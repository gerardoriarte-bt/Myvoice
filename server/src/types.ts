
export enum Platform {
  PUSH = 'Push Notification',
  WHATSAPP = 'WhatsApp',
  INSTAGRAM = 'Instagram Post',
  GOOGLE_ADS = 'Google Ads',
  EMAIL = 'Email',
  POPUP = 'Pop up'
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
  voice: string;
  goal: string;
  product: string;
  targetAudience: string;
  theme: string;
  keywords: string;
  brandVoiceGuidelines: string; 
  valueProposition: string; 
  primaryCTA: string; 
  feedbackExamples: FeedbackExample[]; // Nuevo campo de aprendizaje
  createdAt: number;
}

export interface CopyParameters {
  voice: string;
  goal: string;
  theme: string;
  product: string;
  targetAudience: string;
  keywords: string;
  brandVoiceGuidelines: string;
  valueProposition: string;
  primaryCTA: string;
  platforms: Platform[];
  clientId: string;
  clientName?: string;
  clientIndustry?: string;
  feedbackExamples?: FeedbackExample[];
}

export interface CopyVariation {
  id: string;
  platform: Platform;
  type: 'Beneficio' | 'Curiosidad' | 'Urgencia';
  content: string;
  charCount: number;
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
}
