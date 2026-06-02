import OpenAI from "openai";

export type AIProvider = "openai" | "anthropic" | "gemini" | "openrouter";

export interface WorkspaceAIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string; // override default model
}

// All providers expose an OpenAI-compatible REST API,
// so we can use the OpenAI SDK for all of them — just swap baseURL + apiKey.
const BASE_URLS: Record<AIProvider, string | undefined> = {
  openai:     undefined, // SDK default (api.openai.com)
  anthropic:  "https://api.anthropic.com/v1",
  gemini:     "https://generativelanguage.googleapis.com/v1beta/openai",
  openrouter: "https://openrouter.ai/api/v1",
};

// Default models per provider (writer quality)
export const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai:     "gpt-4o",
  anthropic:  "claude-sonnet-4-6",
  gemini:     "gemini-2.0-flash",
  openrouter: "google/gemini-2.5-flash",
};

// Cheaper / faster models for critic / director roles
export const MINI_MODELS: Record<AIProvider, string> = {
  openai:     "gpt-4o-mini",
  anthropic:  "claude-haiku-4-5-20251001",
  gemini:     "gemini-2.5-flash-lite",
  openrouter: "google/gemini-2.5-flash-lite",
};


export const createAIClient = (config: WorkspaceAIConfig): OpenAI =>
  new OpenAI({
    apiKey:  config.apiKey,
    baseURL: BASE_URLS[config.provider],
    // Anthropic's OpenAI-compatible endpoint requires this header
    defaultHeaders:
      config.provider === "anthropic"
        ? { "anthropic-version": "2023-06-01", "anthropic-beta": "prompt-caching-2024-07-31" }
        : undefined,
  });

export const resolveModel = (config: WorkspaceAIConfig, mini = false): string => {
  if (config.model) return config.model;
  return mini ? MINI_MODELS[config.provider] : DEFAULT_MODELS[config.provider];
};

// Fallback: server-level config from env vars (used when workspace has no custom key)
export const serverAIConfig = (): WorkspaceAIConfig => {
  const provider = (process.env.AI_PROVIDER as AIProvider) || "openai";
  let apiKey = process.env.OPENAI_API_KEY || "";
  
  if (provider === "openrouter") {
    apiKey = process.env.OPENROUTER_API_KEY || apiKey;
  } else if (provider === "anthropic") {
    apiKey = process.env.ANTHROPIC_API_KEY || apiKey;
  } else if (provider === "gemini") {
    apiKey = process.env.GEMINI_API_KEY || apiKey;
  }

  return {
    provider,
    apiKey,
    model: process.env.AI_MODEL,
  };
};

