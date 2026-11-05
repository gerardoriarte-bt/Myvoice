import { ChannelSpec } from "../types.js";
import { Platform } from "../../types.js";

/** Lo que admite un carrusel por generación (docs/plan-piezas-por-medio.md). */
export const SLIDES_MIN = 3;
export const SLIDES_MAX = 10;
export const SLIDES_POR_DEFECTO = 5;

/**
 * Un carrusel es una pieza con N slides, cada una con su texto, que cuentan una sola historia, más el
 * copy out. El spec declara las 10 posibles; cada generación usa las primeras N (`specParaGeneracion`
 * en registry.ts) y la última cierra con la acción. Hasta el 2026-11-05 las slides del medio eran un
 * solo slot «Slides 2-6» con 5 variaciones, que la herramienta trataba como alternativas.
 */
export const instagramCarrusel: ChannelSpec = {
  id: Platform.INSTAGRAM_CARRUSEL,
  group: "social",
  description: "Carrusel: una historia contada en N slides, más el copy out.",
  slots: [
    { id: "slide1", label: "Slide 1", porPieza: 1, unit: "char", max: 80,
      guidance: "La primera: promesa o tensión que obliga a deslizar." },
    { id: "slide2", label: "Slide 2", porPieza: 1, unit: "char", max: 120,
      guidance: "Paga la promesa de la anterior y abre la siguiente. Una idea." },
    { id: "slide3", label: "Slide 3", porPieza: 1, unit: "char", max: 120,
      guidance: "Paga la promesa de la anterior y abre la siguiente. Una idea." },
    { id: "slide4", label: "Slide 4", porPieza: 1, unit: "char", max: 120,
      guidance: "Paga la promesa de la anterior y abre la siguiente. Una idea." },
    { id: "slide5", label: "Slide 5", porPieza: 1, unit: "char", max: 120,
      guidance: "Paga la promesa de la anterior y abre la siguiente. Una idea." },
    { id: "slide6", label: "Slide 6", porPieza: 1, unit: "char", max: 120,
      guidance: "Paga la promesa de la anterior y abre la siguiente. Una idea." },
    { id: "slide7", label: "Slide 7", porPieza: 1, unit: "char", max: 120,
      guidance: "Paga la promesa de la anterior y abre la siguiente. Una idea." },
    { id: "slide8", label: "Slide 8", porPieza: 1, unit: "char", max: 120,
      guidance: "Paga la promesa de la anterior y abre la siguiente. Una idea." },
    { id: "slide9", label: "Slide 9", porPieza: 1, unit: "char", max: 120,
      guidance: "Paga la promesa de la anterior y abre la siguiente. Una idea." },
    { id: "slide10", label: "Slide 10", porPieza: 1, unit: "char", max: 120,
      guidance: "Paga la promesa de la anterior y abre la siguiente. Una idea." },
    { id: "primeraLinea", label: "Primera línea", porPieza: 1, unit: "char", zona: "copyOut", max: 125,
      guidance: "Copy out. Lo único que se ve antes de «más»: invita a deslizar." },
    { id: "cuerpo", label: "Cuerpo", porPieza: 1, unit: "char", zona: "copyOut", max: 600,
      guidance: "Copy out. Resume el valor del carrusel y cierra con una acción secundaria." },
    { id: "hashtags", label: "Hashtags", porPieza: 1, unit: "char", zona: "copyOut",
      guidance: "3-5 hashtags relevantes, sin spam de marcas." },
    // Legado: así se llamaban hasta el 2026-11-05; sirven para leer lo ya guardado.
    { id: "slide1Hook", label: "Slide 1 — Hook", porPieza: 1, unit: "char", max: 80, legado: true },
    { id: "slidesBody", label: "Slides 2-6 — Desarrollo", porPieza: 1, unit: "char", max: 120, legado: true },
    { id: "slideFinalCTA", label: "Slide final — CTA", porPieza: 1, unit: "char", max: 80, legado: true },
    { id: "caption", label: "Caption del post", porPieza: 1, unit: "char", zona: "copyOut", max: 800, legado: true },
  ],
  guidance: "Una sola historia: la slide 1 engancha, cada slide paga la anterior y la última cierra con la acción. Cada slide se lee sola y en orden.",
  pieza: { tipo: "grafica", formatos: ["1080×1080", "1080×1350"] },
};
