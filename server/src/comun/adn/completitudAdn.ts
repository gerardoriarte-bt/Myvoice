import type { AdnResuelto } from './resolverAdn.js';
import { ClaveAdn, DESCRIPTORES, DefinicionSeccion, GrupoAdn, SECCIONES_ADN } from './secciones.js';

/**
 * La completitud del ADN (ADN-4, ADN-5, docs/plan-adn-2.md): el único lugar que la calcula.
 *
 *   porcentaje = Σ peso × valor / Σ peso      valor: VACIA 0 · DEBIL 0.5 · COMPLETA 1
 *   apta       = porcentaje ≥ MINIMO y todas las imprescindibles en COMPLETA
 *
 * Se calcula sobre el ADN **resuelto**: lo heredado de la madre cuenta, así que una submarca solo
 * completa lo propio. Lo que propuso la IA y nadie confirmó no está en el resuelto, así que no cuenta
 * (ADN-7).
 *
 * El estado de cada sección sale de reglas fijas, sin IA y sin gasto. Son provisionales, igual que los
 * pesos y el mínimo: se ajustan cuando `verify:calidad -- --ablacion` diga cuánto pesa cada sección en
 * el copy. En v2 la campaña no se crea sin un ADN apto; en v1 solo se avisa.
 */

export const MINIMO_ADN = 75;

export type EstadoSeccion = 'VACIA' | 'DEBIL' | 'COMPLETA';

export interface SeccionEvaluada {
  clave: ClaveAdn;
  nombre: string;
  grupo: GrupoAdn;
  critica: boolean;
  estado: EstadoSeccion;
  /** Por qué no está completa, en palabras de la pantalla. NULL si está completa. */
  motivo: string | null;
  /** Hay algo propuesto por la IA esperando confirmación. */
  propuestaPendiente: boolean;
}

export interface Completitud {
  porcentaje: number;
  minimo: number;
  apta: boolean;
  secciones: SeccionEvaluada[];
  /** Lo que falta para quedar apta: primero las imprescindibles, después lo que más suma. */
  faltan: ClaveAdn[];
}

const VALOR: Record<EstadoSeccion, number> = { VACIA: 0, DEBIL: 0.5, COMPLETA: 1 };
const FRASE_COMPLETA = 60;
const EJEMPLOS_MINIMOS = 3;
const PROHIBICIONES_MINIMAS = 2;

const elementos = (texto: string, separador = ', ') =>
  texto.split(separador.trim() || '\n').map(t => t.trim()).filter(Boolean);

const evaluar = (def: DefinicionSeccion, adn: AdnResuelto): { estado: EstadoSeccion; motivo: string | null } => {
  const s = adn.secciones[def.clave];
  const texto = s.texto;
  const completa = { estado: 'COMPLETA' as const, motivo: null };
  switch (def.clave) {
    case 'propuestaDeValor':
    case 'voz':
      if (!texto) return { estado: 'VACIA', motivo: 'Vacía' };
      return texto.length < FRASE_COMPLETA ? { estado: 'DEBIL', motivo: 'Muy corta: falta qué la hace distinta' } : completa;
    case 'audiencias': {
      const lista = s.contenido.audiencias ?? [];
      if (!lista.length) return { estado: 'VACIA', motivo: 'Sin audiencias' };
      const incompleta = lista.find(a => DESCRIPTORES.some(d => !a.descriptores?.[d]?.trim()));
      return incompleta ? { estado: 'DEBIL', motivo: `A «${incompleta.nombre}» le faltan descriptores` } : completa;
    }
    case 'asiSuena': {
      const n = s.contenido.ejemplos?.length ?? 0;
      if (!n) return { estado: 'VACIA', motivo: 'Sin ejemplos' };
      return n < EJEMPLOS_MINIMOS ? { estado: 'DEBIL', motivo: `${n} de ${EJEMPLOS_MINIMOS} ejemplos` } : completa;
    }
    case 'prohibiciones': {
      const n = elementos(texto, def.separador).length;
      if (!n) return { estado: 'VACIA', motivo: 'Vacía' };
      return n < PROHIBICIONES_MINIMAS ? { estado: 'DEBIL', motivo: 'Solo una prohibición' } : completa;
    }
    case 'reglasDeEstilo': {
      const medibles = Object.keys(s.contenido.reglas ?? {}).length;
      if (!texto && !medibles) return { estado: 'VACIA', motivo: 'Vacía' };
      return medibles ? completa : { estado: 'DEBIL', motivo: 'Solo notas: ninguna regla que se verifique sola' };
    }
    default:
      return texto ? completa : { estado: 'VACIA', motivo: 'Vacía' };
  }
};

const porcentajeDe = (estados: Map<ClaveAdn, EstadoSeccion>): number => {
  const total = SECCIONES_ADN.reduce((n, d) => n + d.peso, 0);
  const suma = SECCIONES_ADN.reduce((n, d) => n + d.peso * VALOR[estados.get(d.clave) ?? 'VACIA'], 0);
  return Math.round((suma / total) * 100);
};

/** `pendientes`: las claves de la marca con una propuesta de la IA sin confirmar (`conPropuesta`). */
export const completitudAdn = (adn: AdnResuelto, pendientes: Set<string> = new Set()): Completitud => {
  const secciones = SECCIONES_ADN.map(def => ({
    clave: def.clave,
    nombre: def.nombre,
    grupo: def.grupo,
    critica: def.critica,
    ...evaluar(def, adn),
    propuestaPendiente: pendientes.has(def.clave),
  }));
  const estados = new Map(secciones.map(s => [s.clave, s.estado as EstadoSeccion]));
  const porcentaje = porcentajeDe(estados);
  const criticasCompletas = secciones.every(s => !s.critica || s.estado === 'COMPLETA');

  // Primero las imprescindibles; después, mientras no alcance, la que más sume (una vacía antes que una débil).
  const faltan: ClaveAdn[] = secciones.filter(s => s.critica && s.estado !== 'COMPLETA').map(s => s.clave);
  const hipotesis = new Map(estados);
  for (const c of faltan) hipotesis.set(c, 'COMPLETA');
  const resto = secciones
    .filter(s => !s.critica && s.estado !== 'COMPLETA')
    .sort((a, b) => VALOR[a.estado] - VALOR[b.estado]);
  for (const s of resto) {
    if (porcentajeDe(hipotesis) >= MINIMO_ADN) break;
    hipotesis.set(s.clave, 'COMPLETA');
    faltan.push(s.clave);
  }

  return {
    porcentaje,
    minimo: MINIMO_ADN,
    apta: porcentaje >= MINIMO_ADN && criticasCompletas,
    secciones,
    faltan,
  };
};

/** Las claves con una propuesta de la IA pendiente, desde las filas de `SeccionAdn`. */
export const conPropuesta = (filas: { clave: string; propuesta: unknown }[]): Set<string> =>
  new Set(filas.filter(f => f.propuesta != null).map(f => f.clave));

