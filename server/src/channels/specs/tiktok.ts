import { ChannelSpec } from "../types.js";

export const tiktok: ChannelSpec = {
  id: "TikTok",
  group: "social",
  description: "Video TikTok — caption MAX 100 caracteres, hook verbal en 2s.",
  slots: [
    { id: "verbalHook", label: "Hook verbal (0-2s)", count: 3, unit: "char", max: 80, varyByAngle: true,
      guidance: "Frase de apertura del video. Crea curiosidad o tensión inmediata." },
    { id: "narrative", label: "Narrativa", count: 1, unit: "char",
      guidance: "Estructura escena por escena con tiempo y diálogo." },
    { id: "caption", label: "Caption", count: 3, unit: "char", max: 100, varyByAngle: true,
      guidance: "MAX 100 CARACTERES — hard limit de la plataforma. Nada de hashtags genéricos." },
    { id: "cta", label: "CTA", count: 1, unit: "char", max: 60,
      guidance: "Acción específica al final del video." }
  ],
  guidance: "Tono nativo de TikTok: directo, casual, sin sonar a anuncio. Caption ≤ 100 char es duro."
};
