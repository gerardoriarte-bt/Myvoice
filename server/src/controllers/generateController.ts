
import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { assertDnaProfileInWorkspace, TenantContext } from '../lib/tenancy.js';
import { generateCopyWithOpenAI, streamGenerateCopyWithOpenAI, generateForChannel, buildBrief } from '../services/openaiService.js';
import { serverAIConfig, WorkspaceAIConfig, createAIClient, resolveModel, AIError } from '../services/aiClient.js';
import { UsageEntry, UsageTotal, aggregateUsage } from '../services/pricing.js';
import { assertQuotaAvailable, recordUsage } from '../services/usageService.js';
import { prisma } from '../lib/prisma.js';
import { decryptWorkspaceApiKey } from '../lib/workspaceSecret.js';
import { getChannelSpec } from '../channels/registry.js';

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
      },
    });
  } catch (e) {
    console.error('registrarGeneracion error:', e);
  }
};

async function buildGenerationContext(dnaProfileId: string, tenant: TenantContext): Promise<{
  dnaProfile: any;
  client: any;
  generationParams: any;
}> {
  // Una sola guarda cubre las tres verificaciones que antes estaban abiertas a
  // mano: que el brief exista, que su marca sea de este workspace, y que quien
  // llama tenga membresía en él.
  const dnaProfile = await assertDnaProfileInWorkspace(tenant, dnaProfileId);
  const client = dnaProfile.client;

  // Fetch approved variations for few-shot learning (Bucle de Feedback)
  const approvedVariations = await prisma.savedVariation.findMany({
    where: { clientId: client.id, isApproved: true },
    take: 5,
    orderBy: { savedAt: 'desc' }
  });

  const globalExamples = approvedVariations.map((v: any) => ({ content: v.content }));
  const briefExamples = (dnaProfile.feedbackExamples as any[]) || [];
  const combinedExamples = [...globalExamples, ...briefExamples];

  const negatives = await prisma.negativeFeedback.findMany({
    where: { clientId: client.id },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  const negativeExamples = negatives.map((n: any) => ({ content: n.content, reason: n.reason }));

  const generationParams = {
    clientName: client.name,
    clientIndustry: client.industry,
    // Priority: Client Global DNA > Brief DNA (Fallback)
    valueProposition: client.valueProposition || dnaProfile.valueProposition,
    brandVoiceGuidelines: client.brandVoiceGuidelines || dnaProfile.brandVoiceGuidelines,
    voice: client.voice || dnaProfile.voice,
    // Brief Specifics
    product: dnaProfile.product,
    targetAudience: dnaProfile.targetAudience,
    goal: dnaProfile.goal,
    primaryCTA: dnaProfile.primaryCTA,
    theme: dnaProfile.theme,
    // Merge brand-level (from PDF extraction) with campaign-level
    keywords: [client.brandKeywords, dnaProfile.keywords].filter(Boolean).join(', '),
    prohibitions: [client.brandProhibitions, dnaProfile.prohibitions].filter(Boolean).join(', '),
    campaignConcept: dnaProfile.campaignConcept || '',
    brandFingerprint: client.brandFingerprint || null,
    feedbackExamples: combinedExamples,
    negativeExamples
  };

  return { dnaProfile, client, generationParams };
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
    const { dnaProfile, client, generationParams } = await buildGenerationContext(dnaProfileId, req.tenant!);

    await assertQuotaAvailable(req.tenant!, client);

    const mergedParams = { ...generationParams, ...params };
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
    const { dnaProfile, client, generationParams } = await buildGenerationContext(dnaProfileId, req.tenant!);

    await assertQuotaAvailable(req.tenant!, client);

    const mergedParams = { ...generationParams, ...params };

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
      platforms: params?.platforms ?? [],
      funnelStage: params?.funnelStage || null,
      spine: capturedSpine || null,
      outputJson: { variations: capturedVariations, coherence: capturedCoherence, usage: capturedUsage },
      usage: capturedUsage,
      aiConfig,
      durationMs,
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

    const spec = getChannelSpec(platform);
    if (!spec) return res.status(400).json({ error: 'Canal no soportado: ' + platform });

    const spine = existingSpine;
    const aiConfig = await resolveWorkspaceAIConfig(req.tenant!.workspaceId);
    const aiClientInstance = createAIClient(aiConfig);
    const writerModel = resolveModel(aiConfig, false);
    const miniModel = resolveModel(aiConfig, true);

    const brief = buildBrief({ ...generationParams, ...params }, spine);
    const usage: UsageEntry[] = [];
    const t0 = Date.now();
    const variations = await generateForChannel(spec, brief, aiClientInstance, writerModel, miniModel, usage);
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
      funnelStage: params?.funnelStage || null,
      spine,
      outputJson: { variations, usage: usageTotal, regeneratedChannel: platform },
      usage: usageTotal,
      aiConfig,
      durationMs,
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
