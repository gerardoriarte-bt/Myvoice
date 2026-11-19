import React from 'react';
import { Check, Lock } from 'lucide-react';
import { SCREENS, ScreenId } from '../../screens';
import { clientApi } from '../../services/api';
import type { CampanaEnProceso, PasoDeProceso } from '../../types';
import { PASOS } from './rutas';

/**
 * El Panorama (decisión 24; en el `.pen`, «§ Marco · Panorama»): la entrada de quien administra con la
 * plataforma por procesos. Las campañas en curso de todas las marcas, el avance de cada paso y qué espera a
 * quién. Primero lo que espera algo; «Abrir» lleva a la campaña, en el paso donde está.
 */

interface Props {
  onAbrir: (campana: CampanaEnProceso, pantalla: ScreenId) => void;
}

const ESTILO: Record<PasoDeProceso['estado'], string> = {
  hecho: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  activo: 'bg-white border-[rgba(0,0,0,0.12)] text-[#1D1D1F]',
  pendiente: 'bg-white border-[rgba(0,0,0,0.08)] text-[#86868B]',
  bloqueado: 'bg-[#F5F5F7] border-[rgba(0,0,0,0.06)] text-[#86868B]',
  neutro: 'bg-white border-[rgba(0,0,0,0.08)] text-[#86868B]',
};

export default function Panorama({ onAbrir }: Props) {
  const [campanas, setCampanas] = React.useState<CampanaEnProceso[] | null>(null);
  const [error, setError] = React.useState(false);
  const [soloEsperan, setSoloEsperan] = React.useState(false);

  React.useEffect(() => {
    clientApi
      .panorama()
      .then(setCampanas)
      .catch(() => setError(true));
  }, []);

  if (error) return <p className="text-[13px] text-red-600">No se pudo armar el Panorama. Recarga la página.</p>;
  if (!campanas) return <div className="h-48" />;

  const esperan = (c: CampanaEnProceso) => c.enCurso?.estado === 'bloqueado' || Boolean(c.enCurso?.quien);
  const marcas = new Set(campanas.map(c => c.marca.id)).size;
  const lista = [...campanas]
    .filter(c => !soloEsperan || esperan(c))
    .sort((a, b) => Number(esperan(b)) - Number(esperan(a)));

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[22px] font-bold text-[#1D1D1F] tracking-[-0.01em]">{SCREENS.panorama.name}</h2>
          <p className="text-[13px] text-[#6E6E73] mt-0.5">
            {campanas.length} {campanas.length === 1 ? 'campaña en curso' : 'campañas en curso'} en {marcas}{' '}
            {marcas === 1 ? 'marca' : 'marcas'} · {campanas.filter(esperan).length} esperan a alguien
          </p>
        </div>
        <div className="flex gap-2">
          {(
            [
              [false, 'Todas'],
              [true, 'Solo las que esperan'],
            ] as [boolean, string][]
          ).map(([valor, nombre]) => (
            <button
              key={nombre}
              type="button"
              aria-pressed={soloEsperan === valor}
              onClick={() => setSoloEsperan(valor)}
              className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold border border-[rgba(0,0,0,0.08)] ${
                soloEsperan === valor ? 'bg-ink text-white' : 'bg-white text-[#3A3A3C] hover:bg-[#F5F5F7]'
              }`}
            >
              {nombre}
            </button>
          ))}
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-10 text-center text-[13px] text-[#86868B]">
          {soloEsperan ? 'Nada espera a nadie.' : 'No hay campañas en curso.'}
        </div>
      ) : (
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#F5F5F7]">
              <tr>
                {['Campaña', 'Pasos', 'Qué espera · a quién', ''].map(c => (
                  <th key={c} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.04em] text-[#86868B]">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map(c => {
                const paso = PASOS.find(p => p.id === c.enCurso?.paso) ?? PASOS[0];
                const pantalla = paso.grupos[0].pantallas[0];
                return (
                  <tr key={c.id} className="border-t border-[rgba(0,0,0,0.06)]">
                    <td className="px-4 py-3 w-[220px]">
                      <div className="text-[13.5px] font-bold text-[#1D1D1F]">{c.nombre}</div>
                      <div className="text-[12px] text-[#86868B]">{c.marca.nombre}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {PASOS.map((def, i) => {
                          const p = c.pasos.find(x => x.paso === def.id);
                          const estado = p?.estado ?? 'neutro';
                          return (
                            <span
                              key={def.id}
                              title={p?.falta}
                              className={`flex-1 min-w-[96px] flex items-center gap-1 rounded-md border px-1.5 py-1 text-[11px] font-medium ${ESTILO[estado]}`}
                            >
                              {estado === 'hecho' ? (
                                <Check className="w-3 h-3 shrink-0" strokeWidth={3} />
                              ) : estado === 'bloqueado' ? (
                                <Lock className="w-3 h-3 shrink-0" />
                              ) : (
                                <span className="tabular-nums">{i + 1}</span>
                              )}
                              <span className="truncate">{p?.texto ?? def.nombre}</span>
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-semibold text-[#3A3A3C]">{c.enCurso?.falta ?? `En ${paso.nombre}`}</div>
                      {c.enCurso?.quien && <div className="text-[12px] text-[#86868B]">{c.enCurso.quien.nombre}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onAbrir(c, pantalla)}
                        className="text-[12.5px] font-semibold"
                        style={{ color: paso.color }}
                      >
                        Abrir →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
