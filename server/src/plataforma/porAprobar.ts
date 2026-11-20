/**
 * «Por aprobar» (decisión 30, 2026-11-20): todo lo que espera la decisión de quien mira, en un solo lugar y
 * sin depender de los avisos. Las aprobaciones tienen que estar a la vista: si alguien se suma como
 * aprobador por urgencia, no tiene que haber recibido una notificación para encontrar qué decidir.
 *
 * Es de la plataforma porque junta los tres módulos; cada uno dice lo suyo con su propia regla.
 */

import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { sabanasPorAprobarDe } from '../cdm/planning/planningService.js';
import { copyPorAprobarDe } from '../services/aprobacion.js';
import { piezasPorDecidirDe } from '../services/piezaService.js';

export const porAprobar = async (req: AuthRequest, res: Response) => {
  try {
    const tenant = req.tenant!;
    const [sabanas, copy, piezas] = await Promise.all([sabanasPorAprobarDe(tenant), copyPorAprobarDe(tenant), piezasPorDecidirDe(tenant)]);
    res.json({ sabanas, copy, piezas, total: sabanas.length + copy.reduce((t, c) => t + c.cantidad, 0) + piezas.length });
  } catch (error) {
    handleTenantError(error, res, 'Error al leer lo que espera tu aprobación');
  }
};
