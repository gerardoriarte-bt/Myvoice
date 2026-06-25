/**
 * OpenAI pricing as of late 2024 / 2025.
 * Cached input is ~50% off vs regular input.
 * Update if pricing changes.
 */

export interface ModelPricing {
  inputPer1M: number;        // USD per 1M input tokens
  cachedInputPer1M: number;  // USD per 1M cached input tokens
  outputPer1M: number;       // USD per 1M output tokens
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  "gpt-4o":      { inputPer1M: 2.50, cachedInputPer1M: 1.25, outputPer1M: 10.00 },
  "gpt-4o-mini": { inputPer1M: 0.15, cachedInputPer1M: 0.075, outputPer1M: 0.60 },
  // Anthropic
  "claude-sonnet-4-6":          { inputPer1M: 3.00, cachedInputPer1M: 1.50, outputPer1M: 15.00 },
  "claude-haiku-4-5-20251001":  { inputPer1M: 0.25, cachedInputPer1M: 0.125, outputPer1M: 1.25 },
  // Gemini
  "gemini-2.0-flash":       { inputPer1M: 0.075, cachedInputPer1M: 0.0375, outputPer1M: 0.30 },
  "gemini-2.5-flash-lite":  { inputPer1M: 0.10,  cachedInputPer1M: 0.05,   outputPer1M: 0.40 },
  "gemini-2.5-flash":       { inputPer1M: 0.15,  cachedInputPer1M: 0.075,  outputPer1M: 0.60 },
};

const DEFAULT = MODEL_PRICING["gpt-4o"];

export interface UsageEntry {
  model: string;
  stage: string;          // 'director' | 'writer:<channel>' | 'critic:<channel>' | 'fixer:<channel>' | 'supercritic'
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
  costUsd: number;
}

export const computeCost = (
  model: string,
  promptTokens: number,
  cachedTokens: number,
  completionTokens: number
): number => {
  const pricing = MODEL_PRICING[model] || DEFAULT;
  const uncached = Math.max(0, promptTokens - cachedTokens);
  const inputCost  = (uncached      / 1_000_000) * pricing.inputPer1M;
  const cachedCost = (cachedTokens  / 1_000_000) * pricing.cachedInputPer1M;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPer1M;
  return Number((inputCost + cachedCost + outputCost).toFixed(6));
};

export interface UsageTotal {
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
  costUsd: number;
  byStage: Record<string, { tokens: number; costUsd: number }>;
}

export const aggregateUsage = (entries: UsageEntry[]): UsageTotal => {
  const total: UsageTotal = {
    promptTokens: 0,
    cachedTokens: 0,
    completionTokens: 0,
    costUsd: 0,
    byStage: {},
  };
  for (const e of entries) {
    total.promptTokens += e.promptTokens;
    total.cachedTokens += e.cachedTokens;
    total.completionTokens += e.completionTokens;
    total.costUsd += e.costUsd;
    if (!total.byStage[e.stage]) total.byStage[e.stage] = { tokens: 0, costUsd: 0 };
    total.byStage[e.stage].tokens += e.promptTokens + e.completionTokens;
    total.byStage[e.stage].costUsd += e.costUsd;
  }
  total.costUsd = Number(total.costUsd.toFixed(6));
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
  return {
    model,
    stage,
    promptTokens,
    cachedTokens,
    completionTokens,
    costUsd: computeCost(model, promptTokens, cachedTokens, completionTokens),
  };
};
