import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { aprobacionesApi } from '../../services/api';
import type { PorAprobar as Pendientes } from '../../types';

/**
 * «Por aprobar · N» (decisión 30, 2026-11-20): siempre en el encabezado, en todas las pantallas y en los
 * dos marcos. Las aprobaciones no pueden depender de haber visto un aviso: quien se suma como aprobador
 * por urgencia llega aquí y encuentra qué decidir. Junta la sábana (CDM), el copy (My Voice) y las piezas
 * (Producción); cada fila lleva a donde se decide.
 */

interface Props {
  /** Cambia con la pantalla: al volver de decidir algo, el número se pone al día. */
  pulso: string;
  onSabana: (clientId: string, campanaId: string) => void;
  onCopy: (clientId: string | null, campanaId: string) => void;
  onPieza: (clientId: string, piezaId: string) => void;
}

export default function PorAprobar({ pulso, onSabana, onCopy, onPieza }: Props) {
  const [datos, setDatos] = React.useState<Pendientes | null>(null);
  const [abierta, setAbierta] = React.useState(false);

  const cargar = React.useCallback(() => {
    aprobacionesApi.porAprobar().then(setDatos).catch(() => undefined);
  }, []);
  React.useEffect(() => {
    cargar();
  }, [cargar, pulso]);
  React.useEffect(() => {
    const t = setInterval(cargar, 60_000);
    window.addEventListener('focus', cargar);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', cargar);
    };
  }, [cargar]);

  const total = datos?.total ?? 0;
  const ir = (accion: () => void) => {
    setAbierta(false);
    accion();
  };
  const fila = 'flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left hover:bg-[#F5F5F7]';
  const titulo = 'px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868B]';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setAbierta(v => !v);
          cargar();
        }}
        className={`flex h-7 items-center gap-1.5 rounded-[7px] px-2.5 text-[12px] font-semibold transition-colors ${
          total > 0 ? 'bg-amber-100 text-amber-900 hover:bg-amber-200' : 'text-[#6E6E73] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1D1D1F]'
        }`}
      >
        <CheckCircle2 className="h-[14px] w-[14px]" strokeWidth={2} />
        Por aprobar{total > 0 ? ` · ${total}` : ''}
      </button>

      {abierta && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierta(false)} />
          <div className="absolute right-0 top-9 z-50 w-[360px] overflow-hidden rounded-xl border border-[rgba(0,0,0,0.08)] bg-white pb-2 shadow-[0_8px_32px_rgba(0,0,0,0.14)]">
            <div className="border-b border-[rgba(0,0,0,0.06)] px-4 py-2.5 text-[12px] font-semibold text-[#1D1D1F]">Te toca aprobar</div>
            {!datos ? (
              <p className="px-4 py-6 text-center text-[12px] text-[#86868B]">Cargando…</p>
            ) : total === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] text-[#86868B]">Nada espera tu aprobación.</p>
            ) : (
              <>
                {datos.sabanas.length > 0 && (
                  <>
                    <p className={titulo}>Sábanas · CDM</p>
                    {datos.sabanas.map(s => (
                      <button key={s.planningId} type="button" className={fila} onClick={() => ir(() => onSabana(s.clientId, s.campanaId))}>
                        <span className="text-[13px] font-medium text-[#1D1D1F]">{s.campana}</span>
                        <span className="text-[11.5px] text-[#86868B]">{s.marca}</span>
                      </button>
                    ))}
                  </>
                )}
                {datos.copy.length > 0 && (
                  <>
                    <p className={titulo}>Copy · Copywriting</p>
                    {datos.copy.map(c => (
                      <button key={c.campanaId} type="button" className={fila} onClick={() => ir(() => onCopy(c.clientId, c.campanaId))}>
                        <span className="text-[13px] font-medium text-[#1D1D1F]">
                          {c.campana} <span className="font-normal text-[#6E6E73]">· {c.cantidad} {c.cantidad === 1 ? 'texto' : 'textos'}</span>
                        </span>
                        <span className="text-[11.5px] text-[#86868B]">{c.marca}</span>
                      </button>
                    ))}
                  </>
                )}
                {datos.piezas.length > 0 && (
                  <>
                    <p className={titulo}>Piezas · Producción</p>
                    {datos.piezas.map(p => (
                      <button key={p.piezaId} type="button" className={fila} onClick={() => ir(() => onPieza(p.clientId, p.piezaId))}>
                        <span className="text-[13px] font-medium text-[#1D1D1F]">
                          {p.pieza}
                          {p.campana && <span className="font-normal text-[#6E6E73]"> · {p.campana}</span>}
                        </span>
                        <span className="text-[11.5px] text-[#86868B]">{p.marca}</span>
                      </button>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
