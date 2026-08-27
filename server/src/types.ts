
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

export enum Role {
  ADMIN = 'Admin',
  CLIENT = 'Cliente'
}

export interface User {
  id: string;
  name: string;
  role: Role;
  clientId?: string;
  email: string;
  createdAt: number;
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  logo: string; // Base64
  createdAt: number;
}

export interface FeedbackExample {
  platform: string;
  content: string;
}

export interface ContentDNAProfile {
  id: string;
  clientId: string;
  name: string;
  campaignConcept?: string;
  voice: string;
  goal: string;
  product: string;
  targetAudience: string;
  theme: string;
  keywords: string;
  prohibitions?: string;
  brandVoiceGuidelines: string;
  valueProposition: string;
  primaryCTA: string;
  feedbackExamples: FeedbackExample[]; // Nuevo campo de aprendizaje
  createdAt: number;
}

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
  clientName?: string;
  clientIndustry?: string;
  marketLocale?: 'es-CO' | 'es-AR' | 'es-MX' | 'es-419';
  brandFingerprint?: Record<string, any>;
  feedbackExamples?: FeedbackExample[];
  negativeExamples?: { content: string; reason: string }[];
}

export interface CopyVariation {
  id: string;
  platform: Platform | string;
  type: string;
  slot?: string;
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

export interface Project {
  id: string;
  name: string;
  createdAt: number;
}

export interface SavedVariation extends CopyVariation {
  projectId?: string;
  clientId?: string;
  tags: string[];
  savedAt: number;
  isApproved?: boolean;
  /** True cuando el slot lo dedujo el backfill heurístico y no el writer. */
  slotInferred?: boolean;
}

export interface BrandConfig {
  id: string;
  name: string;
}

export interface GenerationResponse {
  variations: CopyVariation[];
  spine?: CampaignSpine;
  coherence?: CoherenceReport;
  usage?: any;
}
