import { ChannelSpec } from "../types.js";

export const whatsapp: ChannelSpec = {
  id: "WhatsApp",
  group: "engagement",
  description: "Mensaje de WhatsApp — conversacional, *negritas* con asteriscos, máximo 2 emojis.",
  slots: [
    { id: "message", label: "Mensaje", count: 3, unit: "char", max: 500, varyByAngle: true,
      guidance: "Tono conversacional, NO corporativo. Negritas con *asteriscos*. Máximo 2 emojis. Máximo 3 párrafos cortos. Saludo natural, no plantilla." },
    { id: "cta", label: "CTA / link", count: 3, unit: "char", max: 40,
      guidance: "Texto del botón o llamado a la acción al cierre del mensaje." }
  ],
  guidance: "WhatsApp NO es email — es chat. Primera persona, lenguaje cercano, sin firmas formales."
};
