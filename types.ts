
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
  /** ISO. Decide si una novedad le corresponde: a quien llega después, no. */
  createdAt?: string;
  /** Ids de `novedades.ts` que ya vio. Vive en el servidor, no en el navegador. */
  novedadesVistas?: string[];
}

/** Miembro de un workspace, tal como lo devuelve GET /workspace/members. */
/**
 * Qué hace una persona, que es un eje distinto de cuánto administra
 * (`WorkspaceRole`). No restringe nada: decide a quién se le avisa y quién
 * aparece primero al asignar una pieza.
 */
export type FuncionEquipo = 'COPY' | 'DISENO' | 'APROBACION';

export interface FuncionAsignada {
  id: string;
  funcion: FuncionEquipo;
  /** null = todas las marcas del workspace, que es el caso normal. */
  clientId: string | null;
  marca: string | null;
}

export const FUNCION_LABELS: Record<FuncionEquipo, string> = {
  COPY: 'Copy',
  DISENO: 'Diseño',
  APROBACION: 'Aprobación',
};

export const FUNCION_HINTS: Record<FuncionEquipo, string> = {
  COPY: 'Escribe y manda a producción',
  DISENO: 'Recibe piezas asignadas',
  APROBACION: 'Acepta o devuelve piezas',
};

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  createdAt?: string;
  membershipId?: string;
  funciones?: FuncionAsignada[];
}

/**
 * Un aviso de la bandeja. `cantidad > 1` es un lote —varias piezas repartidas
 * de una sentada— y entonces `piezaId` viene en null: el destino es el tablero
 * de esa marca, no una tarjeta.
 */
export interface Notificacion {
  id: string;
  tipo: 'ASIGNACION' | 'ENTREGA' | string;
  titulo: string;
  detalle: string | null;
  cantidad: number;
  piezaId: string | null;
  clientId: string | null;
  marca: string | null;
  leida: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Bandeja {
  notificaciones: Notificacion[];
  sinLeer: number;
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
  /** La marca de la que es complementaria (docs/plan-marcas-relacionadas.md). Un solo nivel. */
  marcaMadreId?: string | null;
  /** Calculado por GET /clients: las marcas del workspace que se llaman igual. */
  nombreRepetidoCon?: string[];
  /** Calculado por GET /clients: lo que distingue a una marca de otra con el mismo nombre. */
  conteos?: { campanas: number; complementarias: number };
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
  /** Faltas al manual de oficio detectadas sin IA (server/src/services/oficio.ts). */
  oficioHits?: string[];
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
  campoSemantico?: string;
  angles: { name: string; premise: string; register: string }[];
}

export interface CoherenceReport {
  coherenceScore: number;
  summary: string;
  issues: { channels: string[]; problem: string; severity: 'low' | 'medium' | 'high' }[];
  flags: string[];
}

/** Cómo se aprueba el copy de una campaña antes de producir. */
export type ModoAprobacion = 'INTERNA' | 'CLIENTE';

export const MODO_APROBACION_LABELS: Record<ModoAprobacion, string> = {
  INTERNA: 'Interna',
  CLIENTE: 'Del cliente',
};

/**
 * Una campaña. La que se elige en Generar (el brief) y la que recibe el copy
 * son la misma: `dnaProfileId` las une.
 */
export interface Project {
  id: string;
  name: string;
  createdAt: number;
  clientId?: string | null;
  dnaProfileId?: string | null;
  modoAprobacion?: ModoAprobacion;
  responsableId?: string | null;
  responsable?: { id: string; name: string } | null;
}

/**
 * El paso del recorrido de un copy. Lo calcula el servidor al leer
 * (server/src/services/aprobacion.ts) y el orden de acá es el del proceso.
 */
export type EtapaCopy = 'SIN_CAMPANA' | 'POR_APROBAR' | 'DEVUELTO' | 'CON_EL_CLIENTE' | 'APROBADO' | 'EN_PRODUCCION';

export const ETAPAS_COPY: { id: EtapaCopy; label: string; que: string }[] = [
  { id: 'SIN_CAMPANA', label: 'Sin campaña', que: 'Guardado antes de que el copy perteneciera a una campaña. Asignale una para que pueda avanzar.' },
  { id: 'POR_APROBAR', label: 'Por aprobar', que: 'Espera la aprobación del responsable o el envío al cliente.' },
  { id: 'DEVUELTO', label: 'Devuelto', que: 'El cliente lo rechazó. Editalo y volvé a mandarlo.' },
  { id: 'CON_EL_CLIENTE', label: 'Con el cliente', que: 'En una revisión abierta, esperando respuesta.' },
  { id: 'APROBADO', label: 'Aprobado', que: 'Listo para mandar a producción.' },
  { id: 'EN_PRODUCCION', label: 'En producción', que: 'Ya forma parte de una pieza.' },
];

export interface SavedVariation extends CopyVariation {
  projectId?: string | null;
  project?: Project | null;
  clientId?: string;
  tags: string[];
  savedAt: number;
  isApproved?: boolean;
  etapa?: EtapaCopy;
  aprobadoPorNombre?: string | null;
  aprobadoEn?: string | null;
  aprobadoVia?: ModoAprobacion | null;
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

/** Un item de una revisión: copy en la ronda COPY, pieza en la ronda PIEZA. */
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
  } | null;
  pieza?: { id: string; platform: string; formato: string; titulo: string } | null;
}

export interface ReviewItemFeedbackDetail {
  /** Uno de los dos, según la ronda. */
  savedVariationId: string | null;
  piezaId?: string | null;
  decision: ReviewDecision;
  /** Era `comment`. En la ronda de copy todo comentario es sobre copy. */
  feedbackCopy?: string | null;
  /** Solo en la ronda de piezas (H2.E). */
  feedbackDiseno?: string | null;
}

/** Qué se revisa. Una sesión es homogénea: o copy o piezas, nunca las dos. */
export type RondaRevision = 'COPY' | 'PIEZA';

/** Lo que el cliente ve de una pieza en la ronda 2. */
export interface PiezaEnRevision {
  id: string;
  platform: string;
  formato: string;
  titulo: string;
  tipo: PiezaTipo;
  marca: string;
  /** Firmada y con vencimiento. null en video y audio: no hay imagen. */
  previaUrl: string | null;
  slots: { slot: string; slotLabel: string; textoCongelado: string }[];
}

/** El desglose de D4: los dos campos opcionales, y con uno alcanza. */
export interface ReviewPiezaFeedback {
  piezaId: string;
  decision: ReviewDecision;
  feedbackCopy?: string;
  feedbackDiseno?: string;
}

export interface ReviewSession {
  id: string;
  token: string;
  title: string;
  status: ReviewSessionStatus;
  expiresAt: string;
  createdAt: string;
  ronda?: RondaRevision;
  /** La marca de la sesión. Una sesión es de una sola, así que se afirma. */
  marca?: string | null;
  clientId?: string | null;
  _count?: { items: number };
  items?: ReviewSessionItem[];
  /** Solo en la ronda 2: el portal recibe piezas en vez de items. */
  piezas?: PiezaEnRevision[];
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
export type PiezaEstado = 'POR_ASIGNAR' | 'EN_DISENO' | 'POR_REVISAR' | 'CON_EL_CLIENTE' | 'LISTA';
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

export type AuditoriaEstado = 'PENDIENTE' | 'COMPLETA' | 'NO_DISPONIBLE';
export type HallazgoTipo = 'HECHO' | 'JUICIO' | 'MEDIDAS' | 'ILEGIBLE';
export type HallazgoDecision = 'PENDIENTE' | 'ACEPTADO' | 'CORREGIDO';

/**
 * El semáforo de D3: tres estados, y ninguno rojo — el rojo prometería un
 * bloqueo que D2 dice que no existe.
 */
export type Semaforo = 'verificada' | 'hallazgos' | 'revisar-a-ojo' | 'sin-auditoria' | 'auditando' | null;

export interface Hallazgo {
  id: string;
  tipo: HallazgoTipo;
  slot: string | null;
  slotLabel: string | null;
  /** Solo en HECHO: los dos lados de la comparación. */
  esperado: string | null;
  encontrado: string | null;
  detalle: string;
  decision: HallazgoDecision;
  notaDecision: string | null;
  decididoPor?: { name: string } | null;
  decididoAt: string | null;
}

export interface PiezaVersionResumen {
  id: string;
  numero: number;
  anchoPx: number | null;
  altoPx: number | null;
  pesoBytes: number | null;
  estadoAuditoria: AuditoriaEstado;
  hallazgos: number;
  /** Hallazgos sin decidir, sin contar los ilegibles. */
  pendientes: number;
}

export interface InformeAuditoria extends PiezaVersionResumen {
  motivoNoDisponible: string | null;
  auditadaAt: string | null;
  costoUsd: string | number | null;
  modelo: string | null;
  createdAt: string;
  subidaPor?: { name: string } | null;
  hallazgos: never;
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
  /** La última entrega con archivo, si la hay. */
  version: PiezaVersionResumen | null;
  semaforo: Semaforo;
  /** URL firmada del snapshot: nuestra, no depende de permisos ajenos. */
  previaUrl: string | null;
  client?: { id: string; name: string };
  project?: {
    id: string;
    name: string;
    modoAprobacion?: ModoAprobacion;
    responsableId?: string | null;
    responsable?: { id: string; name: string } | null;
  } | null;
  /**
   * Qué puede hacer con esta pieza quien la mira. Lo calcula el servidor
   * (permisosPieza.ts), que es el mismo que después lo hace cumplir.
   */
  puedo: Record<AccionPermitida, boolean>;
  /** Si no puede decidir: quién lo hace, en una línea. */
  quienDecide: string | null;
  /** Solo en diseño: la devolución vigente y sus motivos. */
  devolucion: {
    por: string;
    createdAt: string;
    motivos: { categoria: 'COPY' | 'DISENO' | null; nota: string | null }[];
    /** Hubo motivo de copy y el responsable todavía no lo corrigió. */
    esperaCopy: boolean;
  } | null;
  /** Solo en Lista: quién la cerró. */
  cierre: { via: 'CLIENTE' | 'INTERNA'; por: string; createdAt: string } | null;
  /** Solo con el cliente: cuándo se le mandó, si ya se le mandó. */
  enviadaAlCliente: { createdAt: string } | null;
}

export type AccionPermitida =
  | 'asignar'
  | 'entregar'
  | 'aceptar'
  | 'devolver'
  | 'reabrir'
  | 'decidirHallazgos'
  | 'corregirCopy'
  | 'actualizarCopy'
  | 'renombrar'
  | 'mandarAlCliente';

export interface PiezaEvento {
  id: string;
  tipo: string;
  deEstado: PiezaEstado | null;
  aEstado: PiezaEstado | null;
  nota: string | null;
  /** COPY · DISENO. null = nadie lo clasificó, y es un valor válido. */
  categoria?: string | null;
  createdAt: string;
  autor?: { id: string; name: string } | null;
  /** Quien no tiene cuenta: el cliente desde el portal. */
  autorExterno?: string | null;
}

export interface PiezaDetalle extends Pieza {
  eventos: PiezaEvento[];
  hermanas: { id: string; platform: string; formato: string; estado: PiezaEstado; titulo: string }[];
  /** El informe completo de la última versión: lo ve el diseñador y quien aprueba (D3). */
  informe:
    | (Omit<InformeAuditoria, 'hallazgos' | 'pendientes'> & { hallazgos: Hallazgo[] })
    | null;
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
    motivo: 'sin-pieza' | 'no-aprobado' | 'ya-en-pieza' | 'sin-campana' | 'sin-responsable';
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
