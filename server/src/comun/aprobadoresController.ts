import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import * as aprobadores from './aprobadores.js';

/** Quién aprueba una campaña: el responsable y quienes tienen Aprobación para la marca en Equipo. Solo lectura. */
export const listar = async (req: AuthRequest, res: Response) => {
  try {
    res.json(await aprobadores.listarAprobadores(req.tenant!, req.params.id));
  } catch (error) {
    handleTenantError(error, res, 'Error al leer los aprobadores');
  }
};
