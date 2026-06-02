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

  if (/\b(argentin|argentina|buenos aires|caba|rioplatense|voseo)\b/.test(haystack)) {
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

export const buildLocaleRulesBlock = (locale: MarketLocale): string => {
  const label = LOCALE_LABELS[locale];

  const forbiddenByLocale: Record<MarketLocale, string> = {
    "es-CO": `
    - Voseo y formas rioplatenses: vos, andás, querés, podés, tenés, salí, vení, che, boludo, laburo, mina, pibe, plata (por dinero), bondi, colectivo.
    - Modismos mexicanos: chido, padre (por cool), celular→móvil español, etc.
    - Español de España: vosotros, ordenador, móvil, coger (evitar ambigüedad), vale.
    - Prefiere léxico natural en Colombia: tú/usted según marca, celular, computador, gasolina/combustible, parqueadero, manejar, redimir, acumular, beneficio.`,
    "es-AR": `
    - Mezclar voseo con tuteo en la misma pieza.
    - Modismos colombianos o mexicanos que rompan coherencia rioplatense.
    - Español de España: vosotros, ordenador.`,
    "es-MX": `
    - Voseo argentino y modismos colombianos aislados.
    - Español de España: vosotros, ordenador.`,
    "es-419": `
    - Regionalismos fuertes (voseo, lunfardo, modismos locales).
    - Español de España: vosotros, ordenador.`,
  };

  return `
    REGLAS DE IDIOMA Y VARIANTE (OBLIGATORIO — prioridad sobre estilo genérico):
    - Escribe en ${label}.
    - El copy debe sonar nativo para ese mercado, no traducido ni mezclado entre países.
    - PROHIBIDO usar expresiones fuera del mercado definido:
    ${forbiddenByLocale[locale]}
    - Si las guías de voz del ADN piden un registro distinto, respétalo sin cambiar de país/variante.
  `;
};

export const buildSystemMessage = (locale: MarketLocale): string => {
  const label = LOCALE_LABELS[locale];
  return [
    "Eres un redactor creativo senior de Grupo LoBueno, especializado en copy de marca y performance.",
    `Escribes exclusivamente en ${label}.`,
    "Nunca mezcles variantes del español (p. ej. voseo argentino en copy para Colombia).",
    "Responde siempre en JSON válido cuando se solicite formato JSON.",
  ].join(" ");
};
