import { FuncionAsignada, WorkspaceMember } from '../../types';

/**
 * A quién se le puede asignar una pieza.
 *
 * **La función no restringe: ordena** (H3.D, D2). Quien tiene Diseño en esa
 * marca aparece primero; el resto sigue estando, porque el día que el diseñador
 * está de vacaciones alguien tiene que poder tomar la pieza sin ir a cambiar
 * funciones a la pantalla de Equipo.
 */

export interface MiembroAsignable {
  id: string;
  name: string;
  /** Para que la lista pueda decir por qué alguien está primero. */
  etiqueta?: string;
}

const disenaPara = (funciones: FuncionAsignada[] | undefined, clientId: string): FuncionAsignada | undefined =>
  funciones?.find(f => f.funcion === 'DISENO' && (f.clientId === null || f.clientId === clientId));

export const ordenarParaAsignar = (miembros: WorkspaceMember[], clientId: string): MiembroAsignable[] => {
  const conFuncion: MiembroAsignable[] = [];
  const resto: MiembroAsignable[] = [];

  for (const m of miembros) {
    const f = disenaPara(m.funciones, clientId);
    if (f) conFuncion.push({ id: m.id, name: m.name, etiqueta: f.marca ? `diseño · ${f.marca}` : 'diseño' });
    else resto.push({ id: m.id, name: m.name });
  }

  const porNombre = (a: MiembroAsignable, b: MiembroAsignable) => a.name.localeCompare(b.name, 'es');
  return [...conFuncion.sort(porNombre), ...resto.sort(porNombre)];
};
