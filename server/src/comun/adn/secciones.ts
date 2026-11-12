import type { ModoSeccionAdn } from '@prisma/client';

/**
 * Las secciones del ADN de una marca y cómo hereda cada una de su madre (decisión 16,
 * docs/ecosistema/decisiones.md; ADN 2.0, docs/plan-adn-2.md). El ADN 2.0 suma secciones aquí, no en
 * otro lado.
 *
 * Diez secciones en tres grupos, ordenadas por lo que aportan al entregable y no por The Brief: cada
 * grupo es la etapa del motor que lo usa.
 *
 * - **Qué decir** (director y redactor): propuesta de valor, productos y servicios, audiencias.
 * - **Cómo suena** (redactor y revisor): voz, tratamiento, así suena (textos aprobados que imita).
 * - **Qué no se toca** (validadores): prohibiciones, frases que no se cambian, reglas de estilo, keywords.
 *
 * En una submarca, prohibiciones, frases y keywords siempre `SUMA`: agrega las suyas y no puede quitar
 * las de la madre. El resto `HEREDA` (igual que la madre) o `PROPIA`.
 */
export type ClaveAdn =
  | 'propuestaDeValor'
  | 'productos'
  | 'audiencias'
  | 'voz'
  | 'tratamiento'
  | 'asiSuena'
  | 'prohibiciones'
  | 'frasesIntocables'
  | 'reglasDeEstilo'
  | 'keywords';

export type GrupoAdn = 'queDecir' | 'comoSuena' | 'queNoSeToca';

/**
 * Las columnas de `Client` que hacen de espejo para la pantalla de v1. `brandVoiceGuidelines` (las
 * «guías de voz») son desde el ADN 2.0 las notas de reglas de estilo.
 */
export type ColumnaAdn =
  | 'voice'
  | 'valueProposition'
  | 'brandVoiceGuidelines'
  | 'brandKeywords'
  | 'brandProhibitions'
  | 'tratamiento';

export interface DefinicionSeccion {
  clave: ClaveAdn;
  nombre: string;
  grupo: GrupoAdn;
  /** Imprescindible para el mínimo (las ★ del `.pen`). */
  critica: boolean;
  /** Peso en la completitud. Provisional hasta calibrar con `verify:calidad -- --ablacion`. */
  peso: number;
  columna?: ColumnaAdn;
  /** Los modos que admite frente a la madre. Con uno solo, es fijo. */
  modos: ModoSeccionAdn[];
  /** Cómo se separan los elementos de una sección que suma. */
  separador?: string;
}

const critica = (clave: ClaveAdn, nombre: string, grupo: GrupoAdn, resto: Partial<DefinicionSeccion> = {}): DefinicionSeccion => ({
  clave, nombre, grupo, critica: true, peso: 2, modos: ['HEREDA', 'PROPIA'], ...resto,
});
const comun = (clave: ClaveAdn, nombre: string, grupo: GrupoAdn, resto: Partial<DefinicionSeccion> = {}): DefinicionSeccion => ({
  clave, nombre, grupo, critica: false, peso: 1, modos: ['HEREDA', 'PROPIA'], ...resto,
});

export const SECCIONES_ADN: DefinicionSeccion[] = [
  critica('propuestaDeValor', 'Propuesta de valor', 'queDecir', { columna: 'valueProposition' }),
  comun('productos', 'Productos y servicios', 'queDecir'),
  critica('audiencias', 'Audiencias', 'queDecir'),
  critica('voz', 'Voz y personalidad', 'comoSuena', { columna: 'voice' }),
  critica('tratamiento', 'Tratamiento', 'comoSuena', { columna: 'tratamiento' }),
  comun('asiSuena', 'Así suena', 'comoSuena'),
  critica('prohibiciones', 'Prohibiciones', 'queNoSeToca', { columna: 'brandProhibitions', modos: ['SUMA'], separador: ', ' }),
  comun('frasesIntocables', 'Frases que no se cambian', 'queNoSeToca', { modos: ['SUMA'], separador: '\n' }),
  comun('reglasDeEstilo', 'Reglas de estilo', 'queNoSeToca', { columna: 'brandVoiceGuidelines' }),
  comun('keywords', 'Keywords', 'queNoSeToca', { columna: 'brandKeywords', modos: ['SUMA'], separador: ', ' }),
];

export const seccion = (clave: string): DefinicionSeccion | undefined => SECCIONES_ADN.find(s => s.clave === clave);

/** Las que tienen columna espejo: lo que edita la pantalla de v1. */
export const SECCIONES_CON_COLUMNA = SECCIONES_ADN.filter(s => s.columna);
export const COLUMNAS_ADN: ColumnaAdn[] = SECCIONES_CON_COLUMNA.map(s => s.columna!);

/**
 * Las que pide la revisión de la madre antes de heredar (docs/plan-revision-adn.md): las cinco que
 * existían cuando se diseñó. El ADN 2.0 la generaliza en la pantalla nueva (F2).
 */
export const SECCIONES_DE_REVISION = SECCIONES_ADN.filter(s =>
  (['voz', 'propuestaDeValor', 'reglasDeEstilo', 'keywords', 'prohibiciones'] as ClaveAdn[]).includes(s.clave)
);

/** Un texto que la marca imita, tomado del copy aprobado o escrito a mano. */
export interface EjemploAsiSuena {
  texto: string;
  platform?: string;
  savedVariationId?: string;
}

/** Las reglas de estilo que se pueden verificar sin IA (las usa `validators.ts` desde F4). */
export interface ReglasMedibles {
  /** 'no': ninguno · 'pocos': hasta dos por texto · 'libre'. */
  emojis?: 'no' | 'pocos' | 'libre';
  /** Exigir ¡ y ¿ de apertura. */
  signosDeApertura?: boolean;
  /** Cómo se escriben los precios, por ejemplo «$12.900». */
  formatoDePrecio?: string;
  /** Prohibir palabras enteras en mayúsculas sostenidas. */
  sinMayusculasSostenidas?: boolean;
}

/**
 * Lo que se guarda de una sección. `texto` siempre existe: es lo que lee el motor y lo que suma una
 * sección que suma (en reglas de estilo, las notas). `ejemplos` es de así suena y `reglas`, de reglas
 * de estilo. Las audiencias viven en `AudienciaDeMarca`; en una versión guardada van en `audiencias`.
 */
export interface ContenidoSeccion {
  texto: string;
  ejemplos?: EjemploAsiSuena[];
  reglas?: ReglasMedibles;
  audiencias?: AudienciaGuardada[];
}

export interface DescriptoresAudiencia {
  quienEs: string;
  queLeImporta: string;
  queLaFrena: string;
  comoHabla: string;
}

export const DESCRIPTORES: (keyof DescriptoresAudiencia)[] = ['quienEs', 'queLeImporta', 'queLaFrena', 'comoHabla'];

export interface AudienciaGuardada {
  id: string;
  nombre: string;
  descriptores: DescriptoresAudiencia;
}

/** Lo que se guarda de una sección, en `SeccionAdn` y en cada `AdnVersion`. */
export interface SeccionGuardada {
  modo: ModoSeccionAdn;
  contenido: ContenidoSeccion;
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

/** Las secciones con columna de una marca tal como las guardan hoy sus columnas. */
export const seccionesDesdeColumnas = (
  columnas: Partial<Record<ColumnaAdn, string | null>>,
  tieneMadre: boolean
): SeccionesGuardadas => {
  const secciones: SeccionesGuardadas = {};
  for (const def of SECCIONES_CON_COLUMNA) {
    const texto = (columnas[def.columna!] ?? '').trim();
    secciones[def.clave] = { modo: modoDesdeTexto(def, texto, tieneMadre), contenido: { texto } };
  }
  return secciones;
};

/**
 * Las secciones de una versión guardada antes del ADN 2.0, con las claves de hoy: `guias` pasó a ser
 * `reglasDeEstilo` (migración 20261105000002_adn_2_secciones).
 */
export const conClavesDeHoy = (secciones: Record<string, SeccionGuardada | undefined>): SeccionesGuardadas => {
  const { guias, ...resto } = secciones;
  return (guias && !resto.reglasDeEstilo ? { ...resto, reglasDeEstilo: guias } : resto) as SeccionesGuardadas;
};

/** Madre más propia, para las secciones que suman. */
export const sumar = (deMadre: string, propio: string, separador = ', '): string =>
  [deMadre, propio].map(t => t.trim()).filter(Boolean).join(separador);

const texto = (v: unknown, campo: string, max = 4000): string => {
  if (v == null) return '';
  if (typeof v !== 'string') throw new Error(`${campo} tiene que ser texto`);
  if (v.length > max) throw new Error(`${campo} supera los ${max} caracteres`);
  return v.trim();
};

/**
 * Valida y normaliza el contenido que llega del cliente para una sección. Lanza `Error` con un mensaje
 * para la pantalla; quien llama lo convierte en 400. Lo que no es de la sección se descarta.
 */
export const contenidoValido = (def: DefinicionSeccion, crudo: unknown): ContenidoSeccion => {
  const c = (crudo && typeof crudo === 'object' ? crudo : {}) as Record<string, unknown>;
  if (def.clave === 'audiencias') throw new Error('Las audiencias se editan una por una');
  if (def.clave === 'tratamiento') {
    const t = texto(c.texto, 'El tratamiento');
    if (t && !['TU', 'VOS', 'USTED'].includes(t)) throw new Error('El tratamiento tiene que ser TU, VOS o USTED');
    return { texto: t };
  }
  const contenido: ContenidoSeccion = { texto: texto(c.texto, def.nombre) };
  if (def.clave === 'asiSuena') {
    if (c.ejemplos != null && !Array.isArray(c.ejemplos)) throw new Error('Los ejemplos tienen que ser una lista');
    const ejemplos = ((c.ejemplos as unknown[]) ?? []).slice(0, 20).map((e, i) => {
      const x = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>;
      const ejemplo: EjemploAsiSuena = { texto: texto(x.texto, `El ejemplo ${i + 1}`, 1500) };
      if (typeof x.platform === 'string') ejemplo.platform = x.platform.slice(0, 60);
      if (typeof x.savedVariationId === 'string') ejemplo.savedVariationId = x.savedVariationId;
      return ejemplo;
    });
    contenido.ejemplos = ejemplos.filter(e => e.texto);
  }
  if (def.clave === 'reglasDeEstilo' && c.reglas != null) {
    if (typeof c.reglas !== 'object') throw new Error('Las reglas tienen que ser un objeto');
    const r = c.reglas as Record<string, unknown>;
    const reglas: ReglasMedibles = {};
    if (r.emojis != null) {
      if (!['no', 'pocos', 'libre'].includes(r.emojis as string)) throw new Error('Emojis: no, pocos o libre');
      reglas.emojis = r.emojis as ReglasMedibles['emojis'];
    }
    if (r.signosDeApertura != null) reglas.signosDeApertura = Boolean(r.signosDeApertura);
    if (r.sinMayusculasSostenidas != null) reglas.sinMayusculasSostenidas = Boolean(r.sinMayusculasSostenidas);
    if (r.formatoDePrecio != null) reglas.formatoDePrecio = texto(r.formatoDePrecio, 'El formato de precio', 40);
    contenido.reglas = reglas;
  }
  return contenido;
};

/** Valida los descriptores de una audiencia. Un descriptor vacío vale: la deja débil, no inválida. */
export const descriptoresValidos = (crudo: unknown): DescriptoresAudiencia => {
  const c = (crudo && typeof crudo === 'object' ? crudo : {}) as Record<string, unknown>;
  return Object.fromEntries(DESCRIPTORES.map(d => [d, texto(c[d], 'Un descriptor', 1000)])) as unknown as DescriptoresAudiencia;
};
