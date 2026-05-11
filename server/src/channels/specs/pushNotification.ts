import { ChannelSpec } from "../types.js";

export const pushNotification: ChannelSpec = {
  id: "Push Notification",
  group: "engagement",
  description: "Push notification — Título 25 char, Texto 40 char.",
  slots: [
    { id: "title", label: "Título", count: 5, unit: "char", max: 25,
      guidance: "Headline corto que aparece negrita. MAX 25 CARACTERES exactos." },
    { id: "text", label: "Texto", count: 5, unit: "char", max: 40,
      guidance: "Cuerpo del push. MAX 40 CARACTERES exactos. Cierra con beneficio o urgencia." }
  ],
  guidance: "Contar caracteres incluyendo espacios. Cada par título+texto debe rotar un ángulo distinto."
};
