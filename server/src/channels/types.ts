import type { Tratamiento } from "../comun/adn/tratamiento.js";
import type { ReglasDeAdn } from "../comun/adn/estilo.js";
import { CampaignSpine, CopyVariation, FunnelStage, Platform } from "../types.js";

export type SlotUnit = "char" | "word";
export type ZonaSlot = "pieza" | "copyOut" | "indicacion";
export type ChannelGroup = "social" | "performance" | "engagement" | "audio";

export interface SlotSpec {
  /** machine id, e.g. "shortTitle" */
  id: string;
  /** human label, e.g. "Título Corto" */
  label: string;
  /**
   * Cuántos textos de este slot lleva UNA pieza (docs/plan-piezas-por-medio.md). 1 casi siempre; un
   * anuncio de Google Ads lleva 10 títulos cortos. Hasta el 2026-11-05 era `count`: cuántas
   * alternativas del mismo texto, y el carrusel trataba sus slides como alternativas.
   */
  porPieza: number;
  /** Dónde va el texto: en la pieza, como copy out (acompaña la publicación) o como indicación. Por defecto, `pieza`. */
  zona?: ZonaSlot;
  /** Solo para leer lo guardado con el modelo anterior: el motor ya no lo genera. */
  legado?: boolean;
  unit: SlotUnit;
  /** hard ceiling — anything above is invalid */
  max?: number;
  /** soft floor — for word-count specs like radio (55-60 words) */
  min?: number;
  /** LEGADO: lo lee scripts/backfillSlots.ts para clasificar copy viejo. El motor ya no lo usa. */
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
    /** Lo que la marca vende de verdad: el motor no inventa beneficios ni precios fuera de esto. */
    productos: string;
    /** Frases que no se cambian y reglas de estilo medibles (comun/adn/estilo.ts). */
    adn: ReglasDeAdn;
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
  /** Tú, vos o usted (comun/adn/tratamiento.ts). NULL = la marca no lo eligió: no se impone ninguno. */
  tratamiento: Tratamiento | null;
}

/**
 * Qué entregable de diseño produce el canal, cuando produce alguno.
 *
 * Vive en el spec y no en una lista aparte porque es una propiedad del canal,
 * no una elección por campaña: `null` significa que el copy aprobado ES lo que
 * se publica —Google Ads, Push, WhatsApp— y por eso ese canal no entra al
 * tablero de producción. Solo `grafica` se audita: el video se entrega como
 * enlace y el audio pasa directo a revisión (docs/plan-h2-produccion-auditoria.md,
 * estados límite 2 y 4).
 */
export interface PiezaSpec {
  tipo: "grafica" | "video" | "audio";
  /** Medidas ofrecidas al crear la pieza; la primera es la de por defecto. */
  formatos: string[];
}

export interface ChannelSpec {
  /** El canal: tiene que ser un valor de Platform (el contrato con el front). */
  id: Platform;
  group: ChannelGroup;
  description: string;   // short description used in director prompt context
  slots: SlotSpec[];
  /** plain-text guidance injected into the prompt — channel-specific tactics */
  guidance: string;
  /** null = no produce pieza de diseño; ver PiezaSpec */
  pieza: PiezaSpec | null;
}

export interface ChannelGenerationResult {
  variations: CopyVariation[];
}
