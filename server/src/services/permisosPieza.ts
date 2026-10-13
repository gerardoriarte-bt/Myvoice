/**
 * Quién puede hacer qué con una pieza (docs/plan-produccion-con-responsable.md).
 *
 * Es el único lugar que lo decide. El servidor lo usa para rechazar y el
 * tablero lo recibe calculado (`puedo`, `quienDecide`), así la pantalla no
 * ofrece un botón que el servidor después niega, ni al revés.
 *
 * La regla de fondo es la del copy (#32): **toda aprobación tiene un
 * responsable con nombre**, el de la campaña. Quien administra no se lo salta:
 * si hace falta, nombra a otro en la campaña. Y quien entregó la versión que se
 * revisa nunca la acepta, aunque sea el responsable: aprobarse a uno mismo no
 * es aprobar.
 */

import { WorkspaceRole } from '@prisma/client';
import { canManage, TenantContext, TenantError } from '../lib/tenancy.js';

export interface PiezaParaPermisos {
  tipo: string;
  asignadaAId: string | null;
  project: {
    name: string;
    responsableId: string | null;
    responsable?: { name: string } | null;
  } | null;
  /** La última versión subida, si la hay. Su autor es quien entregó. */
  versiones?: { subidaPorId: string | null }[];
}

export type AccionConPermiso =
  | 'asignar'
  | 'entregar'
  | 'aceptar'
  | 'devolver'
  | 'reabrir'
  | 'decidirHallazgos'
  | 'corregirCopy'
  | 'actualizarCopy'
  | 'renombrar'
  | 'mandarAlCliente';

export type Puedo = Record<AccionConPermiso, boolean>;

/**
 * Quién entregó la versión que se revisa. En los gráficos, quien subió el
 * archivo; en video y audio, que se entregan con un enlace y no dejan versión,
 * la persona asignada.
 */
const entregadaPor = (p: PiezaParaPermisos): string | null =>
  p.versiones?.[0]?.subidaPorId ?? p.asignadaAId;

export const permisosDe = (tenant: { userId: string; role: WorkspaceRole }, pieza: PiezaParaPermisos) => {
  const administra = canManage(tenant.role);
  const responsableId = pieza.project?.responsableId ?? null;
  const esResponsable = !!responsableId && responsableId === tenant.userId;
  const laEntregoYo = entregadaPor(pieza) === tenant.userId;
  const decide = esResponsable && !laEntregoYo;

  const puedo: Puedo = {
    asignar: administra || esResponsable,
    renombrar: administra || esResponsable,
    actualizarCopy: administra || esResponsable,
    entregar: administra || pieza.asignadaAId === tenant.userId,
    aceptar: decide,
    devolver: decide,
    decidirHallazgos: decide,
    reabrir: esResponsable,
    corregirCopy: esResponsable,
    mandarAlCliente: administra || esResponsable,
  };

  // Lo que la pantalla dice en lugar del botón de aprobar.
  let quienDecide: string | null = null;
  if (!pieza.project) {
    quienDecide = 'Esta pieza no tiene campaña: no hay a quién le toque aprobarla.';
  } else if (!responsableId) {
    quienDecide = `«${pieza.project.name}» no tiene responsable: quien administra lo nombra en Copy.`;
  } else if (esResponsable && laEntregoYo) {
    quienDecide =
      'La entregaste vos, así que no la podés aceptar. Quien administra puede nombrar otro responsable en la campaña.';
  } else if (!esResponsable) {
    const nombre = pieza.project.responsable?.name ?? 'el responsable';
    quienDecide = laEntregoYo
      ? `La entregaste. Espera el visto bueno de ${nombre}.`
      : `La decide ${nombre}, responsable de «${pieza.project.name}».`;
  }

  return { puedo, quienDecide };
};

/** Rechaza con el motivo en una línea. Otro workspace ya se resolvió antes con 404. */
export const exigir = (tenant: TenantContext, pieza: PiezaParaPermisos, accion: AccionConPermiso) => {
  const { puedo, quienDecide } = permisosDe(tenant, pieza);
  if (puedo[accion]) return;
  const motivo: Partial<Record<AccionConPermiso, string>> = {
    asignar: 'Asigna quien administra o el responsable de la campaña.',
    renombrar: 'Renombra quien administra o el responsable de la campaña.',
    actualizarCopy: 'Actualiza la orden quien administra o el responsable de la campaña.',
    entregar: 'Entrega la persona asignada.',
    mandarAlCliente: 'Se la manda al cliente el responsable de la campaña.',
  };
  throw new TenantError(motivo[accion] ?? quienDecide ?? 'No te toca esta decisión.', 403);
};
