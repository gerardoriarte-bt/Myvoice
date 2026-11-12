import type { ReglasMedibles } from './secciones.js';

/**
 * Lo que «qué no se toca» del ADN deja verificar sin IA (docs/plan-adn-2.md, F4): las frases que se
 * escriben siempre igual y las reglas de estilo medibles. Lo usan `validators.ts` (cada texto, al
 * escribirlo y al corregirlo), el revisor, que lo recibe como violación, y el corrector, que lo arregla.
 *
 * Igual que `tratamiento.ts`: el redactor recibe la regla en el prompt y esto detecta lo que se le
 * escapó. Las prohibiciones siguen en `validators.ts`, como antes.
 */

export interface ReglasDeAdn {
  /** Frases que no se cambian, una por elemento («ViveTerpel», «Puntos ViveTerpel»). */
  frases?: string[];
  reglas?: ReglasMedibles;
}

/** Sin tildes, en minúsculas, solo letras y números: «Vive Terpel» y «viveterpel» comparan igual. */
const plano = (c: string) =>
  c
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
const esAlfanumerico = (c: string) => /[\p{L}\p{N}]/u.test(c);

/**
 * Las veces que una frase aparece escrita distinto: con otras mayúsculas, sin tilde, separada o junta.
 * Recorre el texto sin espacios ni signos, y cada coincidencia se compara con la frase tal cual.
 */
const frasesMalEscritas = (texto: string, frases: string[]): string[] => {
  const letras: { c: string; i: number }[] = [];
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (esAlfanumerico(c)) letras.push({ c: plano(c), i });
  }
  const corrido = letras.map(l => l.c).join('');
  const faltas = new Set<string>();
  for (const frase of frases) {
    const clave = [...frase].filter(esAlfanumerico).map(plano).join('');
    if (!clave) continue;
    let desde = 0;
    for (;;) {
      const k = corrido.indexOf(clave, desde);
      if (k < 0) break;
      desde = k + 1;
      const inicio = letras[k].i;
      const fin = letras[k + clave.length - 1].i + 1;
      // Que sea una palabra entera: «ViveTerpelito» no es «ViveTerpel».
      if ((inicio > 0 && esAlfanumerico(texto[inicio - 1])) || (fin < texto.length && esAlfanumerico(texto[fin]))) continue;
      // En un hashtag o una mención la frase va sin espacios: «#MyVoice» está bien escrito.
      const palabra = texto.slice(0, inicio).split(/\s/).pop() ?? '';
      if (/^[#@]/.test(palabra + texto[inicio])) continue;
      const escrito = texto.slice(inicio, fin);
      if (escrito !== frase) faltas.add(`«${escrito}» se escribe «${frase}»`);
    }
  }
  return [...faltas];
};

const EMOJI = /\p{Extended_Pictographic}/gu;

/** «$12.900»: símbolo, si lleva espacio y el separador de miles. */
const formatoDe = (ejemplo: string) => {
  const m = ejemplo.match(/^(\D*?)(\s?)(\d{1,3})([.,\s’'])(\d{3})/);
  if (!m) return null;
  return { simbolo: m[1].trim(), espacio: m[2], miles: m[4] };
};

const conMiles = (digitos: string, miles: string) => digitos.replace(/\B(?=(\d{3})+(?!\d))/g, miles);

/** Los precios que no siguen el formato de la marca. Solo mira cifras con el símbolo, de 4 dígitos o más. */
const preciosMalEscritos = (texto: string, ejemplo: string): string[] => {
  const f = formatoDe(ejemplo);
  if (!f?.simbolo) return [];
  const simbolo = f.simbolo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const precio = new RegExp(`${simbolo}\\s?\\d[\\d.,’' ]*\\d`, 'g');
  const faltas: string[] = [];
  for (const m of texto.match(precio) ?? []) {
    const escrito = m.trim();
    const entero = escrito.slice(f.simbolo.length).trim().split(/[.,](?=\d{1,2}$)/)[0];
    const digitos = entero.replace(/\D/g, '');
    if (digitos.length < 4) continue;
    const esperado = `${f.simbolo}${f.espacio}${conMiles(digitos, f.miles)}`;
    if (!escrito.startsWith(esperado)) faltas.push(`«${escrito}» se escribe «${esperado}»`);
  }
  return faltas;
};

/** Las faltas de un texto a lo que el ADN dice que no se toca. Vacío si no hay nada que marcar. */
export const faltasDeAdn = (texto: string, adn: ReglasDeAdn | undefined): string[] => {
  if (!adn) return [];
  const faltas: string[] = [];
  const frases = (adn.frases ?? []).filter(Boolean);
  if (frases.length) faltas.push(...frasesMalEscritas(texto, frases));

  const r = adn.reglas ?? {};
  const emojis = texto.match(EMOJI)?.length ?? 0;
  if (r.emojis === 'no' && emojis > 0) faltas.push('Lleva emojis y la marca no los usa');
  if (r.emojis === 'pocos' && emojis > 2) faltas.push(`Lleva ${emojis} emojis: la marca usa hasta dos por texto`);

  if (r.signosDeApertura) {
    const cuenta = (c: string) => texto.split(c).length - 1;
    if (cuenta('?') > cuenta('¿')) faltas.push('Falta el «¿» de apertura');
    if (cuenta('!') > cuenta('¡')) faltas.push('Falta el «¡» de apertura');
  }

  if (r.sinMayusculasSostenidas) {
    // Las siglas de 2 o 3 letras (CRM, TV) y lo que está en las frases de la marca no cuentan.
    const permitidas = new Set(frases.flatMap(f => f.split(/\s+/)));
    const gritos = (texto.match(/\p{L}+/gu) ?? []).filter(
      p => p.length >= 4 && p === p.toUpperCase() && p !== p.toLowerCase() && !permitidas.has(p)
    );
    if (gritos.length) faltas.push(`Palabras en mayúsculas sostenidas: ${[...new Set(gritos)].join(', ')}`);
  }

  if (r.formatoDePrecio) faltas.push(...preciosMalEscritos(texto, r.formatoDePrecio));
  return faltas;
};

/** Las reglas para el redactor, el director y el revisor, en palabras. Vacío si la marca no tiene. */
export const reglasDeAdnEnPalabras = (adn: ReglasDeAdn | undefined): string => {
  if (!adn) return '';
  const lineas: string[] = [];
  const frases = (adn.frases ?? []).filter(Boolean);
  if (frases.length)
    lineas.push(`- Frases que no se cambian (escritura EXACTA: mayúsculas, tildes y espacios): ${frases.map(f => `«${f}»`).join(', ')}`);
  const r = adn.reglas ?? {};
  if (r.emojis === 'no') lineas.push('- Sin emojis.');
  if (r.emojis === 'pocos') lineas.push('- Hasta dos emojis por texto.');
  if (r.signosDeApertura) lineas.push('- Siempre con ¡ y ¿ de apertura.');
  if (r.formatoDePrecio) lineas.push(`- Precios y cifras con este formato: ${r.formatoDePrecio}`);
  if (r.sinMayusculasSostenidas) lineas.push('- Sin palabras enteras en MAYÚSCULAS.');
  return lineas.join('\n');
};
