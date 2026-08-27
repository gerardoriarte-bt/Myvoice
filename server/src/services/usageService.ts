/**
 * Cuota por periodo.
 *
 * Reemplaza el contador de por vida `Client.quotaUsed`, que se incrementaba
 * para siempre mientras el mensaje de error hablaba de un "límite mensual". El
 * consumo vive ahora en UsagePeriod, una fila por (marca, mes UTC), creada con
 * upsert perezoso en el primer uso: no hay cron ni job de reinicio, y un
 * periodo sin consumo simplemente no tiene fila.
 *
 * La cuota se mide en COSTO (con techo secundario en tokens), no en llamadas:
 * regenerar un canal suelto y generar catorce no pueden valer lo mismo.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { TenantContext, TenantError } from '../lib/tenancy.js';
import { resolvePlanLimits } from '../lib/planLimits.js';
import { UsageTotal } from './pricing.js';

/**
 * Modo observación. Cambiar la semántica de la cuota puede cortarle el servicio
 * a un cliente activo, así que arranca calculando y avisando sin bloquear: se
 * despliega así una semana, se revisan las filas acumuladas contra los límites
 * del plan, y recién ahí se pone `QUOTA_ENFORCE=true`.
 */
const ENFORCE = process.env.QUOTA_ENFORCE === 'true';

/** Medianoche UTC del día 1. Con `new Date(y, m, 1)` local, una zona negativa como la de Bogotá corre la fila un mes entero. */
export const currentPeriodStart = (now: Date = new Date()): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

export const nextPeriodStart = (periodStart: Date): Date =>
  new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1));

/** Prisma devuelve NUMERIC como Decimal; el borde de la app trabaja con number. */
const aNumero = (valor: Prisma.Decimal | number | string | null | undefined): number =>
  valor == null ? 0 : Number(valor.toString());

export interface CuotaMarca {
  costUsd: number;
  tokens: number;
  origen: 'plan' | 'override';
}

interface MarcaConCuota {
  id: string;
  name?: string;
  quotaCostUsdOverride?: Prisma.Decimal | number | null;
  quotaTokensOverride?: number | null;
}

/**
 * El límite del plan es el techo del WORKSPACE en el periodo; el override por
 * marca es un sub-límite dentro de ese techo, nunca una ampliación: una marca
 * con override generoso sigue cortándose cuando el workspace agota el plan.
 */
export const resolveQuota = (client: MarcaConCuota, workspacePlan?: string | null): CuotaMarca => {
  const plan = resolvePlanLimits(workspacePlan);
  const costOverride = client.quotaCostUsdOverride != null ? aNumero(client.quotaCostUsdOverride) : null;
  const tokensOverride = client.quotaTokensOverride ?? null;

  if (costOverride === null && tokensOverride === null) {
    return { costUsd: plan.costUsdPerPeriod, tokens: plan.tokensPerPeriod, origen: 'plan' };
  }
  return {
    costUsd: costOverride ?? plan.costUsdPerPeriod,
    tokens: tokensOverride ?? plan.tokensPerPeriod,
    origen: 'override',
  };
};

const fechaReinicio = (periodStart: Date) => nextPeriodStart(periodStart).toISOString().slice(0, 10);

/**
 * Se evalúa ANTES de generar, contra el consumo ya registrado; el costo real de
 * esta generación recién se conoce después. Una marca puede entonces pasarse por
 * el valor de exactamente una generación: es deliberado, porque un sistema de
 * reserva agrega un estado intermedio que habría que liberar en cada camino de
 * error, incluido el de la conexión SSE cortada.
 */
export const assertQuotaAvailable = async (tenant: TenantContext, client: MarcaConCuota): Promise<void> => {
  const periodStart = currentPeriodStart();
  const workspace = await prisma.workspace.findUnique({
    where: { id: tenant.workspaceId },
    select: { plan: true },
  });
  const plan = resolvePlanLimits(workspace?.plan);
  const limites = resolveQuota(client, workspace?.plan);

  const consumoWorkspace = await prisma.usagePeriod.aggregate({
    where: { workspaceId: tenant.workspaceId, periodStart },
    _sum: { costUsd: true, tokens: true },
  });
  const costoWorkspace = aNumero(consumoWorkspace._sum.costUsd);
  const tokensWorkspace = consumoWorkspace._sum.tokens ?? 0;

  let motivo: string | null = null;

  if (costoWorkspace >= plan.costUsdPerPeriod) {
    motivo = `el workspace consumió USD ${costoWorkspace.toFixed(2)} de USD ${plan.costUsdPerPeriod.toFixed(2)} del plan ${plan.label}`;
  } else if (tokensWorkspace >= plan.tokensPerPeriod) {
    motivo = `el workspace consumió ${tokensWorkspace} de ${plan.tokensPerPeriod} tokens del plan ${plan.label}`;
  } else if (limites.origen === 'override') {
    const fila = await prisma.usagePeriod.findUnique({
      where: { clientId_periodStart: { clientId: client.id, periodStart } },
      select: { costUsd: true, tokens: true },
    });
    const costoMarca = aNumero(fila?.costUsd);
    const tokensMarca = fila?.tokens ?? 0;
    if (costoMarca >= limites.costUsd) {
      motivo = `la marca consumió USD ${costoMarca.toFixed(2)} de USD ${limites.costUsd.toFixed(2)} asignados`;
    } else if (tokensMarca >= limites.tokens) {
      motivo = `la marca consumió ${tokensMarca} de ${limites.tokens} tokens asignados`;
    }
  }

  if (!motivo) return;

  const detalle = `${motivo}. El periodo se reinicia el ${fechaReinicio(periodStart)}.`;

  if (!ENFORCE) {
    console.warn(
      `[cuota] OBSERVACIÓN — marca ${client.name ?? client.id} (${client.id}) superó su cuota: ${detalle} ` +
      `No se bloquea porque QUOTA_ENFORCE no está en 'true'.`
    );
    return;
  }

  throw new TenantError(`CUOTA_AGOTADA: ${detalle}`, 403);
};

export interface ConsumoRegistrable {
  workspaceId: string;
  clientId: string;
  usage?: UsageTotal | null;
  /** Cuántas variaciones produjo la generación. Cero = no se cobra. */
  variationCount: number;
}

/**
 * Registra consumo COBRABLE, no gasto bruto: una generación en la que fallaron
 * todos los canales igual quemó tokens (la etapa director corre antes del
 * fan-out), pero no toca esta tabla. Ese gasto queda visible en GenerationLog;
 * la diferencia entre ambas es intencional.
 *
 * Se come su propio error, igual que el registro de telemetría: en la ruta SSE
 * corre después de `res.end()`, donde un throw termina en un `res.write` sobre
 * una respuesta ya cerrada. Se pierde ese consumo y queda el console.error.
 */
export const recordUsage = async ({ workspaceId, clientId, usage, variationCount }: ConsumoRegistrable): Promise<void> => {
  if (variationCount <= 0) return;

  const periodStart = currentPeriodStart();
  const costUsd = usage?.costUsd ?? 0;
  const tokens = (usage?.promptTokens ?? 0) + (usage?.completionTokens ?? 0);

  try {
    // El unique (clientId, periodStart) hace atómico el upsert: dos
    // generaciones simultáneas en un periodo recién estrenado no pueden crear
    // dos filas ni perder un incremento.
    await prisma.usagePeriod.upsert({
      where: { clientId_periodStart: { clientId, periodStart } },
      create: { workspaceId, clientId, periodStart, generations: 1, costUsd, tokens },
      update: {
        generations: { increment: 1 },
        costUsd: { increment: costUsd },
        tokens: { increment: tokens },
      },
    });
  } catch (e) {
    console.error('recordUsage error:', e);
  }
};
