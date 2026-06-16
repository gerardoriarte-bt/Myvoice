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

/**
 * Tuteo forms that are unambiguously 2nd-person singular tuteo — never appear in voseo.
 * Maps the found tuteo form → the Colombian voseo correction.
 * Sorted longest-first to avoid substring collisions.
 */
const TUTEO_FORMS: { pattern: RegExp; correction: string }[] = [
  { pattern: /\btienes\b/gi,  correction: "tenés"  },
  { pattern: /\bpuedes\b/gi,  correction: "podés"  },
  { pattern: /\bquieres\b/gi, correction: "querés" },
  { pattern: /\bvienes\b/gi,  correction: "venís"  },
  { pattern: /\bhaces\b/gi,   correction: "hacés"  },
  { pattern: /\bsabes\b/gi,   correction: "sabés"  },
  { pattern: /\beres\b/gi,    correction: "sos"    },
  { pattern: /\btú\b/gi,      correction: "vos"    },
];

/**
 * Scan text for unambiguous Colombian tuteo violations.
 * Returns strings like "tienes → tenés" for each hit found.
 */
export const detectTuteo = (text: string): string[] => {
  const hits: string[] = [];
  for (const { pattern, correction } of TUTEO_FORMS) {
    const matches = text.match(pattern);
    if (matches) {
      const unique = [...new Set(matches.map(m => m.toLowerCase()))];
      unique.forEach(m => hits.push(`${m} → ${correction}`));
    }
  }
  return hits;
};

export const validateVariation = (
  v: CopyVariation,
  spec: ChannelSpec,
  prohibitions: string,
  checkVoseo = false
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
  const tuteoHits = checkVoseo ? detectTuteo(v.content) : (v.tuteoHits ?? []);

  return {
    ...v,
    charCount: count,
    budget: max,
    budgetUnit: unit,
    budgetOk: !overMax && !underMin,
    prohibitionsHit: hits,
    tuteoHits,
  };
};

export const validateBatch = (
  variations: CopyVariation[],
  spec: ChannelSpec,
  prohibitions: string,
  checkVoseo = false
): CopyVariation[] => variations.map(v => validateVariation(v, spec, prohibitions, checkVoseo));
