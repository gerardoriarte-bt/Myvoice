import OpenAI from "openai";

export type AIProvider = "openrouter" | "openai" | "anthropic" | "gemini";

export interface WorkspaceAIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string; // override default model
}

// All providers expose an OpenAI-compatible REST API,
// so we can use the OpenAI SDK for all of them — just swap baseURL + apiKey.
const BASE_URLS: Record<AIProvider, string | undefined> = {
  openrouter: "https://openrouter.ai/api/v1",
  openai:     undefined, // SDK default (api.openai.com)
  anthropic:  "https://api.anthropic.com/v1",
  gemini:     "https://generativelanguage.googleapis.com/v1beta/openai",
};

// Default models per provider (writer quality).
// OpenRouter slugs verified against https://openrouter.ai/api/v1/models.
//
// NO CAMBIAR sin decisión explícita: estos defaults aplican a cualquier
// workspace que no fije su propio modelo, así que un cambio acá mueve el costo
// de producción. Referencia (USD por 1M tokens, in/out):
//   google/gemini-2.5-flash       0.30 /  2.50   ← default actual
//   anthropic/claude-sonnet-4.6   3.00 / 15.00   (10x input)
//   anthropic/claude-sonnet-5     2.00 / 10.00   (7x input, mejor modelo)
// Para subir de gama, fijar AI_MODEL en el entorno en lugar de editar esto.
export const DEFAULT_MODELS: Record<AIProvider, string> = {
  openrouter: "google/gemini-2.5-flash",
  openai:     "gpt-4o",
  anthropic:  "claude-sonnet-4-6",
  gemini:     "gemini-2.5-flash",
};

// Cheaper / faster models for critic / fixer / director roles.
//   google/gemini-2.5-flash-lite  0.10 / 0.40   ← default actual
//   anthropic/claude-haiku-4.5    1.00 / 5.00   (10x)
export const MINI_MODELS: Record<AIProvider, string> = {
  openrouter: "google/gemini-2.5-flash-lite",
  openai:     "gpt-4o-mini",
  anthropic:  "claude-haiku-4-5",
  gemini:     "gemini-2.5-flash-lite",
};

// Output ceilings per stage. Without these a runaway response can burn the
// whole context window; every stage here returns compact JSON.
export const MAX_TOKENS = {
  director:    2_000,
  writer:      8_000,
  critic:      4_000,
  fixer:       1_000,
  superCritic: 2_000,
  fingerprint: 2_000,
} as const;

export const createAIClient = (config: WorkspaceAIConfig): OpenAI =>
  new OpenAI({
    apiKey:  config.apiKey,
    baseURL: BASE_URLS[config.provider],
    // Anthropic's OpenAI-compatible endpoint requires a version header.
    // (Prompt caching there is driven by cache_control blocks, not a beta header.)
    defaultHeaders:
      config.provider === "anthropic"
        ? { "anthropic-version": "2023-06-01" }
        : undefined,
  });

// Anthropic's OpenAI-compatible endpoint rejects response_format: { type: "json_object" }
// (only "json_schema" is accepted there). Detect the provider from the client's baseURL so
// call sites don't need to thread WorkspaceAIConfig through just for this.
export const jsonObjectFormat = (client: OpenAI): { type: "json_object" } | undefined =>
  client.baseURL?.includes("anthropic.com") ? undefined : { type: "json_object" };

/**
 * Anthropic models only cache a prompt prefix when it carries an explicit
 * `cache_control` breakpoint — there is no automatic prefix caching. OpenAI and
 * Gemini 2.5 cache automatically and reject/ignore the field, so we only emit it
 * where it does something. Detected from baseURL, same as jsonObjectFormat.
 */
export const supportsExplicitCache = (client: OpenAI): boolean => {
  const url = client.baseURL || "";
  return url.includes("openrouter.ai") || url.includes("anthropic.com");
};

/**
 * Models that reject non-default sampling params (temperature/top_p/top_k) with
 * a 400. Anything in the Claude 4.7+ / Opus 5 / Sonnet 5 / Fable 5 line does.
 * Matched loosely so both bare and OpenRouter-slugged ids hit.
 */
const NO_SAMPLING_PARAMS = /claude-(opus-(4[.-]7|4[.-]8|5)|sonnet-5|fable-5|mythos-5)/i;

/**
 * Returns `{ temperature }` only when the target model accepts it. Spread this
 * into the request instead of setting temperature unconditionally, so swapping
 * in a newer Claude from the workspace settings UI doesn't 400.
 */
export const samplingParams = (model: string, temperature: number): { temperature?: number } =>
  NO_SAMPLING_PARAMS.test(model) ? {} : { temperature };

type CacheableTextPart = {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
};

/**
 * Builds the system message, marking it as a cache breakpoint where supported.
 * Everything stable for a generation (persona + campaign spine + brand DNA)
 * belongs in here so all per-channel calls share one cached prefix.
 *
 * Note: the prefix must reach the provider minimum (~1024 tokens) to cache at
 * all. Below that it silently won't — check `cachedTokens` in the usage report.
 */
export const buildCacheableSystemMessage = (
  text: string,
  client: OpenAI
): OpenAI.Chat.Completions.ChatCompletionMessageParam => {
  if (!supportsExplicitCache(client)) {
    return { role: "system", content: text };
  }
  const part: CacheableTextPart = {
    type: "text",
    text,
    cache_control: { type: "ephemeral" },
  };
  // cache_control is a provider passthrough field the OpenAI SDK types don't model.
  return { role: "system", content: [part] as any };
};

// Models wrap JSON in markdown fences or prepend a sentence ("Aquí están las
// correcciones:") despite prompt instructions, most often when response_format
// can't force JSON mode — e.g. Anthropic's OpenAI-compatible endpoint, where
// jsonObjectFormat() returns undefined. Observed breaking the fixer in a real
// run against Anthropic, so this handles all three shapes before JSON.parse.
export const stripJsonFence = (raw: string): string => {
  const trimmed = raw.trim();

  const candidates: string[] = [];

  // ```json ... ``` wrapping the whole response, or sitting inside prose.
  const fenced =
    trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i) ||
    trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) candidates.push(fenced[1].trim());

  candidates.push(trimmed);

  // Widest slice between the first opening and last closing bracket — covers a
  // preamble, trailing commentary, or both around otherwise valid JSON.
  const start = trimmed.search(/[{[]/);
  const end = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
  if (start >= 0 && end > start) candidates.push(trimmed.slice(start, end + 1));

  // Return the first candidate that actually parses, so the happy path is
  // untouched and the salvage attempts never make things worse.
  for (const candidate of candidates) {
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      /* siguiente candidato */
    }
  }

  // Nothing parsed — hand back the most likely shape so the caller's own
  // JSON.parse throws with a useful message.
  return candidates[0] ?? trimmed;
};

export const resolveModel = (config: WorkspaceAIConfig, mini = false): string => {
  if (mini) return process.env.AI_MODEL_MINI || MINI_MODELS[config.provider];
  return config.model ?? process.env.AI_MODEL ?? DEFAULT_MODELS[config.provider];
};

// Fallback: server-level config from env vars (used when workspace has no custom key)
export const serverAIConfig = (): WorkspaceAIConfig => {
  const provider = (process.env.AI_PROVIDER as AIProvider) || "openrouter";

  const KEYS: Record<AIProvider, string | undefined> = {
    openrouter: process.env.OPENROUTER_API_KEY,
    openai:     process.env.OPENAI_API_KEY,
    // ANTHROPIC_API_KEY_TEMP is a temporary extra key — remove once no longer needed.
    anthropic:  process.env.ANTHROPIC_API_KEY_TEMP || process.env.ANTHROPIC_API_KEY,
    gemini:     process.env.GEMINI_API_KEY,
  };

  return {
    provider,
    apiKey: KEYS[provider] || process.env.OPENAI_API_KEY || "",
    model: process.env.AI_MODEL,
  };
};
