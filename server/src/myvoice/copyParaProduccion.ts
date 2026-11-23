/**
 * El copy de My Voice para Producción (2026-11-23): lo único por donde Producción lee o toca el copy. Antes
 * `piezaService` consultaba y actualizaba la tabla de My Voice con `prisma`, una deuda del contrato que la regla de
 * imports no veía (docs/ecosistema/tecnico/spec-plataforma.md § 2.1). Producción puede depender de My Voice, que
 * viene antes en el proceso; al revés, nunca.
 */

import { ModoAprobacion, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { TenantContext } from '../lib/tenancy.js';

/** El texto original de cada copy, para comparar con lo congelado en la pieza («el copy cambió»). */
export const copyOriginal = async (ids: string[]) => {
  const unicos = [...new Set(ids)];
  if (!unicos.length) return new Map<string, { id: string; content: string; isApproved: boolean; platform: string }>();
  const filas = await prisma.savedVariation.findMany({
    where: { id: { in: unicos } },
    select: { id: true, content: true, isApproved: true, platform: true },
  });
  return new Map(filas.map(f => [f.id, f]));
};

/** El copy elegido para proponer piezas, con su campaña, en el orden en que se guardó. Solo del workspace. */
export const copyParaProponer = (tenant: TenantContext, ids: string[]) =>
  prisma.savedVariation.findMany({
    where: { id: { in: ids }, client: { workspaceId: tenant.workspaceId } },
    include: { project: { select: { id: true, name: true, responsableId: true } } },
    orderBy: { savedAt: 'asc' },
  });

/** El copy con que se crean las piezas, con el responsable de su campaña. Solo del workspace. */
export const copyParaCrear = (tenant: TenantContext, ids: string[]) =>
  prisma.savedVariation.findMany({
    where: { id: { in: ids }, client: { workspaceId: tenant.workspaceId } },
    include: { project: { select: { responsableId: true } } },
  });

/** El texto actual de cada copy, dentro de la transacción de quien lo pide (recongelar una pieza). */
export const textoActual = async (tx: Prisma.TransactionClient, ids: string[]) =>
  new Map(
    (await tx.savedVariation.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, content: true } })).map(
      f => [f.id, f.content]
    )
  );

/**
 * El responsable corrige el copy dentro de la pieza (`corregir-copy`): el texto nuevo queda en el copy y queda
 * aprobado por él, en la transacción de Producción.
 */
export const corregirCopyAprobado = (tx: Prisma.TransactionClient, id: string, texto: string, quien: { id: string; nombre: string | null }) =>
  tx.savedVariation.update({
    where: { id },
    data: {
      content: texto,
      charCount: texto.length,
      isApproved: true,
      aprobadoPorId: quien.id,
      aprobadoPorNombre: quien.nombre,
      aprobadoEn: new Date(),
      aprobadoVia: ModoAprobacion.INTERNA,
    },
  });

/** F5: de cada copy, de qué línea de la sábana salió y quién lo aprobó y cómo (para Implementación, por contrato). */
export const copyParaImplementar = async (ids: string[]) => {
  const unicos = [...new Set(ids)];
  if (!unicos.length) return new Map<string, { lineaDePlanningId: string | null; aprobadoPor: string | null; aprobadoEn: Date | null; via: string | null }>();
  const filas = await prisma.savedVariation.findMany({
    where: { id: { in: unicos } },
    select: { id: true, lineaDePlanningId: true, aprobadoPorNombre: true, aprobadoEn: true, aprobadoVia: true },
  });
  return new Map(filas.map(f => [f.id, { lineaDePlanningId: f.lineaDePlanningId, aprobadoPor: f.aprobadoPorNombre, aprobadoEn: f.aprobadoEn, via: f.aprobadoVia }]));
};
