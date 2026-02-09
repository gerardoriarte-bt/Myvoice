
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'Lobueno2025*';
const ADMIN_DOMAINS = ['lobueno.co', 'buentipo.com'];

export const register = async (req: Request, res: Response) => {
  const { email, password, name, role, clientId } = req.body;
  
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'El usuario ya existe' });

    const isInternalDomain = ADMIN_DOMAINS.some(domain => email.endsWith(`@${domain}`));
    const finalRole = isInternalDomain ? 'ADMIN' : (role || 'CLIENT');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: finalRole,
        clientId: isInternalDomain ? null : clientId
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
    const isInternalDomain = ADMIN_DOMAINS.some(domain => email.endsWith(`@${domain}`));
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

    const token = jwt.sign(
      { userId: user.id, role: user.role, clientId: user.clientId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        client: user.client
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error en el login' });
  }
};
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
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
