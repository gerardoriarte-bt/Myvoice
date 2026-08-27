import { Response } from 'express';
import { WorkspaceRole } from '@prisma/client';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { createAIClient, resolveModel, WorkspaceAIConfig, TIEMPOS, chatCompletionConRetry } from '../services/aiClient.js';
import { assertMemberOfWorkspace, TenantError } from '../lib/tenancy.js';
import { encryptSecret } from '../lib/crypto.js';
import { PLANES_VALIDOS } from '../lib/planLimits.js';
import { notifyWorkspaceInvite } from '../services/notificationService.js';
import { prisma } from '../lib/prisma.js';

const INVITE_TTL_DAYS = 7;

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'workspace';

const uniqueSlug = async (base: string) => {
  let slug = base;
  let n = 2;
  while (await prisma.workspace.findUnique({ where: { slug } })) slug = `${base}-${n++}`;
  return slug;
};

const isValidRole = (role: unknown): role is WorkspaceRole =>
  typeof role === 'string' && (Object.values(WorkspaceRole) as string[]).includes(role);

// ------------------------------------------------------------- workspaces

export const listMyWorkspaces = async (req: AuthRequest, res: Response) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: { userId: req.auth!.userId },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true, plan: true, _count: { select: { clients: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(
      memberships.map(m => ({
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        plan: m.workspace.plan,
        role: m.role,
        clientCount: m.workspace._count.clients,
      }))
    );
  } catch (error) {
    handleTenantError(error, res, 'Error al listar workspaces');
  }
};

/** Crea una empresa nueva. Quien la crea queda como OWNER. */
export const createWorkspace = async (req: AuthRequest, res: Response) => {
  const { name, plan } = req.body as { name?: string; plan?: string };
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  // El plan es el que resuelve la cuota del workspace: un typo acá lo mandaría
  // en silencio al plan de fallback.
  if (plan && !PLANES_VALIDOS.includes(plan)) {
    return res.status(400).json({ error: `Plan inválido. Planes válidos: ${PLANES_VALIDOS.join(', ')}` });
  }

  try {
    const workspace = await prisma.workspace.create({
      data: { name: name.trim(), slug: await uniqueSlug(slugify(name)), plan: plan || 'company' },
    });
    await prisma.membership.create({
      data: { userId: req.auth!.userId, workspaceId: workspace.id, role: WorkspaceRole.OWNER },
    });
    res.status(201).json({ ...workspace, role: WorkspaceRole.OWNER, clientCount: 0 });
  } catch (error) {
    handleTenantError(error, res, 'Error al crear el workspace');
  }
};

// ---------------------------------------------------------------- miembros

export const listMembers = async (req: AuthRequest, res: Response) => {
  try {
    const members = await prisma.membership.findMany({
      where: { workspaceId: req.tenant!.workspaceId },
      include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(
      members.map(m => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        createdAt: m.user.createdAt,
        membershipId: m.id,
      }))
    );
  } catch (error) {
    handleTenantError(error, res, 'Error al listar los miembros');
  }
};

export const updateMemberRole = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const { role } = req.body as { role?: string };
  if (!isValidRole(role)) return res.status(400).json({ error: 'Rol inválido' });

  try {
    const tenant = req.tenant!;
    await assertMemberOfWorkspace(tenant, userId);

    // No dejamos un workspace sin dueño.
    if (role !== WorkspaceRole.OWNER) {
      const owners = await prisma.membership.count({
        where: { workspaceId: tenant.workspaceId, role: WorkspaceRole.OWNER },
      });
      const target = await prisma.membership.findUnique({
        where: { userId_workspaceId: { userId, workspaceId: tenant.workspaceId } },
      });
      if (owners <= 1 && target?.role === WorkspaceRole.OWNER) {
        throw new TenantError('El workspace necesita al menos un OWNER', 400);
      }
    }

    const updated = await prisma.membership.update({
      where: { userId_workspaceId: { userId, workspaceId: tenant.workspaceId } },
      data: { role },
    });
    res.json({ userId, role: updated.role });
  } catch (error) {
    handleTenantError(error, res, 'Error al cambiar el rol');
  }
};

export const removeMember = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  try {
    const tenant = req.tenant!;
    const membership = await assertMemberOfWorkspace(tenant, userId);

    if (membership.role === WorkspaceRole.OWNER) {
      const owners = await prisma.membership.count({
        where: { workspaceId: tenant.workspaceId, role: WorkspaceRole.OWNER },
      });
      if (owners <= 1) throw new TenantError('El workspace necesita al menos un OWNER', 400);
    }

    await prisma.membership.delete({ where: { id: membership.id } });

    // Si era su workspace activo, lo movemos a otro donde sí tenga membresía.
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.workspaceId === tenant.workspaceId) {
      const fallback = await prisma.membership.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { workspaceId: fallback?.workspaceId ?? null },
      });
    }

    res.json({ message: 'Miembro removido del workspace' });
  } catch (error) {
    handleTenantError(error, res, 'Error al remover el miembro');
  }
};

// ------------------------------------------------------------ invitaciones

export const listInvites = async (req: AuthRequest, res: Response) => {
  try {
    const invites = await prisma.workspaceInvite.findMany({
      where: { workspaceId: req.tenant!.workspaceId, acceptedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, role: true, expiresAt: true, createdAt: true, token: true },
    });
    res.json(invites);
  } catch (error) {
    handleTenantError(error, res, 'Error al listar las invitaciones');
  }
};

export const createInvite = async (req: AuthRequest, res: Response) => {
  const { email, role } = req.body as { email?: string; role?: string };
  if (!email?.includes('@')) return res.status(400).json({ error: 'Email inválido' });
  const inviteRole = isValidRole(role) ? role : WorkspaceRole.MEMBER;

  try {
    const tenant = req.tenant!;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      const already = await prisma.membership.findUnique({
        where: { userId_workspaceId: { userId: existing.id, workspaceId: tenant.workspaceId } },
      });
      if (already) return res.status(400).json({ error: 'Ese usuario ya es miembro del workspace' });

      // Usuario existente: entra directo, no hace falta que acepte nada.
      await prisma.membership.create({
        data: { userId: existing.id, workspaceId: tenant.workspaceId, role: inviteRole },
      });
      return res.status(201).json({ added: true, email: normalizedEmail, role: inviteRole });
    }

    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
    const invite = await prisma.workspaceInvite.create({
      data: {
        workspaceId: tenant.workspaceId,
        email: normalizedEmail,
        role: inviteRole,
        expiresAt,
        createdById: tenant.userId,
      },
      include: { workspace: { select: { name: true } } },
    });

    await notifyWorkspaceInvite({
      email: normalizedEmail,
      workspaceName: invite.workspace.name,
      token: invite.token,
      expiresAt,
    });

    res.status(201).json({
      added: false,
      id: invite.id,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    handleTenantError(error, res, 'Error al crear la invitación');
  }
};

export const revokeInvite = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const invite = await prisma.workspaceInvite.findUnique({ where: { id } });
    if (!invite || invite.workspaceId !== req.tenant!.workspaceId) {
      throw new TenantError('Invitación no encontrada', 404);
    }
    await prisma.workspaceInvite.delete({ where: { id } });
    res.json({ message: 'Invitación revocada' });
  } catch (error) {
    handleTenantError(error, res, 'Error al revocar la invitación');
  }
};

// ------------------------------------------------------------- config IA

export const getWorkspaceAIConfig = async (req: AuthRequest, res: Response) => {
  try {
    const ws = await prisma.workspace.findUnique({
      where: { id: req.tenant!.workspaceId },
      select: { aiProvider: true, aiModel: true, aiApiKey: true },
    });
    if (!ws) return res.status(404).json({ error: 'Workspace no encontrado' });

    res.json({
      aiProvider: ws.aiProvider || null,
      aiModel: ws.aiModel || null,
      // Never return the raw key — just signal if it's set
      hasApiKey: Boolean(ws.aiApiKey),
    });
  } catch (error) {
    handleTenantError(error, res, 'Error al obtener configuración');
  }
};

export const updateWorkspaceAIConfig = async (req: AuthRequest, res: Response) => {
  const { aiProvider, aiApiKey, aiModel } = req.body as {
    aiProvider?: string;
    aiApiKey?: string;
    aiModel?: string;
  };

  // Mantener alineado con AIProvider en services/aiClient.ts.
  const VALID_PROVIDERS = ['openrouter', 'openai', 'anthropic', 'gemini'];
  if (aiProvider && !VALID_PROVIDERS.includes(aiProvider)) {
    return res.status(400).json({ error: `Provider inválido. Usá: ${VALID_PROVIDERS.join(', ')}` });
  }

  // Validate the key works before saving (quick smoke test).
  // NOTE: uses a minimal chat completion, not models.list() — Anthropic's
  // OpenAI-compatible endpoint rejects Bearer auth on /v1/models (401 "Invalid
  // bearer token") even for a valid key, so models.list() would false-negative
  // every Anthropic key.
  if (aiApiKey && aiProvider) {
    try {
      const testConfig: WorkspaceAIConfig = { provider: aiProvider as any, apiKey: aiApiKey, model: aiModel || undefined };
      const testClient = createAIClient(testConfig);
      // Único call site donde el no-reintento es intencional: una key inválida
      // tiene que fallar rápido en la UI de ajustes. Reintentar tres veces un
      // 401 solo le hace esperar 25 s al admin para el mismo error.
      await chatCompletionConRetry(
        testClient,
        {
          model: resolveModel(testConfig, true),
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        },
        { etapa: 'prueba-api-key', timeoutMs: TIEMPOS.llamada.prueba, intentosMax: 1 }
      );
    } catch (err: any) {
      return res.status(400).json({
        error: `API key inválida o sin acceso: ${err?.message || 'error desconocido'}`,
      });
    }
  }

  try {
    const data: Record<string, any> = {};
    if (aiProvider !== undefined) data.aiProvider = aiProvider || null;
    // Se cifra recién acá: el smoke test de arriba valida contra el proveedor
    // con la clave que mandó el usuario, en claro.
    if (aiApiKey !== undefined) data.aiApiKey = aiApiKey ? encryptSecret(aiApiKey) : null;
    if (aiModel !== undefined) data.aiModel = aiModel || null;

    await prisma.workspace.update({ where: { id: req.tenant!.workspaceId }, data });
    res.json({ ok: true });
  } catch (error) {
    handleTenantError(error, res, 'Error al guardar configuración');
  }
};
