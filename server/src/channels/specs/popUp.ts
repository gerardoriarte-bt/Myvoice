import { ChannelSpec } from "../types.js";

export const popUp: ChannelSpec = {
  id: "Pop up",
  group: "engagement",
  description: "Pop-up on-site — título, cuerpo, CTA y microcopy de rechazo.",
  slots: [
    { id: "title", label: "Título", count: 3, unit: "char", max: 50, varyByAngle: true,
      guidance: "Promesa clara o pregunta. Sin clickbait barato." },
    { id: "body", label: "Cuerpo", count: 3, unit: "char", max: 140, varyByAngle: true,
      guidance: "Máximo 2 líneas. Refuerzo del valor + manejo de objeción típica." },
    { id: "cta", label: "CTA principal", count: 3, unit: "char", max: 25,
      guidance: "Verbo de acción específico. Evitar 'Aceptar' / 'Continuar'." },
    { id: "rejectMicrocopy", label: "Microcopy de rechazo", count: 3, unit: "char", max: 60,
      guidance: "Texto del 'No, gracias' que refuerza el costo de rechazar la oferta. Ej: 'No, prefiero seguir pagando más'." }
  ],
  guidance: "El microcopy de rechazo es CLAVE — hace explícito el costo de oportunidad."
};
