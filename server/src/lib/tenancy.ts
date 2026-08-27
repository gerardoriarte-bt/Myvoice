/**
 * Guardas de propiedad por workspace.
 *
 * Regla del sistema: ningún handler toca un recurso por `id` sin pasarlo antes
 * por una de estas funciones. No es un middleware genérico porque el recurso a
 * verificar cambia en cada endpoint; es una guarda explícita, visible en el
 * diff y auditable en code review.
 *
 * Un recurso de otro workspace responde 404, no 403: un 403 confirma que el id
 * existe y convierte el endpoint en un oráculo de existencia entre tenants.
 */

import { WorkspaceRole } from '@prisma/client';
import { prisma } from './prisma.js';

export interface TenantContext {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
}

export class TenantError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 404) {
    super(message);
    this.name = 'TenantError';
    this.statusCode = statusCode;
  }
}

const notFound = (what: string) => new TenantError(`${what} no encontrado`, 404);

/** OWNER y ADMIN administran el workspace; MEMBER solo trabaja dentro de él. */
export const canManage = (role: WorkspaceRole) =>
  role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN;

/**
 * Copia solo los campos permitidos de un body. Evita el mass assignment que
 * permitía reasignar `clientId` o `workspaceId` desde el cliente.
 */
export const pickFields = <T extends object, K extends keyof T>(
  body: T,
  allowed: readonly K[]
): Partial<Pick<T, K>> => {
  const out: Partial<Pick<T, K>> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
};

// ---------------------------------------------------------------- recursos

export const assertClientInWorkspace = async (tenant: TenantContext, clientId: string) => {
  if (!clientId) throw new TenantError('clientId es obligatorio', 400);
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.workspaceId !== tenant.workspaceId) throw notFound('Marca');
  return client;
};

export const assertDnaProfileInWorkspace = async (tenant: TenantContext, profileId: string) => {
  if (!profileId) throw new TenantError('dnaProfileId es obligatorio', 400);
  const profile = await prisma.contentDNAProfile.findUnique({
    where: { id: profileId },
    include: { client: true },
  });
  if (!profile || profile.client.workspaceId !== tenant.workspaceId) throw notFound('Brief');
  return profile;
};

export const assertVariationInWorkspace = async (tenant: TenantContext, variationId: string) => {
  const variation = await prisma.savedVariation.findUnique({
    where: { id: variationId },
    include: { client: true },
  });
  if (!variation || variation.client.workspaceId !== tenant.workspaceId) throw notFound('Contenido');
  return variation;
};

export const assertProjectInWorkspace = async (tenant: TenantContext, projectId: string) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== tenant.workspaceId) throw notFound('Proyecto');
  return project;
};

export const assertPresetInWorkspace = async (tenant: TenantContext, presetId: string) => {
  const preset = await prisma.generationPreset.findUnique({ where: { id: presetId } });
  if (!preset || preset.workspaceId !== tenant.workspaceId) throw notFound('Preset');
  return preset;
};

/** Un usuario "pertenece" al workspace solo si tiene membresía en él. */
export const assertMemberOfWorkspace = async (tenant: TenantContext, userId: string) => {
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: tenant.workspaceId } },
    include: { user: true },
  });
  if (!membership) throw notFound('Miembro');
  return membership;
};

/**
 * Valida una lista de ids de una sola consulta y devuelve solo los que son del
 * workspace. Para operaciones masivas, donde ir de a uno sería N consultas.
 */
export const filterVariationsInWorkspace = async (tenant: TenantContext, ids: string[]) => {
  const rows = await prisma.savedVariation.findMany({
    where: { id: { in: ids }, client: { workspaceId: tenant.workspaceId } },
    select: { id: true },
  });
  return rows.map(r => r.id);
};
