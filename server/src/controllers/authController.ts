import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { WorkspaceRole } from '@prisma/client';
import { AuthRequest, signToken } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Ya no existe ni el password maestro ni el mapa de dominios que otorgaba
 * acceso automático. El acceso a un workspace se obtiene de una sola forma:
 * una membresía, creada al aceptar una invitación o al fundar el workspace.
 */

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

/** Workspaces donde el usuario tiene membresía, con su rol en cada uno. */
const listWorkspacesOf = async (userId: string) => {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { workspace: { select: { id: true, name: true, slug: true, plan: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return memberships.map(m => ({
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    plan: m.workspace.plan,
    role: m.role,
  }));
};

/** Sesión completa: token con el workspace activo + los workspaces disponibles. */
const buildSession = async (user: { id: string; name: string; email: string; workspaceId: string | null }) => {
  const workspaces = await listWorkspacesOf(user.id);

  const active =
    workspaces.find(w => w.id === user.workspaceId) ?? workspaces[0] ?? null;

  if (active && active.id !== user.workspaceId) {
    await prisma.user.update({ where: { id: user.id }, data: { workspaceId: active.id } });
  }

  return {
    token: signToken({ userId: user.id, workspaceId: active?.id ?? null }),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: active?.role ?? null,
      workspaceId: active?.id ?? null,
      workspaceName: active?.name ?? null,
      workspaces,
    },
  };
};

/** Consume una invitación vigente y deja al usuario adentro del workspace. */
const redeemInvite = async (userId: string, email: string, token: string) => {
  const invite = await prisma.workspaceInvite.findUnique({ where: { token } });
  if (!invite) throw Object.assign(new Error('Invitación inválida'), { statusCode: 400 });
  if (invite.acceptedAt) throw Object.assign(new Error('Esta invitación ya fue usada'), { statusCode: 400 });
  if (invite.expiresAt < new Date()) throw Object.assign(new Error('La invitación expiró'), { statusCode: 400 });
  if (invite.email.toLowerCase() !== email.toLowerCase()) {
    throw Object.assign(new Error('La invitación es para otro email'), { statusCode: 403 });
  }

  await prisma.$transaction([
    prisma.membership.upsert({
      where: { userId_workspaceId: { userId, workspaceId: invite.workspaceId } },
      create: { userId, workspaceId: invite.workspaceId, role: invite.role },
      update: { role: invite.role },
    }),
    prisma.workspaceInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: { workspaceId: invite.workspaceId } }),
  ]);

  return invite.workspaceId;
};

export const register = async (req: Request, res: Response) => {
  // `role`, `clientId` y `workspaceId` del body se ignoran a propósito: antes
  // un email externo podía registrarse enviando role: 'ADMIN'.
  const { email, password, name, inviteToken } = req.body as {
    email?: string;
    password?: string;
    name?: string;
    inviteToken?: string;
  };

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password y name son obligatorios' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) return res.status(400).json({ error: 'El usuario ya existe' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email: normalizedEmail, passwordHash, name, workspaceId: null },
    });

    if (inviteToken) {
      await redeemInvite(user.id, normalizedEmail, inviteToken);
    } else if ((await prisma.workspace.count()) === 0) {
      // Bootstrap de instalación limpia: el primer usuario funda su workspace.
      const workspace = await prisma.workspace.create({
        data: { name, slug: await uniqueSlug(slugify(name)), plan: 'agency' },
      });
      await prisma.membership.create({
        data: { userId: user.id, workspaceId: workspace.id, role: WorkspaceRole.OWNER },
      });
      await prisma.user.update({ where: { id: user.id }, data: { workspaceId: workspace.id } });
    }

    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const session = await buildSession(fresh);

    if (session.user.workspaces.length === 0) {
      return res.status(201).json({
        message: 'Usuario creado. Necesitás una invitación para entrar a un workspace.',
        userId: user.id,
      });
    }
    return res.status(201).json(session);
  } catch (error: any) {
    if (error?.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error('register error:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: 'Credenciales inválidas' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    // Mismo mensaje para usuario inexistente y password incorrecto: no revelamos
    // qué emails están registrados.
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const session = await buildSession(user);
    if (session.user.workspaces.length === 0) {
      return res.status(403).json({
        error: 'Tu usuario no pertenece a ningún workspace. Pedí una invitación a un administrador.',
      });
    }
    res.json(session);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error en el login' });
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  const { credential, inviteToken } = req.body as { credential?: string; inviteToken?: string };
  if (!credential) return res.status(400).json({ error: 'Falta el credential de Google' });

  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ error: 'Token de Google inválido' });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || email.split('@')[0];

    let user = await prisma.user.findUnique({ where: { email } });

    // El dominio del email ya no otorga acceso. Un usuario nuevo solo se crea
    // si trae una invitación vigente a su nombre.
    if (!user) {
      const pending = inviteToken
        ? await prisma.workspaceInvite.findUnique({ where: { token: inviteToken } })
        : await prisma.workspaceInvite.findFirst({
            where: { email, acceptedAt: null, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
          });

      if (!pending) {
        return res.status(403).json({
          error: 'No hay ninguna invitación para este email. Pedí acceso a un administrador.',
        });
      }

      const randomHash = await bcrypt.hash(`google:${email}:${pending.token}`, 10);
      user = await prisma.user.create({ data: { email, name, passwordHash: randomHash } });
      await redeemInvite(user.id, email, pending.token);
      user = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    } else if (inviteToken) {
      await redeemInvite(user.id, email, inviteToken);
      user = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    }

    const session = await buildSession(user);
    if (session.user.workspaces.length === 0) {
      return res.status(403).json({
        error: 'Tu usuario no pertenece a ningún workspace. Pedí una invitación a un administrador.',
      });
    }
    res.json(session);
  } catch (error: any) {
    if (error?.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Error en la autenticación con Google' });
  }
};

/** Sesión vigente: sirve para refrescar los workspaces sin volver a loguearse. */
export const me = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
    res.json(await buildSession(user));
  } catch (error) {
    console.error('me error:', error);
    res.status(500).json({ error: 'Error al cargar la sesión' });
  }
};

/** Cambia el workspace activo. Emite un token nuevo; falla si no hay membresía. */
export const switchWorkspace = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.body as { workspaceId?: string };
  if (!workspaceId) return res.status(400).json({ error: 'workspaceId es obligatorio' });

  try {
    const userId = req.auth!.userId;
    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) return res.status(404).json({ error: 'Workspace no encontrado' });

    await prisma.user.update({ where: { id: userId }, data: { workspaceId } });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    res.json(await buildSession(user));
  } catch (error) {
    console.error('switchWorkspace error:', error);
    res.status(500).json({ error: 'Error al cambiar de workspace' });
  }
};
