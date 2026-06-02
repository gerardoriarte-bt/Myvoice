import { ChannelSpec } from "../types.js";

export const instagramReel: ChannelSpec = {
  id: "Instagram Reel",
  group: "social",
  description: "Video corto vertical — guion con hook verbal en los primeros 3s.",
  slots: [
    { id: "verbalHook", label: "Hook verbal (0-3s)", count: 3, unit: "char", max: 90, varyByAngle: true,
      guidance: "Frase que se DICE en los primeros 3 segundos. Scroll-stop." },
    { id: "structure", label: "Estructura escena por escena", count: 1, unit: "char",
      guidance: "Lista numerada de escenas con tiempo aproximado y acción/diálogo." },
    { id: "onScreenText", label: "Texto en pantalla", count: 3, unit: "char", max: 50,
      guidance: "Frases cortas que aparecen sobreimpresas. Refuerzan el audio, no lo repiten." },
    { id: "caption", label: "Caption", count: 1, unit: "char", max: 500,
      guidance: "Caption corto. Hashtags al final." },
    { id: "cta", label: "CTA final", count: 1, unit: "char", max: 60,
      guidance: "Acción concreta que cierra el reel." }
  ],
  guidance: "Guion para video. El hook verbal y el visual deben funcionar juntos en 3 segundos."
};
