import { ChannelSpec } from "../types.js";
import { Platform } from "../../types.js";

export const tiktok: ChannelSpec = {
  id: Platform.TIKTOK,
  group: "social",
  description: "Video TikTok — caption MAX 100 caracteres, hook verbal en 2s.",
  slots: [
    { id: "verbalHook", label: "Hook verbal (0-2s)", porPieza: 1, unit: "char", max: 80,
      guidance: "Frase de apertura del video. Crea curiosidad o tensión inmediata." },
    { id: "narrative", label: "Narrativa", porPieza: 1, unit: "char",
      guidance: "Estructura escena por escena con tiempo y diálogo." },
    { id: "caption", label: "Caption", porPieza: 1, unit: "char", zona: "copyOut", max: 100,
      guidance: "MAX 100 CARACTERES — hard limit de la plataforma. Nada de hashtags genéricos." },
    { id: "cta", label: "CTA", porPieza: 1, unit: "char", max: 60,
      guidance: "Acción específica al final del video." }
  ],
  guidance: "Tono nativo de TikTok: directo, casual, sin sonar a anuncio. Caption ≤ 100 char es duro.",
  pieza: { tipo: "video", formatos: ["1080×1920"] },
};
