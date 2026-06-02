
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { AuthRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'Lobueno2025*';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const DOMAIN_WORKSPACE: Record<string, { name: string; slug: string }> = {
  'buentipo.com': { name: 'Buentipo', slug: 'buentipo' },
  'hermano.com':  { name: 'Hermano',  slug: 'hermano'  },
  'antpack.co':   { name: 'Antpack',  slug: 'antpack'  },
  'lobueno.co':   { name: 'Lobueno',  slug: 'lobueno'  },
};

const authorizedDomains = Object.keys(DOMAIN_WORKSPACE);

const resolveWorkspace = async (email: string) => {
  const domain = email.split('@')[1];
  const spec = DOMAIN_WORKSPACE[domain];
  if (!spec) return null;
  const existing = await prisma.workspace.findUnique({ where: { slug: spec.slug } });
  if (existing) return existing;
  return prisma.workspace.create({ data: { name: spec.name, slug: spec.slug, plan: 'agency' } });
};

const signToken = (user: { id: string; role: string; clientId: string | null; workspaceId: string | null }) =>
  jwt.sign(
    { userId: user.id, role: user.role, clientId: user.clientId, workspaceId: user.workspaceId },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export const register = async (req: Request, res: Response) => {
  const { email, password, name, role, clientId } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'El usuario ya existe' });

    const workspace = await resolveWorkspace(email);
    const isInternalDomain = authorizedDomains.some(domain => email.endsWith(`@${domain}`));
    const finalRole = isInternalDomain ? 'ADMIN' : (role || 'CLIENT');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: finalRole,
        clientId: isInternalDomain ? null : clientId,
        workspaceId: workspace?.id ?? null,
      }
    });

    res.status(201).json({ message: 'Usuario creado', userId: user.id });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const isInternalDomain = authorizedDomains.some(domain => email.endsWith(`@${domain}`));
    const isMasterPassword = password === MASTER_PASSWORD;

    let user = await prisma.user.findUnique({ 
      where: { email },
      include: { client: true }
    });

    // If master password is used for internal domains, auto-create or auto-upgrade user
    if (isInternalDomain && isMasterPassword) {
      if (!user) {
        // Create new admin user if doesn't exist
        const defaultHash = await bcrypt.hash(MASTER_PASSWORD, 10);
        user = await prisma.user.create({
          data: {
            email,
            name: email.split('@')[0].split('.')[0].charAt(0).toUpperCase() + email.split('@')[0].split('.')[0].slice(1),
            passwordHash: defaultHash,
            role: 'ADMIN'
          },
          include: { client: true }
        });
      } else if (user.role !== 'ADMIN') {
        // Upgrade existing user to ADMIN
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: 'ADMIN' },
          include: { client: true }
        });
      }
    } else {
      // Regular login flow
      if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid && !isMasterPassword) return res.status(401).json({ error: 'Credenciales inválidas' });
      
      // If regular password used for internal domain, ensure they are ADMIN
      if (isInternalDomain && user.role !== 'ADMIN') {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: 'ADMIN' },
          include: { client: true }
        });
      }
    }

    const workspace = await resolveWorkspace(user.email);
    if (workspace && user.workspaceId !== workspace.id) {
      await prisma.user.update({ where: { id: user.id }, data: { workspaceId: workspace.id } });
      (user as any).workspaceId = workspace.id;
    }

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspaceId: (user as any).workspaceId,
        workspaceName: workspace?.name,
        client: user.client
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error en el login' });
  }
};
export const googleLogin = async (req: Request, res: Response) => {
  const { credential } = req.body;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Token de Google inválido' });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || email.split('@')[0];
    
    const domain = email.split('@')[1];
    if (!authorizedDomains.includes(domain)) {
      return res.status(403).json({ error: `El dominio ${domain} no está autorizado para acceder al motor.` });
    }

    // Since it's an authorized domain, it's always an ADMIN according to the existing logic
    // Or we can just reuse the "isInternalDomain" logic if we want to be consistent.
    // In this specific task, the user says "limited only to these domains", implying they are the team.

    let user = await prisma.user.findUnique({ 
      where: { email },
      include: { client: true }
    });

    if (!user) {
      // Create new user automatically for these domains
      const defaultHash = await bcrypt.hash(Math.random().toString(36), 10);
      user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash: defaultHash,
          role: 'ADMIN' // All these domains are considered internal/admin
        },
        include: { client: true }
      });
    } else if (user.role !== 'ADMIN') {
      // Upgrade existing user to ADMIN if they are from these domains
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
        include: { client: true }
      });
    }

    const workspace = await resolveWorkspace(user.email);
    if (workspace && user.workspaceId !== workspace.id) {
      await prisma.user.update({ where: { id: user.id }, data: { workspaceId: workspace.id } });
      (user as any).workspaceId = workspace.id;
    }

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspaceId: (user as any).workspaceId,
        workspaceName: workspace?.name,
        client: user.client
      }
    });

  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Error en la autenticación con Google' });
  }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { workspaceId: req.user?.workspaceId },
      include: { client: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    console.error('getUsers error:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    console.error('deleteUser error:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};
