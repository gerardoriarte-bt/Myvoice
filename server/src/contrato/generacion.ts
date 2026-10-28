/**
 * Contrato de la generación: lo que viaja entre el front y la API al generar copy.
 *
 * Es la única definición de estos tipos. La importan el servidor (`server/src/types.ts`) y el
 * front (`types.ts`), que compilan con configuraciones distintas (NodeNext estricto y bundler sin
 * strict). Por eso **este archivo no importa nada**: un import resolvería distinto en cada lado. CI
 * lo verifica.
 *
 * Vive dentro de `server/src` porque la imagen del servidor solo copia `server/` y no podría leer
 * un archivo de afuera; la del front copia el repositorio entero. Ver
 * docs/ecosistema/tecnico/spec-plataforma.md § 2.2.
 *
 * Hasta el 2026-10-28 cada lado tenía su copia y 3 de estos tipos ya no coincidían.
 */

export enum FunnelStage {
  AWARENESS = 'Awareness',
  CONSIDERATION = 'Consideración',
  CONVERSION = 'Conversión',
  RETENTION = 'Retención'
}

export enum Platform {
  INSTAGRAM_POST = 'Instagram Post',
  INSTAGRAM_HISTORIA = 'Instagram Historia',
  INSTAGRAM_CARRUSEL = 'Instagram Carrusel',
  INSTAGRAM_REEL = 'Instagram Reel',
  TIKTOK = 'TikTok',
  YOUTUBE = 'YouTube',
  CUNA_RADIO = 'Cuña de Radio',
  GOOGLE_ADS = 'Google Ads',
  GOOGLE_DISPLAY = 'Google Display',
  RICH_MEDIA = 'Rich Media',
  POP_UP = 'Pop up',
  PUSH = 'Push Notification',
  EMAIL = 'Email',
  WHATSAPP = 'WhatsApp'
}

export interface FeedbackExample {
  platform: string;
  content: string;
}

/**
 * Parámetros de una generación. El servidor arma la base desde el ADN y el brief
 * (`buildGenerationContext`) y le superpone lo que manda el front: por eso un mismo tipo cubre
 * los campos que llena cada lado.
 */
export interface CopyParameters {
  voice: string;
  goal: string;
  campaignConcept?: string;
  theme: string;
  product: string;
  targetAudience: string;
  keywords: string;
  prohibitions?: string;
  brandVoiceGuidelines: string;
  valueProposition: string;
  primaryCTA: string;
  funnelStage?: FunnelStage;
  platforms: Platform[];
  clientId: string;
  /**
   * Brief (perfil de ADN) elegido en el formulario. Sin esto el consumidor
   * tiene que adivinar por clientId y termina tomando el primer brief de la
   * marca, que no es necesariamente el que se seleccionó.
   */
  dnaProfileId?: string;
  clientName?: string;
  clientIndustry?: string;
  /** Lo llena el servidor. */
  marketLocale?: 'es-CO' | 'es-AR' | 'es-MX' | 'es-419';
  /** Lo llena el servidor desde la marca. */
  brandFingerprint?: Record<string, any>;
  feedbackExamples?: FeedbackExample[];
  /** Lo llena el servidor desde los rechazos guardados de la marca. */
  negativeExamples?: { content: string; reason: string }[];
}

export interface CopyVariation {
  id: string;
  platform: Platform;
  type: string; // angle: Beneficio | Curiosidad | Urgencia | channel-specific
  slot?: string; // e.g. "shortTitle", "longTitle", "hook", "body", "subject"
  /** Etiqueta legible del slot, resuelta en el servidor contra channels/registry.ts. */
  slotLabel?: string;
  variationIndex?: number;
  content: string;
  charCount: number;
  budget?: number;
  budgetUnit?: 'char' | 'word';
  budgetOk?: boolean;
  prohibitionsHit?: string[];
  tuteoHits?: string[];        // e.g. ["tienes → tenés", "eres → sos"]
  score?: number;
  scoreRationale?: string;
  writerScore?: number;
  editorFlags?: string[];
  autofixed?: boolean;
}

export interface CampaignSpine {
  concept: string;
  keyMessage: string;
  tone: string;
  heroCTA: string;
  angles: { name: string; premise: string; register: string }[];
}

export interface CoherenceReport {
  coherenceScore: number;
  summary: string;
  issues: { channels: string[]; problem: string; severity: 'low' | 'medium' | 'high' }[];
  flags: string[];
}

/** El servidor siempre manda todos los campos (`aggregateUsage` en services/pricing.ts). */
export interface UsageReport {
  promptTokens: number;
  cachedTokens: number;
  /** tokens written to cache on the first call of a generation */
  cacheWriteTokens: number;
  completionTokens: number;
  costUsd: number;
  /** true when costUsd is estimated from a local price table, not reported by the provider */
  costEstimated: boolean;
  /** cachedTokens / promptTokens, 0-1 */
  cacheHitRate: number;
  byStage: Record<string, { tokens: number; costUsd: number }>;
}

export interface GenerationResponse {
  variations: CopyVariation[];
  spine?: CampaignSpine;
  coherence?: CoherenceReport;
  usage?: UsageReport;
}
