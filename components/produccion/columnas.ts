import { PiezaEstado } from '../../types';

/**
 * Las cinco columnas del tablero (D5), con lo que hace falta para que se lean
 * como un proceso y no como cinco listas.
 *
 * Cada una trae su número —la secuencia—, qué significa estar ahí y **quién es
 * su dueño**. Que el dueño esté escrito no es decoración: una columna sin
 * dueño humano es una columna donde las cosas se quedan. Por revisar y Con el
 * cliente lo dicen con nombre: el responsable de la campaña
 * (docs/plan-produccion-con-responsable.md).
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
  CON_EL_CLIENTE: { fondo: '#F5F3FF', texto: '#6D28D9', borde: '#DDD6FE', etiqueta: 'CON EL CLIENTE' },
  LISTA:       { fondo: '#ECFDF5', texto: '#047857', borde: '#A7F3D0', etiqueta: 'LISTA' },
};

export interface Columna {
  estado: PiezaEstado;
  numero: number;
  nombre: string;
  /** Qué significa que una pieza esté acá. */
  que: string;
  /** Quién la mueve, cuando no se puede decir con nombre. */
  dueño: string;
  /** El dueño es el responsable de la campaña: se dice con su nombre. */
  delResponsable?: boolean;
}

export const COLUMNAS: Columna[] = [
  {
    estado: 'POR_ASIGNAR',
    numero: 1,
    nombre: 'Por asignar',
    que: 'Copy aprobado esperando quién lo diseñe.',
    dueño: 'Quien administra',
  },
  {
    estado: 'EN_DISENO',
    numero: 2,
    nombre: 'En diseño',
    que: 'La diseñadora la produce. Al subirla se audita, y recién ahí pasa a revisión.',
    dueño: 'La persona asignada',
  },
  {
    estado: 'POR_REVISAR',
    numero: 3,
    nombre: 'Por revisar',
    que: 'Entregada y auditada. Espera el visto bueno.',
    dueño: 'El responsable de la campaña',
    delResponsable: true,
  },
  {
    estado: 'CON_EL_CLIENTE',
    numero: 4,
    nombre: 'Con el cliente',
    que: 'Aceptada por el equipo. La campaña es «del cliente»: falta su aprobación.',
    dueño: 'El responsable de la campaña, que se la manda',
    delResponsable: true,
  },
  {
    estado: 'LISTA',
    numero: 5,
    nombre: 'Lista',
    que: 'Aprobada por quien correspondía. Terminada.',
    dueño: 'Nadie: es el final',
  },
];
