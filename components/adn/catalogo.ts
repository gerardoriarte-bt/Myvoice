import type { ClaveAdn, EstadoSeccionAdn, ModoSeccionAdn } from '../../types';

/**
 * Las secciones del ADN como las muestra la pantalla: la misma lista que
 * `server/src/comun/adn/secciones.ts` (el front no puede importar del server), más lo que solo es de la
 * pantalla: para qué sirve cada una, que va detrás de la «i».
 */
export interface SeccionEnPantalla {
  clave: ClaveAdn;
  nombre: string;
  critica: boolean;
  /** Los modos frente a la madre. Con uno solo (suma) es fijo y lleva candado. */
  modos: ModoSeccionAdn[];
  /** Qué hace el motor con ella. */
  ayuda: string;
  /** Cómo se separan los elementos de una sección que suma, para mostrarlos como lista. */
  separador?: string;
}

export const GRUPOS: { id: string; nombre: string; ayuda: string; secciones: SeccionEnPantalla[] }[] = [
  {
    id: 'queDecir',
    nombre: 'Qué decir',
    ayuda: 'Lo que usa el director para el concepto y los ángulos de cada campaña.',
    secciones: [
      { clave: 'propuestaDeValor', nombre: 'Propuesta de valor', critica: true, modos: ['HEREDA', 'PROPIA'], ayuda: 'Qué hace distinta a la marca. Con menos de una frase completa queda débil.' },
      { clave: 'productos', nombre: 'Productos y servicios', critica: false, modos: ['HEREDA', 'PROPIA'], ayuda: 'Lo que la marca vende de verdad: el motor no inventa beneficios ni precios fuera de esto.' },
      { clave: 'audiencias', nombre: 'Audiencias', critica: true, modos: ['HEREDA', 'PROPIA'], ayuda: 'Una lista fija de la marca. Cada campaña elige de acá; cada una necesita quién es, qué le importa, qué la frena y cómo habla.' },
    ],
  },
  {
    id: 'comoSuena',
    nombre: 'Cómo suena',
    ayuda: 'Lo que usan el redactor y el revisor para que el texto suene a la marca.',
    secciones: [
      { clave: 'voz', nombre: 'Voz y personalidad', critica: true, modos: ['HEREDA', 'PROPIA'], ayuda: 'Cómo es la marca cuando habla. Con menos de una frase completa queda débil.' },
      { clave: 'tratamiento', nombre: 'Tratamiento', critica: true, modos: ['HEREDA', 'PROPIA'], ayuda: 'Tú, vos o usted. El motor lo cumple en todos los textos y el revisor marca el que no.' },
      { clave: 'asiSuena', nombre: 'Así suena', critica: false, modos: ['HEREDA', 'PROPIA'], ayuda: 'Textos que la marca dio por buenos y el redactor imita. Hacen falta 3. Mientras no haya, el motor usa los 5 últimos aprobados.' },
    ],
  },
  {
    id: 'queNoSeToca',
    nombre: 'Qué no se toca',
    ayuda: 'Lo que verifican los validadores en cada texto, sin excepción.',
    secciones: [
      { clave: 'prohibiciones', nombre: 'Prohibiciones', critica: true, modos: ['SUMA'], separador: ', ', ayuda: 'Lo que nunca se dice. Separadas por coma; hacen falta al menos 2. En una submarca se suman a las de la madre.' },
      { clave: 'frasesIntocables', nombre: 'Frases que no se cambian', critica: false, modos: ['SUMA'], separador: '\n', ayuda: 'Nombres y frases que se escriben siempre igual (mayúsculas, tildes, espacios). Una por línea. En una submarca se suman a las de la madre.' },
      { clave: 'reglasDeEstilo', nombre: 'Reglas de estilo', critica: false, modos: ['HEREDA', 'PROPIA'], ayuda: 'Las que se verifican solas (emojis, signos, precios, mayúsculas) y notas para el redactor. Solo con notas queda débil.' },
      { clave: 'keywords', nombre: 'Keywords', critica: false, modos: ['SUMA'], separador: ', ', ayuda: 'Palabras que la marca quiere que aparezcan. Separadas por coma. En una submarca se suman a las de la madre.' },
    ],
  },
];

export const SECCIONES: SeccionEnPantalla[] = GRUPOS.flatMap(g => g.secciones);
export const seccionDe = (clave: ClaveAdn) => SECCIONES.find(s => s.clave === clave)!;

export const COLOR_ESTADO: Record<EstadoSeccionAdn | 'PROPUESTA', { punto: string; borde: string }> = {
  COMPLETA: { punto: 'bg-emerald-500', borde: 'border-emerald-300' },
  DEBIL: { punto: 'bg-amber-500', borde: 'border-amber-300' },
  VACIA: { punto: 'bg-gray-400', borde: 'border-gray-300' },
  PROPUESTA: { punto: 'bg-blue-600', borde: 'border-blue-500' },
};

export const TRATAMIENTOS: { valor: 'TU' | 'VOS' | 'USTED'; nombre: string; ejemplo: string }[] = [
  { valor: 'TU', nombre: 'Tú', ejemplo: '«¿Sabes cuántos beneficios tienes?»' },
  { valor: 'VOS', nombre: 'Vos', ejemplo: '«¿Sabés cuántos beneficios tenés?»' },
  { valor: 'USTED', nombre: 'Usted', ejemplo: '«¿Sabe cuántos beneficios tiene?»' },
];

export const FUENTES: Record<string, string> = {
  pdf: 'manual',
  'copy-aprobado': 'copy aprobado',
  url: 'sitio web',
  entrevista: 'entrevista',
};

export const DESCRIPTORES: { clave: 'quienEs' | 'queLeImporta' | 'queLaFrena' | 'comoHabla'; nombre: string }[] = [
  { clave: 'quienEs', nombre: 'Quién es' },
  { clave: 'queLeImporta', nombre: 'Qué le importa' },
  { clave: 'queLaFrena', nombre: 'Qué la frena' },
  { clave: 'comoHabla', nombre: 'Cómo habla' },
];

/** Los elementos de una sección que suma, para listarlos. */
export const elementos = (texto: string, separador = ', ') =>
  texto.split(separador.trim() || '\n').map(t => t.trim()).filter(Boolean);
