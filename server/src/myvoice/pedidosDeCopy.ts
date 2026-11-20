/**
 * F4: cuánto copy hay escrito y aprobado para cada pedido (cada línea de una sábana de CDM). Una pieza es un
 * `conjuntoId`: está escrita si hay copy guardado con ese conjunto para la línea, y aprobada si todos sus
 * textos lo están.
 */

import { prisma } from '../lib/prisma.js';
import { TenantContext } from '../lib/tenancy.js';

export const avanceDeLineas = async (tenant: TenantContext, lineaIds: string[]) => {
  const avance = new Map<string, { escritas: number; aprobadas: number }>();
  if (!lineaIds.length) return avance;
  const textos = await prisma.savedVariation.findMany({
    where: { lineaDePlanningId: { in: lineaIds }, client: { workspaceId: tenant.workspaceId } },
    select: { id: true, lineaDePlanningId: true, conjuntoId: true, isApproved: true },
  });
  const piezas = new Map<string, Map<string, boolean>>();
  for (const t of textos) {
    const porLinea = piezas.get(t.lineaDePlanningId!) ?? new Map<string, boolean>();
    // Copy viejo sin conjunto: cada texto cuenta como su propia pieza.
    const pieza = t.conjuntoId ?? t.id;
    porLinea.set(pieza, (porLinea.get(pieza) ?? true) && t.isApproved);
    piezas.set(t.lineaDePlanningId!, porLinea);
  }
  for (const [linea, porPieza] of piezas) {
    avance.set(linea, { escritas: porPieza.size, aprobadas: [...porPieza.values()].filter(Boolean).length });
  }
  return avance;
};
