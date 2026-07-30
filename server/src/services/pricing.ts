/**
 * Cost accounting.
 *
 * OpenRouter returns the real charged amount on `usage.cost`, so that is always
 * preferred. The table below is only a fallback for providers that don't report
 * cost (direct OpenAI / Anthropic / Gemini) — keep it updated, but note that any
 * number it produces is an estimate.
 *
 * Prices in USD per 1M tokens. Cached input is ~10% of base input; writing to
 * cache costs ~1.25x base input (Anthropic 5-minute TTL).
 */

export interface ModelPricing {
  inputPer1M: number;        // USD per 1M input tokens
  cachedInputPer1M: number;  // USD per 1M cached (read) input tokens
  outputPer1M: number;       // USD per 1M output tokens
}

const p = (input: number, output: number): ModelPricing => ({
  inputPer1M: input,
  cachedInputPer1M: Number((input * 0.1).toFixed(6)),
  outputPer1M: output,
});

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  "gpt-4o":      p(2.50, 10.00),
  "gpt-4o-mini": p(0.15, 0.60),
  // Anthropic (bare ids)
  "claude-opus-5":    p(5.00, 25.00),
  "claude-sonnet-5":  p(2.00, 10.00),
  "claude-sonnet-4-6": p(3.00, 15.00),
  "claude-haiku-4-5":  p(1.00, 5.00),
  "claude-haiku-4-5-20251001": p(1.00, 5.00),
  // Anthropic via OpenRouter slugs
  "anthropic/claude-opus-5":     p(5.00, 25.00),
  "anthropic/claude-sonnet-5":   p(2.00, 10.00),
  "anthropic/claude-sonnet-4.6": p(3.00, 15.00),
  "anthropic/claude-haiku-4.5":  p(1.00, 5.00),
  // Gemini
  "gemini-2.5-flash":       p(0.30, 2.50),
  "gemini-2.5-flash-lite":  p(0.10, 0.40),
  "google/gemini-2.5-flash":      p(0.30, 2.50),
  "google/gemini-2.5-flash-lite": p(0.10, 0.40),
};

const warnedModels = new Set<string>();

export interface UsageEntry {
  model: string;
  stage: string;          // 'director' | 'writer:<channel>' | 'critic:<channel>' | 'fixer:<channel>' | 'supercritic'
  promptTokens: number;
  cachedTokens: number;
  cacheWriteTokens: number;
  completionTokens: number;
  costUsd: number;
  /** true when costUsd is an estimate from MODEL_PRICING, not a provider-reported charge */
  costEstimated: boolean;
}

export const computeCost = (
  model: string,
  promptTokens: number,
  cachedTokens: number,
  completionTokens: number,
  cacheWriteTokens = 0
): number => {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    // Silently substituting another model's price produces plausible-but-wrong
    // numbers, which is worse than an obvious zero. Warn once per model.
    if (!warnedModels.has(model)) {
      warnedModels.add(model);
      console.warn(
        `[pricing] Sin tarifa conocida para "${model}" y el proveedor no reportó costo. ` +
        `Se registra 0 USD. Agregá el modelo a MODEL_PRICING en services/pricing.ts.`
      );
    }
    return 0;
  }
  const uncached = Math.max(0, promptTokens - cachedTokens - cacheWriteTokens);
  const inputCost      = (uncached         / 1_000_000) * pricing.inputPer1M;
  const cachedCost     = (cachedTokens     / 1_000_000) * pricing.cachedInputPer1M;
  const cacheWriteCost = (cacheWriteTokens / 1_000_000) * pricing.inputPer1M * 1.25;
  const outputCost     = (completionTokens / 1_000_000) * pricing.outputPer1M;
  return Number((inputCost + cachedCost + cacheWriteCost + outputCost).toFixed(6));
};

export interface UsageTotal {
  promptTokens: number;
  cachedTokens: number;
  cacheWriteTokens: number;
  completionTokens: number;
  costUsd: number;
  costEstimated: boolean;
  /** share of prompt tokens served from cache, 0-1 — useful to verify caching works */
  cacheHitRate: number;
  byStage: Record<string, { tokens: number; costUsd: number }>;
}

export const aggregateUsage = (entries: UsageEntry[]): UsageTotal => {
  const total: UsageTotal = {
    promptTokens: 0,
    cachedTokens: 0,
    cacheWriteTokens: 0,
    completionTokens: 0,
    costUsd: 0,
    costEstimated: false,
    cacheHitRate: 0,
    byStage: {},
  };
  for (const e of entries) {
    total.promptTokens += e.promptTokens;
    total.cachedTokens += e.cachedTokens;
    total.cacheWriteTokens += e.cacheWriteTokens;
    total.completionTokens += e.completionTokens;
    total.costUsd += e.costUsd;
    if (e.costEstimated) total.costEstimated = true;
    if (!total.byStage[e.stage]) total.byStage[e.stage] = { tokens: 0, costUsd: 0 };
    total.byStage[e.stage].tokens += e.promptTokens + e.completionTokens;
    total.byStage[e.stage].costUsd += e.costUsd;
  }
  total.costUsd = Number(total.costUsd.toFixed(6));
  total.cacheHitRate = total.promptTokens
    ? Number((total.cachedTokens / total.promptTokens).toFixed(3))
    : 0;
  return total;
};

export const extractUsage = (
  response: any,
  model: string,
  stage: string
): UsageEntry | null => {
  const u = response?.usage;
  if (!u) return null;

  const promptTokens = u.prompt_tokens || 0;
  const completionTokens = u.completion_tokens || 0;
  const cachedTokens = u.prompt_tokens_details?.cached_tokens || 0;
  const cacheWriteTokens = u.prompt_tokens_details?.cache_write_tokens || 0;

  // OpenRouter reports the actual amount charged; trust it over our table.
  const reportedCost = typeof u.cost === "number" ? u.cost : undefined;

  return {
    model,
    stage,
    promptTokens,
    cachedTokens,
    cacheWriteTokens,
    completionTokens,
    costUsd:
      reportedCost ?? computeCost(model, promptTokens, cachedTokens, completionTokens, cacheWriteTokens),
    costEstimated: reportedCost === undefined,
  };
};
