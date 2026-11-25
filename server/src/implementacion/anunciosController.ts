import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { assertClientInWorkspace } from '../lib/tenancy.js';
import * as anuncios from './anuncios.js';

/** F5: los anuncios de una marca (piezas listas) con lo que les falta. */
export const listar = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = String(req.query.clientId ?? '');
    await assertClientInWorkspace(req.tenant!, clientId);
    res.json(await anuncios.anunciosDeMarca(req.tenant!, clientId));
  } catch (error) {
    handleTenantError(error, res, 'Error al leer los anuncios');
  }
};

const accion =
  (hacer: (req: AuthRequest) => Promise<unknown>, mensaje: string) =>
  async (req: AuthRequest, res: Response) => {
    try {
      res.json(await hacer(req));
    } catch (error) {
      handleTenantError(error, res, mensaje);
    }
  };

export const montar = accion(req => anuncios.montar(req.tenant!, req.params.id, req.body ?? {}), 'Error al marcar el anuncio montado');
export const devolver = accion(req => anuncios.devolver(req.tenant!, req.params.id, req.body ?? {}), 'Error al devolver el anuncio');
export const reabrir = accion(req => anuncios.reabrir(req.tenant!, req.params.id), 'Error al volver el anuncio a por montar');
export const destino = accion(req => anuncios.guardarDestino(req.tenant!, req.params.id, req.body ?? {}), 'Error al guardar el destino');

/** La aprobación final: autorizar (campaña interna) o el enlace para el cliente (campaña con cliente). */
export const autorizar = accion(req => anuncios.autorizar(req.tenant!, req.body?.ids), 'Error al autorizar la implementación');
export const enlace = accion(req => anuncios.enlaceParaElCliente(req.tenant!, req.body?.campanaId), 'Error al crear el enlace para el cliente');

/** «Mi cola»: lo que le toca a quien mira, en todas las marcas con Implementación. */
export const miCola = accion(req => anuncios.miCola(req.tenant!), 'Error al leer tu cola');
