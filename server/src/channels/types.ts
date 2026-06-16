import { CampaignSpine, CopyVariation, FunnelStage } from "../types.js";

export type SlotUnit = "char" | "word";
export type ChannelGroup = "social" | "performance" | "engagement" | "audio";

export interface SlotSpec {
  /** machine id, e.g. "shortTitle" */
  id: string;
  /** human label, e.g. "Título Corto" */
  label: string;
  /** how many distinct copies to produce for this slot */
  count: number;
  unit: SlotUnit;
  /** hard ceiling — anything above is invalid */
  max?: number;
  /** soft floor — for word-count specs like radio (55-60 words) */
  min?: number;
  /** angle: when count >= 3 we vary along Beneficio/Curiosidad/Urgencia by default */
  varyByAngle?: boolean;
  /** extra free-text rule shown to the model for this slot */
  guidance?: string;
}

export interface ChannelBrief {
  spine: CampaignSpine;
  funnelStage?: FunnelStage;
  brand: {
    name: string;
    industry: string;
    voice: string;
    valueProposition: string;
    brandVoiceGuidelines: string;
    fingerprint?: any;
  };
  campaign: {
    name: string;
    product: string;
    targetAudience: string;
    goal: string;
    theme: string;
    keywords: string;
    prohibitions: string;
    primaryCTA: string;
  };
  examples: { platform: string; content: string }[];
  negativeExamples: { content: string; reason: string }[];
  checkVoseo: boolean;
}

export interface ChannelSpec {
  id: string;            // matches Platform enum value, e.g., "Instagram Post"
  group: ChannelGroup;
  description: string;   // short description used in director prompt context
  slots: SlotSpec[];
  /** plain-text guidance injected into the prompt — channel-specific tactics */
  guidance: string;
}

export interface ChannelGenerationResult {
  variations: CopyVariation[];
}
