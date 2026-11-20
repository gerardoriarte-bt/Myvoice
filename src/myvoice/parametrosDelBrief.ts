import { esCarrusel } from '../../piezas';
import { FunnelStage } from '../../types';
import type { Client, ContentDNAProfile, CopyParameters, EtapaDeFunnel, Platform } from '../../types';

/** La etapa de la sábana de CDM, en la escala del motor. */
export const ETAPA_DEL_MOTOR: Record<EtapaDeFunnel, FunnelStage> = {
  RECONOCIMIENTO: FunnelStage.AWARENESS,
  CONSIDERACION: FunnelStage.CONSIDERATION,
  CONVERSION: FunnelStage.CONVERSION,
  RETENCION: FunnelStage.RETENTION,
};

/**
 * Lo que el motor recibe para una generación: el brief de la campaña más el medio, la etapa y cuántas piezas.
 * Lo usan Generar suelto (el formulario) y los pedidos de CDM (F4), para que los dos generen igual.
 */
export const parametrosDelBrief = (
  profile: ContentDNAProfile,
  marca: Client | undefined,
  eleccion: { platform: Platform; funnelStage: FunnelStage; cantidad: number; slides?: number }
): CopyParameters => ({
  voice: profile.voice,
  goal: profile.goal,
  theme: profile.theme,
  product: profile.product,
  targetAudience: profile.targetAudience,
  keywords: profile.keywords,
  prohibitions: profile.prohibitions,
  brandVoiceGuidelines: profile.brandVoiceGuidelines,
  valueProposition: profile.valueProposition,
  primaryCTA: profile.primaryCTA,
  funnelStage: eleccion.funnelStage,
  feedbackExamples: profile.feedbackExamples,
  platforms: [eleccion.platform],
  cantidad: eleccion.cantidad,
  ...(esCarrusel(eleccion.platform) && eleccion.slides ? { slides: eleccion.slides } : {}),
  clientId: profile.clientId,
  dnaProfileId: profile.id,
  clientName: marca?.name,
  clientIndustry: marca?.industry,
});
