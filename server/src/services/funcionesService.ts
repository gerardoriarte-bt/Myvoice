/**
 * Las funciones del equipo: quién escribe, quién diseña y quién aprueba.
 *
 * Es un eje **distinto** del permiso. `Membership.role` dice cuánto puede
 * administrar una persona; la función dice qué hace. Una persona puede tener
 * varias, y cada una puede acotarse a marcas.
 *
 * **Ninguna función restringe nada** (D2 del plan). Sin la de Aprobación igual
 * se puede aceptar una pieza. Lo único que cambia es:
 *
 *   · a quién le llega el aviso (fase 3), y
 *   · quién aparece primero en «Asignar a…».
 *
 * Si restringiera, el día que el aprobador está de vacaciones habría que ir a
 * Equipo a cambiar roles para destrabar una pieza — y eso termina con todos
 * siendo aprobadores «por las dudas», que es peor que no tener funciones.
 *
 * Ver docs/plan-h3d-funciones-notificaciones.md.
 */

import { FuncionEquipo, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { assertClientInWorkspace, assertMemberOfWorkspace, TenantContext, TenantError } from '../lib/tenancy.js';

export const esFuncion = (valor: unknown): valor is FuncionEquipo =>
  typeof valor === 'string' && (Object.values(FuncionEquipo) as string[]).includes(valor);

export interface FuncionAsignada {
  id: string;
  funcion: FuncionEquipo;
  clientId: string | null;
  /** Nombre de la marca, o null cuando aplica a todas. */
  marca: string | null;
}

const INCLUDE = { client: { select: { id: true, name: true } } } satisfies Prisma.MiembroFuncionInclude;

const aSalida = (f: Prisma.MiembroFuncionGetPayload<{ include: typeof INCLUDE }>): FuncionAsignada => ({
  id: f.id,
  funcion: f.funcion,
  clientId: f.clientId,
  marca: f.client?.name ?? null,
});

/** Las funciones de todo el workspace, agrupadas por persona para la pantalla de Equipo. */
export const funcionesPorMiembro = async (tenant: TenantContext): Promise<Map<string, FuncionAsignada[]>> => {
  const filas = await prisma.miembroFuncion.findMany({
    where: { workspaceId: tenant.workspaceId },
    include: INCLUDE,
    orderBy: [{ funcion: 'asc' }, { createdAt: 'asc' }],
  });
  const mapa = new Map<string, FuncionAsignada[]>();
  for (const f of filas) mapa.set(f.userId, [...(mapa.get(f.userId) ?? []), aSalida(f)]);
  return mapa;
};

/**
 * Da una función a alguien. `clientId` null = todas las marcas del workspace,
 * que es el caso normal.
 *
 * Es idempotente: pedir dos veces la misma función no falla ni duplica. Una
 * pantalla que reintenta no tiene por qué romper nada.
 */
export const asignarFuncion = async (
  tenant: TenantContext,
  userId: string,
  funcion: FuncionEquipo,
  clientId?: string | null
): Promise<FuncionAsignada[]> => {
  if (!esFuncion(funcion)) throw new TenantError('Función desconocida', 400);
  // Las dos guardas: la persona tiene que ser del workspace y la marca también.
  await assertMemberOfWorkspace(tenant, userId);
  if (clientId) await assertClientInWorkspace(tenant, clientId);

  // Un upsert no sirve: el unique es compuesto y lleva `clientId` nullable, y
  // Prisma no acepta NULL en la clave de búsqueda de un unique compuesto. Así
  // que se busca y se crea, y la carrera la resuelve el unique de la base.
  const existente = await prisma.miembroFuncion.findFirst({
    where: { workspaceId: tenant.workspaceId, userId, funcion, clientId: clientId ?? null },
    select: { id: true },
  });
  if (!existente) {
    try {
      await prisma.miembroFuncion.create({
        data: { workspaceId: tenant.workspaceId, userId, funcion, clientId: clientId ?? null },
      });
    } catch (e) {
      // P2002: alguien la creó entre la búsqueda y el create. Es el resultado
      // que se pedía, así que no es un error.
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
    }
  }

  return funcionesDe(tenant, userId);
};

export const quitarFuncion = async (tenant: TenantContext, funcionId: string): Promise<void> => {
  // deleteMany con el workspace en el where: un id de otro tenant no borra nada
  // y responde 404, igual que el resto de las guardas.
  const { count } = await prisma.miembroFuncion.deleteMany({
    where: { id: funcionId, workspaceId: tenant.workspaceId },
  });
  if (count === 0) throw new TenantError('Función no encontrada', 404);
};

export const funcionesDe = async (tenant: TenantContext, userId: string): Promise<FuncionAsignada[]> => {
  const filas = await prisma.miembroFuncion.findMany({
    where: { workspaceId: tenant.workspaceId, userId },
    include: INCLUDE,
    orderBy: [{ funcion: 'asc' }, { createdAt: 'asc' }],
  });
  return filas.map(aSalida);
};

/**
 * Quién tiene una función para una marca: los acotados a esa marca **más** los
 * que la tienen sin acotar. Es la consulta que la fase 3 va a usar para saber a
 * quién avisarle, y la que hoy ordena «Asignar a…».
 *
 * Devuelve ids, no usuarios: quien llama ya tiene la lista de miembros.
 */
export const quienTiene = async (
  tenant: TenantContext,
  funcion: FuncionEquipo,
  clientId?: string | null
): Promise<string[]> => {
  const filas = await prisma.miembroFuncion.findMany({
    where: {
      workspaceId: tenant.workspaceId,
      funcion,
      OR: [{ clientId: null }, ...(clientId ? [{ clientId }] : [])],
    },
    select: { userId: true },
  });
  return [...new Set(filas.map(f => f.userId))];
};
