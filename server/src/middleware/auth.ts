
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    clientId?: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

export const authorizeRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({ error: 'Acceso denegado: no autenticado' });
    }

    // Map frontend roles to backend roles if necessary
    const normalizedRoles = roles.map(r => r.toUpperCase());
    const userRole = req.user.role.toUpperCase();

    if (!normalizedRoles.includes(userRole)) {
      console.warn(`Access denied for user ${req.user.userId}. Required: ${roles}, Has: ${req.user.role}`);
      return res.status(403).json({ error: 'Acceso denegado: permiso insuficiente' });
    }
    next();
  };
};
