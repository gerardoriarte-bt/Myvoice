import { ChannelSpec } from "../types.js";

export const googleDisplay: ChannelSpec = {
  id: "Google Display",
  group: "performance",
  description: "Google Display Responsivo — 10 títulos cortos (≤30) + 4 títulos largos (≤90) + descripciones.",
  slots: [
    { id: "shortTitle", label: "Título Corto", count: 10, unit: "char", max: 30,
      guidance: "Headline visible en banners pequeños. Beneficio directo. MAX 30 CARACTERES." },
    { id: "longTitle", label: "Título Largo", count: 4, unit: "char", max: 90,
      guidance: "Visible en banners grandes / nativos. MAX 90 CARACTERES." },
    { id: "description", label: "Descripción", count: 4, unit: "char", max: 90,
      guidance: "Body acompañante. MAX 90 CARACTERES." }
  ],
  guidance: "Display rota titulares con creatividades; cada título debe poder leerse aislado y vender solo."
};
