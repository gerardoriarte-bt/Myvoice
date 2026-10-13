import React from 'react';
import { ArrowRight } from 'lucide-react';
import { NOVEDADES, Novedad, fechaCorta } from '../novedades';
import { screenName } from '../screens';

/**
 * El registro de lo que cambió (ver `novedades.ts`). Discreto a propósito: no
 * está en el menú por etapas, se llega desde el pie de la barra lateral.
 */
interface Props {
  vistas: string[];
  /** Reabrir el aviso completo de una novedad que lo tiene. */
  onVerAviso: (novedad: Novedad) => void;
}

export default function Novedades({ vistas, onVerAviso }: Props) {
  return (
    <div className="mx-auto max-w-[640px] apple-card p-7">
      <h1 className="text-[22px] font-semibold text-gray-900">{screenName('novedades')}</h1>
      <p className="mt-1 text-[12px] text-gray-500">Lo que cambió en My Voice, de lo más reciente a lo más viejo.</p>

      <ol className="mt-6 space-y-5">
        {NOVEDADES.map(n => (
          <li key={n.id} className="flex gap-[18px]">
            <div className="w-[92px] shrink-0">
              <time dateTime={n.fecha} className="text-[11px] font-medium text-gray-500">
                {fechaCorta(n.fecha)}
              </time>
              {n.aviso && !vistas.includes(n.id) && (
                <span className="mt-1 block w-fit rounded-full bg-indigo-50 px-1.5 text-[8.5px] font-bold uppercase tracking-[0.06em] text-indigo-700">
                  Nuevo
                </span>
              )}
            </div>
            <div className="flex-1 border-b border-gray-100 pb-[18px]">
              <h2 className="text-[14px] font-semibold text-gray-900">{n.titulo}</h2>
              <ul className="mt-1.5 space-y-1">
                {n.cambios.map((c, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-gray-700">
                    <span className="text-gray-400">·</span>
                    {c}
                  </li>
                ))}
              </ul>
              {n.aviso && (
                <button
                  onClick={() => onVerAviso(n)}
                  className="mt-2 flex items-center gap-1 text-[11.5px] font-medium text-indigo-700 hover:underline"
                >
                  Ver el aviso completo <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
