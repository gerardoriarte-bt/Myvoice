import { prisma } from '../lib/prisma.js';
import type { UsageEntry } from '../services/pricing.js';

/**
 * Registra lo que costó una llamada a la IA fuera del motor de copy y de la auditoría (2026-11-25): la entrevista, la
 * extracción del manual, la mejora del ADN desde un texto y el Voice Fingerprint. Sin esto Control mostraba un gasto del mes más bajo que el real. Nunca falla la operación que
 * lo pidió: si no se puede registrar, se avisa en el log.
 */
export const registrarConsumo = async (datos: {
  workspaceId: string;
  clientId?: string | null;
  etapa: 'asistente-adn' | 'extraccion-pdf' | 'mejora-adn' | 'fingerprint';
  uso: UsageEntry | null;
  autorId?: string | null;
}) => {
  if (!datos.uso) return;
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
      },
    })
    .catch(err => console.warn(`[consumo] no se pudo registrar ${datos.etapa}: ${err?.message}`));
};
