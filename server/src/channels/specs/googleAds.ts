import { ChannelSpec } from "../types.js";

export const googleAds: ChannelSpec = {
  id: "Google Ads",
  group: "performance",
  description: "Google Ads RSA — 10 títulos cortos (≤30) + 4 títulos largos (≤90) + descripciones.",
  slots: [
    { id: "shortTitle", label: "Título Corto", count: 10, unit: "char", max: 30,
      guidance: "Beneficio directo, verbo de acción. MAX 30 CARACTERES exactos. Sin keywords genéricas." },
    { id: "longTitle", label: "Título Largo", count: 4, unit: "char", max: 90,
      guidance: "Más contexto, propuesta de valor extendida. MAX 90 CARACTERES exactos." },
    { id: "description", label: "Descripción", count: 4, unit: "char", max: 90,
      guidance: "Descripciones que se rotarán con los títulos. MAX 90 CARACTERES. Cada una con un beneficio distinto." }
  ],
  guidance: "Optimizado para CTR y Quality Score. Diferentes ángulos: precio, beneficio, urgencia, social proof."
};
