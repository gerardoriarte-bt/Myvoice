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

/**
 * El copy de una campaña para el encabezado (③ y ④): qué textos tiene y cuáles están aprobados. Lo dice My Voice
 * sobre su propia tabla; la plataforma y Producción no la leen directo.
 */
export const copyDeCampana = async (campanaId: string) =>
  prisma.savedVariation.findMany({ where: { projectId: campanaId }, select: { id: true, isApproved: true } });

/**
 * Lo que My Voice necesita saber de la línea de un pedido al guardar copy: de qué campaña es, si su sábana sigue
 * aprobada y qué canal la escribe. La línea es de CDM, y My Voice no importa CDM: la plataforma registra al
 * arrancar la función que lo responde (`routes/index.ts`). Sin registrar, ningún pedido es válido.
 */
export type LineaDePedido = { campanaId: string; aprobada: boolean; canal: string | null };
type BuscarLinea = (tenant: TenantContext, lineaId: string) => Promise<LineaDePedido | null>;
let buscarLinea: BuscarLinea = async () => null;
export const registrarLineasDePedido = (fn: BuscarLinea) => {
  buscarLinea = fn;
};
export const lineaDePedido = (tenant: TenantContext, lineaId: string) => buscarLinea(tenant, lineaId);
