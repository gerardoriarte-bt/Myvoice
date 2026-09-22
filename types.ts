
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

/**
 * Rol DENTRO de un workspace. Un mismo usuario puede ser ADMIN en el workspace
 * de su empresa y MEMBER en el de un cliente: el rol viaja con la membresía,
 * no con el usuario.
 */
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export const canManageWorkspace = (role?: WorkspaceRole | null) =>
  role === 'OWNER' || role === 'ADMIN';

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  MEMBER: 'Miembro'
};

/** Un workspace al que el usuario tiene acceso, con su rol en él. */
export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  plan?: string;
  role: WorkspaceRole;
  clientCount?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  /** Rol en el workspace ACTIVO. Cambia al cambiar de workspace. */
  role: WorkspaceRole;
  workspaceId?: string | null;
  workspaceName?: string | null;
  /** Todos los workspaces donde tiene membresía. Alimenta el selector. */
  workspaces?: WorkspaceSummary[];
  createdAt?: number;
}

/** Miembro de un workspace, tal como lo devuelve GET /workspace/members. */
export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  createdAt?: string;
  membershipId?: string;
}

/** Invitación pendiente a un workspace. */
export interface WorkspaceInvite {
  id: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  expiresAt: string;
  createdAt: string;
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
  /** La API los devuelve anidados en el cliente; el estado vivo de la app es
   *  el de `dnaProfiles`, esta copia solo alimenta la carga inicial. */
  dnaProfiles?: ContentDNAProfile[];
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
  /**
   * Brief (perfil de ADN) elegido en el formulario. Sin esto el consumidor
   * tiene que adivinar por clientId y termina tomando el primer brief de la
   * marca, que no es necesariamente el que se seleccionó.
   */
  dnaProfileId?: string;
  clientName?: string;
  clientIndustry?: string;
  feedbackExamples?: FeedbackExample[];
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
  previousVersions?: Array<{ content: string; charCount: number; editedAt: string }>;
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
  usage?: UsageReport;
}

export interface UsageReport {
  promptTokens: number;
  cachedTokens: number;
  /** tokens written to cache on the first call of a generation */
  cacheWriteTokens?: number;
  completionTokens: number;
  costUsd: number;
  /** true when costUsd is estimated from a local price table, not reported by the provider */
  costEstimated?: boolean;
  /** cachedTokens / promptTokens, 0-1 */
  cacheHitRate?: number;
  byStage: Record<string, { tokens: number; costUsd: number }>;
}

export type ReviewDecision = 'APPROVED' | 'REJECTED';
export type ReviewSessionStatus = 'PENDING' | 'IN_REVIEW' | 'COMPLETED';

export interface ReviewFeedback {
  savedVariationId: string;
  decision: ReviewDecision;
  comment?: string;
}

export interface ReviewSessionItem {
  id: string;
  sortOrder: number;
  savedVariation: {
    id: string;
    platform: string;
    type: string;
    content: string;
    charCount: number;
    clientId: string;
  };
}

export interface ReviewItemFeedbackDetail {
  savedVariationId: string;
  decision: ReviewDecision;
  comment?: string | null;
}

export interface ReviewSession {
  id: string;
  token: string;
  title: string;
  status: ReviewSessionStatus;
  expiresAt: string;
  createdAt: string;
  _count?: { items: number };
  items?: ReviewSessionItem[];
  submission?: {
    submittedAt: string;
    reviewerName?: string | null;
    feedbacks?: ReviewItemFeedbackDetail[];
  };
}

export interface GenerationPreset {
  id: string;
  name: string;
  workspaceId?: string;
  clientId?: string;
  parameters: Partial<CopyParameters>;
  createdAt?: number;
  updatedAt?: number;
}

// ------------------------------------------------------------------ piezas

/**
 * El tablero de producción (H2 fase 2). Los tipos son explícitos y no `any`
 * porque `apiRequest` devuelve `any` (E2, punto 4): si la pantalla nueva
 * heredara eso, el tablero entero quedaría fuera de la gate de tipos.
 */
export type PiezaEstado = 'POR_ASIGNAR' | 'EN_DISENO' | 'POR_REVISAR' | 'LISTA';
export type PiezaTipo = 'GRAFICA' | 'VIDEO' | 'AUDIO';

export interface PiezaSlot {
  id: string;
  slot: string;
  slotLabel: string;
  textoCongelado: string;
  esInstruccion: boolean;
  orden: number;
  savedVariationId: string | null;
}

/** Por qué el copy de la pieza ya no coincide con el de la Biblioteca. */
export interface SlotDesfasado {
  slot: string;
  slotLabel: string;
  motivo: 'editado' | 'desaprobado' | 'borrado';
  textoCongelado: string;
  textoActual: string | null;
}

export interface Pieza {
  id: string;
  clientId: string;
  projectId: string | null;
  platform: string;
  tipo: PiezaTipo;
  formato: string;
  titulo: string;
  estado: PiezaEstado;
  asignadaAId: string | null;
  grupoId: string | null;
  enlace: string | null;
  estadoDesde: string;
  createdAt: string;
  slots: PiezaSlot[];
  desfases: SlotDesfasado[];
  asignadaA?: { id: string; name: string; email: string } | null;
  /** Cuántos comentarios tiene la pieza, y el último, para la tarjeta. */
  comentarios: number;
  ultimoComentario: { nota: string | null; autor: string | null; createdAt: string } | null;
  client?: { id: string; name: string };
  project?: { id: string; name: string } | null;
}

export interface PiezaEvento {
  id: string;
  tipo: string;
  deEstado: PiezaEstado | null;
  aEstado: PiezaEstado | null;
  nota: string | null;
  createdAt: string;
  autor?: { id: string; name: string };
}

export interface PiezaDetalle extends Pieza {
  eventos: PiezaEvento[];
  hermanas: { id: string; platform: string; formato: string; estado: PiezaEstado; titulo: string }[];
}

export interface SlotPropuesto {
  savedVariationId: string;
  slot: string;
  slotLabel: string;
  contenido: string;
  esInstruccion: boolean;
  /** Otros aprobados del mismo slot: la pregunta «¿una pieza o dos?» de D7. */
  alternativas: { savedVariationId: string; contenido: string }[];
}

export interface PiezaPropuesta {
  platform: string;
  tipo: PiezaTipo;
  formato: string;
  formatosDisponibles: string[];
  titulo: string;
  clientId: string;
  projectId: string | null;
  proyectoNombre: string | null;
  slots: SlotPropuesto[];
}

export interface PropuestaDePiezas {
  piezas: PiezaPropuesta[];
  excluidos: {
    savedVariationId: string;
    platform: string;
    motivo: 'sin-pieza' | 'no-aprobado' | 'ya-en-pieza';
    detalle: string;
  }[];
}

export interface PiezaAConfirmar {
  platform: string;
  formato: string;
  titulo: string;
  savedVariationIds: string[];
  hermanaDe?: number;
}
