// Los tipos de la generación son el contrato con el front y viven en un solo lugar.
// Las copias de User, Client, Project, SavedVariation, ContentDNAProfile, Role y BrandConfig que
// había aquí no las importaba nadie: el servidor usa los tipos de Prisma. Se borraron el
// 2026-10-28 (spec-plataforma § 2.2).
export { FunnelStage, Platform } from './contrato/generacion.js';
export type {
  FeedbackExample,
  CopyParameters,
  CopyVariation,
  CampaignSpine,
  CoherenceReport,
  UsageReport,
  GenerationResponse,
} from './contrato/generacion.js';
