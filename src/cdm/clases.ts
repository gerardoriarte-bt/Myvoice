/**
 * Las cuatro clases de medio (decisión 29). El proceso es el mismo para todas; cambia quién publica al final,
 * en Implementación (⑤).
 */
export type ClaseDeMedio = 'PAGOS' | 'REDES_SOCIALES' | 'PROPIOS' | 'TRADICIONAL';

export const CLASES: { id: ClaseDeMedio; nombre: string; alFinal: string }[] = [
  { id: 'PAGOS', nombre: 'Pagos', alFinal: 'el trafficker monta el anuncio' },
  { id: 'REDES_SOCIALES', nombre: 'Redes sociales', alFinal: 'el community manager lo publica' },
  { id: 'PROPIOS', nombre: 'Propios', alFinal: 'se programa en el CRM de la marca' },
  { id: 'TRADICIONAL', nombre: 'Tradicional', alFinal: 'se entrega al medio' },
];

export const nombreDeClase = (id: ClaseDeMedio) => CLASES.find(c => c.id === id)?.nombre ?? id;
