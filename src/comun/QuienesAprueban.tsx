import React from 'react';
import { aprobacionesApi } from '../../services/api';
import type { AprobadoresDeCampana } from '../../types';

/**
 * Quiénes más aprueban una campaña, además del responsable: las personas con la función Aprobación para su
 * marca. Solo se muestra: los permisos se manejan en Equipo (Gerardo, 2026-11-23), no desde cada campaña.
 */
export default function QuienesAprueban({ campanaId }: { campanaId: string }) {
  const [datos, setDatos] = React.useState<AprobadoresDeCampana | null>(null);
  React.useEffect(() => {
    aprobacionesApi.aprobadores(campanaId).then(setDatos).catch(() => setDatos(null));
  }, [campanaId]);
  if (!datos?.sumados.length) return null;
  return (
    <p className="mt-1.5 text-[12px] text-[#6E6E73]">
      También aprueban: <span className="font-medium text-[#1D1D1F]">{datos.sumados.map(s => s.name).join(', ')}</span>
      <span className="text-[#86868B]"> · se cambia en Equipo</span>
    </p>
  );
}
