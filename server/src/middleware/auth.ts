import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { WorkspaceRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { TenantContext, canManage } from '../lib/tenancy.js';

// Sin fallback a propósito. Con un secreto conocido cualquiera puede firmar un
// token con el workspace y el rol que quiera, y todo el aislamiento se cae.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('[MyVoice] JWT_SECRET no está definido. El proceso no puede arrancar sin él.');
}

export interface AuthRequest extends Request {
  /** Lo que venía firmado en el token. Nunca se usa para autorizar por sí solo. */
  auth?: { userId: string; workspaceId?: string | null };
  /** Contexto verificado contra la tabla Membership. Esto sí autoriza. */
  tenant?: TenantContext;
  /**
   * Compatibilidad con los handlers que leen `req.user`. Se llena desde
   * `tenant`, no desde el token: `workspaceId` y `role` siempre salen de la
   * membresía verificada en esta misma request.
   */
  user?: { userId: string; workspaceId: string; role: WorkspaceRole };
}

export interface TokenPayload {
  userId: string;
  /** Workspace activo de la sesión. Es una preferencia, no un permiso. */
  workspaceId?: string | null;
}

export const signToken = (payload: TokenPayload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (!decoded?.userId) return res.status(401).json({ error: 'Token inválido' });
    req.auth = { userId: decoded.userId, workspaceId: decoded.workspaceId ?? null };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

/**
 * Resuelve el workspace activo contra la tabla Membership en CADA request.
 *
 * Se consulta la base en vez de confiar en el token por dos razones: revocar
 * una membresía tiene efecto inmediato en vez de esperar 24 h a que expire el
 * token, y un `workspaceId` viejo o manipulado en el payload no sirve de nada
 * si no existe la fila que lo respalda.
 */
export const requireWorkspace = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const auth = req.auth;
  if (!auth) return res.status(401).json({ error: 'No autenticado' });

  try {
    const membership = auth.workspaceId
      ? await prisma.membership.findUnique({
          where: { userId_workspaceId: { userId: auth.userId, workspaceId: auth.workspaceId } },
        })
      : await prisma.membership.findFirst({
          where: { userId: auth.userId },
          orderBy: { createdAt: 'asc' },
        });

    if (!membership) {
      return res.status(403).json({
        error: 'No tenés acceso a este workspace. Pedí una invitación a un administrador.',
      });
    }

    const tenant: TenantContext = {
      userId: auth.userId,
      workspaceId: membership.workspaceId,
      role: membership.role,
    };
    req.tenant = tenant;
    req.user = tenant;
    next();
  } catch (error) {
    console.error('requireWorkspace error:', error);
    return res.status(500).json({ error: 'Error al resolver el workspace' });
  }
};

/** Gestión del workspace: marcas, briefs, miembros, configuración. */
export const requireManager = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.tenant) return res.status(401).json({ error: 'No autenticado' });
  if (!canManage(req.tenant.role)) {
    return res.status(403).json({ error: 'Necesitás rol de administrador en este workspace' });
  }
  next();
};

/** Traduce TenantError a su status. Cualquier otro error es 500. */
export const handleTenantError = (error: any, res: Response, fallbackMessage: string) => {
  if (error?.statusCode) return res.status(error.statusCode).json({ error: error.message });
  console.error(`${fallbackMessage}:`, error);
  return res.status(500).json({ error: fallbackMessage });
};
