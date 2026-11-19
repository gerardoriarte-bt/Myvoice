import { FuncionEquipo } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { canManage, TenantContext, TenantError } from '../lib/tenancy.js';

/**
 * Quién puede ACTUAR en cada paso del proceso (F1, decisión 22). Es el único lugar que lo decide, como
 * `permisosPieza.ts` para las piezas. Ver no se restringe: cualquier miembro lee todos los pasos.
 *
 * La regla en una línea: actúa en un paso quien tiene su función —en esa marca o en todas— o un admin
 * (OWNER/ADMIN), que puede destrabar cualquier paso si alguien falta. Aprobar no pasa por acá: sigue siendo
 * del responsable de la campaña (`aprobacion.ts`, `permisosPieza.ts`).
 *
 * **Se enciende de a poco**, como la cuota. Con `PERMISOS_POR_FUNCION=aplicar` y el workspace con la
 * plataforma por procesos encendida, quien no puede actuar recibe 403. En cualquier otro caso —el de hoy—
 * solo se registra en el log quién habría quedado afuera: así se ve, antes de prenderlo, a quién le falta
 * una función en Equipo.
 */

export type PasoDeTrabajo = 'ADN' | 'CDM' | 'COPY' | 'PRODUCCION' | 'IMPLEMENTACION';

/** El orden del proceso: decide el entorno de quien tiene varias funciones. */
export const PASOS_EN_ORDEN: PasoDeTrabajo[] = ['ADN', 'CDM', 'COPY', 'PRODUCCION', 'IMPLEMENTACION'];

export const FUNCIONES_DEL_PASO: Record<PasoDeTrabajo, FuncionEquipo[]> = {
  ADN: [FuncionEquipo.ESTRATEGIA],
  CDM: [FuncionEquipo.PLANNING],
  COPY: [FuncionEquipo.COPY],
  PRODUCCION: [FuncionEquipo.DISENO],
  IMPLEMENTACION: [FuncionEquipo.TRAFFICKER],
};

const NOMBRE_DEL_PASO: Record<PasoDeTrabajo, string> = {
  ADN: 'el ADN de la marca',
  CDM: 'CDM',
  COPY: 'el copy',
  PRODUCCION: 'Producción',
  IMPLEMENTACION: 'Implementación',
};

export const puedeActuar = async (tenant: TenantContext, paso: PasoDeTrabajo, clientId?: string | null) => {
  if (canManage(tenant.role)) return true;
  const fila = await prisma.miembroFuncion.findFirst({
    where: {
      workspaceId: tenant.workspaceId,
      userId: tenant.userId,
      funcion: { in: FUNCIONES_DEL_PASO[paso] },
      OR: [{ clientId: null }, ...(clientId ? [{ clientId }] : [])],
    },
    select: { id: true },
  });
  return Boolean(fila);
};

const aplica = async (workspaceId: string) => {
  if (process.env.PERMISOS_POR_FUNCION !== 'aplicar') return false;
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { plataformaPorProcesos: true } });
  return Boolean(ws?.plataformaPorProcesos);
};

/**
 * Va DESPUÉS de la guarda de tenencia, a la vista en el diff. Responde 403 y no 404: el recurso ya es visible
 * para la persona, así que no confirma nada que no supiera.
 */
export const assertPuedeActuar = async (tenant: TenantContext, paso: PasoDeTrabajo, clientId?: string | null) => {
  if (await puedeActuar(tenant, paso, clientId)) return;
  if (await aplica(tenant.workspaceId)) {
    throw new TenantError(`Para cambiar ${NOMBRE_DEL_PASO[paso]} hace falta su función en Equipo`, 403);
  }
  console.warn(
    `[permisos] OBSERVACIÓN — ${tenant.userId} actuó en ${paso} (marca ${clientId ?? 'todas'}) sin la función; ` +
      'no se bloquea porque PERMISOS_POR_FUNCION no es «aplicar» o la plataforma por procesos está apagada.'
  );
};

/**
 * Para las rutas que eran solo de admin y se abren a la función del paso (el ADN a Estrategia): decide
 * siempre, sin modo observar. Observar ahí sería abrirlas a todo el workspace; así solo entra quien un admin
 * nombró en Equipo.
 */
export const exigirPaso = async (tenant: TenantContext, paso: PasoDeTrabajo, clientId?: string | null) => {
  if (!(await puedeActuar(tenant, paso, clientId))) {
    throw new TenantError(`Para cambiar ${NOMBRE_DEL_PASO[paso]} hace falta su función en Equipo`, 403);
  }
};

/**
 * El paso donde entra cada persona: el de su primera función en el orden del proceso. `null` = no tiene
 * función de un paso (un admin, o solo Aprobación): el marco decide (Panorama, Mi cola).
 */
export const entornoDe = (funciones: FuncionEquipo[]): PasoDeTrabajo | null =>
  PASOS_EN_ORDEN.find(paso => FUNCIONES_DEL_PASO[paso].some(f => funciones.includes(f))) ?? null;
