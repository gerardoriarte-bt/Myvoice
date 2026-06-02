import { ChannelSpec } from "../types.js";

export const instagramHistoria: ChannelSpec = {
  id: "Instagram Historia",
  group: "social",
  description: "Story 9:16 — copy super corto + elemento interactivo.",
  slots: [
    { id: "copy", label: "Copy principal", count: 3, unit: "char", max: 90, varyByAngle: true,
      guidance: "Máximo 3 líneas. Una idea por historia." },
    { id: "interactive", label: "Elemento interactivo", count: 1, unit: "char",
      guidance: "Sticker concreto: encuesta / quiz / pregunta / cuenta regresiva. Especificar texto del sticker." },
    { id: "swipeCTA", label: "CTA / swipe-up", count: 1, unit: "char", max: 30,
      guidance: "Texto del botón o sticker de link. Verbo de acción." }
  ],
  guidance: "Tono directo, conversacional. Cada historia debe poder ser autónoma."
};
