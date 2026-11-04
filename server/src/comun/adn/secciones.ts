import type { ModoSeccionAdn } from '@prisma/client';

/**
 * Las secciones del ADN de una marca y cómo hereda cada una de su madre (decisión 16,
 * docs/ecosistema/decisiones.md). Hoy son las columnas del ADN de `Client`; el ADN 2.0 suma
 * secciones nuevas aquí, no en otro lado.
 *
 * - Prohibiciones y keywords: siempre `SUMA`. La submarca agrega las suyas y no puede quitar las
 *   de la madre.
 * - Voz, propuesta de valor y guías: `HEREDA` (igual que la madre) o `PROPIA`.
 */
export type ClaveAdn = 'voz' | 'propuestaDeValor' | 'guias' | 'keywords' | 'prohibiciones';

/** Las columnas de `Client` que hoy guardan el ADN: el espejo que lee la pantalla de v1. */
export type ColumnaAdn = 'voice' | 'valueProposition' | 'brandVoiceGuidelines' | 'brandKeywords' | 'brandProhibitions';

export interface DefinicionSeccion {
  clave: ClaveAdn;
  nombre: string;
  columna: ColumnaAdn;
  /** Los modos que admite frente a la madre. Con uno solo, es fijo. */
  modos: ModoSeccionAdn[];
}

export const SECCIONES_ADN: DefinicionSeccion[] = [
  { clave: 'voz', nombre: 'Voz', columna: 'voice', modos: ['HEREDA', 'PROPIA'] },
  { clave: 'propuestaDeValor', nombre: 'Propuesta de valor', columna: 'valueProposition', modos: ['HEREDA', 'PROPIA'] },
  { clave: 'guias', nombre: 'Guías de voz', columna: 'brandVoiceGuidelines', modos: ['HEREDA', 'PROPIA'] },
  { clave: 'keywords', nombre: 'Keywords', columna: 'brandKeywords', modos: ['SUMA'] },
  { clave: 'prohibiciones', nombre: 'Prohibiciones', columna: 'brandProhibitions', modos: ['SUMA'] },
];

export const COLUMNAS_ADN: ColumnaAdn[] = SECCIONES_ADN.map(s => s.columna);

/** Lo que se guarda de una sección, en `SeccionAdn` y en cada `AdnVersion`. */
export interface SeccionGuardada {
  modo: ModoSeccionAdn;
  contenido: { texto: string };
}

export type SeccionesGuardadas = Partial<Record<ClaveAdn, SeccionGuardada>>;

/**
 * El modo de una sección cuando lo decide la pantalla de v1, que no lo muestra: con texto propio es
 * `PROPIA`; vacía en una submarca, `HEREDA`. Hasta el ADN por capas, una sección vacía dejaba pasar la
 * del brief; ahora, en una submarca, toma la de la madre.
 */
export const modoDesdeTexto = (def: DefinicionSeccion, texto: string, tieneMadre: boolean): ModoSeccionAdn => {
  if (def.modos.length === 1) return def.modos[0];
  if (texto) return 'PROPIA';
  return tieneMadre ? 'HEREDA' : 'PROPIA';
};

/** Las secciones de una marca tal como las guardan hoy sus columnas. */
export const seccionesDesdeColumnas = (
  columnas: Partial<Record<ColumnaAdn, string | null>>,
  tieneMadre: boolean
): SeccionesGuardadas => {
  const secciones: SeccionesGuardadas = {};
  for (const def of SECCIONES_ADN) {
    const texto = (columnas[def.columna] ?? '').trim();
    secciones[def.clave] = { modo: modoDesdeTexto(def, texto, tieneMadre), contenido: { texto } };
  }
  return secciones;
};

/** Madre más propia, para las secciones que suman. Las listas son texto separado por comas. */
export const sumar = (deMadre: string, propio: string): string =>
  [deMadre, propio].map(t => t.trim()).filter(Boolean).join(', ');
