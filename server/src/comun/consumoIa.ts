import { prisma } from '../lib/prisma.js';
import type { UsageEntry } from '../services/pricing.js';

/**
 * Registra lo que costó una llamada a la IA fuera del motor de copy y de la auditoría (2026-11-25): la entrevista, la
 * extracción del manual, la mejora del ADN desde un texto y el Voice Fingerprint. Desde 2026-11-26 también «Refinar» y
 * lo gastado por una generación que falló antes de terminar, cargados a su campaña (`projectId`) cuando la hay. Sin esto Control mostraba un gasto del mes más bajo que el real. Nunca falla la operación que
 * lo pidió: si no se puede registrar, se avisa en el log.
 */
export const registrarConsumo = async (datos: {
  workspaceId: string;
  clientId?: string | null;
  etapa: 'asistente-adn' | 'extraccion-pdf' | 'mejora-adn' | 'fingerprint' | 'refinar' | 'generacion-fallida';
  uso: UsageEntry | null;
  autorId?: string | null;
  projectId?: string | null;
}) => {
  if (!datos.uso || (!datos.uso.promptTokens && !datos.uso.completionTokens)) return;
  await prisma.consumoIa
    .create({
      data: {
        workspaceId: datos.workspaceId,
        clientId: datos.clientId ?? null,
        etapa: datos.etapa,
        model: datos.uso.model,
        promptTokens: datos.uso.promptTokens,
        completionTokens: datos.uso.completionTokens,
        cachedTokens: datos.uso.cachedTokens,
        costUsd: datos.uso.costUsd,
        autorId: datos.autorId ?? null,
        projectId: datos.projectId ?? null,
      },
    })
    .catch(err => console.warn(`[consumo] no se pudo registrar ${datos.etapa}: ${err?.message}`));
};

/** Junta varias llamadas en un solo registro (los lotes de «Refinar», las etapas de una generación que falló). */
export const unirUsos = (usos: UsageEntry[], etapa: string): UsageEntry | null =>
  usos.length
    ? usos.reduce(
        (t, u) => ({
          ...t,
          promptTokens: t.promptTokens + u.promptTokens,
          cachedTokens: t.cachedTokens + u.cachedTokens,
          cacheWriteTokens: t.cacheWriteTokens + u.cacheWriteTokens,
          completionTokens: t.completionTokens + u.completionTokens,
          costUsd: t.costUsd + u.costUsd,
          costEstimated: t.costEstimated || u.costEstimated,
        }),
        { model: usos[0].model, stage: etapa, promptTokens: 0, cachedTokens: 0, cacheWriteTokens: 0, completionTokens: 0, costUsd: 0, costEstimated: false }
      )
    : null;
