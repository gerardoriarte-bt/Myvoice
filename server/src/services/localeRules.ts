import { CopyParameters } from "../types.js";

export type MarketLocale = "es-CO" | "es-AR" | "es-MX" | "es-419";

const LOCALE_LABELS: Record<MarketLocale, string> = {
  "es-CO": "español de Colombia (latino neutro profesional)",
  "es-AR": "español de Argentina (rioplatense, solo si el ADN lo exige)",
  "es-MX": "español de México",
  "es-419": "español latinoamericano neutro (sin regionalismos marcados)",
};

/** Infiere mercado desde ADN; por defecto Colombia (marcas LoBueno / Terpel). */
export const resolveMarketLocale = (params: CopyParameters): MarketLocale => {
  const haystack = [
    params.keywords,
    params.targetAudience,
    params.product,
    params.theme,
    params.brandVoiceGuidelines,
    params.valueProposition,
    params.clientName,
    params.clientIndustry,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b(argentin|argentina|buenos aires|caba|rioplatense|lunfardo)\b/.test(haystack)) {
    return "es-AR";
  }
  if (/\b(méxico|mexico|cdmx|latam mex)\b/.test(haystack)) {
    return "es-MX";
  }
  if (/\b(colombia|colombian|bogotá|medellín|puntos colombia)\b/.test(haystack)) {
    return "es-CO";
  }

  return "es-CO";
};

/**
 * Reglas de voseo colombiano (paisa/andino) — inyectadas en prompts para es-CO.
 * El voseo colombiano NO es igual al rioplatense: comparte la morfología (-ás/-és/-ís)
 * pero carece del lunfardo argentino (che, boludo, laburo, mina, pibe).
 */
export const VOSEO_CO_RULES = `
VOSEO COLOMBIANO — OBLIGATORIO para es-CO (paisa/andino):
- Usa SIEMPRE "vos" como pronombre de 2ª persona informal (nunca "tú").
- Presente indicativo: hablás, comés, vivís, tenés, podés, querés, sabés, hacés, venís, sos (ser), vas (ir — irregular).
- Imperativo afirmativo: hablá, comé, viví, tené, podé, queré, sabé, hacé, vení — acento en la última sílaba.
- Los posesivos siguen siendo "tu/tuyo" (no cambian con el voseo).
- PROHIBIDO tuteo: tú (pronombre), eres, tienes, puedes, quieres, sabes, haces, vienes.
- PROHIBIDO lunfardo/rioplatense: che, boludo, mina, pibe, laburo, bondi, birra (por cerveza), plata (si es exclusivamente rioplatense).
- OK usar "usted" cuando la marca o el contexto exige formalidad — nunca mezclar usted + vos en la misma pieza.
- Léxico natural colombiano: celular, computador, gasolina, parqueadero, manejar, redimir, acumular, beneficio, bacano, chévere, parce (solo si el ADN lo permite).
`.trim();

export const buildLocaleRulesBlock = (locale: MarketLocale): string => {
  const label = LOCALE_LABELS[locale];

  const rulesBlock: Record<MarketLocale, string> = {
    "es-CO": `
    OBLIGATORIO — voseo colombiano (paisa/andino):
    ${VOSEO_CO_RULES}`,
    "es-AR": `
    PROHIBIDO:
    - Mezclar voseo con tuteo en la misma pieza.
    - Modismos colombianos o mexicanos que rompan coherencia rioplatense.
    - Español de España: vosotros, ordenador.`,
    "es-MX": `
    PROHIBIDO:
    - Voseo argentino y modismos colombianos aislados.
    - Español de España: vosotros, ordenador.`,
    "es-419": `
    PROHIBIDO:
    - Regionalismos fuertes (voseo marcado, lunfardo, modismos locales).
    - Español de España: vosotros, ordenador.`,
  };

  return `
    REGLAS DE IDIOMA Y VARIANTE (OBLIGATORIO — prioridad sobre estilo genérico):
    - Escribe en ${label}.
    - El copy debe sonar nativo para ese mercado, no traducido ni mezclado entre países.
    ${rulesBlock[locale]}
    - Si las guías de voz del ADN piden un registro distinto, respétalo sin cambiar de país/variante.
  `;
};

/** Indica si el locale exige voseo activo (para validators y fixer). */
export const requiresVoseo = (locale: MarketLocale): boolean => locale === "es-CO";

export const buildSystemMessage = (locale: MarketLocale): string => {
  const label = LOCALE_LABELS[locale];
  return [
    "Eres un redactor creativo senior de Grupo LoBueno, especializado en copy de marca y performance.",
    `Escribes exclusivamente en ${label}.`,
    "Nunca mezcles variantes del español (p. ej. voseo argentino en copy para Colombia).",
    "Responde siempre en JSON válido cuando se solicite formato JSON.",
  ].join(" ");
};
