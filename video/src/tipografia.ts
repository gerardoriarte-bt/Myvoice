import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORES } from './guion';

/**
 * El sistema tipográfico del video.
 *
 * **Inter se carga de verdad.** Declararla en un `fontFamily` no alcanza: el
 * navegador que renderiza no la tiene instalada y caía en Helvetica, que es
 * más ancha, tiene otra altura de x y desarma todos los espaciados pensados
 * para Inter. Se notaba sin saber por qué.
 *
 * Tres tamaños y ninguno más. Un video de un minuto con cinco escalas parece
 * hecho por cinco personas.
 */
const { fontFamily } = loadFont('normal', { weights: ['400', '500', '600', '700', '800'] });

export const FUENTE = fontFamily;

/** El tamaño grande se usa solo cuando el texto está SOLO en pantalla. */
export const TITULAR = {
  fontFamily,
  fontSize: 118,
  fontWeight: 700,
  letterSpacing: -4,
  lineHeight: 1.02,
  color: COLORES.blanco,
} as const;

/**
 * El rótulo: dos palabras en versalitas sobre el titular. No es decoración —
 * es lo que le dice al ojo dónde empieza el texto cuando atrás hay una captura
 * llena de información, que era el problema de la primera versión.
 */
export const ROTULO = {
  fontFamily,
  fontSize: 24,
  fontWeight: 800,
  letterSpacing: 3.2,
  textTransform: 'uppercase',
} as const;

/** El texto sobre una captura. Más chico que el titular: compite, no manda. */
export const FRASE = {
  fontFamily,
  fontSize: 58,
  fontWeight: 600,
  letterSpacing: -1.8,
  lineHeight: 1.1,
} as const;

export const APOYO = {
  fontFamily,
  fontSize: 30,
  fontWeight: 500,
  letterSpacing: -0.2,
} as const;

export const PIE = {
  fontFamily,
  fontSize: 22,
  fontWeight: 500,
  letterSpacing: 0.2,
} as const;
