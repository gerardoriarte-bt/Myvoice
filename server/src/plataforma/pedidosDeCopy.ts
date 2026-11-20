/**
 * F4: los pedidos de copy que llegan de CDM, por campaña y estado (Copywriting › Pedidos). Junta lo que dice
 * CDM (las líneas de las sábanas aprobadas) con lo que dice My Voice (el copy escrito y aprobado de cada una),
 * por eso vive en la plataforma.
 *
 * El estado de un pedido se calcula al leer, nunca se guarda:
 * - POR_ESCRIBIR: faltan piezas por escribir.
 * - EN_APROBACION: están todas escritas y falta aprobar alguna.
 * - LISTO: todas sus piezas están aprobadas.
 */

import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { assertClientInWorkspace } from '../lib/tenancy.js';
import { pedidosDeCopy } from '../cdm/planning/planningService.js';
import { avanceDeLineas } from '../myvoice/pedidosDeCopy.js';

const estadoDe = (piezas: number, escritas: number, aprobadas: number) =>
  aprobadas >= piezas ? 'LISTO' : escritas >= piezas ? 'EN_APROBACION' : 'POR_ESCRIBIR';

export const pedidos = async (req: AuthRequest, res: Response) => {
  try {
    const tenant = req.tenant!;
    const clientId = String(req.query.clientId ?? '');
    await assertClientInWorkspace(tenant, clientId);
    const campanas = await pedidosDeCopy(tenant, clientId);
    const avance = await avanceDeLineas(tenant, campanas.flatMap(c => c.lineas.map(l => l.id)));
    res.json(
      campanas.map(c => ({
        ...c,
        lineas: c.lineas.map(l => {
          const a = avance.get(l.id) ?? { escritas: 0, aprobadas: 0 };
          return { ...l, ...a, estado: estadoDe(l.piezas, a.escritas, a.aprobadas) };
        }),
      }))
    );
  } catch (error) {
    handleTenantError(error, res, 'Error al leer los pedidos de copy');
  }
};
