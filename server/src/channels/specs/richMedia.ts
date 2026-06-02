import { ChannelSpec } from "../types.js";

export const richMedia: ChannelSpec = {
  id: "Rich Media",
  group: "performance",
  description: "Banner Rich Media — Título 25 char, Texto 40 char.",
  slots: [
    { id: "title", label: "Título", count: 5, unit: "char", max: 25,
      guidance: "Headline impactante. MAX 25 CARACTERES exactos." },
    { id: "text", label: "Texto", count: 5, unit: "char", max: 40,
      guidance: "Copy de soporte. MAX 40 CARACTERES exactos." },
    { id: "cta", label: "CTA del botón", count: 3, unit: "char", max: 18,
      guidance: "Verbo de acción para el botón. Corto y directo." },
    { id: "animationBrief", label: "Indicación de animación", count: 1, unit: "char",
      guidance: "Concepto visual + animación sugerida." }
  ],
  guidance: "Espacio MUY limitado. Una idea por banner. Los 5 títulos+textos deben rotar ángulos."
};
