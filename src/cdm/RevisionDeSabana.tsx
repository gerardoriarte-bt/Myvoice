import React from 'react';
import Isotipo from '../../components/ui/Isotipo';
import { reviewApi } from '../../services/api';
import type { EtapaDeFunnel, ReviewSession } from '../../types';

/**
 * El cliente aprueba la sábana por enlace, sin cuenta (F3b; P5 de las campañas «con cliente», decisión 24).
 * Ve la campaña, las fechas y las líneas por etapa; aprueba o devuelve con un comentario. Mismo marco que la
 * revisión de piezas del portal.
 */

const ETAPA: Record<EtapaDeFunnel, string> = {
  RECONOCIMIENTO: 'Reconocimiento',
  CONSIDERACION: 'Consideración',
  CONVERSION: 'Conversión',
  RETENCION: 'Retención',
};
const dia = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '');
const rango = (desde: string | null, hasta: string | null) => (desde || hasta ? `${dia(desde)} a ${dia(hasta)}` : 'sin fechas');

interface Props {
  token: string;
  sesion: ReviewSession;
  onEnviada: () => void;
  onError: () => void;
}

export default function RevisionDeSabana({ token, sesion, onEnviada, onError }: Props) {
  const s = sesion.sabana!;
  const [quien, setQuien] = React.useState('');
  const [comentario, setComentario] = React.useState('');
  const [falta, setFalta] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);
  const piezas = s.lineas.reduce((t, l) => t + l.piezas, 0);
  const medios = new Set(s.lineas.map(l => l.medio));

  const responder = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!quien.trim()) return setFalta('Escribe tu nombre para firmar la respuesta.');
    if (decision === 'REJECTED' && !comentario.trim()) return setFalta('Para devolverla, escribe qué hay que cambiar.');
    setFalta(null);
    setEnviando(true);
    try {
      const r = await reviewApi.submit(token, {
        reviewerName: quien.trim(),
        feedbacks: [{ planningId: s.id, decision, feedbackCopy: comentario.trim() || undefined }],
      });
      if (r?.error) throw new Error(r.error);
      onEnviada();
    } catch {
      onError();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <header className="border-b border-[rgba(0,0,0,0.06)] bg-white">
        <div className="mx-auto flex max-w-[1080px] items-center gap-2.5 px-6 py-4">
          <Isotipo className="h-6 w-6" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868B]">Aprobación de la sábana</p>
            <h1 className="flex items-center gap-2 text-[15px] font-semibold text-[#1D1D1F]">
              {s.marca && <span className="rounded-md bg-[#1D1D1F] px-2 py-0.5 text-[12px] font-semibold text-white">{s.marca}</span>}
              <span className="truncate">{s.campana}</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] space-y-5 px-6 py-7">
        <p className="text-[13px] text-[#6E6E73]">
          Estos son los medios, formatos y piezas que proponemos para la campaña. Revísalos y apruébalos, o devuélvelos con lo que
          haya que cambiar.
        </p>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            [String(piezas), piezas === 1 ? 'pieza' : 'piezas'],
            [String(medios.size), `${medios.size === 1 ? 'medio' : 'medios'} · ${[...medios].join(', ')}`],
            [String(s.etapas.length), `${s.etapas.length === 1 ? 'etapa' : 'etapas'} · ${s.etapas.map(e => ETAPA[e]).join(' y ')}`],
            [rango(s.desde, s.hasta), 'fechas'],
          ].map(([n, r]) => (
            <div key={r} className="rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3">
              <div className="text-[18px] font-bold text-[#1D1D1F]">{n}</div>
              <div className="text-[12px] text-[#6E6E73] truncate">{r}</div>
            </div>
          ))}
        </div>

        {s.etapas.map(e => {
          const de = s.lineas.filter(l => l.etapa === e);
          if (!de.length) return null;
          return (
            <section key={e} className="overflow-hidden rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white">
              <h2 className="flex items-baseline justify-between px-4 py-3 text-[14px] font-bold text-[#1D1D1F]">
                {ETAPA[e]}
                <span className="text-[12px] font-normal text-[#6E6E73]">{de.reduce((t, l) => t + l.piezas, 0)} piezas</span>
              </h2>
              <ul className="divide-y divide-[rgba(0,0,0,0.05)] border-t border-[rgba(0,0,0,0.06)]">
                {de.map(l => (
                  <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-[13px]">
                    <span className="w-[120px] font-semibold text-[#1D1D1F]">{l.medio}</span>
                    <span className="flex-1 text-[#1D1D1F]">{l.formato}</span>
                    <span className="text-[12px] text-[#6E6E73]">{l.medidas ?? 'solo texto'}</span>
                    <span className="w-[80px] text-right font-semibold tabular-nums">
                      {l.piezas} {l.piezas === 1 ? 'pieza' : 'piezas'}
                    </span>
                    <span className="w-[120px] text-right text-[12px] text-[#6E6E73]">{rango(l.desde ?? s.desde, l.hasta ?? s.hasta)}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <section className="space-y-3 rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white p-4">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868B]">Tu nombre</span>
            <input value={quien} onChange={e => setQuien(e.target.value)} className="mt-1 block w-full max-w-[360px] rounded-md border border-[rgba(0,0,0,0.12)] px-3 py-2 text-[13px]" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868B]">Comentario (obligatorio si la devuelves)</span>
            <textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              placeholder="Ej.: sumar TikTok también en Consideración"
              className="mt-1 h-20 w-full rounded-md border border-[rgba(0,0,0,0.12)] px-3 py-2 text-[13px]"
            />
          </label>
          {falta && <p className="text-[12.5px] text-red-600">{falta}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={enviando}
              onClick={() => void responder('REJECTED')}
              className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#1D1D1F] hover:bg-[#F5F5F7] disabled:opacity-40"
            >
              Devolver con comentario
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={() => void responder('APPROVED')}
              className="rounded-lg bg-[#1D1D1F] px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
            >
              Aprobar la sábana
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
