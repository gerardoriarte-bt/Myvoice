import { faltasDeTratamiento, Tratamiento } from "../comun/adn/tratamiento.js";
import { CopyVariation } from "../types.js";
import { ChannelSpec, SlotSpec, SlotUnit } from "./types.js";
import { detectarOficio } from "../services/oficio.js";

const countUnits = (text: string, unit: SlotUnit): number => {
  if (unit === "word") {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }
  return text.length;
};

const findProhibitions = (text: string, prohibitions: string): string[] => {
  if (!prohibitions) return [];
  const tokens = prohibitions
    .split(",")
    .map(t => t.trim())
    .filter(Boolean);
  const lower = text.toLowerCase();
  return tokens.filter(t => lower.includes(t.toLowerCase()));
};


/** Lo que el validador necesita saber de la marca y la campaña para las reglas del manual. */
export interface ContextoDeValidacion {
  marca?: string;
  concepto?: string;
}

/**
 * Un titular de una pieza que lleva logo: el slot corto (≤ 90 caracteres) de un
 * canal gráfico o de video. Ahí repetir la marca es espacio desperdiciado; en
 * un push, un email sin pieza o una cuña de radio, no.
 */
const esTitularConLogo = (spec: ChannelSpec, slot: SlotSpec | undefined): boolean =>
  Boolean(spec.pieza && spec.pieza.tipo !== "audio" && slot && slot.unit === "char" && (slot.max ?? Infinity) <= 90);

export const validateVariation = (
  v: CopyVariation,
  spec: ChannelSpec,
  prohibitions: string,
  tratamiento: Tratamiento | null = null,
  ctx: ContextoDeValidacion = {}
): CopyVariation => {
  const slot: SlotSpec | undefined = v.slot
    ? spec.slots.find(s => s.id === v.slot)
    : undefined;
  const unit: SlotUnit = slot?.unit || "char";
  const count = countUnits(v.content, unit);
  const max = slot?.max;
  const min = slot?.min;
  const overMax = max !== undefined && count > max;
  const underMin = min !== undefined && count < min;
  const hits = findProhibitions(v.content, prohibitions);
  const tuteoHits = tratamiento ? faltasDeTratamiento(v.content, tratamiento) : (v.tuteoHits ?? []);
  const oficioHits = detectarOficio(v.content, {
    marca: ctx.marca,
    concepto: ctx.concepto,
    titularConLogo: esTitularConLogo(spec, slot),
  });

  return {
    ...v,
    charCount: count,
    budget: max,
    budgetUnit: unit,
    budgetOk: !overMax && !underMin,
    prohibitionsHit: hits,
    tuteoHits,
    oficioHits,
  };
};

export const validateBatch = (
  variations: CopyVariation[],
  spec: ChannelSpec,
  prohibitions: string,
  tratamiento: Tratamiento | null = null,
  ctx: ContextoDeValidacion = {}
): CopyVariation[] => variations.map(v => validateVariation(v, spec, prohibitions, tratamiento, ctx));
