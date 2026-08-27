import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { assertClientInWorkspace } from '../lib/tenancy.js';
import { currentPeriodStart, nextPeriodStart } from '../services/usageService.js';
import { prisma } from '../lib/prisma.js';

export const getAnalytics = async (req: AuthRequest, res: Response) => {
  const workspaceId = req.tenant!.workspaceId;
  const clientIdFilter = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;

  try {
    const clients = await prisma.client.findMany({
      where: clientIdFilter ? { workspaceId, id: clientIdFilter } : { workspaceId },
      select: { id: true, name: true },
    });
    const clientIds = clients.map(c => c.id);
    const clientMap = new Map(clients.map(c => [c.id, c.name]));

    if (clientIds.length === 0) {
      return res.json({
        summary: { totalSaved: 0, totalApproved: 0, totalRejected: 0, approvalRate: 0 },
        byClient: [],
        byPlatform: [],
        recentRejections: [],
      });
    }

    const scopedClientIds = clientIdFilter ? [clientIdFilter].filter(id => clientIds.includes(id)) : clientIds;

    const [savedAll, approvedAll, rejectedAll, savedByPlatform, approvedByPlatform, rejectedByPlatform, recentRejections] =
      await Promise.all([
        prisma.savedVariation.groupBy({
          by: ['clientId'],
          where: { clientId: { in: scopedClientIds } },
          _count: { id: true },
        }),
        prisma.savedVariation.groupBy({
          by: ['clientId'],
          where: { clientId: { in: scopedClientIds }, isApproved: true },
          _count: { id: true },
        }),
        prisma.negativeFeedback.groupBy({
          by: ['clientId'],
          where: { clientId: { in: scopedClientIds } },
          _count: { id: true },
        }),
        prisma.savedVariation.groupBy({
          by: ['platform'],
          where: { clientId: { in: scopedClientIds } },
          _count: { id: true },
        }),
        prisma.savedVariation.groupBy({
          by: ['platform'],
          where: { clientId: { in: scopedClientIds }, isApproved: true },
          _count: { id: true },
        }),
        prisma.negativeFeedback.groupBy({
          by: ['platform'],
          where: { clientId: { in: scopedClientIds } },
          _count: { id: true },
          orderBy: { _count: { platform: 'desc' } },
        }),
        prisma.negativeFeedback.findMany({
          where: { clientId: { in: scopedClientIds } },
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: { platform: true, reason: true, clientId: true, createdAt: true },
        }),
      ]);

    const savedMap = new Map(savedAll.map(r => [r.clientId, r._count.id]));
    const approvedMap = new Map(approvedAll.map(r => [r.clientId, r._count.id]));
    const rejectedMap = new Map(rejectedAll.map(r => [r.clientId, r._count.id]));

    const byClient = clients.map(c => {
      const saved = savedMap.get(c.id) ?? 0;
      const approved = approvedMap.get(c.id) ?? 0;
      const rejected = rejectedMap.get(c.id) ?? 0;
      const approvalRate = saved > 0 ? Math.round((approved / saved) * 100) : 0;
      return { clientId: c.id, clientName: c.name, saved, approved, rejected, approvalRate };
    }).filter(r => r.saved > 0 || r.rejected > 0);

    const totalSaved = savedAll.reduce((s, r) => s + r._count.id, 0);
    const totalApproved = approvedAll.reduce((s, r) => s + r._count.id, 0);
    const totalRejected = rejectedAll.reduce((s, r) => s + r._count.id, 0);
    const approvalRate = totalSaved > 0 ? Math.round((totalApproved / totalSaved) * 100) : 0;

    const savedByPlatformMap = new Map(savedByPlatform.map(r => [r.platform, r._count.id]));
    const approvedByPlatformMap = new Map(approvedByPlatform.map(r => [r.platform, r._count.id]));
    const rejectedByPlatformMap = new Map(rejectedByPlatform.map(r => [r.platform, r._count.id]));

    const allPlatforms = new Set([
      ...savedByPlatformMap.keys(),
      ...rejectedByPlatformMap.keys(),
    ]);

    const byPlatform = Array.from(allPlatforms).map(platform => ({
      platform,
      saved: savedByPlatformMap.get(platform) ?? 0,
      approved: approvedByPlatformMap.get(platform) ?? 0,
      rejected: rejectedByPlatformMap.get(platform) ?? 0,
    })).sort((a, b) => b.rejected - a.rejected);

    const formattedRejections = recentRejections.map(r => ({
      platform: r.platform,
      reason: r.reason,
      clientName: clientMap.get(r.clientId) ?? r.clientId,
      createdAt: r.createdAt.toISOString(),
    }));

    res.json({ summary: { totalSaved, totalApproved, totalRejected, approvalRate }, byClient, byPlatform, recentRejections: formattedRejections });
  } catch (error) {
    console.error('getAnalytics error:', error);
    res.status(500).json({ error: 'Error al calcular analytics' });
  }
};

/**
 * Consumo y costo del workspace (B0).
 *
 * Es dato financiero, así que la ruta va con requireManager. Todo `where` parte
 * de `workspaceId` — nunca del `clientId` del query — y si viene un clientId se
 * valida primero contra el workspace: una marca ajena responde 404 y no filtra
 * un solo monto.
 */

const UNIDADES_PERIODO = ['day', 'week', 'month'] as const;
type UnidadPeriodo = (typeof UNIDADES_PERIODO)[number];

/**
 * Tope de filas que se traen para el desglose por etapa. La agregación se hace
 * en JS: un `jsonb_each` lateral no se justifica con este volumen y quedaría
 * ilegible. Si el volumen crece, ese es el momento de moverla a SQL.
 */
const MAX_FILAS_ETAPA = 5000;

/** Prisma serializa NUMERIC como Decimal (y bigint como BigInt): el borde del controller devuelve números. */
const aNumero = (valor: unknown): number =>
  valor === null || valor === undefined ? 0 : Number(valor.toString());

const parseFecha = (valor: unknown): Date | null => {
  if (typeof valor !== 'string' || !valor.trim()) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

export const getUsageAnalytics = async (req: AuthRequest, res: Response) => {
  const workspaceId = req.tenant!.workspaceId;
  const clientId = typeof req.query.clientId === 'string' && req.query.clientId ? req.query.clientId : undefined;

  const groupBy = typeof req.query.groupBy === 'string' ? req.query.groupBy : 'day';
  // Whitelist antes de que la unidad llegue a date_trunc, aunque viaje como parámetro.
  const unidad: UnidadPeriodo = (UNIDADES_PERIODO as readonly string[]).includes(groupBy)
    ? (groupBy as UnidadPeriodo)
    : 'day';

  // Default: el mes calendario vigente, el mismo periodo que mide la cuota.
  const periodoActual = currentPeriodStart();
  const desde = parseFecha(req.query.from) ?? (req.query.from ? undefined : periodoActual);
  const hasta = parseFecha(req.query.to) ?? (req.query.to ? undefined : nextPeriodStart(periodoActual));
  if (!desde || !hasta) return res.status(400).json({ error: 'Fechas inválidas: usá formato ISO en from y to' });
  if (desde >= hasta) return res.status(400).json({ error: 'El rango es vacío: from debe ser anterior a to' });

  try {
    if (clientId) await assertClientInWorkspace(req.tenant!, clientId);

    const where = {
      workspaceId,
      createdAt: { gte: desde, lt: hasta },
      ...(clientId ? { clientId } : {}),
    };

    const filtroCliente = clientId ? Prisma.sql`AND "clientId" = ${clientId}` : Prisma.empty;

    const [agregado, sinTelemetria, estimadas, porClienteRaw, porModeloRaw, clientes, filasEtapa, porPeriodoRaw] =
      await Promise.all([
        prisma.generationLog.aggregate({
          where,
          _count: { _all: true },
          _sum: {
            costUsd: true,
            promptTokens: true,
            completionTokens: true,
            cachedTokens: true,
            cacheWriteTokens: true,
          },
        }),
        prisma.generationLog.count({ where: { ...where, costUsd: null } }),
        prisma.generationLog.count({ where: { ...where, costEstimated: true } }),
        prisma.generationLog.groupBy({
          by: ['clientId'],
          where,
          _count: { _all: true },
          _sum: { costUsd: true, promptTokens: true, completionTokens: true, cachedTokens: true },
        }),
        prisma.generationLog.groupBy({
          by: ['model', 'provider'],
          where,
          _count: { _all: true },
          _sum: { costUsd: true },
        }),
        prisma.client.findMany({ where: { workspaceId }, select: { id: true, name: true } }),
        prisma.generationLog.findMany({
          where: { ...where, stageBreakdown: { not: Prisma.DbNull } },
          select: { stageBreakdown: true },
          orderBy: { createdAt: 'desc' },
          take: MAX_FILAS_ETAPA,
        }),
        prisma.$queryRaw<{ periodo: Date; generaciones: number; costUsd: unknown; tokens: unknown }[]>`
          SELECT date_trunc(${unidad}::text, "createdAt")                                    AS "periodo",
                 count(*)::int                                                              AS "generaciones",
                 COALESCE(sum("costUsd"), 0)                                                AS "costUsd",
                 COALESCE(sum(COALESCE("promptTokens", 0) + COALESCE("completionTokens", 0)), 0)::bigint AS "tokens"
            FROM "GenerationLog"
           WHERE "workspaceId" = ${workspaceId}
             AND "createdAt" >= ${desde}
             AND "createdAt" < ${hasta}
             ${filtroCliente}
           GROUP BY 1
           ORDER BY 1
        `,
      ]);

    const nombreCliente = new Map(clientes.map(c => [c.id, c.name]));

    const promptTokens = agregado._sum.promptTokens ?? 0;
    const completionTokens = agregado._sum.completionTokens ?? 0;
    const cachedTokens = agregado._sum.cachedTokens ?? 0;

    const total = {
      generaciones: agregado._count._all,
      costUsd: aNumero(agregado._sum.costUsd),
      promptTokens,
      cachedTokens,
      cacheWriteTokens: agregado._sum.cacheWriteTokens ?? 0,
      completionTokens,
      cacheHitRate: promptTokens > 0 ? Number((cachedTokens / promptTokens).toFixed(3)) : 0,
      // Un estimado y un cobro reportado por el proveedor no tienen la misma
      // precisión: la UI necesita saberlo para no presentar uno como el otro.
      costEstimado: estimadas > 0,
      // Filas del rango sin costo registrado. Se expone para que la pantalla no
      // presente un subconteo como si fuera el gasto real.
      sinTelemetria,
    };

    const porCliente = porClienteRaw
      .map(fila => {
        const prompt = fila._sum.promptTokens ?? 0;
        const cached = fila._sum.cachedTokens ?? 0;
        return {
          clientId: fila.clientId,
          clientName: nombreCliente.get(fila.clientId) ?? fila.clientId,
          generaciones: fila._count._all,
          costUsd: aNumero(fila._sum.costUsd),
          promptTokens: prompt,
          completionTokens: fila._sum.completionTokens ?? 0,
          cacheHitRate: prompt > 0 ? Number((cached / prompt).toFixed(3)) : 0,
        };
      })
      .sort((a, b) => b.costUsd - a.costUsd);

    const porPeriodo = porPeriodoRaw.map(fila => ({
      periodo: new Date(fila.periodo).toISOString(),
      generaciones: fila.generaciones,
      costUsd: aNumero(fila.costUsd),
      tokens: aNumero(fila.tokens),
    }));

    const porModelo = porModeloRaw
      .map(fila => ({
        // El backfill no puede recuperar modelo ni proveedor de las filas
        // históricas: quedan en NULL y se rotulan, no se esconden.
        model: fila.model ?? 'sin registro',
        provider: fila.provider ?? 'sin registro',
        generaciones: fila._count._all,
        costUsd: aNumero(fila._sum.costUsd),
      }))
      .sort((a, b) => b.costUsd - a.costUsd);

    const acumuladoEtapa = new Map<string, { costUsd: number; tokens: number }>();
    for (const fila of filasEtapa) {
      const desglose = fila.stageBreakdown as Record<string, { tokens?: number; costUsd?: number }> | null;
      if (!desglose || typeof desglose !== 'object') continue;
      for (const [etapa, valores] of Object.entries(desglose)) {
        const acumulado = acumuladoEtapa.get(etapa) ?? { costUsd: 0, tokens: 0 };
        acumulado.costUsd += valores?.costUsd ?? 0;
        acumulado.tokens += valores?.tokens ?? 0;
        acumuladoEtapa.set(etapa, acumulado);
      }
    }
    const porEtapa = Array.from(acumuladoEtapa.entries())
      .map(([etapa, valores]) => ({
        etapa,
        costUsd: Number(valores.costUsd.toFixed(6)),
        tokens: valores.tokens,
      }))
      .sort((a, b) => b.costUsd - a.costUsd);

    res.json({
      periodo: { desde: desde.toISOString(), hasta: hasta.toISOString() },
      total,
      porCliente,
      porPeriodo,
      porEtapa,
      porModelo,
    });
  } catch (error) {
    handleTenantError(error, res, 'Error al calcular el consumo');
  }
};
