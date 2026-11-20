/**
 * Quién puede hacer qué con una pieza (docs/plan-produccion-con-responsable.md).
 *
 * Es el único lugar que lo decide. El servidor lo usa para rechazar y el
 * tablero lo recibe calculado (`puedo`, `quienDecide`), así la pantalla no
 * ofrece un botón que el servidor después niega, ni al revés.
 *
 * La regla de fondo es la del copy (#32): **toda aprobación tiene un
 * responsable con nombre**, el de la campaña. Y quien entregó la versión que se
 * revisa nunca la acepta, aunque sea el responsable: aprobarse a uno mismo no
 * es aprobar.
 *
 * Cuando quien entregó **es** el responsable, la aprueba cualquiera que
 * administre el workspace, menos quien la subió (feedback de pruebas del
 * 2026-11-05, punto 8). Antes la pieza quedaba trabada hasta que alguien
 * nombrara otro responsable, y nadie en el equipo entendía por qué.
 *
 * `aprobador` dice siempre quién aprueba, con nombre y correo, para que quien
 * espera le pueda escribir.
 */

import { WorkspaceRole } from '@prisma/client';
import { apruebaLaCampana, quienesAprueban } from '../comun/aprobadores.js';
import { canManage, TenantContext, TenantError } from '../lib/tenancy.js';

export interface PiezaParaPermisos {
  tipo: string;
  asignadaAId: string | null;
  project: {
    name: string;
    responsableId: string | null;
    responsable?: { name: string; email?: string | null } | null;
    /** Los aprobadores sumados a la campaña (decisión 30): deciden igual que el responsable. */
    aprobadores?: { user: Persona }[];
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
  | 'mandarAlCliente'
  | 'cancelar';

export type Puedo = Record<AccionConPermiso, boolean>;

export interface Persona {
  id: string;
  name: string;
  email?: string | null;
}

/** Quién aprueba la pieza, para mostrarlo con nombre y cara en la tarjeta. */
export interface Aprobador {
  /** `responsable` (y sumados) de la campaña; `administra` si la entregó el responsable; `nadie` si no hay a quién. */
  rol: 'responsable' | 'administra' | 'nadie';
  personas: Persona[];
  /** Una línea: por qué es esa persona y qué hacer. */
  detalle: string;
  /** Quien mira es una de las personas que aprueban. */
  soyYo: boolean;
}

/**
 * Quién entregó la versión que se revisa. En los gráficos, quien subió el
 * archivo; en video y audio, que se entregan con un enlace y no dejan versión,
 * la persona asignada.
 */
const entregadaPor = (p: PiezaParaPermisos): string | null =>
  p.versiones?.[0]?.subidaPorId ?? p.asignadaAId;

/**
 * `gestores` son quienes administran el workspace (OWNER y ADMIN), con nombre y correo. Sin ellos los
 * permisos son los mismos; solo el `aprobador` del caso «la entregó el responsable» queda sin nombres.
 */
export const permisosDe = (
  tenant: { userId: string; role: WorkspaceRole },
  pieza: PiezaParaPermisos,
  gestores: Persona[] = []
) => {
  const administra = canManage(tenant.role);
  const responsableId = pieza.project?.responsableId ?? null;
  // «Responsable» aquí es quien aprueba la campaña: su responsable o un aprobador sumado (decisión 30).
  const esResponsable = apruebaLaCampana(tenant.userId, pieza.project);
  const aprueban = quienesAprueban(pieza.project);
  const entrego = entregadaPor(pieza);
  const laEntregoYo = entrego === tenant.userId;
  const laEntregoElResponsable = !!responsableId && entrego === responsableId;
  // Quienes aprueban y no la entregaron: si hay alguno, deciden ellos aunque la haya entregado el responsable.
  const otrosQueAprueban = aprueban.filter(p => p.id !== entrego);
  const decide = !laEntregoYo && (esResponsable || (administra && laEntregoElResponsable && otrosQueAprueban.length === 0));

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
    // Sacar del tablero una pieza enviada por error (feedback del 2026-11-05, punto 7).
    cancelar: administra,
  };

  const nombres = (ps: Persona[]) =>
    ps.length === 0 ? 'quien administra' : ps.length === 1 ? ps[0].name : `${ps.slice(0, -1).map(p => p.name).join(', ')} o ${ps[ps.length - 1].name}`;

  let aprobador: Aprobador;
  if (!pieza.project) {
    aprobador = { rol: 'nadie', personas: [], soyYo: false, detalle: 'Esta pieza no tiene campaña: no hay a quién le toque aprobarla.' };
  } else if (!responsableId) {
    aprobador = {
      rol: 'nadie',
      personas: [],
      soyYo: false,
      detalle: `«${pieza.project.name}» no tiene responsable: quien administra lo nombra en Copy.`,
    };
  } else if (laEntregoElResponsable && otrosQueAprueban.length === 0) {
    const otros = gestores.filter(g => g.id !== entrego);
    const responsable = pieza.project.responsable?.name ?? 'El responsable';
    aprobador = {
      rol: 'administra',
      personas: otros,
      soyYo: otros.some(g => g.id === tenant.userId),
      detalle: laEntregoYo
        ? `La entregaste tú, así que la aprueba quien administra: ${nombres(otros)}.`
        : `${responsable} la entregó, así que la aprueba quien administra (cualquiera, menos quien la subió).`,
    };
  } else {
    // Si la entregó uno de los que aprueban, la deciden los demás.
    const personas = aprueban.filter(p => p.id !== entrego);
    aprobador = {
      rol: 'responsable',
      personas: personas.length ? personas : aprueban,
      soyYo: esResponsable && !laEntregoYo,
      detalle: aprueban.length > 1 ? `Aprueban «${pieza.project.name}».` : `Responsable de «${pieza.project.name}».`,
    };
  }

  // Lo que la pantalla dice en lugar del botón de aprobar.
  let quienDecide: string | null = null;
  if (!decide) {
    quienDecide =
      aprobador.rol === 'responsable'
        ? laEntregoYo
          ? `La entregaste. Espera el visto bueno de ${nombres(aprobador.personas)}.`
          : `La decide ${nombres(aprobador.personas)}, de «${pieza.project!.name}».`
        : aprobador.rol === 'administra'
          ? laEntregoYo
            ? aprobador.detalle
            : `La aprueba quien administra: ${nombres(aprobador.personas)}.`
          : aprobador.detalle;
  }

  return { puedo, quienDecide, aprobador };
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
    cancelar: 'Cancela una pieza quien administra.',
  };
  throw new TenantError(motivo[accion] ?? quienDecide ?? 'No te toca esta decisión.', 403);
};
