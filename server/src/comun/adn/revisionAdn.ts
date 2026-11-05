import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { TenantContext, TenantError } from '../../lib/tenancy.js';
import { guardarAdnDesdeColumnas } from './guardarAdn.js';
import { ClaveAdn, COLUMNAS_ADN, SECCIONES_DE_REVISION, seccionesDesdeColumnas } from './secciones.js';

/**
 * Revisar el ADN de una marca madre antes de que lo hereden sus submarcas (docs/plan-revision-adn.md).
 *
 * Una submarca hereda solo cuando el ADN de su madre está confirmado. Confirmar exige revisar las cinco
 * secciones de antes del ADN 2.0 (`SECCIONES_DE_REVISION`): «está bien» o corregirla. Es lo que enciende la herencia de la familia.
 */

type Tx = Prisma.TransactionClient;

/** El tipo de aviso de la bandeja. */
export const AVISO_ADN_POR_REVISAR = 'ADN_POR_REVISAR';

export interface SeccionEnRevision {
  clave: ClaveAdn;
  nombre: string;
  texto: string;
  /** Cómo la reciben las submarcas. */
  comoHereda: string;
  revisada: boolean;
}

export interface EstadoDeRevision {
  clientId: string;
  marca: string;
  /** Tiene submarcas y su ADN no está confirmado. */
  requiere: boolean;
  confirmadoEn: Date | null;
  submarcas: { id: string; name: string }[];
  secciones: SeccionEnRevision[];
  revisadas: number;
  total: number;
}

const SELECT_COLUMNAS = Object.fromEntries(COLUMNAS_ADN.map(c => [c, true])) as Record<(typeof COLUMNAS_ADN)[number], true>;

export const estadoDeRevision = async (clientId: string, db: Tx | typeof prisma = prisma): Promise<EstadoDeRevision> => {
  const client = await db.client.findUniqueOrThrow({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      adnConfirmadoEn: true,
      complementarias: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
      ...SELECT_COLUMNAS,
    },
  });
  const filas = await db.seccionAdn.findMany({ where: { clientId } });
  const desdeColumnas = seccionesDesdeColumnas(client, false);
  const secciones = SECCIONES_DE_REVISION.map(def => {
    const fila = filas.find(f => f.clave === def.clave);
    return {
      clave: def.clave,
      nombre: def.nombre,
      texto: fila ? ((fila.contenido as { texto?: string }).texto ?? '') : (desdeColumnas[def.clave]?.contenido.texto ?? ''),
      comoHereda: def.modos.includes('SUMA') ? 'Se suman a las suyas' : 'Si no tienen propia',
      revisada: Boolean(fila?.revisadaEn),
    };
  });
  const revisadas = secciones.filter(s => s.revisada).length;
  return {
    clientId,
    marca: client.name,
    requiere: client.complementarias.length > 0 && !client.adnConfirmadoEn,
    confirmadoEn: client.adnConfirmadoEn,
    submarcas: client.complementarias,
    secciones,
    revisadas,
    total: secciones.length,
  };
};

/**
 * «Está bien» (sin `texto`) o «Corregir» (con `texto`, que se escribe en la columna: la pantalla de v1
 * sigue leyendo de ahí). En los dos casos la sección queda revisada por quien la revisó.
 */
export const revisarSeccion = async (
  tenant: TenantContext,
  clientId: string,
  clave: string,
  texto?: string
): Promise<EstadoDeRevision> => {
  const def = SECCIONES_DE_REVISION.find(s => s.clave === clave);
  if (!def) throw new TenantError(`No existe la sección «${clave}»`, 400);
  if (texto !== undefined && typeof texto !== 'string') throw new TenantError('El texto tiene que ser texto', 400);
  return prisma.$transaction(async tx => {
    if (texto !== undefined) {
      await tx.client.update({ where: { id: clientId }, data: { [def.columna!]: texto.trim() } });
    }
    await guardarAdnDesdeColumnas(clientId, { autorId: tenant.userId, tx });
    await tx.seccionAdn.update({
      where: { clientId_clave: { clientId, clave: def.clave } },
      data: { revisadaEn: new Date(), revisadaPorId: tenant.userId },
    });
    return estadoDeRevision(clientId, tx);
  });
};

/**
 * Confirma el ADN de la madre y enciende la herencia: cada submarca recibe sus secciones (si no las
 * tenía) y una versión nueva que registra la madre. Cierra los avisos de la bandeja de esta marca.
 */
export const confirmarAdn = async (
  tenant: TenantContext,
  clientId: string
): Promise<{ estado: EstadoDeRevision; submarcasAfectadas: number }> =>
  prisma.$transaction(async tx => {
    await guardarAdnDesdeColumnas(clientId, { autorId: tenant.userId, tx });
    const antes = await estadoDeRevision(clientId, tx);
    if (antes.confirmadoEn) return { estado: antes, submarcasAfectadas: 0 };
    const faltan = antes.total - antes.revisadas;
    if (faltan > 0)
      throw new TenantError(
        `Falta${faltan === 1 ? '' : 'n'} ${faltan} ${faltan === 1 ? 'sección' : 'secciones'} por revisar`,
        409
      );
    await tx.client.update({
      where: { id: clientId },
      data: { adnConfirmadoEn: new Date(), adnConfirmadoPorId: tenant.userId },
    });
    for (const sub of antes.submarcas)
      await guardarAdnDesdeColumnas(sub.id, { motivo: 'madre', autorId: tenant.userId, tx });
    await tx.notificacion.updateMany({
      where: { workspaceId: tenant.workspaceId, clientId, tipo: AVISO_ADN_POR_REVISAR, leidaAt: null },
      data: { leidaAt: new Date() },
    });
    return { estado: await estadoDeRevision(clientId, tx), submarcasAfectadas: antes.submarcas.length };
  });

/**
 * Un aviso por marca madre sin confirmar, para cada OWNER y ADMIN de su workspace. No se repite: quien
 * ya lo recibió (lo haya leído o no) no recibe otro; el aviso de Marcas sigue a la vista hasta confirmar.
 * Corre al arrancar el servidor y cuando una marca pasa a tener submarcas.
 */
export const avisarAdnPorRevisar = async (filtro: { workspaceId?: string; clientId?: string } = {}): Promise<number> => {
  const madres = await prisma.client.findMany({
    where: {
      adnConfirmadoEn: null,
      complementarias: { some: {} },
      ...(filtro.workspaceId ? { workspaceId: filtro.workspaceId } : {}),
      ...(filtro.clientId ? { id: filtro.clientId } : {}),
    },
    select: { id: true, name: true, workspaceId: true, _count: { select: { complementarias: true } } },
  });
  let creados = 0;
  for (const m of madres) {
    const gestores = await prisma.membership.findMany({
      where: { workspaceId: m.workspaceId, role: { in: ['OWNER', 'ADMIN'] } },
      select: { userId: true },
    });
    const n = m._count.complementarias;
    for (const { userId } of gestores) {
      const ya = await prisma.notificacion.count({
        where: { workspaceId: m.workspaceId, userId, clientId: m.id, tipo: AVISO_ADN_POR_REVISAR },
      });
      if (ya) continue;
      await prisma.notificacion.create({
        data: {
          workspaceId: m.workspaceId,
          userId,
          tipo: AVISO_ADN_POR_REVISAR,
          clientId: m.id,
          titulo: `Revisá el ADN de ${m.name}: lo van a heredar ${n === 1 ? 'una submarca' : `${n} submarcas`}`,
          detalle: 'Hasta que lo confirmes, sus submarcas siguen con su propio ADN.',
        },
      });
      creados++;
    }
  }
  return creados;
};
