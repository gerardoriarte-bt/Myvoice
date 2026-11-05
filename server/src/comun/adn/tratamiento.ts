/**
 * El tratamiento de la marca: tú, vos o usted (feedback de pruebas del 2026-11-05, punto 2).
 *
 * Lo elige la marca en su ADN (`Client.tratamiento`) y el motor lo cumple en las cuatro etapas: el
 * redactor y el director lo reciben como regla, `validators.ts` detecta las faltas sin IA, el revisor
 * las marca (`tuteo-violation`, que desde ahora quiere decir «no respeta el tratamiento») y el
 * corrector las reescribe con la tabla de su tratamiento.
 *
 * Hasta el 2026-11-05 el voseo se adivinaba buscando «Medellín», «Antioquia», «tutear» o «vos (» en el
 * ADN y el brief, y el revisor marcaba como falta todo «tú» en cualquier marca. Una marca de Medellín
 * que pedía tutear recibía voseo, y pedirlo («no uses vos, tuteá») lo activaba. Sin tratamiento
 * elegido rige el default del país (en Colombia, usted: localeRules.ts) y el revisor no marca nada.
 */

export type Tratamiento = 'TU' | 'VOS' | 'USTED';

export const TRATAMIENTOS: Tratamiento[] = ['TU', 'VOS', 'USTED'];

export const esTratamiento = (x: unknown): x is Tratamiento =>
  typeof x === 'string' && (TRATAMIENTOS as string[]).includes(x);

const NOMBRE: Record<Tratamiento, string> = { TU: 'tú', VOS: 'vos', USTED: 'usted' };

/** La regla para el redactor y el director. */
export const reglaDeTratamiento = (t: Tratamiento): string =>
  ({
    TU: `TRATAMIENTO — TÚ (regla dura, la eligió la marca):
- Tuteá: tú, tienes, puedes, quieres, sabes, eres; imperativos descubre, conoce, disfruta, aprovecha.
- PROHIBIDO el voseo (vos, tenés, podés, sabés, sos, conocé, descubrí) y PROHIBIDO "usted" (tiene, conozca, disfrute).`,
    VOS: `TRATAMIENTO — VOS (regla dura, la eligió la marca):
- Voseo colombiano: vos, tenés, podés, querés, sabés, hacés, venís, sos; imperativos conocé, descubrí, disfrutá — sin abusar de las formas acentuadas.
- PROHIBIDO el tuteo (tú, tienes, puedes, eres). Nada de lunfardo rioplatense (che, boludo, pibe, laburo).`,
    USTED: `TRATAMIENTO — USTED (regla dura, la eligió la marca):
- Usted cálido y cercano: usted tiene, puede, merece; imperativos conozca, descubra, disfrute, aproveche.
- PROHIBIDO el tuteo (tú, tienes, descubre) y PROHIBIDO el voseo (vos, tenés, conocé).`,
  })[t];

/** Lo que el revisor tiene que penalizar con `tuteo-violation`. */
export const verificacionDeTratamiento = (t: Tratamiento): string =>
  `\n## VERIFICACIÓN DE TRATAMIENTO — ${NOMBRE[t].toUpperCase()}\nLa marca habla de "${NOMBRE[t]}". Marcá "tuteo-violation" en toda variación que use otro tratamiento. ${reglaDeTratamiento(t).split('\n').slice(1).join(' ')}\n`;

// --------------------------------------------------------------- detección sin IA

/** [forma que sobra, cómo se dice en tú, en vos, en usted]. */
const FORMAS: [RegExp, string, string, string][] = [
  [/\btienes\b/gi, 'tienes', 'tenés', 'tiene'],
  [/\bpuedes\b/gi, 'puedes', 'podés', 'puede'],
  [/\bquieres\b/gi, 'quieres', 'querés', 'quiere'],
  [/\bvienes\b/gi, 'vienes', 'venís', 'viene'],
  [/\bhaces\b/gi, 'haces', 'hacés', 'hace'],
  [/\bsabes\b/gi, 'sabes', 'sabés', 'sabe'],
  [/\beres\b/gi, 'eres', 'sos', 'es'],
  [/\btú\b/gi, 'tú', 'vos', 'usted'],
];

const VOSEO: [RegExp, string, string][] = [
  [/\bvos\b/gi, 'tú', 'usted'],
  [/\btenés\b/gi, 'tienes', 'tiene'],
  [/\bpodés\b/gi, 'puedes', 'puede'],
  [/\bquerés\b/gi, 'quieres', 'quiere'],
  [/\bsabés\b/gi, 'sabes', 'sabe'],
  [/\bhacés\b/gi, 'haces', 'hace'],
  [/\bvenís\b/gi, 'vienes', 'viene'],
  [/\bsos\b/gi, 'eres', 'es'],
  [/\bcomés\b/gi, 'comes', 'come'],
  [/\bescuchás\b/gi, 'escuchas', 'escucha'],
  [/\bnecesitás\b/gi, 'necesitas', 'necesita'],
  [/\bencontrás\b/gi, 'encuentras', 'encuentra'],
  [/\bdisfrutás\b/gi, 'disfrutas', 'disfruta'],
  [/\bconocé\b/gi, 'conoce', 'conozca'],
  [/\bdescubrí\b/gi, 'descubre', 'descubra'],
  [/\bdisfrutá\b/gi, 'disfruta', 'disfrute'],
  [/\baprovechá\b/gi, 'aprovecha', 'aproveche'],
  [/\bmirá\b/gi, 'mira', 'mire'],
  [/\belegí\b/gi, 'elige', 'elija'],
  [/\bvení\b/gi, 'ven', 'venga'],
  [/\bcontame\b/gi, 'cuéntame', 'cuénteme'],
];

const USTED: [RegExp, string, string][] = [
  [/\busted(es)?\b/gi, 'tú', 'vos'],
  [/\bconozca\b/gi, 'conoce', 'conocé'],
  [/\bdescubra\b/gi, 'descubre', 'descubrí'],
  [/\bdisfrute\b/gi, 'disfruta', 'disfrutá'],
  [/\baproveche\b/gi, 'aprovecha', 'aprovechá'],
];

const hits = (texto: string, re: RegExp, correccion: string): string[] =>
  [...new Set((texto.match(re) ?? []).map(m => m.toLowerCase()))].map(m => `${m} → ${correccion}`);

/**
 * Las faltas al tratamiento que se ven sin IA, como «sabés → sabes». Va en `tuteoHits` (el nombre es
 * de cuando solo existía el voseo). «Disfrute» o «descubra» pueden ser sustantivos o subjuntivos: el
 * corrector decide con el contexto, la marca solo avisa.
 */
export const faltasDeTratamiento = (texto: string, t: Tratamiento): string[] => {
  const out: string[] = [];
  if (t !== 'TU') for (const [re, , vos, usted] of FORMAS) out.push(...hits(texto, re, t === 'VOS' ? vos : usted));
  if (t !== 'VOS') for (const [re, tu, usted] of VOSEO) out.push(...hits(texto, re, t === 'TU' ? tu : usted));
  if (t !== 'USTED') for (const [re, tu, vos] of USTED) out.push(...hits(texto, re, t === 'TU' ? tu : vos));
  // «Tu» posesivo vale en tú y en vos («tu mascota»); en usted es «su».
  if (t === 'USTED') out.push(...hits(texto, /\btus?\b/gi, 'su / sus'));
  return out;
};

/** La tabla que el corrector usa para reescribir. */
export const tablaDeConversion = (t: Tratamiento): string =>
  `\n## TRATAMIENTO: ${NOMBRE[t].toUpperCase()} — reescribí toda forma de otro tratamiento\n${reglaDeTratamiento(t)}\n`;
