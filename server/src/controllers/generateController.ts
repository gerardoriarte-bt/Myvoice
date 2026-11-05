
import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { assertDnaProfileInWorkspace, TenantContext } from '../lib/tenancy.js';
import { generateCopyWithOpenAI, streamGenerateCopyWithOpenAI, generateForChannel, buildBrief, cantidadValida } from '../services/openaiService.js';
import { randomUUID } from 'node:crypto';
import { serverAIConfig, WorkspaceAIConfig, createAIClient, resolveModel, AIError } from '../services/aiClient.js';
import { UsageEntry, UsageTotal, aggregateUsage } from '../services/pricing.js';
import { assertQuotaAvailable, recordUsage } from '../services/usageService.js';
import { prisma } from '../lib/prisma.js';
import { decryptWorkspaceApiKey } from '../lib/workspaceSecret.js';
import { getChannelSpec, specParaGeneracion } from '../channels/registry.js';
import { parametrosDeGeneracion } from '../services/parametrosDeGeneracion.js';

const resolveWorkspaceAIConfig = async (workspaceId?: string): Promise<WorkspaceAIConfig> => {
  if (workspaceId) {
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (ws?.aiApiKey && ws?.aiProvider) {
      return { provider: ws.aiProvider as any, apiKey: decryptWorkspaceApiKey(ws.id, ws.aiApiKey), model: ws.aiModel || undefined };
    }
  }
  return serverAIConfig();
};

interface DatosGeneracion {
  tenant: TenantContext;
  client: { id: string; workspaceId: string };
  dnaProfileId: string;
  platforms: string[];
  funnelStage: string | null;
  spine: any;
  outputJson: any;
  usage?: UsageTotal;
  aiConfig: WorkspaceAIConfig;
  durationMs: number;
  /** La versión del ADN con que se generó (`parametrosDeGeneracion`). */
  adnVersion: number | null;
}

/**
 * Única fuente de verdad del mapeo usage → columnas de GenerationLog. Antes
 * cada ruta derivaba lo suyo y la no-streaming no registraba nada; con el
 * helper, un cuarto call site no puede volver a inventar su propio subconjunto.
 *
 * Se come su propio error a propósito: la telemetría no puede tumbar una
 * generación que el usuario ya pagó, y en la ruta SSE esto corre DESPUÉS de
 * `res.end()`, donde un throw cae en el catch que intenta escribir sobre una
 * respuesta cerrada.
 */
const registrarGeneracion = async (datos: DatosGeneracion): Promise<void> => {
  try {
    await prisma.generationLog.create({
      data: {
        clientId: datos.client.id,
        workspaceId: datos.client.workspaceId,
        userId: datos.tenant.userId,
        dnaProfileId: datos.dnaProfileId,
        platforms: datos.platforms ?? [],
        funnelStage: datos.funnelStage,
        spineJson: datos.spine ?? null,
        outputJson: datos.outputJson as any,
        promptTokens: datos.usage?.promptTokens ?? null,
        completionTokens: datos.usage?.completionTokens ?? null,
        cachedTokens: datos.usage?.cachedTokens ?? null,
        cacheWriteTokens: datos.usage?.cacheWriteTokens ?? null,
        costUsd: datos.usage?.costUsd ?? null,
        costEstimated: datos.usage?.costEstimated ?? null,
        model: resolveModel(datos.aiConfig, false),
        provider: datos.aiConfig.provider,
        durationMs: datos.durationMs,
        stageBreakdown: (datos.usage?.byStage ?? null) as any,
        adnVersion: datos.adnVersion,
      },
    });
  } catch (e) {
    console.error('registrarGeneracion error:', e);
  }
};

/**
 * Lo único que decide el front en una generación: qué canales y para qué etapa. Todo lo demás sale
 * del ADN de la marca y del brief (`buildGenerationContext`).
 *
 * Hasta el 2026-10-28 se mezclaba el body entero encima (`{ ...generationParams, ...params }`). El
 * formulario manda los campos del brief tal cual, así que pisaba lo que se arma desde la marca: la
 * voz y la propuesta de valor de la marca (que tienen prioridad sobre las del brief), las
 * prohibiciones y keywords de la marca (que se suman a las del brief) y los ejemplos de copy
 * aprobado. El ADN manda (docs/ecosistema/decisiones.md, decisión 14).
 */
const deLaGeneracion = (
  params: unknown
): { platforms: string[]; funnelStage?: string; cantidad?: number; slides?: number } => {
  const p = (params ?? {}) as { platforms?: unknown; funnelStage?: unknown; cantidad?: unknown; slides?: unknown };
  const platforms = Array.isArray(p.platforms)
    ? p.platforms.filter((x): x is string => typeof x === 'string')
    : [];
  // Cuántas piezas y, en el carrusel, cuántas slides (docs/plan-piezas-por-medio.md). El motor las acota.
  const entero = (x: unknown) => (typeof x === 'number' && Number.isInteger(x) ? x : undefined);
  return {
    platforms,
    ...(typeof p.funnelStage === 'string' && p.funnelStage ? { funnelStage: p.funnelStage } : {}),
    ...(entero(p.cantidad) !== undefined ? { cantidad: entero(p.cantidad) } : {}),
    ...(entero(p.slides) !== undefined ? { slides: entero(p.slides) } : {}),
  };
};

async function buildGenerationContext(dnaProfileId: string, tenant: TenantContext): Promise<{
  dnaProfile: any;
  client: any;
  generationParams: any;
  adnVersion: number | null;
}> {
  // Una sola guarda cubre las tres verificaciones que antes estaban abiertas a
  // mano: que el brief exista, que su marca sea de este workspace, y que quien
  // llama tenga membresía en él.
  const dnaProfile = await assertDnaProfileInWorkspace(tenant, dnaProfileId);
  const client = dnaProfile.client;

  const { params: generationParams, adnVersion } = await parametrosDeGeneracion(dnaProfile, client);

  return { dnaProfile, client, generationParams, adnVersion };
}

export const listGenerationHistory = async (req: AuthRequest, res: Response) => {
  const { clientId } = req.query;
  try {
    const logs = await prisma.generationLog.findMany({
      where: {
        ...(clientId ? { clientId: String(clientId) } : {}),
        // La columna existe desde la migración de telemetría: filtrar por ella
        // ahorra el join contra Client. Un `where` por igualdad nunca matchea
        // NULL, así que una fila sin workspace tampoco se filtraría de más.
        workspaceId: req.tenant!.workspaceId,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        clientId: true,
        dnaProfileId: true,
        platforms: true,
        funnelStage: true,
        spineJson: true,
        outputJson: true,
        createdAt: true,
        costUsd: true,
        model: true,
        provider: true,
        durationMs: true,
      },
    });
    // Prisma serializa Decimal como string: sin esta conversión el frontend
    // recibe "0.012300" y cualquier toFixed concatena en vez de sumar.
    res.json(logs.map(log => ({ ...log, costUsd: log.costUsd == null ? null : Number(log.costUsd) })));
  } catch (error) {
    console.error('listGenerationHistory error:', error);
    res.status(500).json({ error: 'Error al cargar el historial' });
  }
};

export const generateCopy = async (req: AuthRequest, res: Response) => {
  const { dnaProfileId, params } = req.body;

  try {
    const { dnaProfile, client, generationParams, adnVersion } = await buildGenerationContext(dnaProfileId, req.tenant!);

    await assertQuotaAvailable(req.tenant!, client);

    const mergedParams = { ...generationParams, ...deLaGeneracion(params) };
    const aiConfig = await resolveWorkspaceAIConfig(req.tenant!.workspaceId);
    const t0 = Date.now();
    const result = await generateCopyWithOpenAI(mergedParams, aiConfig);
    const durationMs = Date.now() - t0;

    await recordUsage({
      workspaceId: req.tenant!.workspaceId,
      clientId: client.id,
      usage: result.usage,
      variationCount: result.variations.length,
    });

    // Esta ruta era ciega: gastaba contra la API key del workspace y no dejaba
    // fila. El outputJson tiene la misma forma que el del stream para que el
    // historial no tenga que distinguir el origen.
    await registrarGeneracion({
      tenant: req.tenant!,
      client,
      dnaProfileId: dnaProfile.id,
      platforms: mergedParams.platforms ?? [],
      funnelStage: mergedParams.funnelStage ?? null,
      spine: result.spine ?? null,
      outputJson: { variations: result.variations, coherence: result.coherence, usage: result.usage },
      usage: result.usage,
      aiConfig,
      durationMs,
      adnVersion,
    });

    res.json(result);
  } catch (error: any) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("Generation Error:", error);
    res.status(500).json({ error: 'Error en la generación de contenido' });
  }
};

export const generateCopyStream = async (req: AuthRequest, res: Response) => {
  const { dnaProfileId, params } = req.body;
  let latido: NodeJS.Timeout | undefined;
  let abortoCliente: AbortController | undefined;

  try {
    const { dnaProfile, client, generationParams, adnVersion } = await buildGenerationContext(dnaProfileId, req.tenant!);

    await assertQuotaAvailable(req.tenant!, client);

    const mergedParams = { ...generationParams, ...deLaGeneracion(params) };

    // Cabeceras SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Si el creativo cierra la pestaña, la generación sigue quemando llamadas
    // contra la cuota de su workspace hasta terminar. Abortamos el pipeline
    // entero en cuanto se cae la conexión.
    //
    // Va en `res`, no en `req`: desde Node 16 el 'close' de IncomingMessage se
    // emite cuando termina de leerse el *pedido*, y con un body JSON chico eso
    // pasa a los cero milisegundos — escuchar ahí abortaría todas las
    // generaciones al instante. El 'close' de la respuesta también se emite en
    // el cierre normal, así que `writableEnded` distingue "lo cerramos
    // nosotros" de "se cayó el cliente".
    abortoCliente = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) abortoCliente?.abort();
    });

    // Tap into the event stream to also collect for the audit log
    let capturedSpine: any = undefined;
    let capturedCoherence: any = undefined;
    let capturedUsage: any = undefined;
    const capturedVariations: any[] = [];

    // Después de resolver la config a propósito: hasta acá no se escribió nada,
    // así que un fallo (por ejemplo, la API key del workspace que no descifra)
    // todavía puede salir como JSON con su status. El primer `write` sella eso.
    //
    // Con reintentos y backoff el hueco entre dos eventos reales pasa de
    // segundos a decenas de segundos, y el nginx de dos capas corta la conexión
    // antes de que llegue el canal siguiente. El comentario `: ping` es un no-op
    // para EventSource: mantiene el socket vivo sin ensuciar el stream.
    const aiConfig = await resolveWorkspaceAIConfig(req.tenant!.workspaceId);
    latido = setInterval(() => res.write(': ping\n\n'), 15_000);
    const t0 = Date.now();

    await streamGenerateCopyWithOpenAI(mergedParams, aiConfig, (event) => {
      if (event.type === 'spine') capturedSpine = event.payload;
      else if (event.type === 'channel') capturedVariations.push(...event.payload.variations);
      else if (event.type === 'coherence') capturedCoherence = event.payload;
      else if (event.type === 'usage') capturedUsage = event.payload;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }, { signal: abortoCliente.signal });

    const durationMs = Date.now() - t0;
    if (latido) clearInterval(latido);
    // Un aborto por cierre del cliente no propaga: los canales encolados se
    // saltean y `runGeneration` resuelve igual. Del otro lado ya no hay nadie,
    // pero los tokens que se gastaron hasta el corte sí se cobraron, así que la
    // contabilidad de abajo corre en los dos casos.
    if (!res.writableEnded) {
      res.write(`data: [DONE]\n\n`);
      res.end();
    }

    // El consumo va PRIMERO: si el registro de telemetría fallaba antes que el
    // incremento, la generación quedaba gratis.
    await recordUsage({
      workspaceId: req.tenant!.workspaceId,
      clientId: client.id,
      usage: capturedUsage,
      variationCount: capturedVariations.length,
    });

    await registrarGeneracion({
      tenant: req.tenant!,
      client,
      dnaProfileId: dnaProfile.id,
      platforms: mergedParams.platforms,
      funnelStage: mergedParams.funnelStage || null,
      spine: capturedSpine || null,
      outputJson: { variations: capturedVariations, coherence: capturedCoherence, usage: capturedUsage },
      usage: capturedUsage,
      aiConfig,
      durationMs,
      adnVersion,
    });

  } catch (error: any) {
    if (error?.statusCode && !res.headersSent) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    // Si el corte lo pedimos nosotros al cerrarse la conexión, esto no es un
    // fallo que valga un log de error y no hay a quién escribirle. (Este camino
    // solo se da si el aborto cae en la etapa del director, que sí propaga.)
    if (abortoCliente?.signal.aborted) {
      if (!res.writableEnded) res.end();
      return;
    }
    console.error("Streaming Generation Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error en la generación de contenido' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Error en la generación' })}\n\n`);
      res.end();
    }
  } finally {
    if (latido) clearInterval(latido);
  }
};

export const regenerateChannel = async (req: AuthRequest, res: Response) => {
  const { dnaProfileId, platform, existingSpine, params } = req.body;
  try {
    const ctx = await buildGenerationContext(dnaProfileId, req.tenant!);
    const { client, generationParams } = ctx;

    await assertQuotaAvailable(req.tenant!, client);

    if (!existingSpine?.concept || !Array.isArray(existingSpine?.angles)) {
      return res.status(400).json({ error: 'existingSpine inválida: debe tener concept y angles' });
    }

    const base = getChannelSpec(platform);
    if (!base) return res.status(400).json({ error: 'Canal no soportado: ' + platform });
    const deGeneracion = deLaGeneracion(params);
    const spec = specParaGeneracion(base, { slides: deGeneracion.slides });

    const spine = existingSpine;
    const aiConfig = await resolveWorkspaceAIConfig(req.tenant!.workspaceId);
    const aiClientInstance = createAIClient(aiConfig);
    const writerModel = resolveModel(aiConfig, false);
    const miniModel = resolveModel(aiConfig, true);

    const brief = buildBrief({ ...generationParams, ...deGeneracion }, spine);
    const usage: UsageEntry[] = [];
    const t0 = Date.now();
    // Las piezas que fallaron (las manda el panel de canales fallidos); sin lista, todas las pedidas.
    // Cada una conserva su ángulo y recibe un id nuevo: es una pieza nueva.
    const pedidas: unknown[] = Array.isArray(req.body?.piezas) ? req.body.piezas : [];
    const indices = pedidas.filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 10);
    const todas = Array.from({ length: cantidadValida(deGeneracion.cantidad) }, (_, i) => i + 1);
    const piezas = (indices.length ? indices : todas).map(indice => ({
      indice,
      angulo: spine.angles[(indice - 1) % spine.angles.length],
    }));
    const variations = await generateForChannel(spec, brief, aiClientInstance, writerModel, miniModel, usage, { piezas });
    const conjuntos = new Map(piezas.map(p => [p.indice, randomUUID()]));
    for (const v of variations) v.conjuntoId = conjuntos.get(v.piezaIndex ?? piezas[0].indice);
    const durationMs = Date.now() - t0;
    const usageTotal = aggregateUsage(usage);

    // Regenerar un canal cuesta en cuota lo que realmente costó, no lo mismo
    // que una campaña de catorce.
    await recordUsage({
      workspaceId: req.tenant!.workspaceId,
      clientId: client.id,
      usage: usageTotal,
      variationCount: variations.length,
    });

    // Regeneration is a real spend — log it like a generation so cost reporting
    // isn't blind to it.
    await registrarGeneracion({
      tenant: req.tenant!,
      client,
      dnaProfileId: ctx.dnaProfile.id,
      platforms: [platform],
      funnelStage: deLaGeneracion(params).funnelStage || null,
      spine,
      outputJson: { variations, usage: usageTotal, regeneratedChannel: platform },
      usage: usageTotal,
      aiConfig,
      durationMs,
      adnVersion: ctx.adnVersion,
    });

    res.json({ platform, variations, usage: usageTotal });
  } catch (error: any) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    // Un transitorio que agotó los reintentos es un fallo del proveedor, no
    // nuestro: 502 le dice al panel de canales fallidos que reintentar tiene
    // sentido, mientras que un terminal (clave inválida, sin créditos) sigue
    // saliendo como 500 porque reintentar no lo arregla.
    if (error instanceof AIError && !error.terminal) {
      return res.status(502).json({ error: error.message });
    }
    console.error('regenerateChannel error:', error);
    res.status(500).json({ error: error.message || 'Error regenerando canal' });
  }
};

/**
 * «Otra»: reescribe UN texto de una pieza (una slide, el titular) mirando los demás de esa pieza, para
 * que siga encajando en la historia (docs/plan-piezas-por-medio.md, F5). El resto de la pieza no cambia.
 */
export const regenerarTexto = async (req: AuthRequest, res: Response) => {
  const { dnaProfileId, platform, existingSpine, params, pieza, slot, variationIndex, conjuntoId, textos } = req.body ?? {};
  try {
    const ctx = await buildGenerationContext(dnaProfileId, req.tenant!);
    await assertQuotaAvailable(req.tenant!, ctx.client);
    if (!existingSpine?.concept || !Array.isArray(existingSpine?.angles) || !existingSpine.angles.length)
      return res.status(400).json({ error: 'existingSpine inválida: debe tener concept y angles' });
    const base = getChannelSpec(platform);
    if (!base) return res.status(400).json({ error: 'Canal no soportado: ' + platform });
    const deGeneracion = deLaGeneracion(params);
    const slotSpec = specParaGeneracion(base, { slides: deGeneracion.slides }).slots.find(s => s.id === slot);
    if (!slotSpec) return res.status(400).json({ error: `«${slot}» no es un texto de ${platform}` });
    const indice = Number.isInteger(pieza) && pieza >= 1 && pieza <= 10 ? pieza : 1;
    const resto = (Array.isArray(textos) ? textos : [])
      .slice(0, 40)
      .filter((t: any) => t && typeof t.content === 'string' && typeof t.slot === 'string');
    const actual = resto.find((t: any) => t.slot === slot && (t.variationIndex ?? 1) === (variationIndex ?? 1));
    const contexto = [
      `## REESCRIBÍ SOLO «${slotSpec.label}» DE LA PIEZA ${indice}`,
      'Devolvé UNA sola entrada, para ese slot. Tiene que encajar con los demás textos de la pieza, que quedan así:',
      ...resto
        .filter((t: any) => t !== actual)
        .map((t: any) => `- ${String(t.slotLabel || t.slot).slice(0, 60)}: "${String(t.content).slice(0, 600)}"`),
      actual ? `El texto actual es "${String(actual.content).slice(0, 600)}": escribí otro, distinto, que cumpla lo mismo.` : '',
    ].join('\n');

    const spine = existingSpine;
    const aiConfig = await resolveWorkspaceAIConfig(req.tenant!.workspaceId);
    const cliente = createAIClient(aiConfig);
    const brief = buildBrief({ ...ctx.generationParams, ...deGeneracion }, spine);
    const usage: UsageEntry[] = [];
    const t0 = Date.now();
    const spec = { ...base, slots: [{ ...slotSpec, porPieza: 1 }] };
    const variaciones = await generateForChannel(spec, brief, cliente, resolveModel(aiConfig, false), resolveModel(aiConfig, true), usage, {
      piezas: [{ indice, angulo: spine.angles[(indice - 1) % spine.angles.length] }],
      contexto,
    });
    const nueva = variaciones.find(v => v.slot === slot) ?? variaciones[0];
    if (!nueva) return res.status(502).json({ error: 'El motor no devolvió un texto nuevo' });
    nueva.variationIndex = Number.isInteger(variationIndex) ? variationIndex : 1;
    nueva.piezaIndex = indice;
    if (typeof conjuntoId === 'string') nueva.conjuntoId = conjuntoId;

    const usageTotal = aggregateUsage(usage);
    await recordUsage({ workspaceId: req.tenant!.workspaceId, clientId: ctx.client.id, usage: usageTotal, variationCount: 1 });
    await registrarGeneracion({
      tenant: req.tenant!,
      client: ctx.client,
      dnaProfileId: ctx.dnaProfile.id,
      platforms: [platform],
      funnelStage: deGeneracion.funnelStage || null,
      spine,
      outputJson: { variations: [nueva], usage: usageTotal, regeneratedText: { pieza: indice, slot } },
      usage: usageTotal,
      aiConfig,
      durationMs: Date.now() - t0,
      adnVersion: ctx.adnVersion,
    });
    res.json({ variation: nueva });
  } catch (error: any) {
    if (error instanceof AIError) return res.status(502).json({ error: error.message });
    handleTenantError(error, res, 'Error al reescribir el texto');
  }
};
