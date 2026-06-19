import { CopyParameters } from "../types.js";

export type MarketLocale = "es-CO" | "es-AR" | "es-MX" | "es-419";

const LOCALE_LABELS: Record<MarketLocale, string> = {
  "es-CO": "español colombiano (usted — registro cálido y profesional)",
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
 * Detecta si el ADN de la marca pide explícitamente voseo paisa/regional.
 * Sólo en ese caso se activa la verificación de voseo.
 */
export const brandUsesVoseo = (params: CopyParameters): boolean => {
  const haystack = [
    params.voice,
    params.brandVoiceGuidelines,
    params.targetAudience,
    params.theme,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /\b(voseo|paisa|antioquia|medellín|eje cafetero|pereira|manizales|armenia|vos \(|usar vos|tutear)\b/.test(haystack);
};

/**
 * Reglas de voseo colombiano (paisa/andino) — solo para marcas que lo piden explícitamente.
 * Se mantiene separado del default de "usted" para no contaminar el tono general.
 */
export const VOSEO_CO_RULES = `
VOSEO COLOMBIANO — solo porque el ADN de esta marca lo solicita (paisa/andino):
- Usa "vos" como pronombre de 2ª persona informal (alternando naturalmente con "usted" si el contexto lo pide).
- Presente indicativo: tenés, podés, querés, sabés, hacés, venís, sos (ser).
- Imperativo: usá con moderación — no abuses de las formas acentuadas en cada frase.
- PROHIBIDO lunfardo/rioplatense: che, boludo, mina, pibe, laburo, bondi.
- Léxico colombiano: celular, computador, gasolina, parqueadero, manejar, bacano, chévere.
`.trim();

export const buildLocaleRulesBlock = (locale: MarketLocale): string => {
  const label = LOCALE_LABELS[locale];

  const rulesBlock: Record<MarketLocale, string> = {
    "es-CO": `
    REGISTRO COLOMBIANO AUTÉNTICO:
    - Usa "usted" como pronombre estándar — en Colombia "usted" es cálido, cercano y personal, no distante.
    - "Usted tiene", "usted puede", "usted merece", "disfrute", "conozca", "aproveche" suenan 100 % colombianos.
    - PROHIBIDO "tú" como pronombre — no suena colombiano, suena extranjero o de otro país.
    - PROHIBIDO forzar voseo (tenés, hacés, podés) salvo que el ADN de la marca lo pida explícitamente — de lo contrario suena argentino.
    - PROHIBIDO lunfardo/rioplatense: che, boludo, mina, pibe, laburo, bondi.
    - Léxico natural colombiano: celular, computador, gasolina, parqueadero, manejar, redimir, acumular, beneficio, bacano, chévere.
    - Tono: cálido, directo, con carácter — sin exagerar regionalismos.`,
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

/**
 * Voseo nunca se fuerza automáticamente — solo cuando la marca lo pide explícitamente.
 * Usa brandUsesVoseo(params) para ese chequeo dinámico.
 */
export const requiresVoseo = (_locale: MarketLocale): boolean => false;

export const buildSystemMessage = (locale: MarketLocale): string => {
  const label = LOCALE_LABELS[locale];
  return [
    "Eres un redactor creativo senior de Grupo LoBueno, especializado en copy de marca y performance.",
    `Escribes exclusivamente en ${label}.`,
    "Nunca mezcles variantes del español ni impongas regionalismos que el ADN de marca no pida.",
    "Responde siempre en JSON válido cuando se solicite formato JSON.",
  ].join(" ");
};
