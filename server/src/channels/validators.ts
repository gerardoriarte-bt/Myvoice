import { CopyVariation } from "../types.js";
import { ChannelSpec, SlotSpec, SlotUnit } from "./types.js";

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

export const validateVariation = (
  v: CopyVariation,
  spec: ChannelSpec,
  prohibitions: string
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

  return {
    ...v,
    charCount: count,
    budget: max,
    budgetUnit: unit,
    budgetOk: !overMax && !underMin,
    prohibitionsHit: hits,
  };
};

export const validateBatch = (
  variations: CopyVariation[],
  spec: ChannelSpec,
  prohibitions: string
): CopyVariation[] => variations.map(v => validateVariation(v, spec, prohibitions));
