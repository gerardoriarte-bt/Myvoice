import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../../middleware/auth.js';
import { assertClientInWorkspace } from '../../lib/tenancy.js';
import * as planning from './planningService.js';

/** Las rutas del planning (F3). Las reglas viven en `planningService.ts`. */

export const listar = async (req: AuthRequest, res: Response) => {
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : '';
  try {
    await assertClientInWorkspace(req.tenant!, clientId);
    res.json(await planning.listarPlannings(req.tenant!, clientId));
  } catch (error) {
    handleTenantError(error, res, 'Error al leer los plannings');
  }
};

export const crear = async (req: AuthRequest, res: Response) => {
  try {
    res.status(201).json(await planning.crearPlanning(req.tenant!, req.body ?? {}));
  } catch (error) {
    // Si la campaña ya tiene su planning, se dice cuál: la pantalla lo abre en vez de crear otro.
    const existente = (error as { planningId?: string })?.planningId;
    if (existente) return res.status(409).json({ error: (error as Error).message, planningId: existente });
    handleTenantError(error, res, 'Error al crear el planning');
  }
};

export const detalle = async (req: AuthRequest, res: Response) => {
  try {
    res.json(await planning.detallePlanning(req.tenant!, req.params.id));
  } catch (error) {
    handleTenantError(error, res, 'Error al leer el planning');
  }
};

/** Cada escritura devuelve el planning como quedó: la pantalla no adivina el estado. */
const yDevolver = (accion: (req: AuthRequest) => Promise<unknown>, mensaje: string) => async (req: AuthRequest, res: Response) => {
  try {
    await accion(req);
    res.json(await planning.detallePlanning(req.tenant!, req.params.id));
  } catch (error) {
    handleTenantError(error, res, mensaje);
  }
};

export const actualizar = yDevolver(req => planning.actualizarPlanning(req.tenant!, req.params.id, req.body ?? {}), 'Error al guardar el planning');
export const lineas = yDevolver(req => planning.guardarLineas(req.tenant!, req.params.id, req.body?.lineas), 'Error al guardar la sábana');
export const enviar = yDevolver(req => planning.enviarPlanning(req.tenant!, req.params.id), 'Error al enviar el planning');
export const aprobar = yDevolver(req => planning.decidirPlanning(req.tenant!, req.params.id, 'aprobar', req.body?.comentario), 'Error al aprobar');
export const devolver = yDevolver(req => planning.decidirPlanning(req.tenant!, req.params.id, 'devolver', req.body?.comentario), 'Error al devolver');
export const ubicaciones = yDevolver(
  req => planning.elegirUbicaciones(req.tenant!, req.params.id, req.params.lineaId, req.body?.ubicacionIds),
  'Error al elegir las ubicaciones'
);
/** El enlace para el cliente: lo devuelve tal cual, para copiarlo. */
export const enlace = async (req: AuthRequest, res: Response) => {
  try {
    res.json(await planning.enlaceParaElCliente(req.tenant!, req.params.id));
  } catch (error) {
    handleTenantError(error, res, 'Error al crear el enlace para el cliente');
  }
};
/** P6: destino y UTM de una línea, sin versión nueva (F5). */
export const destino = async (req: AuthRequest, res: Response) => {
  try {
    res.json(await planning.guardarDestinoDeLinea(req.tenant!, req.params.id, req.params.lineaId, req.body ?? {}));
  } catch (error) {
    handleTenantError(error, res, 'Error al guardar el destino');
  }
};
export const reabrir = yDevolver(req => planning.reabrirPlanning(req.tenant!, req.params.id), 'Error al reabrir el planning');
