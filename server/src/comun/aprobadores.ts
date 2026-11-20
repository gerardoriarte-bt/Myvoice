/**
 * Quién aprueba una campaña (decisión 30, 2026-11-20): su responsable y los aprobadores que se le sumen.
 *
 * La regla sigue siendo la de siempre —toda aprobación tiene un nombre—, pero ya no depende de una sola
 * persona: si el responsable no está y hay urgencia, quien administra o quien ya aprueba suma a otra, y
 * cualquiera de ellas decide la sábana, el copy y las piezas. El primero que decide, decide; el historial
 * dice quién fue.
 *
 * Es el único lugar que sabe esto. CDM, My Voice y Producción preguntan aquí, nunca comparan
 * `responsableId` a mano.
 */

import { prisma } from '../lib/prisma.js';
import { canManage, TenantContext, TenantError, assertProjectInWorkspace } from '../lib/tenancy.js';

export interface PersonaQueAprueba {
  id: string;
  name: string;
  email?: string | null;
}

/** Lo que hay que leer de una campaña para decidir quién aprueba. Se pone dentro del `select` del project. */
export const SELECT_APROBADORES = {
  responsableId: true,
  responsable: { select: { id: true, name: true, email: true } },
  aprobadores: { orderBy: { createdAt: 'asc' as const }, select: { user: { select: { id: true, name: true, email: true } } } },
};

export interface CampanaConAprobadores {
  responsableId: string | null;
  responsable?: { id?: string; name: string; email?: string | null } | null;
  aprobadores?: { user: PersonaQueAprueba }[];
}

/** El responsable primero y después los sumados, sin repetir. */
export const quienesAprueban = (c: CampanaConAprobadores | null | undefined): PersonaQueAprueba[] => {
  if (!c) return [];
  const personas: PersonaQueAprueba[] = [];
  if (c.responsableId) personas.push({ id: c.responsableId, name: c.responsable?.name ?? 'El responsable', email: c.responsable?.email });
  for (const a of c.aprobadores ?? []) if (!personas.some(p => p.id === a.user.id)) personas.push(a.user);
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

const campanaConAprobadores = async (tenant: TenantContext, projectId: string) => {
  await assertProjectInWorkspace(tenant, projectId);
  return prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { id: true, name: true, ...SELECT_APROBADORES } });
};

/** Suma y quita quien administra o quien ya aprueba la campaña: la urgencia no puede esperar a un admin. */
const exigirQuePuedaCambiar = async (tenant: TenantContext, c: CampanaConAprobadores) => {
  if (canManage(tenant.role) || apruebaLaCampana(tenant.userId, c)) return;
  throw new TenantError('Suman aprobadores quien administra o quien ya aprueba la campaña', 403);
};

export const listarAprobadores = async (tenant: TenantContext, projectId: string) => {
  const c = await campanaConAprobadores(tenant, projectId);
  return {
    responsable: c.responsable ? { id: c.responsable.id, name: c.responsable.name, email: c.responsable.email } : null,
    sumados: c.aprobadores.map(a => a.user),
    puedoCambiar: canManage(tenant.role) || apruebaLaCampana(tenant.userId, c),
  };
};

export const sumarAprobador = async (tenant: TenantContext, projectId: string, userId: unknown) => {
  if (typeof userId !== 'string' || !userId) throw new TenantError('Falta a quién sumar', 400);
  const c = await campanaConAprobadores(tenant, projectId);
  await exigirQuePuedaCambiar(tenant, c);
  // Solo alguien del workspace: un aprobador de fuera vería una campaña que no es suya.
  const miembro = await prisma.membership.findUnique({ where: { userId_workspaceId: { userId, workspaceId: tenant.workspaceId } } });
  if (!miembro) throw new TenantError('Esa persona no es del workspace', 404);
  if (userId !== c.responsableId) {
    await prisma.aprobadorDeCampana.upsert({
      where: { projectId_userId: { projectId, userId } },
      update: {},
      create: { projectId, userId, agregadoPorId: tenant.userId },
    });
  }
  return listarAprobadores(tenant, projectId);
};

export const quitarAprobador = async (tenant: TenantContext, projectId: string, userId: string) => {
  const c = await campanaConAprobadores(tenant, projectId);
  await exigirQuePuedaCambiar(tenant, c);
  await prisma.aprobadorDeCampana.deleteMany({ where: { projectId, userId } });
  return listarAprobadores(tenant, projectId);
};
