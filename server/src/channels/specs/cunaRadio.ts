import { ChannelSpec } from "../types.js";

export const cunaRadio: ChannelSpec = {
  id: "Cuña de Radio",
  group: "audio",
  description: "Cuña de radio — guion entre 55 y 60 palabras (≈30 segundos).",
  slots: [
    { id: "script", label: "Guion locutado", count: 3, unit: "word", min: 55, max: 60, varyByAngle: true,
      guidance: "ENTRE 55 Y 60 PALABRAS exactas (no más, no menos). Lenguaje hablado, no leído." },
    { id: "production", label: "Indicaciones de producción", count: 1, unit: "char",
      guidance: "Tono del locutor, música sugerida, efectos. Una línea por indicación." }
  ],
  guidance: "Texto pensado para SER ESCUCHADO. Frases cortas, ritmo, sin palabras complejas que se traben."
};
