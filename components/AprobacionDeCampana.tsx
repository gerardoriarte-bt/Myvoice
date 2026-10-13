import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { MODO_APROBACION_LABELS, ModoAprobacion, Project, WorkspaceMember } from '../types';
import { libraryApi } from '../services/api';

/**
 * Cómo se aprueba una campaña y quién responde por eso.
 *
 * Es la regla bajo la que avanza todo el copy de la campaña
 * (docs/plan-aprobacion-por-campana.md), así que se muestra donde se decide
 * algo con ella —en Generar, antes de gastar, y en Copy, donde se aprueba— y
 * no escondida en una pantalla de configuración.
 *
 * Quien administra la edita acá mismo. Quien no, la lee: saber quién aprueba es
 * lo que le dice a quién esperar.
 */

interface Props {
  campana: Project;
  /** Para elegir responsable. Solo hace falta si `puedeEditar`. */
  miembros?: WorkspaceMember[];
  puedeEditar: boolean;
  onCambio: (campana: Project) => void;
  onError: (mensaje: string) => void;
}

/** Quien tiene la función Aprobación en esa marca va primero; el resto sigue estando. */
const ordenar = (miembros: WorkspaceMember[], clientId?: string | null) => {
  const aprueba = (m: WorkspaceMember) =>
    m.funciones?.some(f => f.funcion === 'APROBACION' && (f.clientId === null || f.clientId === clientId));
  return [...miembros].sort(
    (a, b) => Number(aprueba(b)) - Number(aprueba(a)) || a.name.localeCompare(b.name, 'es')
  );
};

export default function AprobacionDeCampana({ campana, miembros = [], puedeEditar, onCambio, onError }: Props) {
  const [guardando, setGuardando] = React.useState(false);
  const modo: ModoAprobacion = campana.modoAprobacion ?? 'INTERNA';
  const sinResponsable = !campana.responsableId;

  const cambiar = async (datos: { modoAprobacion?: ModoAprobacion; responsableId?: string | null }) => {
    setGuardando(true);
    try {
      onCambio(await libraryApi.updateProject(campana.id, datos));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo cambiar la campaña');
    } finally {
      setGuardando(false);
    }
  };

  const quien = modo === 'INTERNA' ? 'Aprueba' : 'Responde por el cliente';

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 text-[12px] ${
        sinResponsable ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-1.5 font-medium text-gray-900">
        {sinResponsable ? (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
        ) : (
          <ShieldCheck className="h-3.5 w-3.5 text-gray-500" />
        )}
        Aprobación {MODO_APROBACION_LABELS[modo].toLowerCase()}
      </div>

      {puedeEditar ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-gray-500">Quién aprueba</span>
            <select
              value={modo}
              disabled={guardando}
              onChange={e => cambiar({ modoAprobacion: e.target.value as ModoAprobacion })}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[12px] text-gray-900"
            >
              <option value="INTERNA">El equipo</option>
              <option value="CLIENTE">El cliente</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-gray-500">Responsable</span>
            <select
              value={campana.responsableId ?? ''}
              disabled={guardando}
              onChange={e => cambiar({ responsableId: e.target.value || null })}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[12px] text-gray-900"
            >
              <option value="">Elegir…</option>
              {ordenar(miembros, campana.clientId).map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <p className="mt-1 text-gray-600">
          {sinResponsable ? 'Sin responsable.' : `${quien}: ${campana.responsable?.name}.`}
        </p>
      )}

      <p className="mt-1.5 leading-snug text-gray-500">
        {sinResponsable
          ? 'Sin responsable el copy de esta campaña se guarda pero no avanza: nadie puede aprobarlo.'
          : modo === 'INTERNA'
            ? `${campana.responsable?.name} aprueba el copy antes de producirlo.`
            : `El cliente aprueba desde el enlace de revisión; ${campana.responsable?.name} se lo manda y responde por él.`}
      </p>
    </div>
  );
}
