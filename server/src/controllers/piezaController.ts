/**
 * Tablero de producción.
 *
 * El controller no decide nada: valida el borde y delega en `piezaService`,
 * donde viven la propuesta de alta (D7) y la máquina de estados (D5). Cada
 * handler que toca una pieza por id pasa antes por `assertPiezaInWorkspace`,
 * salvo los que llaman a una función del servicio que ya hace esa verificación
 * — en cuyo caso está anotado.
 *
 * Todas las rutas van con `requireWorkspace` y ninguna con `requireManager`:
 * el tablero es la primera pantalla de trabajo pensada para un MEMBER, que es
 * el rol que tiene un diseñador.
 */

import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { assertClientInWorkspace, assertPiezaInWorkspace } from '../lib/tenancy.js';
import * as piezas from '../services/piezaService.js';

const idsDelBody = (valor: unknown): string[] =>
  Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string' && !!v) : [];

/** El tablero, por marca: es el alcance de todo el producto. */
export const listarPorMarca = async (req: AuthRequest, res: Response) => {
  const clientId = String(req.query.clientId ?? '');
  try {
    await assertClientInWorkspace(req.tenant!, clientId);
    res.json(await piezas.listarPorMarca(req.tenant!, clientId));
  } catch (error) {
    handleTenantError(error, res, 'Error al cargar el tablero');
  }
};

/** Mis piezas: mismo dato, alcance por persona, cruzando las marcas. */
export const listarMias = async (req: AuthRequest, res: Response) => {
  try {
    res.json(await piezas.listarMias(req.tenant!));
  } catch (error) {
    handleTenantError(error, res, 'Error al cargar tus piezas');
  }
};

/** La orden de trabajo. `detalle` verifica el workspace y responde 404. */
export const detalle = async (req: AuthRequest, res: Response) => {
  try {
    res.json(await piezas.detalle(req.tenant!, req.params.id));
  } catch (error) {
    handleTenantError(error, res, 'Error al cargar la pieza');
  }
};

/**
 * La propuesta de D7. Es de solo lectura: no crea nada, y por eso puede
 * llamarse cada vez que cambia la selección.
 */
export const proponer = async (req: AuthRequest, res: Response) => {
  try {
    res.json(await piezas.proponerPiezas(req.tenant!, idsDelBody(req.body?.savedVariationIds)));
  } catch (error) {
    handleTenantError(error, res, 'Error al armar la propuesta');
  }
};

export const crear = async (req: AuthRequest, res: Response) => {
  try {
    const creadas = await piezas.crearPiezas(req.tenant!, req.body?.piezas);
    res.status(201).json(creadas);
  } catch (error) {
    handleTenantError(error, res, 'Error al crear las piezas');
  }
};

/**
 * Las seis acciones de la tabla de transiciones, en un solo handler: la acción
 * llega en la URL y el servicio decide si es legal desde el estado actual. Un
 * handler por acción repetiría seis veces la misma verificación.
 */
export const ejecutarAccion = async (req: AuthRequest, res: Response) => {
  const accion = req.params.accion as piezas.AccionPieza;
  try {
    if (!(accion in piezas.TRANSICIONES)) {
      res.status(404).json({ error: 'Acción desconocida' });
      return;
    }
    await assertPiezaInWorkspace(req.tenant!, req.params.id);
    const actualizada = await piezas.ejecutarAccion(req.tenant!, req.params.id, accion, {
      asignadaAId: req.body?.asignadaAId,
      enlace: req.body?.enlace,
      nota: req.body?.nota,
    });
    res.json(actualizada);
  } catch (error) {
    handleTenantError(error, res, 'Error al actualizar la pieza');
  }
};

/** Lo único editable a mano. El estado se mueve con acciones, no con un PATCH. */
export const renombrar = async (req: AuthRequest, res: Response) => {
  const titulo = typeof req.body?.titulo === 'string' ? req.body.titulo.trim() : '';
  try {
    await assertPiezaInWorkspace(req.tenant!, req.params.id);
    if (!titulo) {
      res.status(400).json({ error: 'El título no puede quedar vacío' });
      return;
    }
    res.json(await piezas.renombrar(req.tenant!, req.params.id, titulo));
  } catch (error) {
    handleTenantError(error, res, 'Error al renombrar la pieza');
  }
};
