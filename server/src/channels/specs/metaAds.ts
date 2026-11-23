import { ChannelSpec } from "../types.js";
import { Platform } from "../../types.js";

/**
 * Meta Ads (2026-11-23): las piezas maestras de Meta en CDM (decisión 18) piden los mismos tres textos, todos de
 * plataforma: no van en la imagen, los carga el trafficker. El largo de cada uno lo decide CDM según las
 * ubicaciones que eligió la línea, y llega en el pedido (`textosDelPedido`); los de aquí son los de por defecto,
 * los del feed. Una pieza de video 4:5, por ejemplo, no lleva descripción: el pedido la deja afuera.
 */
export const metaAds: ChannelSpec = {
  id: Platform.META_ADS,
  group: "performance",
  description: "Meta Ads — texto principal, título y descripción; el largo lo fijan las ubicaciones elegidas en CDM.",
  slots: [
    { id: "textoPrincipal", label: "Texto principal", porPieza: 1, unit: "char", max: 125, zona: "copyOut",
      guidance: "Va arriba de la imagen o el video. Lo importante en las primeras palabras: en muchas ubicaciones se corta. Respeta el MÁXIMO de caracteres." },
    { id: "titulo", label: "Título", porPieza: 1, unit: "char", max: 40, zona: "copyOut",
      guidance: "Va debajo de la pieza, junto al botón. Beneficio concreto, sin repetir el texto principal. Respeta el MÁXIMO." },
    { id: "descripcion", label: "Descripción", porPieza: 1, unit: "char", max: 30, zona: "copyOut",
      guidance: "Línea corta bajo el título; no siempre se muestra. Refuerza, no repite. Respeta el MÁXIMO." }
  ],
  guidance: "Un anuncio de Meta: los tres textos se leen juntos con la pieza. Cada texto debe funcionar aunque los otros no se muestren.",
  pieza: { tipo: "grafica", formatos: ["1080×1080", "1080×1350", "1080×1920"] },
};
