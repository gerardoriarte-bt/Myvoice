/**
 * La bandeja.
 *
 * No hay ningún handler que reciba un `userId`: los tres trabajan siempre
 * sobre `req.tenant.userId`. Es lo que hace imposible pedir la bandeja de otro
 * —no hay parámetro donde pedirla— en vez de depender de una comprobación que
 * alguien puede olvidar en el handler siguiente.
 */

import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import * as notificaciones from '../services/notificacionService.js';

export const listar = async (req: AuthRequest, res: Response) => {
  try {
    const limite = Number(req.query.limite ?? 30);
    res.json(await notificaciones.listar(req.tenant!, Number.isFinite(limite) ? limite : 30));
  } catch (error) {
    handleTenantError(error, res, 'Error al cargar tus avisos');
  }
};

export const marcarLeida = async (req: AuthRequest, res: Response) => {
  try {
    res.json(await notificaciones.marcarLeida(req.tenant!, String(req.params.id)));
  } catch (error) {
    handleTenantError(error, res, 'Error al marcar el aviso');
  }
};

export const marcarTodasLeidas = async (req: AuthRequest, res: Response) => {
  try {
    res.json(await notificaciones.marcarTodasLeidas(req.tenant!));
  } catch (error) {
    handleTenantError(error, res, 'Error al marcar los avisos');
  }
};
