import { ChannelSpec } from "../types.js";
import { Platform } from "../../types.js";

/**
 * Google Recursos (2026-11-25): un solo canal para los textos de plataforma de Google y DV360 en CDM —Display
 * responsivo, Performance Max, Demand Gen, YouTube y native—. Cada pieza de la biblioteca de Google dice qué textos lleva, cuántos y de qué
 * largo según las ubicaciones que eligió la línea; llegan en el pedido (`textosDelPedido`) y este canal escribe solo
 * esos. Sin pedido (Generar suelto) escribe un grupo de recursos de Performance Max: 5 títulos, 1 título largo, 2
 * descripciones y el nombre del negocio. Las rutas, el llamado a la acción y los títulos de tarjeta solo si se piden.
 * Casi todos son de plataforma: no van en la imagen, los carga el trafficker. El titular y el llamado a la acción van
 * dentro del arte de los banners, los intersticiales y los videos que no traen textos de plataforma.
 */
export const googleRecursos: ChannelSpec = {
  id: Platform.GOOGLE_RECURSOS,
  group: "performance",
  description: "Google (PMax, Demand Gen, Display responsivo, YouTube) — títulos, títulos largos y descripciones según la pieza.",
  slots: [
    { id: "titulo", label: "Título", porPieza: 5, unit: "char", max: 30, zona: "copyOut",
      guidance: "Google los combina entre sí y con las imágenes: cada título debe leerse solo y no repetir a los demás. Respeta el MÁXIMO." },
    { id: "tituloLargo", label: "Título largo", porPieza: 1, unit: "char", max: 90, zona: "copyOut",
      guidance: "Reemplaza al título donde hay espacio. Una idea completa, no dos títulos pegados. Respeta el MÁXIMO." },
    { id: "descripcion", label: "Descripción", porPieza: 2, unit: "char", max: 90, zona: "copyOut",
      guidance: "Amplía el título con el beneficio o la prueba. Cada una debe funcionar sin las otras. Respeta el MÁXIMO." },
    { id: "negocio", label: "Nombre del negocio", porPieza: 1, unit: "char", max: 25, zona: "copyOut",
      guidance: "El nombre de la marca tal como se escribe. Nada más." },
    { id: "ruta", label: "Ruta de la URL", porPieza: 2, unit: "char", max: 15, zona: "copyOut", soloSiSePide: true,
      guidance: "Una palabra o dos, sin espacios ni tildes, que diga adónde lleva: «ofertas», «planes»." },
    { id: "cta", label: "Llamado a la acción", porPieza: 1, unit: "char", max: 15, zona: "copyOut", soloSiSePide: true,
      guidance: "Verbo y objeto, corto: «Pide tu demo»." },
    { id: "titular", label: "Titular", porPieza: 1, unit: "char", max: 30, zona: "pieza", soloSiSePide: true,
      guidance: "Va dentro del arte (banner, intersticial, video): lo lee alguien de pasada. Una idea, el beneficio primero." },
    { id: "llamado", label: "Llamado a la acción", porPieza: 1, unit: "char", max: 15, zona: "pieza", soloSiSePide: true,
      guidance: "El botón del arte. Verbo y objeto: «Pide tu demo»." },
    { id: "descripcionLarga", label: "Descripción larga", porPieza: 1, unit: "char", max: 150, zona: "copyOut", soloSiSePide: true,
      guidance: "Native de DV360: el cuerpo donde hay espacio. Desarrolla el beneficio con una prueba concreta." },
    { id: "tarjetaDescripcion", label: "Descripción de tarjeta", porPieza: 3, unit: "char", max: 70, zona: "copyOut", soloSiSePide: true,
      guidance: "Acompaña el título de su tarjeta del carrusel; no repite el de las otras." },
    { id: "tarjetaTitulo", label: "Título de tarjeta", porPieza: 3, unit: "char", max: 40, zona: "copyOut", soloSiSePide: true,
      guidance: "Una tarjeta del carrusel: cada una con su propia idea, en orden, como una secuencia." },
  ],
  guidance: "Google arma el anuncio combinando estos recursos según el espacio. Ningún texto puede depender de otro para entenderse.",
  pieza: { tipo: "grafica", formatos: ["1200×628", "1200×1200", "960×1200"] },
  mixto: true,
};
