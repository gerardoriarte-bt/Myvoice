import React from 'react';
import { UserPlus, X } from 'lucide-react';
import { aprobacionesApi } from '../../services/api';
import type { AprobadoresDeCampana } from '../../types';

/**
 * Los aprobadores sumados a una campaña (decisión 30): para la urgencia, cuando el responsable no está.
 * Cualquiera de ellos decide la sábana, el copy y las piezas. Suma quien administra o quien ya aprueba.
 * Va en la sábana y en la tarjeta de aprobación de la campaña.
 */
export default function SumarAprobador({ campanaId, onCambio }: { campanaId: string; onCambio?: () => void }) {
  const [datos, setDatos] = React.useState<AprobadoresDeCampana | null>(null);
  const [eligiendo, setEligiendo] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    aprobacionesApi.aprobadores(campanaId).then(setDatos).catch(() => setDatos(null));
  }, [campanaId]);

  const abrir = () => setEligiendo(true);
  const hacer = async (accion: () => Promise<AprobadoresDeCampana>) => {
    setError(null);
    try {
      setDatos(await accion());
      setEligiendo(false);
      onCambio?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  };

  if (!datos) return null;
  const ya = new Set([datos.responsable?.id, ...datos.sumados.map(s => s.id)]);

  return (
    <div className="mt-2 space-y-1.5">
      {datos.sumados.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
          <span className="text-[#6E6E73]">También aprueban:</span>
          {datos.sumados.map(s => (
            <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-[#F5F5F7] px-2 py-0.5 font-medium text-[#1D1D1F]">
              {s.name}
              {datos.puedoCambiar && (
                <button type="button" aria-label={`Quitar a ${s.name}`} onClick={() => void hacer(() => aprobacionesApi.quitar(campanaId, s.id))}>
                  <X className="h-3 w-3 text-[#86868B] hover:text-[#1D1D1F]" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {datos.puedoCambiar &&
        (eligiendo ? (
          <select
            autoFocus
            defaultValue=""
            onChange={e => e.target.value && void hacer(() => aprobacionesApi.sumar(campanaId, e.target.value))}
            onBlur={() => setEligiendo(false)}
            className="w-full max-w-[260px] rounded-md border border-[rgba(0,0,0,0.12)] bg-white px-2 py-1.5 text-[12px]"
          >
            <option value="">¿A quién sumas como aprobador?</option>
            {/* Solo quienes tienen la función Aprobación (o todos, si nadie la tiene todavía). */}
            {datos.elegibles
              .filter(m => !ya.has(m.id))
              .map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        ) : (
          <button type="button" onClick={abrir} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#047857] hover:underline">
            <UserPlus className="h-3.5 w-3.5" />
            Sumar aprobador
          </button>
        ))}
      {error && <p className="text-[12px] text-red-600">{error}</p>}
    </div>
  );
}
