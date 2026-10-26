/**
 * Marcas relacionadas, del lado de la pantalla (docs/plan-marcas-relacionadas.md).
 *
 * Lo que dice la verdad lo calcula el servidor: con quién comparte nombre una
 * marca (`nombreRepetidoCon`) y lo que la distingue (`conteos`). Acá solo se
 * ordena y se escribe: las familias juntas, «Terpel CRM · de Terpel», la línea
 * que distingue a dos «Terpel».
 */

import { Client } from './types';

/**
 * Copia de `server/src/lib/nombreDeMarca.ts`, solo para avisar ANTES de crear
 * una marca con un nombre que ya existe. Si cambiás la regla, cambiala en los
 * dos: la API no puede importar este archivo.
 */
export const normalizarNombre = (nombre: string): string =>
  nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export const madreDe = (marca: Client, marcas: Client[]): Client | undefined =>
  marca.marcaMadreId ? marcas.find(m => m.id === marca.marcaMadreId) : undefined;

/** «Terpel CRM · de Terpel». Una madre o una marca suelta se nombra sola. */
export const nombreConMadre = (marca: Client, marcas: Client[]): string => {
  const madre = madreDe(marca, marcas);
  return madre ? `${marca.name} · de ${madre.name}` : marca.name;
};

export interface Familia {
  madre: Client;
  complementarias: Client[];
}

/**
 * Las marcas agrupadas por familia, en el orden en que se crearon. Una
 * complementaria cuya madre no está en la lista se muestra suelta, como madre.
 */
export const familias = (marcas: Client[]): Familia[] => {
  const ids = new Set(marcas.map(m => m.id));
  const raices = marcas.filter(m => !m.marcaMadreId || !ids.has(m.marcaMadreId));
  return raices.map(madre => ({
    madre,
    complementarias: marcas.filter(m => m.marcaMadreId === madre.id),
  }));
};

export const tieneNombreRepetido = (marca: Client): boolean => (marca.nombreRepetidoCon?.length ?? 0) > 0;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

/**
 * Lo que distingue a una marca de otra con el mismo nombre: cuántas campañas
 * tiene, si tiene complementarias y desde cuándo existe. Sin esto, elegir entre
 * dos «Terpel» es tirar una moneda.
 */
export const distincion = (marca: Client): string => {
  const c = marca.conteos;
  const partes: string[] = [];
  if (c) {
    partes.push(c.campanas === 1 ? '1 campaña' : `${c.campanas} campañas`);
    partes.push(
      c.complementarias === 0
        ? 'sin complementarias'
        : c.complementarias === 1
          ? '1 complementaria'
          : `${c.complementarias} complementarias`
    );
  }
  if (marca.createdAt) {
    const d = new Date(marca.createdAt);
    partes.push(`desde ${MESES[d.getMonth()]} ${d.getFullYear()}`);
  }
  return partes.join(' · ');
};

/**
 * El texto de una marca en un selector de «Es parte de». Con un nombre
 * repetido, dos «Terpel» idénticas obligan a adivinar en cuál se cuelga la
 * complementaria: se agrega lo que las distingue.
 */
export const opcionDeMadre = (marca: Client): string =>
  tieneNombreRepetido(marca) ? `${marca.name} · ${distincion(marca)}` : marca.name;

/** Las marcas que pueden ser madre de `marca`: del workspace, sueltas o madres, y no ella. */
export const madresPosibles = (marca: Client | null, marcas: Client[]): Client[] =>
  marcas.filter(m => m.id !== marca?.id && !m.marcaMadreId);
