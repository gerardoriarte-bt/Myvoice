import { ChannelSpec } from "../types.js";

export const youtube: ChannelSpec = {
  id: "YouTube",
  group: "social",
  description: "YouTube — head line 30 char, long line 90 char, descripción 90 char.",
  slots: [
    { id: "headLine", label: "Head Line", count: 3, unit: "char", max: 30, varyByAngle: true,
      guidance: "Título corto / thumbnail. MAX 30 CARACTERES." },
    { id: "longLine", label: "Long Line", count: 3, unit: "char", max: 90, varyByAngle: true,
      guidance: "Título largo / video title. MAX 90 CARACTERES, optimizado para SEO + CTR." },
    { id: "description", label: "Descripción", count: 3, unit: "char", max: 90, varyByAngle: true,
      guidance: "Primera línea de la descripción que aparece sin expandir. MAX 90 CARACTERES." }
  ],
  guidance: "Cada combinación headLine + longLine + description debe ser coherente entre sí (mismo ángulo)."
};
