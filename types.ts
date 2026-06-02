
export enum FunnelStage {
  AWARENESS = 'Awareness',
  CONSIDERATION = 'Consideración',
  CONVERSION = 'Conversión',
  RETENTION = 'Retención'
}

export const FUNNEL_STAGE_DESCRIPTIONS: Record<FunnelStage, string> = {
  [FunnelStage.AWARENESS]: 'Dar a conocer la marca / problema',
  [FunnelStage.CONSIDERATION]: 'Educar, comparar, posicionar',
  [FunnelStage.CONVERSION]: 'Cerrar la compra / acción',
  [FunnelStage.RETENTION]: 'Reforzar valor post-compra'
};

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

export const PLATFORM_GROUPS: Record<string, Platform[]> = {
  Social: [
    Platform.INSTAGRAM_POST,
    Platform.INSTAGRAM_HISTORIA,
    Platform.INSTAGRAM_CARRUSEL,
    Platform.INSTAGRAM_REEL,
    Platform.TIKTOK,
    Platform.YOUTUBE
  ],
  Performance: [
    Platform.GOOGLE_ADS,
    Platform.GOOGLE_DISPLAY,
    Platform.RICH_MEDIA
  ],
  CRM: [
    Platform.EMAIL,
    Platform.WHATSAPP
  ],
  Engagement: [
    Platform.POP_UP,
    Platform.PUSH
  ],
  Audio: [
    Platform.CUNA_RADIO
  ]
};

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
  workspaceId?: string;
  workspaceName?: string;
  createdAt: number;
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  logo: string; // Base64
  voice?: string;
  brandVoiceGuidelines?: string;
  valueProposition?: string;
  brandKeywords?: string;
  brandProhibitions?: string;
  brandGuidelinePdfUrl?: string;
  brandGuidelineFileName?: string;
  brandGuidelineExtractedAt?: string | number | null;
  brandFingerprint?: any;
  brandFingerprintAt?: string | number | null;
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
  feedbackExamples?: FeedbackExample[];
}

export interface CopyVariation {
  id: string;
  platform: Platform;
  type: string; // angle: Beneficio | Curiosidad | Urgencia | channel-specific
  slot?: string; // e.g. "shortTitle", "longTitle", "hook", "body", "subject"
  variationIndex?: number;
  content: string;
  charCount: number;
  budget?: number;
  budgetUnit?: 'char' | 'word';
  budgetOk?: boolean;
  prohibitionsHit?: string[];
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
}

export interface BrandConfig {
  id: string;
  name: string;
}

export interface GenerationResponse {
  variations: CopyVariation[];
  spine?: CampaignSpine;
  coherence?: CoherenceReport;
  usage?: UsageReport;
}

export interface UsageReport {
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
  costUsd: number;
  byStage: Record<string, { tokens: number; costUsd: number }>;
}
