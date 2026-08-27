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

// Presupuestos de tiempo, en ms. Se pueden pisar por entorno para tunear en
// producción sin redeploy (y para que el harness de verificación corra en
// segundos en vez de en minutos).
export const TIEMPOS = {
  llamada: {
    director:    45_000,
    writer:      60_000,
    critic:      40_000,
    fixer:       40_000,
    superCritic: 60_000,
    refine:      90_000,
    extraccion: 120_000,
    prueba:      15_000,
  },
  canal:      Number(process.env.AI_TIMEOUT_CANAL_MS) || 210_000,
  generacion: Number(process.env.AI_TIMEOUT_GENERACION_MS) || 900_000,
} as const;

export const REINTENTOS = {
  intentosMax:  Number(process.env.AI_INTENTOS_MAX) || 3, // 1 intento + 2 reintentos
  baseMs:       Number(process.env.AI_BACKOFF_BASE_MS) || 800,
  topeMs:       8_000,
  topeHeaderMs: 20_000, // tope al Retry-After que manda el proveedor
} as const;

export const createAIClient = (config: WorkspaceAIConfig): OpenAI =>
  new OpenAI({
    apiKey:  config.apiKey,
    baseURL: BASE_URLS[config.provider],
    // El SDK reintenta 2 veces por su cuenta y espera hasta 10 min por llamada.
    // Apagarlo es obligatorio: con nuestro retry encima, una llamada pasaría a
    // valer hasta 9 requests (3 nuestros × 3 del SDK) y el presupuesto de
    // tiempo por canal dejaría de ser calculable. El reintento vive en un solo
    // lugar: chatCompletionConRetry.
    maxRetries: 0,
    timeout: TIEMPOS.llamada.writer,
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

// ---------------------------------------------------------------------------
// Resiliencia: clasificación de errores, backoff y presupuesto de tiempo.
// Toda llamada al endpoint de chat completions del servidor pasa por acá.
// ---------------------------------------------------------------------------

// 529 = "overloaded" de Anthropic, que no está en la lista estándar.
const HTTP_TRANSITORIOS = new Set([408, 409, 425, 429, 500, 502, 503, 504, 529]);
// 402 = OpenRouter sin crédito. Reintentarlo solo gasta tiempo.
const HTTP_TERMINALES = new Set([400, 401, 402, 403, 404, 413, 422]);
const CODIGOS_TERMINALES =
  /insufficient_quota|invalid_api_key|billing|credit balance|context_length_exceeded|model_not_found/i;
const ERRNO_TRANSITORIOS = /ECONNRESET|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN|ENOTFOUND|EPIPE|socket hang up/i;

export type MotivoError =
  | "cancelado"
  | "codigo-terminal"
  | "http-terminal"
  | "http-transitorio"
  | "red"
  | "timeout"
  | "desconocido";

export interface Clasificacion {
  terminal: boolean;
  status?: number;
  codigo?: string;
  motivo: MotivoError;
}

/**
 * El ORDEN de las reglas es la especificación, no un detalle de implementación.
 * `insufficient_quota` llega con status 429 en OpenAI y con 402 en OpenRouter:
 * si se clasificara por status antes que por código, el error irrecuperable se
 * convertiría en el reintentable y cada canal gastaría 3 llamadas contra una
 * cuenta sin plata.
 */
export const clasificarError = (err: any): Clasificacion => {
  const status: number | undefined = typeof err?.status === "number" ? err.status : undefined;
  const codigo: string | undefined =
    (typeof err?.code === "string" && err.code) ||
    (typeof err?.error?.code === "string" && err.error.code) ||
    undefined;

  // 1. Aborto nuestro (presupuesto vencido) o del usuario cerrando el SSE.
  //    Reintentarlo es exactamente lo contrario de lo que se pidió.
  if (err instanceof OpenAI.APIUserAbortError || err?.name === "AbortError") {
    return { terminal: true, status, codigo, motivo: "cancelado" };
  }

  // 2. Códigos irrecuperables, ANTES que cualquier regla por status.
  const textoCodigo = `${codigo ?? ""} ${err?.message ?? ""}`;
  if (CODIGOS_TERMINALES.test(textoCodigo)) {
    return { terminal: true, status, codigo, motivo: "codigo-terminal" };
  }

  if (status !== undefined && HTTP_TERMINALES.has(status)) {
    return { terminal: true, status, codigo, motivo: "http-terminal" };
  }

  // 4. Acá cae el 429 real de rate limit, que es el caso que B2 quiere reintentar.
  if (status !== undefined && HTTP_TRANSITORIOS.has(status)) {
    return { terminal: false, status, codigo, motivo: "http-transitorio" };
  }

  if (
    err instanceof OpenAI.APIConnectionError ||
    err instanceof OpenAI.APIConnectionTimeoutError ||
    ERRNO_TRANSITORIOS.test(`${err?.code ?? ""} ${err?.cause?.code ?? ""} ${err?.message ?? ""}`)
  ) {
    return { terminal: false, status, codigo, motivo: "red" };
  }

  // 6. Falla cerrada: un TypeError nuestro no se reintenta tres veces.
  return { terminal: true, status, codigo, motivo: "desconocido" };
};

export class AIError extends Error {
  readonly terminal: boolean;
  readonly status?: number;
  readonly codigo?: string;
  readonly etapa: string;
  readonly intentos: number;
  readonly motivo: MotivoError;

  constructor(
    mensaje: string,
    datos: { terminal: boolean; status?: number; codigo?: string; etapa: string; intentos: number; motivo: MotivoError }
  ) {
    super(mensaje);
    this.name = "AIError";
    this.terminal = datos.terminal;
    this.status = datos.status;
    this.codigo = datos.codigo;
    this.etapa = datos.etapa;
    this.intentos = datos.intentos;
    this.motivo = datos.motivo;
  }
}

/**
 * Cuota agotada / facturación / key inválida: lo único que amerita el aviso
 * fuerte al usuario y abortar la generación entera en vez de seguir canal por
 * canal contra una key muerta.
 */
export const esErrorDeCredenciales = (err: unknown): boolean => {
  if (!(err instanceof AIError) || !err.terminal) return false;
  if (err.status === 401 || err.status === 402 || err.status === 403) return true;
  return /insufficient_quota|invalid_api_key|billing|credit balance/i.test(`${err.codigo ?? ""} ${err.message}`);
};

/** Espera cancelable. Un setTimeout pelado secuestra el presupuesto del canal
 *  durante toda la espera y anula el propósito del AbortController. */
const dormir = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const abortada = new Error("espera cancelada");
      abortada.name = "AbortError";
      return reject(abortada);
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", alAbortar);
      resolve();
    }, ms);
    function alAbortar() {
      clearTimeout(timer);
      const abortada = new Error("espera cancelada");
      abortada.name = "AbortError";
      reject(abortada);
    }
    signal?.addEventListener("abort", alAbortar, { once: true });
  });

/**
 * Combina señales a mano en vez de con AbortSignal.any: existe en el runtime
 * (node:20-slim) pero puede no estar declarado en el @types/node instalado, y
 * `npx tsc --noEmit` es el único gate del repo.
 *
 * Devuelve también `limpiar` porque las señales padre viven toda la generación:
 * sin desregistrar, cada intento deja un listener y Node escupe
 * MaxListenersExceededWarning pasados los diez.
 */
export const unirSignals = (
  ...signals: Array<AbortSignal | undefined>
): { señal: AbortSignal; limpiar: () => void } => {
  const ac = new AbortController();
  const presentes = signals.filter((s): s is AbortSignal => Boolean(s));
  const quitar: Array<() => void> = [];
  for (const s of presentes) {
    if (s.aborted) {
      ac.abort(s.reason);
      break;
    }
    const alAbortar = () => ac.abort(s.reason);
    s.addEventListener("abort", alAbortar, { once: true });
    quitar.push(() => s.removeEventListener("abort", alAbortar));
  }
  return { señal: ac.signal, limpiar: () => quitar.forEach(q => q()) };
};

/** Lee `retry-after` (segundos) o `retry-after-ms` de la respuesta del proveedor. */
const esperaDelProveedor = (err: any): number | undefined => {
  const headers = err?.headers as Record<string, string | null | undefined> | undefined;
  if (!headers) return undefined;
  const ms = headers["retry-after-ms"];
  if (ms && Number.isFinite(Number(ms))) return Number(ms);
  const segundos = headers["retry-after"];
  if (segundos && Number.isFinite(Number(segundos))) return Number(segundos) * 1000;
  return undefined;
};

export interface OpcionesLlamada {
  /** "writer:Instagram Post" — va al log y al evento de reintento. */
  etapa: string;
  timeoutMs: number;
  intentosMax?: number;
  /** Techo total incluyendo las esperas de backoff. */
  presupuestoMs?: number;
  signal?: AbortSignal;
  onReintento?: (info: {
    etapa: string;
    intento: number;
    intentosMax: number;
    esperaMs: number;
    motivo: string;
  }) => void;
}

/**
 * Único punto del servidor donde se invoca el endpoint de chat completions.
 * Reintenta lo transitorio con backoff exponencial + equal jitter, respeta el
 * Retry-After del proveedor, y corta en seco lo terminal. Todo intento corre
 * bajo el presupuesto de tiempo del canal, así que el peor caso de la llamada
 * está acotado y ningún slot del semáforo queda tomado indefinidamente.
 */
export const chatCompletionConRetry = async (
  client: OpenAI,
  request: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  opts: OpcionesLlamada
): Promise<OpenAI.Chat.Completions.ChatCompletion> => {
  const t0 = Date.now();
  const intentosMax = opts.intentosMax ?? REINTENTOS.intentosMax;
  const presupuestoMs = opts.presupuestoMs ?? TIEMPOS.canal;

  let ultimo: { clasificacion: Clasificacion; mensaje: string } | undefined;

  for (let intento = 1; intento <= intentosMax; intento++) {
    // Una etapa encolada detrás de una generación ya abortada no gasta ni una
    // llamada contra el proveedor.
    if (opts.signal?.aborted) {
      throw new AIError(`${opts.etapa}: cancelado antes de llamar al proveedor.`, {
        terminal: true,
        etapa: opts.etapa,
        intentos: intento - 1,
        motivo: "cancelado",
      });
    }

    const restante = presupuestoMs - (Date.now() - t0);
    if (restante <= 0) {
      throw new AIError(
        `${opts.etapa}: presupuesto de tiempo agotado tras ${intento - 1} intento(s).`,
        {
          terminal: true,
          etapa: opts.etapa,
          intentos: intento - 1,
          motivo: "cancelado",
          status: ultimo?.clasificacion.status,
          codigo: ultimo?.clasificacion.codigo,
        }
      );
    }

    // No se saltea el intento por no entrar entero: se le recorta el timeout a
    // lo que queda de presupuesto.
    const timeoutEfectivo = Math.min(opts.timeoutMs, restante);
    const acLlamada = new AbortController();
    let vencioPorTimeout = false;
    const temporizador = setTimeout(() => {
      vencioPorTimeout = true;
      acLlamada.abort(new Error(`timeout de ${timeoutEfectivo} ms en ${opts.etapa}`));
    }, timeoutEfectivo);
    const { señal, limpiar } = unirSignals(acLlamada.signal, opts.signal);

    try {
      return await client.chat.completions.create(request, {
        timeout: timeoutEfectivo,
        maxRetries: 0,
        signal: señal,
      });
    } catch (error: any) {
      // Un aborto disparado por NUESTRO temporizador es un timeout de llamada
      // (transitorio), no una cancelación del usuario.
      const clasificacion: Clasificacion = vencioPorTimeout
        ? { terminal: false, motivo: "timeout" }
        : clasificarError(error);
      const mensaje = error?.message || "error desconocido";
      ultimo = { clasificacion, mensaje };

      if (clasificacion.terminal) {
        throw new AIError(`${opts.etapa}: ${mensaje}`, {
          terminal: true,
          status: clasificacion.status,
          codigo: clasificacion.codigo,
          etapa: opts.etapa,
          intentos: intento,
          motivo: clasificacion.motivo,
        });
      }

      if (intento >= intentosMax) break;

      const restanteTrasIntento = presupuestoMs - (Date.now() - t0);
      if (restanteTrasIntento <= 0) break;

      // Equal jitter, no full jitter: una espera de ~0 ms no descomprime nada.
      const base = Math.min(REINTENTOS.baseMs * 2 ** (intento - 1), REINTENTOS.topeMs);
      const calculada = base / 2 + Math.random() * (base / 2);
      const delProveedor = esperaDelProveedor(error);
      // Reintentar un 429 más rápido de lo que pide el proveedor empeora el
      // rate limit: su header gana sobre nuestra fórmula.
      const esperaMs = Math.round(
        delProveedor !== undefined
          ? Math.min(delProveedor, REINTENTOS.topeHeaderMs, restanteTrasIntento)
          : Math.min(calculada, restanteTrasIntento)
      );

      console.warn(
        `[ai-retry] ${opts.etapa} intento ${intento}/${intentosMax} · status=${clasificacion.status ?? "-"} ` +
          `código=${clasificacion.codigo ?? clasificacion.motivo} · espera=${esperaMs}ms`
      );
      opts.onReintento?.({
        etapa: opts.etapa,
        intento,
        intentosMax,
        esperaMs,
        motivo: clasificacion.motivo,
      });

      try {
        await dormir(esperaMs, opts.signal);
      } catch {
        throw new AIError(`${opts.etapa}: cancelado durante el backoff.`, {
          terminal: true,
          etapa: opts.etapa,
          intentos: intento,
          motivo: "cancelado",
        });
      }
    } finally {
      clearTimeout(temporizador);
      limpiar();
    }
  }

  throw new AIError(
    `${opts.etapa}: falló tras ${intentosMax} intentos: ${ultimo?.mensaje ?? "error desconocido"}`,
    {
      terminal: false,
      status: ultimo?.clasificacion.status,
      codigo: ultimo?.clasificacion.codigo,
      etapa: opts.etapa,
      intentos: intentosMax,
      motivo: ultimo?.clasificacion.motivo ?? "desconocido",
    }
  );
};
