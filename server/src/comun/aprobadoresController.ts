import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import * as aprobadores from './aprobadores.js';

/** Los aprobadores de una campaña (decisión 30): el responsable y los sumados. */
export const listar = async (req: AuthRequest, res: Response) => {
  try {
    res.json(await aprobadores.listarAprobadores(req.tenant!, req.params.id));
  } catch (error) {
    handleTenantError(error, res, 'Error al leer los aprobadores');
  }
};

export const sumar = async (req: AuthRequest, res: Response) => {
  try {
    res.json(await aprobadores.sumarAprobador(req.tenant!, req.params.id, req.body?.userId));
  } catch (error) {
    handleTenantError(error, res, 'Error al sumar el aprobador');
  }
};

export const quitar = async (req: AuthRequest, res: Response) => {
  try {
    res.json(await aprobadores.quitarAprobador(req.tenant!, req.params.id, req.params.userId));
  } catch (error) {
    handleTenantError(error, res, 'Error al quitar el aprobador');
  }
};
