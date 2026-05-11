import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { CopyParameters, GenerationResponse, CopyVariation, CampaignSpine, CoherenceReport } from "../types.js";
import { getChannelSpec } from "../channels/registry.js";
import { ChannelBrief, ChannelSpec } from "../channels/types.js";
import { buildSystemPrompt, buildUserPrompt } from "../channels/promptBuilder.js";
import { validateBatch } from "../channels/validators.js";
import { buildCampaignSpine } from "./directorService.js";
import { runCritic } from "./criticService.js";
import { runAutoFix } from "./fixerService.js";
import { runSuperCritic } from "./superCriticService.js";
import { UsageEntry, extractUsage, aggregateUsage } from "./pricing.js";
import { WorkspaceAIConfig, createAIClient, resolveModel } from "./aiClient.js";

const buildBrief = (params: CopyParameters, spine: CampaignSpine): ChannelBrief => ({
  spine,
  funnelStage: params.funnelStage,
  brand: {
    name: params.clientName || "Cliente",
    industry: params.clientIndustry || "",
    voice: params.voice || "",
    valueProposition: params.valueProposition || "",
    brandVoiceGuidelines: params.brandVoiceGuidelines || "",
    fingerprint: (params as any).brandFingerprint,
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
});

const generateForChannel = async (
  spec: ChannelSpec,
  brief: ChannelBrief,
  client: OpenAI,
  writerModel: string,
  miniModel: string,
  usage?: UsageEntry[]
): Promise<CopyVariation[]> => {
  const system = buildSystemPrompt(brief);
  const user = buildUserPrompt(brief, spec);

  let raw: string | null = null;
  try {
    const response = await client.chat.completions.create({
      model: writerModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });
    const u = extractUsage(response, writerModel, `writer:${spec.id}`);
    if (u && usage) usage.push(u);
    raw = response.choices[0].message.content;
  } catch (error: any) {
    if (error?.status === 429 || error?.code === "insufficient_quota" || error?.message?.includes("insufficient_quota")) {
      throw new Error("ALERTA_CREDITOS: Tu cuenta de OpenAI se quedó sin créditos o cuota.");
    }
    throw new Error(`Fallo en canal "${spec.id}": ${error?.message || "error desconocido"}`);
  }

  if (!raw) throw new Error(`Canal "${spec.id}" devolvió respuesta vacía.`);

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Canal "${spec.id}" devolvió JSON inválido.`);
  }

  const items: any[] = Array.isArray(parsed.variations) ? parsed.variations : [];

  const variations: CopyVariation[] = items.map((item, idx) => ({
    id: randomUUID(),
    platform: spec.id,
    type: item.type || "Standard",
    slot: item.slot || undefined,
    variationIndex: typeof item.variationIndex === "number" ? item.variationIndex : idx + 1,
    content: typeof item.content === "string" ? item.content : "",
    charCount: typeof item.content === "string" ? item.content.length : 0,
    score: typeof item.score === "number" ? item.score : undefined,
    scoreRationale: typeof item.scoreRationale === "string" ? item.scoreRationale : undefined,
  }));

  const validated = validateBatch(variations, spec, brief.campaign.prohibitions);
  const critiqued = await runCritic(brief, spec, validated, client, miniModel, usage);
  const autofixed = await runAutoFix(brief, spec, critiqued, client, miniModel, usage);
  return autofixed;
};

export type StreamEvent =
  | { type: "spine"; payload: CampaignSpine }
  | { type: "channel"; payload: { platform: string; variations: CopyVariation[] } }
  | { type: "channel-error"; payload: { platform: string; message: string } }
  | { type: "coherence"; payload: CoherenceReport }
  | { type: "usage"; payload: ReturnType<typeof aggregateUsage> }
  | { type: "done" };

const runGeneration = async (
  params: CopyParameters,
  aiConfig: WorkspaceAIConfig,
  emit: (event: StreamEvent) => void
): Promise<void> => {
  const requested = (params.platforms || []) as unknown as string[];
  if (!requested.length) throw new Error("No se seleccionaron canales.");

  const specs = requested
    .map(id => getChannelSpec(id))
    .filter((s): s is ChannelSpec => Boolean(s));

  if (specs.length === 0) throw new Error("Ninguno de los canales seleccionados está soportado.");

  const client = createAIClient(aiConfig);
  const writerModel = resolveModel(aiConfig, false);
  const miniModel = resolveModel(aiConfig, true);

  const usage: UsageEntry[] = [];

  const spine = await buildCampaignSpine(params, client, miniModel, usage);
  const brief = buildBrief(params, spine);
  emit({ type: "spine", payload: spine });

  const allVariations: CopyVariation[] = [];
  await Promise.all(
    specs.map(async spec => {
      try {
        const variations = await generateForChannel(spec, brief, client, writerModel, miniModel, usage);
        allVariations.push(...variations);
        emit({ type: "channel", payload: { platform: spec.id, variations } });
      } catch (error: any) {
        emit({
          type: "channel-error",
          payload: { platform: spec.id, message: error?.message || "Error desconocido" },
        });
      }
    })
  );

  if (allVariations.length > 0) {
    const coherence = await runSuperCritic(brief.brand.name, spine, allVariations, brief.campaign.prohibitions, client, miniModel, usage);
    if (coherence) emit({ type: "coherence", payload: coherence });
  }

  emit({ type: "usage", payload: aggregateUsage(usage) });
  emit({ type: "done" });
};

export const generateCopyWithOpenAI = async (
  params: CopyParameters,
  aiConfig: WorkspaceAIConfig
): Promise<GenerationResponse> => {
  const collected: CopyVariation[] = [];
  let spine: CampaignSpine | undefined;
  let coherence: CoherenceReport | undefined;
  let usageReport: any | undefined;

  await runGeneration(params, aiConfig, event => {
    if (event.type === "spine") spine = event.payload;
    else if (event.type === "channel") collected.push(...event.payload.variations);
    else if (event.type === "coherence") coherence = event.payload;
    else if (event.type === "usage") usageReport = event.payload;
    else if (event.type === "channel-error") {
      if (event.payload.message.includes("ALERTA_CREDITOS")) {
        throw new Error(event.payload.message);
      }
    }
  });

  return { variations: collected, spine, coherence, usage: usageReport };
};

export const streamGenerateCopyWithOpenAI = async (
  params: CopyParameters,
  aiConfig: WorkspaceAIConfig,
  emitEvent: (event: StreamEvent) => void
): Promise<void> => {
  try {
    await runGeneration(params, aiConfig, emitEvent);
  } catch (error: any) {
    console.error("Orchestrator error:", error);
    throw error;
  }
};
