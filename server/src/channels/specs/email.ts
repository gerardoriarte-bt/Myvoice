import { ChannelSpec } from "../types.js";

export const email: ChannelSpec = {
  id: "Email",
  group: "engagement",
  description: "Email marketing — asunto + preheader + header + cuerpo + CTA.",
  slots: [
    { id: "subject", label: "Asunto", count: 3, unit: "char", max: 50, varyByAngle: true,
      guidance: "MAX 50 CARACTERES. Sin spam triggers (\"GRATIS!!!\", \"URGENTE\"). Personal, no plantilla." },
    { id: "preheader", label: "Preheader", count: 3, unit: "char", max: 90, varyByAngle: true,
      guidance: "Texto que aparece junto al asunto en la inbox. MAX 90 CARACTERES. Complementa el asunto, no lo repite." },
    { id: "header", label: "Header del cuerpo", count: 3, unit: "char", max: 80,
      guidance: "Título principal dentro del email. Refuerza la promesa del asunto." },
    { id: "body", label: "Cuerpo", count: 3, unit: "char", max: 600, varyByAngle: true,
      guidance: "2-3 párrafos cortos. Una idea por párrafo. Tono humano, no corporativo." },
    { id: "cta", label: "CTA del botón", count: 3, unit: "char", max: 25,
      guidance: "Verbo de acción específico. Evitar \"Click aquí\" / \"Continuar\"." }
  ],
  guidance: "Subject + preheader trabajan juntos: el preheader extiende la promesa. Body en voz humana, no marketing-speak."
};
