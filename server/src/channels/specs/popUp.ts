import { ChannelSpec } from "../types.js";
import { Platform } from "../../types.js";

export const popUp: ChannelSpec = {
  id: Platform.POP_UP,
  group: "engagement",
  description: "Pop-up on-site — título, cuerpo, CTA y microcopy de rechazo.",
  slots: [
    { id: "title", label: "Título", porPieza: 1, unit: "char", max: 50,
      guidance: "Promesa clara o pregunta. Sin clickbait barato." },
    { id: "body", label: "Cuerpo", porPieza: 1, unit: "char", max: 140,
      guidance: "Máximo 2 líneas. Refuerzo del valor + manejo de objeción típica." },
    { id: "cta", label: "CTA principal", porPieza: 1, unit: "char", max: 25,
      guidance: "Verbo de acción específico. Evitar 'Aceptar' / 'Continuar'." },
    { id: "rejectMicrocopy", label: "Microcopy de rechazo", porPieza: 1, unit: "char", max: 60,
      guidance: "Texto del 'No, gracias' que refuerza el costo de rechazar la oferta. Ej: 'No, prefiero seguir pagando más'." }
  ],
  guidance: "El microcopy de rechazo es CLAVE — hace explícito el costo de oportunidad.",
  pieza: { tipo: "grafica", formatos: ["600×400", "1080×1080"] },
};
