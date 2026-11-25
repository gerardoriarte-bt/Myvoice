import { metaAds } from "./specs/metaAds.js";
import { googleRecursos } from "./specs/googleRecursos.js";
import { ChannelSpec, PiezaSpec, SlotSpec, ZonaSlot } from "./types.js";
import { instagramPost } from "./specs/instagramPost.js";
import { instagramHistoria } from "./specs/instagramHistoria.js";
import { instagramCarrusel, SLIDES_MAX, SLIDES_MIN, SLIDES_POR_DEFECTO } from "./specs/instagramCarrusel.js";
import { instagramReel } from "./specs/instagramReel.js";
import { tiktok } from "./specs/tiktok.js";
import { youtube } from "./specs/youtube.js";
import { cunaRadio } from "./specs/cunaRadio.js";
import { googleAds } from "./specs/googleAds.js";
import { googleDisplay } from "./specs/googleDisplay.js";
import { richMedia } from "./specs/richMedia.js";
import { popUp } from "./specs/popUp.js";
import { pushNotification } from "./specs/pushNotification.js";
import { email } from "./specs/email.js";
import { whatsapp } from "./specs/whatsapp.js";

const ALL: ChannelSpec[] = [
  instagramPost,
  instagramHistoria,
  instagramCarrusel,
  instagramReel,
  tiktok,
  youtube,
  cunaRadio,
  googleAds,
  googleDisplay,
  richMedia,
  popUp,
  pushNotification,
  email,
  whatsapp,
  metaAds,
  googleRecursos,
];

export const CHANNEL_REGISTRY: Map<string, ChannelSpec> = new Map(
  ALL.map(c => [c.id, c])
);

export const getChannelSpec = (id: string): ChannelSpec | undefined =>
  CHANNEL_REGISTRY.get(id);

export const listChannels = (): ChannelSpec[] => ALL;

export const getSlotSpec = (platformId: string, slotId: string): SlotSpec | undefined =>
  CHANNEL_REGISTRY.get(platformId)?.slots.find(s => s.id === slotId);

/**
 * Fuente única de verdad de la etiqueta de un slot: el writer, el controller y el
 * backfill la consultan del mismo lugar en vez de cada uno armar la suya.
 * Devuelve null cuando el canal no tiene spec o el slot no le pertenece: la
 * etiqueta no se inventa.
 */
export const resolveSlotLabel = (platformId: string, slotId?: string | null): string | null =>
  slotId ? getSlotSpec(platformId, slotId)?.label ?? null : null;

/**
 * Los cuatro slots que el motor emite como INSTRUCCIÓN de producción y no como
 * copy publicable. Van a la orden de trabajo del diseñador, pero no se auditan
 * contra la pieza: no son texto que deba aparecer en el arte.
 */
const SLOTS_DE_INSTRUCCION = new Set(["visualBrief", "animationBrief", "structure", "production"]);

export const esSlotDeInstruccion = (slotId?: string | null): boolean =>
  !!slotId && SLOTS_DE_INSTRUCCION.has(slotId);

/**
 * El entregable del canal, o null si no produce ninguno. Un canal sin spec
 * también devuelve null: lo desconocido no entra al tablero.
 */
export const getPiezaSpec = (platformId: string): PiezaSpec | null =>
  CHANNEL_REGISTRY.get(platformId)?.pieza ?? null;

/** El formato por defecto que la propuesta de alta ofrece para el canal. */
export const formatoPorDefecto = (platformId: string): string | null =>
  getPiezaSpec(platformId)?.formatos[0] ?? null;

export const esFormatoValido = (platformId: string, formato: string): boolean =>
  !!getPiezaSpec(platformId)?.formatos.includes(formato);

/** Dónde va un texto guardado: en la pieza, como copy out o como indicación (docs/plan-piezas-por-medio.md). */
export const zonaDe = (platformId: string, slotId?: string | null): ZonaSlot => {
  if (esSlotDeInstruccion(slotId)) return "indicacion";
  return (slotId ? getSlotSpec(platformId, slotId)?.zona : undefined) ?? "pieza";
};

export const esCarrusel = (platformId: string): boolean => platformId === instagramCarrusel.id;

/** Las slides pedidas, dentro del rango del carrusel. */
export const slidesValidas = (slides?: number | null): number =>
  Number.isInteger(slides) ? Math.min(SLIDES_MAX, Math.max(SLIDES_MIN, slides as number)) : SLIDES_POR_DEFECTO;

/**
 * El spec que usa UNA generación: sin los slots de legado y, en el carrusel, con las primeras N slides,
 * la última convertida en el cierre. El spec del registro no cambia: sigue resolviendo las etiquetas de
 * todo lo guardado.
 */
export const specParaGeneracion = (
  spec: ChannelSpec,
  opciones: { slides?: number | null; textosDelPedido?: { slot: string; max: number | null; porPieza?: number | null }[] | null } = {}
): ChannelSpec => {
  let slots = spec.slots.filter(s => !s.legado);
  // F4: lo que pidió CDM manda sobre el spec: qué textos lleva la pieza, su largo y cuántos. Solo si alguno coincide
  // con los slots del canal; si no, el pedido no aplica a este spec y se sigue con el de siempre.
  const pedido = (opciones.textosDelPedido ?? []).filter(t => slots.some(s => s.id === t.slot));
  if (pedido.length) {
    slots = slots
      .filter(s => pedido.some(t => t.slot === s.id))
      .map(s => {
        const t = pedido.find(x => x.slot === s.id)!;
        return {
          ...s,
          ...(typeof t.max === "number" && t.max > 0 ? { max: t.max } : {}),
          ...(typeof t.porPieza === "number" && t.porPieza > 0 ? { porPieza: t.porPieza } : {}),
        };
      });
  } else {
    // Sin pedido, lo que solo se escribe si se pide (rutas, CTA, tarjetas de Google) queda afuera.
    slots = slots.filter(s => !s.soloSiSePide);
  }
  if (esCarrusel(spec.id)) {
    const n = slidesValidas(opciones.slides);
    slots = slots
      .filter(s => !/^slide\d+$/.test(s.id) || Number(s.id.slice(5)) <= n)
      .map(s =>
        s.id === `slide${n}`
          ? { ...s, max: 80, guidance: "La última: cierra la historia con la acción concreta (no «visita el link»)." }
          : s
      );
  }
  return { ...spec, slots };
};

/** Cuántos textos lleva una pieza de este spec (para repartir las piezas en tandas). */
export const textosPorPieza = (spec: ChannelSpec): number => spec.slots.reduce((n, s) => n + (s.porPieza || 1), 0);

/**
 * La clase de medio de un canal (decisión 29), para Implementación cuando el copy no viene de una sábana: con
 * sábana manda la clase del medio en CDM. Redes sociales las publica el community manager; lo demás, el trafficker.
 */
export const claseDeCanal = (platformId: string): 'PAGOS' | 'REDES_SOCIALES' | 'PROPIOS' | 'TRADICIONAL' | null => {
  const grupo = getChannelSpec(platformId)?.group;
  return grupo === 'social' ? 'REDES_SOCIALES' : grupo === 'performance' ? 'PAGOS' : grupo === 'engagement' ? 'PROPIOS' : grupo === 'audio' ? 'TRADICIONAL' : null;
};

/** Si el canal produce pieza de diseño. Con sábana manda el formato de CDM (solo texto = no). */
export const producePieza = (platformId: string): boolean => Boolean(getChannelSpec(platformId)?.pieza);
