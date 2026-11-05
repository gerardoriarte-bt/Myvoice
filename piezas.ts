import { Platform } from './types';

/**
 * Un medio por generación y cuántas piezas (docs/plan-piezas-por-medio.md). Los límites son los del
 * motor (server/src/services/openaiService.ts `cantidadValida`, channels/specs/instagramCarrusel.ts):
 * si cambian allá, cambian acá.
 */
export const CANTIDAD = { min: 1, max: 10, porDefecto: 3 } as const;
export const SLIDES = { min: 3, max: 10, porDefecto: 5 } as const;

export const esCarrusel = (p?: string | null) => p === Platform.INSTAGRAM_CARRUSEL;

/** [singular, plural] de una pieza de cada medio, para «Generar 5 carruseles». */
const NOMBRE: Record<string, [string, string]> = {
  [Platform.INSTAGRAM_POST]: ['post', 'posts'],
  [Platform.INSTAGRAM_CARRUSEL]: ['carrusel', 'carruseles'],
  [Platform.INSTAGRAM_HISTORIA]: ['historia', 'historias'],
  [Platform.INSTAGRAM_REEL]: ['reel', 'reels'],
  [Platform.TIKTOK]: ['video', 'videos'],
  [Platform.YOUTUBE]: ['video', 'videos'],
  [Platform.GOOGLE_ADS]: ['anuncio', 'anuncios'],
  [Platform.GOOGLE_DISPLAY]: ['anuncio', 'anuncios'],
  [Platform.RICH_MEDIA]: ['pieza', 'piezas'],
  [Platform.POP_UP]: ['pop up', 'pop ups'],
  [Platform.PUSH]: ['push', 'push'],
  [Platform.EMAIL]: ['email', 'emails'],
  [Platform.WHATSAPP]: ['mensaje', 'mensajes'],
  [Platform.CUNA_RADIO]: ['cuña', 'cuñas'],
};

export const nombreDePiezas = (platform: string | null | undefined, n: number): string => {
  const [uno, varios] = (platform && NOMBRE[platform]) || ['pieza', 'piezas'];
  return `${n} ${n === 1 ? uno : varios}`;
};

export const nombreDePieza = (platform: string | null | undefined): string =>
  ((platform && NOMBRE[platform]) || ['pieza'])[0];

export const acotar = (n: number, { min, max }: { min: number; max: number }) => Math.min(max, Math.max(min, n));
