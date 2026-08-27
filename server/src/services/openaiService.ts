import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { CopyParameters, GenerationResponse, CopyVariation, CampaignSpine, CoherenceReport } from "../types.js";
import { getChannelSpec, resolveSlotLabel } from "../channels/registry.js";
import { ChannelBrief, ChannelSpec } from "../channels/types.js";
import { buildSystemPrompt, buildUserPrompt } from "../channels/promptBuilder.js";
import { validateBatch } from "../channels/validators.js";
import { buildCampaignSpine } from "./directorService.js";
import { runCritic } from "./criticService.js";
import { runAutoFix } from "./fixerService.js";
import { runSuperCritic } from "./superCriticService.js";
import { UsageEntry, extractUsage, aggregateUsage } from "./pricing.js";
import {
  WorkspaceAIConfig,
  createAIClient,
  resolveModel,
  jsonObjectFormat,
  stripJsonFence,
  buildCacheableSystemMessage,
  samplingParams,
  MAX_TOKENS,
  TIEMPOS,
  AIError,
  chatCompletionConRetry,
  esErrorDeCredenciales,
  unirSignals,
  OpcionesLlamada,
} from "./aiClient.js";
import { resolveMarketLocale, brandUsesVoseo } from "./localeRules.js";

const createSemaphore = (max: number) => {
  let running = 0;
  const queue: Array<() => void> = [];
  const acquire = (): Promise<void> => new Promise(resolve => {
    if (running < max) { running++; resolve(); }
    else queue.push(resolve);
  });
  const release = (): void => {
    running--;
    if (queue.length > 0) { running++; queue.shift()!(); }
  };
  return { acquire, release };
};

export const buildBrief = (params: CopyParameters, spine: CampaignSpine): ChannelBrief => ({
  spine,
  funnelStage: params.funnelStage,
  brand: {
    name: params.clientName || "Cliente",
    industry: params.clientIndustry || "",
    voice: params.voice || "",
    valueProposition: params.valueProposition || "",
    brandVoiceGuidelines: params.brandVoiceGuidelines || "",
    fingerprint: params.brandFingerprint,
  },
  campaign: {
    name: "",
    product: params.product || "",
    targetAudience: params.targetAudience || "",
    goal: params.goal || "",
    theme: params.theme || "",
    keywords: params.keywords || "",
    prohibitions: params.prohibitions || "",
    primaryCTA: params.primaryCTA || "",
  },
  examples: (params.feedbackExamples || []).map(e => ({
    platform: e.platform || "",
    content: e.content || "",
  })),
  negativeExamples: (params.negativeExamples || []).map(e => ({
    content: e.content,
    reason: e.reason,
  })),
  checkVoseo: brandUsesVoseo(params),
});

export interface OpcionesCanal {
  signal?: AbortSignal;
  /** Techo de tiempo compartido por todas las etapas del canal. */
  presupuestoMs?: number;
  onReintento?: OpcionesLlamada["onReintento"];
}

/**
 * Traduce el fallo de una etapa al mensaje que ve el usuario sin perder los
 * metadatos del AIError (terminal / código / intentos), que son lo que el
 * frontend usa para decidir si ofrecer reintento.
 */
const errorDeCanal = (error: any, canal: string): Error => {
  if (!(error instanceof AIError)) {
    return new Error(`Fallo en canal "${canal}": ${error?.message || "error desconocido"}`);
  }
  const mensaje = esErrorDeCredenciales(error)
    ? `ALERTA_CREDITOS: la cuenta de IA se quedó sin créditos o la API key no es válida (${error.message}).`
    : error.terminal
      ? `Canal "${canal}" falló de forma definitiva: ${error.message}`
      : `Canal "${canal}" falló tras ${error.intentos} intentos: ${error.message}`;
  return new AIError(mensaje, {
    terminal: error.terminal,
    status: error.status,
    codigo: error.codigo,
    etapa: error.etapa,
    intentos: error.intentos,
    motivo: error.motivo,
  });
};

export const generateForChannel = async (
  spec: ChannelSpec,
  brief: ChannelBrief,
  client: OpenAI,
  writerModel: string,
  miniModel: string,
  usage?: UsageEntry[],
  opciones: OpcionesCanal = {}
): Promise<CopyVariation[]> => {
  const system = buildSystemPrompt(brief);
  const user = buildUserPrompt(brief, spec);
  const { signal, onReintento } = opciones;
  const presupuestoMs = opciones.presupuestoMs ?? TIEMPOS.canal;

  // Un JSON truncado o envuelto en prosa no es una falla de transporte, así que
  // el envoltorio de retry no la ve — y sin embargo es una causa real de canal
  // faltante. Un único reintento extra, contra el mismo presupuesto del canal.
  const INTENTOS_CONTENIDO = 2;
  let items: any[] = [];
  let falloContenido = "devolvió una respuesta que no se pudo interpretar";

  for (let intento = 1; intento <= INTENTOS_CONTENIDO; intento++) {
    let raw: string | null;
    try {
      const response = await chatCompletionConRetry(
        client,
        {
          model: writerModel,
          messages: [
            // Campaign-wide prefix, cached across every channel call of this generation.
            buildCacheableSystemMessage(system, client),
            { role: "user", content: user },
          ],
          response_format: jsonObjectFormat(client),
          max_tokens: MAX_TOKENS.writer,
          ...samplingParams(writerModel, 0.8),
        },
        {
          etapa: `writer:${spec.id}`,
          timeoutMs: TIEMPOS.llamada.writer,
          presupuestoMs,
          signal,
          onReintento,
        }
      );
      const u = extractUsage(response, writerModel, `writer:${spec.id}`);
      if (u && usage) usage.push(u);
      raw = response.choices[0]?.message?.content ?? null;
    } catch (error: any) {
      throw errorDeCanal(error, spec.id);
    }

    if (!raw) {
      falloContenido = "devolvió respuesta vacía";
    } else {
      try {
        const parsed = JSON.parse(stripJsonFence(raw));
        const candidatos: any[] = Array.isArray(parsed.variations) ? parsed.variations : [];
        if (candidatos.length > 0) {
          items = candidatos;
          break;
        }
        falloContenido = "devolvió cero variaciones";
      } catch {
        falloContenido = "devolvió JSON inválido";
      }
    }

    if (intento < INTENTOS_CONTENIDO) {
      console.warn(`[ai-retry] writer:${spec.id} contenido inválido (${falloContenido}), reintentando una vez.`);
      onReintento?.({
        etapa: `writer:${spec.id}`,
        intento,
        intentosMax: INTENTOS_CONTENIDO,
        esperaMs: 0,
        motivo: "json-invalido",
      });
    }
  }

  if (items.length === 0) throw new Error(`Canal "${spec.id}" ${falloContenido}.`);

  const variations: CopyVariation[] = items.map((item, idx) => ({
    id: randomUUID(),
    platform: spec.id,
    type: item.type || "Standard",
    slot: item.slot || undefined,
    slotLabel: resolveSlotLabel(spec.id, item.slot) ?? undefined,
    variationIndex: typeof item.variationIndex === "number" ? item.variationIndex : idx + 1,
    content: typeof item.content === "string" ? item.content : "",
    charCount: typeof item.content === "string" ? item.content.length : 0,
    score: typeof item.score === "number" ? item.score : undefined,
    scoreRationale: typeof item.scoreRationale === "string" ? item.scoreRationale : undefined,
  }));

  const validated = validateBatch(variations, spec, brief.campaign.prohibitions, brief.checkVoseo);
  const critiqued = await runCritic(brief, spec, validated, client, miniModel, usage, opciones);
  const needsFix = critiqued.some(v => Array.isArray(v.editorFlags) && v.editorFlags.length > 0);
  const autofixed = needsFix
    ? await runAutoFix(brief, spec, critiqued, client, miniModel, usage, opciones)
    : critiqued;
  return autofixed;
};

export type StreamEvent =
  | { type: "spine"; payload: CampaignSpine }
  | { type: "channel"; payload: { platform: string; variations: CopyVariation[] } }
  | {
      type: "channel-error";
      payload: { platform: string; message: string; terminal: boolean; codigo?: string; intentos: number };
    }
  // Sin este evento un backoff de 8 s se ve idéntico a un cuelgue en el panel
  // de progreso.
  | {
      type: "channel-retry";
      payload: { platform: string; etapa: string; intento: number; intentosMax: number; esperaMs: number };
    }
  | { type: "coherence"; payload: CoherenceReport }
  | { type: "usage"; payload: ReturnType<typeof aggregateUsage> }
  | { type: "done" };

export interface OpcionesGeneracion {
  /** Aborta la generación entera (hoy: cierre del SSE por el cliente). */
  signal?: AbortSignal;
  /**
   * Reemplaza al cliente real. Único punto donde el pipeline completo se puede
   * correr contra un doble; lo usa `npm run verify:resiliencia`.
   */
  clienteInyectado?: OpenAI;
}

const runGeneration = async (
  params: CopyParameters,
  aiConfig: WorkspaceAIConfig,
  emit: (event: StreamEvent) => void,
  opciones: OpcionesGeneracion = {}
): Promise<void> => {
  const requested = (params.platforms || []) as unknown as string[];
  if (!requested.length) throw new Error("No se seleccionaron canales.");

  const specs = requested
    .map(id => getChannelSpec(id))
    .filter((s): s is ChannelSpec => Boolean(s));

  if (specs.length === 0) throw new Error("Ninguno de los canales seleccionados está soportado.");

  const client = opciones.clienteInyectado ?? createAIClient(aiConfig);
  const writerModel = resolveModel(aiConfig, false);
  const miniModel = resolveModel(aiConfig, true);

  const usage: UsageEntry[] = [];

  // Presupuesto de la generación entera. Se aborta al vencer, cuando el cliente
  // cierra el SSE, y en cuanto un canal falla por credenciales muertas.
  const acGeneracion = new AbortController();
  const tGeneracion = setTimeout(
    () => acGeneracion.abort(new Error("presupuesto de generación agotado")),
    TIEMPOS.generacion
  );
  const { señal: señalGeneracion, limpiar: limpiarGeneracion } = unirSignals(
    acGeneracion.signal,
    opciones.signal
  );

  try {
    const spine = await buildCampaignSpine(params, client, writerModel, usage, señalGeneracion);
    const brief = buildBrief(params, spine);
    emit({ type: "spine", payload: spine });

    const allVariations: CopyVariation[] = [];
    const sem = createSemaphore(5);
    await Promise.all(
      specs.map(async spec => {
        await sem.acquire();
        // El presupuesto por canal acota por construcción el peor caso de un
        // slot ocupado: sin esto, una petición colgada se queda con uno de los
        // cinco para siempre.
        const acCanal = new AbortController();
        const tCanal = setTimeout(
          () => acCanal.abort(new Error("presupuesto de canal agotado")),
          TIEMPOS.canal
        );
        const { señal: señalCanal, limpiar: limpiarCanal } = unirSignals(acCanal.signal, señalGeneracion);
        try {
          // Un canal encolado detrás de una generación ya abortada no gasta ni
          // una llamada contra el proveedor.
          if (señalCanal.aborted) {
            emit({
              type: "channel-error",
              payload: {
                platform: spec.id,
                message: `Canal "${spec.id}" no se ejecutó: la generación se canceló antes de llegar a él.`,
                terminal: false,
                intentos: 0,
              },
            });
            return;
          }
          const variations = await generateForChannel(spec, brief, client, writerModel, miniModel, usage, {
            signal: señalCanal,
            presupuestoMs: TIEMPOS.canal,
            onReintento: info =>
              emit({
                type: "channel-retry",
                payload: {
                  platform: spec.id,
                  etapa: info.etapa,
                  intento: info.intento,
                  intentosMax: info.intentosMax,
                  esperaMs: info.esperaMs,
                },
              }),
          });
          allVariations.push(...variations);
          emit({ type: "channel", payload: { platform: spec.id, variations } });
        } catch (error: any) {
          const aiError = error instanceof AIError ? error : undefined;
          emit({
            type: "channel-error",
            payload: {
              platform: spec.id,
              message: error?.message || "Error desconocido",
              terminal: aiError ? aiError.terminal : true,
              codigo: aiError?.codigo,
              intentos: aiError?.intentos ?? 1,
            },
          });
          // Fallar rápido en lo irrecuperable es la otra mitad de reintentar lo
          // transitorio: sin esto, los 14 canales se estrellan uno por uno
          // contra una key muerta.
          if (esErrorDeCredenciales(error)) acGeneracion.abort(error);
        } finally {
          clearTimeout(tCanal);
          limpiarCanal();
          sem.release();
        }
      })
    );

    if (allVariations.length > 0) {
      const coherence = await runSuperCritic(
        brief.brand.name,
        spine,
        allVariations,
        brief.campaign.prohibitions,
        client,
        miniModel,
        usage,
        señalGeneracion
      );
      if (coherence) emit({ type: "coherence", payload: coherence });
    }

    emit({ type: "usage", payload: aggregateUsage(usage) });
    emit({ type: "done" });
  } finally {
    clearTimeout(tGeneracion);
    limpiarGeneracion();
  }
};

export const generateCopyWithOpenAI = async (
  params: CopyParameters,
  aiConfig: WorkspaceAIConfig,
  opciones: OpcionesGeneracion = {}
): Promise<GenerationResponse> => {
  const collected: CopyVariation[] = [];
  let spine: CampaignSpine | undefined;
  let coherence: CoherenceReport | undefined;
  let usageReport: any | undefined;

  let errorCredenciales: Error | undefined;

  await runGeneration(
    params,
    aiConfig,
    event => {
      if (event.type === "spine") spine = event.payload;
      else if (event.type === "channel") collected.push(...event.payload.variations);
      else if (event.type === "coherence") coherence = event.payload;
      else if (event.type === "usage") usageReport = event.payload;
      else if (event.type === "channel-error") {
        // No se lanza desde acá: lanzar dentro del emit rompe el Promise.all y
        // deja a los canales restantes corriendo contra una key muerta. Se
        // guarda y se propaga cuando runGeneration ya abortó todo.
        if (!errorCredenciales && event.payload.message.includes("ALERTA_CREDITOS")) {
          errorCredenciales = new Error(event.payload.message);
        }
      }
    },
    opciones
  );

  if (errorCredenciales) throw errorCredenciales;

  return { variations: collected, spine, coherence, usage: usageReport };
};

export const streamGenerateCopyWithOpenAI = async (
  params: CopyParameters,
  aiConfig: WorkspaceAIConfig,
  emitEvent: (event: StreamEvent) => void,
  opciones: OpcionesGeneracion = {}
): Promise<void> => {
  try {
    await runGeneration(params, aiConfig, emitEvent, opciones);
  } catch (error: any) {
    console.error("Orchestrator error:", error);
    throw error;
  }
};
