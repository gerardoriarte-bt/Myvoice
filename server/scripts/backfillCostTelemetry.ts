/**
 * Backfill de telemetría de costo: saca lo que ya está enterrado en
 * `GenerationLog.outputJson.usage` y lo materializa en las columnas nuevas.
 *
 *   npm run backfill:telemetria            → dry-run, no escribe nada
 *   npm run backfill:telemetria -- --apply → escribe, en una sola transacción
 *
 * Correr DESPUÉS de la migración 20260827000000_cost_quota_slot.
 *
 * Lo que el script NO hace, a propósito:
 *
 *   · No inventa `model` ni `provider`: no están en outputJson y no son
 *     recuperables. Sustituirlos por el modelo de hoy produciría números
 *     plausibles y falsos — el mismo criterio de computeCost, donde un hueco
 *     visible es preferible a una tarifa ajena. Quedan en NULL.
 *   · Tampoco `durationMs`, por lo mismo.
 *   · Las filas sin `usage` en el JSON (anteriores a services/pricing.ts) se
 *     cuentan aparte y se dejan en NULL: NULL significa "no se sabe", no
 *     "costó cero".
 */

import { PrismaClient } from '@prisma/client';
import { Reporte } from './lib/reporte.js';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const reporte = new Reporte('backfill-telemetria', APPLY);

interface UsageEnJson {
  promptTokens?: number;
  cachedTokens?: number;
  cacheWriteTokens?: number;
  completionTokens?: number;
  costUsd?: number;
  costEstimated?: boolean;
  byStage?: Record<string, { tokens: number; costUsd: number }>;
}

interface Recuperable {
  id: string;
  clientId: string;
  createdAt: Date;
  costUsd: number;
  cachedTokens: number;
  cacheWriteTokens: number;
  costEstimated: boolean;
  stageBreakdown: Record<string, { tokens: number; costUsd: number }> | null;
  /** Solo si la columna está hoy en NULL: el dato ya persistido manda. */
  promptTokens?: number;
  completionTokens?: number;
}

async function main() {
  const filas = await prisma.generationLog.findMany({
    where: { costUsd: null },
    select: {
      id: true,
      clientId: true,
      createdAt: true,
      outputJson: true,
      promptTokens: true,
      completionTokens: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const recuperables: Recuperable[] = [];
  const sinUsage: { id: string; createdAt: Date }[] = [];
  const sinOutput: { id: string; createdAt: Date }[] = [];

  for (const fila of filas) {
    const output = fila.outputJson as any;
    if (!output || typeof output !== 'object') {
      sinOutput.push({ id: fila.id, createdAt: fila.createdAt });
      continue;
    }
    const usage = output.usage as UsageEnJson | undefined;
    if (!usage || typeof usage !== 'object' || typeof usage.costUsd !== 'number') {
      sinUsage.push({ id: fila.id, createdAt: fila.createdAt });
      continue;
    }

    recuperables.push({
      id: fila.id,
      clientId: fila.clientId,
      createdAt: fila.createdAt,
      costUsd: usage.costUsd,
      cachedTokens: usage.cachedTokens ?? 0,
      cacheWriteTokens: usage.cacheWriteTokens ?? 0,
      costEstimated: usage.costEstimated ?? true,
      stageBreakdown: usage.byStage ?? null,
      ...(fila.promptTokens == null && typeof usage.promptTokens === 'number'
        ? { promptTokens: usage.promptTokens }
        : {}),
      ...(fila.completionTokens == null && typeof usage.completionTokens === 'number'
        ? { completionTokens: usage.completionTokens }
        : {}),
    });
  }

  // La migración rellena workspaceId en todas las filas; si acá aparece alguna
  // en NULL es que algo se escribió sin él, no un pendiente del backfill.
  const sinWorkspace = await prisma.generationLog.count({ where: { workspaceId: null } });

  const costoTotal = recuperables.reduce((suma, r) => suma + r.costUsd, 0);

  // ---- reporte ---------------------------------------------------------
  console.log(`\n${APPLY ? '=== APLICANDO ===' : '=== DRY-RUN (nada se escribe) ==='}\n`);
  console.log(`Filas con costUsd en NULL: ${filas.length}`);
  console.log(`  · recuperables (tienen outputJson.usage): ${recuperables.length}`);
  console.log(`  · sin usage en el JSON (previas a pricing.ts): ${sinUsage.length}`);
  console.log(`  · con outputJson nulo o no-objeto: ${sinOutput.length}`);
  console.log(`\nCosto a materializar: USD ${costoTotal.toFixed(6)}`);

  const conStage = recuperables.filter(r => r.stageBreakdown).length;
  const conTokens = recuperables.filter(r => r.promptTokens != null || r.completionTokens != null).length;
  console.log(`Filas con desglose por etapa: ${conStage}`);
  console.log(`Filas a las que además se les completan tokens: ${conTokens}`);

  reporte
    .leidas('GenerationLog (costUsd NULL)', filas.length)
    .planea('GenerationLog.telemetria', recuperables.length)
    .planea('GenerationLog.tokens', conTokens)
    .saltea('sin usage en outputJson (previas a pricing.ts)', sinUsage.length)
    .saltea('outputJson nulo o no-objeto', sinOutput.length);

  console.log(`\nMuestra (primeras ${Math.min(10, recuperables.length)}):`);
  for (const r of recuperables.slice(0, 10)) {
    const fecha = r.createdAt.toISOString().slice(0, 10);
    const etapas = r.stageBreakdown ? Object.keys(r.stageBreakdown).length : 0;
    console.log(
      `  · ${fecha}  USD ${r.costUsd.toFixed(6)}  cache ${r.cachedTokens}  etapas ${etapas}` +
      `${r.costEstimated ? '  (estimado)' : ''}`
    );
  }

  if (sinWorkspace > 0) {
    const aviso =
      `${sinWorkspace} filas de GenerationLog con workspaceId en NULL. Debería ser 0: ` +
      `lo rellena la migración 20260827000000_cost_quota_slot. Revisar antes de ponerle NOT NULL.`;
    console.log(`\n⚠  ${aviso}`);
    reporte.advierte(aviso);
  }

  if (!APPLY) {
    console.log('\nNada se escribió. Volvé a correr con --apply para aplicarlo.');
    reporte.cierra();
    return;
  }

  // ---- aplicar ---------------------------------------------------------
  await prisma.$transaction(
    async tx => {
      for (const r of recuperables) {
        await tx.generationLog.update({
          where: { id: r.id },
          data: {
            costUsd: r.costUsd,
            cachedTokens: r.cachedTokens,
            cacheWriteTokens: r.cacheWriteTokens,
            costEstimated: r.costEstimated,
            stageBreakdown: (r.stageBreakdown ?? undefined) as any,
            ...(r.promptTokens != null ? { promptTokens: r.promptTokens } : {}),
            ...(r.completionTokens != null ? { completionTokens: r.completionTokens } : {}),
          },
        });
      }
    },
    { timeout: 120_000 }
  );

  reporte
    .escribio('GenerationLog.telemetria', recuperables.length)
    .escribio('GenerationLog.tokens', conTokens);

  console.log(`\n✓ Backfill aplicado sobre ${recuperables.length} filas. ` +
    `Las ${sinUsage.length + sinOutput.length} restantes quedan en NULL: no hay dato de dónde sacarlo.`);
  reporte.cierra();
}

main()
  .catch(err => {
    console.error('\nBackfill abortado — no se escribió nada:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
