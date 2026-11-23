/**
 * Quién aprueba una campaña: su responsable y quienes tienen la función **Aprobación** en Equipo para su
 * marca o para todas (Gerardo, 2026-11-23: los permisos se manejan desde Equipo, no desde cada campaña). Es la
 * decisión 30 con otra fuente: hasta el 23-nov los aprobadores se sumaban por campaña (`AprobadorDeCampana`,
 * que queda sin uso).
 *
 * Cualquiera de ellos decide la sábana, el copy y las piezas; el primero que lo hace, decide, y el historial dice
 * quién fue. Es el único lugar que sabe esto: CDM, My Voice y Producción preguntan aquí, nunca comparan
 * `responsableId` a mano.
 */

import { prisma } from '../lib/prisma.js';
import { TenantContext, TenantError, assertProjectInWorkspace } from '../lib/tenancy.js';

export interface PersonaQueAprueba {
  id: string;
  name: string;
  email?: string | null;
}

/** Lo que hay que leer de una campaña para decidir quién aprueba. Se pone dentro del `select` del project. */
export const SELECT_APROBADORES = {
  clientId: true,
  responsableId: true,
  responsable: { select: { id: true, name: true, email: true } },
  workspace: {
    select: {
      MiembroFuncion: {
        where: { funcion: 'APROBACION' as const },
        orderBy: { createdAt: 'asc' as const },
        select: { clientId: true, user: { select: { id: true, name: true, email: true } } },
      },
    },
  },
};

export interface CampanaConAprobadores {
  clientId?: string | null;
  responsableId: string | null;
  responsable?: { id?: string; name: string; email?: string | null } | null;
  workspace?: { MiembroFuncion: { clientId: string | null; user: PersonaQueAprueba }[] };
}

/** El responsable primero y después quienes tienen Aprobación para la marca (o todas), sin repetir. */
export const quienesAprueban = (c: CampanaConAprobadores | null | undefined): PersonaQueAprueba[] => {
  if (!c) return [];
  const personas: PersonaQueAprueba[] = [];
  if (c.responsableId) personas.push({ id: c.responsableId, name: c.responsable?.name ?? 'El responsable', email: c.responsable?.email });
  for (const f of c.workspace?.MiembroFuncion ?? []) {
    if (f.clientId && f.clientId !== c.clientId) continue;
    if (!personas.some(p => p.id === f.user.id)) personas.push(f.user);
  }
  return personas;
};

export const apruebaLaCampana = (userId: string, c: CampanaConAprobadores | null | undefined) =>
  quienesAprueban(c).some(p => p.id === userId);

/** «Laura», «Laura o Andrés», «Laura, Andrés o Sofía». */
export const nombresDe = (personas: PersonaQueAprueba[]) =>
  personas.length === 0
    ? 'nadie todavía'
    : personas.length === 1
      ? personas[0].name
      : `${personas.slice(0, -1).map(p => p.name).join(', ')} o ${personas[personas.length - 1].name}`;

/**
 * Las campañas que quien mira aprueba, como filtro de Prisma: las que tiene de responsable y las de las marcas
 * donde tiene Aprobación (todas, si la tiene sin marca). Para «Por aprobar».
 */
export const campanasQueApruebo = async (tenant: TenantContext) => {
  const funciones = await prisma.miembroFuncion.findMany({
    where: { workspaceId: tenant.workspaceId, userId: tenant.userId, funcion: 'APROBACION' },
    select: { clientId: true },
  });
  if (funciones.some(f => !f.clientId)) return { workspaceId: tenant.workspaceId };
  const marcas = funciones.map(f => f.clientId!).filter(Boolean);
  return {
    workspaceId: tenant.workspaceId,
    OR: [{ responsableId: tenant.userId }, ...(marcas.length ? [{ clientId: { in: marcas } }] : [])],
  };
};

const campanaConAprobadores = async (tenant: TenantContext, projectId: string) => {
  await assertProjectInWorkspace(tenant, projectId);
  return prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { id: true, name: true, ...SELECT_APROBADORES } });
};

/**
 * Quiénes se pueden elegir como responsable o sumar como aprobador (pregunta 10 de las decisiones,
 * 2026-11-20): las personas con la función Aprobación, para esa marca o para todas. Si en el workspace nadie
 * la tiene todavía, cualquiera del workspace, como hasta ahora: declarar la función no puede trabar nada.
 */
export const elegiblesPara = async (workspaceId: string, clientId: string | null): Promise<PersonaQueAprueba[]> => {
  const conFuncion = await prisma.miembroFuncion.findMany({
    where: { workspaceId, funcion: 'APROBACION', OR: [{ clientId: null }, ...(clientId ? [{ clientId }] : [])] },
    select: { user: { select: { id: true, name: true, email: true } } },
  });
  const unicos = new Map(conFuncion.map(f => [f.user.id, f.user]));
  if (unicos.size) return [...unicos.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const todos = await prisma.membership.findMany({
    where: { workspaceId },
    select: { user: { select: { id: true, name: true, email: true } } },
  });
  return todos.map(m => m.user).sort((a, b) => a.name.localeCompare(b.name, 'es'));
};

/** Rechaza a quien no es elegible, con el motivo en palabras del equipo. */
export const exigirElegible = async (workspaceId: string, clientId: string | null, userId: string) => {
  const elegibles = await elegiblesPara(workspaceId, clientId);
  if (!elegibles.some(e => e.id === userId))
    throw new TenantError('Esa persona no tiene la función Aprobación: dásela en Equipo para poder elegirla', 400);
};

export const listarAprobadores = async (tenant: TenantContext, projectId: string) => {
  const c = await campanaConAprobadores(tenant, projectId);
  return {
    responsable: c.responsable ? { id: c.responsable.id, name: c.responsable.name, email: c.responsable.email } : null,
    // Además del responsable: quienes tienen Aprobación para la marca. Se cambia en Equipo, no aquí.
    sumados: quienesAprueban(c).filter(p => p.id !== c.responsableId),
    puedoCambiar: false,
    elegibles: await elegiblesPara(tenant.workspaceId, c.clientId),
  };
};
