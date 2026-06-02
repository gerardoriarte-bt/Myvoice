import { ChannelSpec } from "../types.js";

export const instagramPost: ChannelSpec = {
  id: "Instagram Post",
  group: "social",
  description: "Feed post — combinación de hook visual + caption.",
  slots: [
    { id: "hook", label: "Hook (línea 1)", count: 3, unit: "char", max: 80, varyByAngle: true,
      guidance: "Primera línea SIN truncar. Stop-scroll obligatorio." },
    { id: "body", label: "Cuerpo del caption", count: 3, unit: "char", max: 124, varyByAngle: true,
      guidance: "Máximo 124 caracteres (sin hashtags ni idea visual). CTA explícito al final." },
    { id: "hashtags", label: "Hashtags", count: 1, unit: "char",
      guidance: "3-5 hashtags relevantes, sin spam de marcas." },
    { id: "visualBrief", label: "Idea visual", count: 1, unit: "char",
      guidance: "Descripción concreta del visual sugerido (no genérica)." }
  ],
  guidance: "El hook debe poder leerse SIN expandir. Caption en español neutro/local según marca."
};
