import { ChannelSpec } from "../types.js";
import { Platform } from "../../types.js";

export const email: ChannelSpec = {
  id: Platform.EMAIL,
  group: "engagement",
  description: "Email marketing — asunto + preheader + header + cuerpo + CTA.",
  slots: [
    { id: "subject", label: "Asunto", porPieza: 1, unit: "char", max: 50,
      guidance: "MAX 50 CARACTERES. Sin spam triggers (\"GRATIS!!!\", \"URGENTE\"). Personal, no plantilla." },
    { id: "preheader", label: "Preheader", porPieza: 1, unit: "char", max: 90,
      guidance: "Texto que aparece junto al asunto en la inbox. MAX 90 CARACTERES. Complementa el asunto, no lo repite." },
    { id: "header", label: "Header del cuerpo", porPieza: 1, unit: "char", max: 80,
      guidance: "Título principal dentro del email. Refuerza la promesa del asunto." },
    { id: "body", label: "Cuerpo", porPieza: 1, unit: "char", max: 600,
      guidance: "2-3 párrafos cortos. Una idea por párrafo. Tono humano, no corporativo." },
    { id: "cta", label: "CTA del botón", porPieza: 1, unit: "char", max: 25,
      guidance: "Verbo de acción específico. Evitar \"Click aquí\" / \"Continuar\"." }
  ],
  guidance: "Subject + preheader trabajan juntos: el preheader extiende la promesa. Body en voz humana, no marketing-speak.",
  pieza: { tipo: "grafica", formatos: ["600 px de ancho"] },
};
