import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { assertClientInWorkspace, assertProjectInWorkspace } from '../lib/tenancy.js';
import { campanasEnProceso, procesoDeCampana } from './proceso.js';

/**
 * Cómo va una campaña en los pasos del encabezado (F0). `?campana=` es opcional: sin ella los pasos solo
 * navegan. Una campaña de otra marca —aunque sea del mismo workspace— responde 404, como una ajena.
 */
export const getProceso = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const campanaId = typeof req.query.campana === 'string' && req.query.campana ? req.query.campana : null;
  try {
    await assertClientInWorkspace(req.tenant!, id);
    if (campanaId) {
      const campana = await assertProjectInWorkspace(req.tenant!, campanaId);
      if (campana.clientId !== id) return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    res.json(await procesoDeCampana(id, campanaId));
  } catch (error) {
    handleTenantError(error, res, 'Error al calcular el proceso de la campaña');
  }
};

/** Las campañas de la marca con el paso en que va cada una: alimenta el selector de campaña del encabezado. */
export const getCampanasEnProceso = async (req: AuthRequest, res: Response) => {
  try {
    await assertClientInWorkspace(req.tenant!, req.params.id);
    res.json(await campanasEnProceso(req.tenant!.workspaceId, req.params.id));
  } catch (error) {
    handleTenantError(error, res, 'Error al leer las campañas de la marca');
  }
};

/**
 * El Panorama (decisión 24): las campañas de todas las marcas del workspace, en qué paso va cada una y qué
 * espera a quién. Es la entrada de quien administra; las que terminaron todos los pasos no aparecen.
 */
export const getPanorama = async (req: AuthRequest, res: Response) => {
  try {
    const campanas = await campanasEnProceso(req.tenant!.workspaceId);
    res.json(campanas.filter(c => c.enCurso));
  } catch (error) {
    handleTenantError(error, res, 'Error al armar el Panorama');
  }
};
