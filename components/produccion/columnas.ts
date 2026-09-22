import { PiezaEstado } from '../../types';

/**
 * Las cuatro columnas del tablero (D5), con lo que hace falta para que se lean
 * como un proceso y no como cuatro listas.
 *
 * Cada una trae su número —la secuencia—, qué significa estar ahí, **quién es
 * su dueño** y **qué acción la vacía**. Que el dueño esté escrito no es
 * decoración: una columna sin dueño humano es una columna donde las cosas se
 * quedan, y esa es la regla que decidió que «En auditoría» no fuera columna.
 *
 * El color es el mismo en la cabecera de la columna y en la barra de cada
 * tarjeta, así el estado de una pieza se reconoce sin leerlo — y lo terminado
 * se distingue de un vistazo.
 */

export interface ColorEstado {
  /** Fondo de la barra de la tarjeta y de la cabecera de la columna. */
  fondo: string;
  texto: string;
  borde: string;
  etiqueta: string;
}

export const COLORES_ESTADO: Record<PiezaEstado, ColorEstado> = {
  POR_ASIGNAR: { fondo: '#F3F4F6', texto: '#4B5563', borde: '#E5E7EB', etiqueta: 'POR ASIGNAR' },
  EN_DISENO:   { fondo: '#EFF6FF', texto: '#1D4ED8', borde: '#BFDBFE', etiqueta: 'EN DISEÑO' },
  POR_REVISAR: { fondo: '#FFFBEB', texto: '#B45309', borde: '#FDE68A', etiqueta: 'POR REVISAR' },
  LISTA:       { fondo: '#ECFDF5', texto: '#047857', borde: '#A7F3D0', etiqueta: 'LISTA' },
};

export interface Columna {
  estado: PiezaEstado;
  numero: number;
  nombre: string;
  /** Qué significa que una pieza esté acá. */
  que: string;
  dueño: string;
  /** La acción que la saca de esta columna. */
  vacia: string;
}

export const COLUMNAS: Columna[] = [
  {
    estado: 'POR_ASIGNAR',
    numero: 1,
    nombre: 'Por asignar',
    que: 'Copy aprobado esperando quién lo diseñe.',
    dueño: 'Quien produce',
    vacia: 'Asignar a alguien',
  },
  {
    estado: 'EN_DISENO',
    numero: 2,
    nombre: 'En diseño',
    que: 'Alguien la está produciendo ahora.',
    dueño: 'El diseñador',
    vacia: 'Entregar la pieza',
  },
  {
    estado: 'POR_REVISAR',
    numero: 3,
    nombre: 'Por revisar',
    que: 'Entregada, esperando el visto bueno.',
    dueño: 'Quien aprueba',
    vacia: 'Aceptar o devolver',
  },
  {
    estado: 'LISTA',
    numero: 4,
    nombre: 'Lista',
    que: 'Aprobada y cerrada.',
    dueño: 'Nadie: es el final',
    vacia: '—',
  },
];
