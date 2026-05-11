import { ChannelSpec } from "../types.js";

export const instagramCarrusel: ChannelSpec = {
  id: "Instagram Carrusel",
  group: "social",
  description: "Carrusel de 5-7 slides con narrativa progresiva.",
  slots: [
    { id: "slide1Hook", label: "Slide 1 — Hook", count: 1, unit: "char", max: 80,
      guidance: "Promesa o pregunta que obliga a deslizar." },
    { id: "slidesBody", label: "Slides 2-6 — Desarrollo", count: 5, unit: "char", max: 120,
      guidance: "Una idea por slide. Progresión lógica: problema → tensión → resolución." },
    { id: "slideFinalCTA", label: "Slide final — CTA", count: 1, unit: "char", max: 80,
      guidance: "Llamado claro y específico, no 'visita el link'." },
    { id: "caption", label: "Caption del post", count: 1, unit: "char", max: 800,
      guidance: "Resumen del valor del carrusel. Incluir CTA secundario." }
  ],
  guidance: "Narrativa con progresión. Cada slide debe pagar la promesa del anterior."
};
