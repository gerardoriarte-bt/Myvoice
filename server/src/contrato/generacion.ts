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
  /** Tú, vos o usted, como lo eligió la marca en su ADN. Sin elegir, el motor no impone ninguno. */
  tratamiento?: 'TU' | 'VOS' | 'USTED' | null;
  brandVoiceGuidelines: string;
  valueProposition: string;
  primaryCTA: string;
  funnelStage?: FunnelStage;
  platforms: Platform[];
  /**
   * Cuántas piezas por medio (docs/plan-piezas-por-medio.md): «5 carruseles». De 1 a 10; sin valor, 3.
   * Desde el 2026-11-05 la pantalla manda un solo medio por generación.
   */
  cantidad?: number;
  /** Solo carrusel: cuántas slides tiene cada uno. De 3 a 10; sin valor, 5. */
  slides?: number;
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
  /** Lo llenan el servidor desde el ADN 2.0 (docs/plan-adn-2.md, F4): lo que la marca vende de verdad. */
  productos?: string;
  /** Frases que se escriben siempre igual. */
  frasesIntocables?: string[];
  /** Reglas de estilo que se verifican sin IA. */
  reglasDeEstilo?: {
    emojis?: 'no' | 'pocos' | 'libre';
    signosDeApertura?: boolean;
    formatoDePrecio?: string;
    sinMayusculasSostenidas?: boolean;
  };
}

export interface CopyVariation {
  id: string;
  platform: Platform;
  type: string; // angle: Beneficio | Curiosidad | Urgencia | channel-specific
  slot?: string; // e.g. "shortTitle", "longTitle", "hook", "body", "subject"
  /** Etiqueta legible del slot, resuelta en el servidor contra channels/registry.ts. */
  slotLabel?: string;
  variationIndex?: number;
  /** Qué pieza de la generación es (1..cantidad). Los textos de una pieza se guardan, aprueban y producen juntos. */
  piezaIndex?: number;
  /** Un id por pieza generada, el mismo en todos sus textos: es lo que los agrupa en Copy y en Producción. */
  conjuntoId?: string;
  /** Dónde va: en la pieza, como copy out o como indicación para Diseño. */
  zona?: 'pieza' | 'copyOut' | 'indicacion';
  content: string;
  charCount: number;
  budget?: number;
  budgetUnit?: 'char' | 'word';
  budgetOk?: boolean;
  prohibitionsHit?: string[];
  tuteoHits?: string[];        // e.g. ["tienes → tenés", "eres → sos"]
  /** Faltas al manual de oficio que se detectan sin IA (services/oficio.ts). */
  oficioHits?: string[];
  /** Faltas a lo que el ADN dice que no se toca: frases mal escritas, reglas de estilo (comun/adn/estilo.ts). */
  adnHits?: string[];
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
