import { ChannelSpec } from "../types.js";
import { Platform } from "../../types.js";

/**
 * Un post es una pieza con dos zonas (docs/plan-piezas-por-medio.md): lo que va en la imagen (titular y
 * bajada) y el copy out que acompaña la publicación (primera línea, cuerpo, hashtags). Hasta el
 * 2026-11-05 el post era casi todo caption y no traía texto para la imagen.
 */
export const instagramPost: ChannelSpec = {
  id: Platform.INSTAGRAM_POST,
  group: "social",
  description: "Post de feed: texto corto en la imagen y copy out que acompaña la publicación.",
  slots: [
    { id: "titular", label: "Titular", porPieza: 1, unit: "char", max: 40,
      guidance: "Va en la imagen. Se lee en un segundo. Construye el concepto." },
    { id: "bajada", label: "Bajada", porPieza: 1, unit: "char", max: 90,
      guidance: "Va en la imagen, debajo del titular. Completa la idea, no la repite." },
    { id: "primeraLinea", label: "Primera línea", porPieza: 1, unit: "char", zona: "copyOut", max: 125,
      guidance: "Copy out. Es lo único que se ve antes de «más»: tiene que enganchar sola." },
    { id: "cuerpo", label: "Cuerpo", porPieza: 1, unit: "char", zona: "copyOut", max: 600,
      guidance: "Copy out. Desarrolla el beneficio y cierra con la acción concreta." },
    { id: "hashtags", label: "Hashtags", porPieza: 1, unit: "char", zona: "copyOut",
      guidance: "3-5 hashtags relevantes, sin spam de marcas." },
    { id: "visualBrief", label: "Idea visual", porPieza: 1, unit: "char", zona: "indicacion",
      guidance: "Indicación para Diseño: el visual concreto (no genérico). No se publica." },
    // Legado: así se llamaban hasta el 2026-11-05; sirven para leer lo ya guardado.
    { id: "hook", label: "Hook (línea 1)", porPieza: 1, unit: "char", zona: "copyOut", max: 80, legado: true, varyByAngle: true },
    { id: "body", label: "Cuerpo del caption", porPieza: 1, unit: "char", zona: "copyOut", max: 124, legado: true, varyByAngle: true },
  ],
  guidance: "Titular y bajada viven en la imagen y se leen de un vistazo; el copy out amplía, no repite.",
  pieza: { tipo: "grafica", formatos: ["1080×1080", "1080×1350"] },
};
