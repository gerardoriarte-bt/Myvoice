import React from 'react';
import { PiezaEnRevision, ReviewDecision, ReviewPiezaFeedback, ReviewSession } from '../types';
import { reviewApi } from '../services/api';
import Isotipo from './ui/Isotipo';

/**
 * La ronda 2: el cliente aprueba la pieza terminada (H2.E).
 *
 * Es una pantalla aparte y no una rama dentro de `ReviewPortal` por dos
 * razones: la ronda de copy funciona y está en producción —no hay motivo para
 * arriesgarla—, y lo que se muestra es tan distinto que compartir el armado
 * habría dejado un componente lleno de condicionales.
 *
 * **El copy aprobado va al lado de la pieza**, no detrás de un clic. Sin eso el
 * cliente compara el arte contra lo que RECUERDA haber aprobado, y lo que
 * recuerda nunca es exactamente lo que aprobó.
 */

interface Props {
  token: string;
  sesion: ReviewSession;
  onEnviada: () => void;
  onError: () => void;
}

/**
 * Los dos campos del desglose. Del arte primero: es lo que el cliente está
 * mirando cuando escribe, y lo que más veces va a llenar.
 */
const CAMPOS = [
  {
    clave: 'feedbackDiseno' as const,
    etiqueta: 'Del arte',
    color: '#7C5CFF',
    ejemplo: 'El logo queda muy chico sobre la foto…',
  },
  {
    clave: 'feedbackCopy' as const,
    etiqueta: 'Del mensaje',
    color: '#0071E3',
    ejemplo: '«Necesita mejor gasolina» suena a que la nuestra es la cara…',
  },
];

type Notas = { feedbackCopy: string; feedbackDiseno: string };

export default function RevisionDePiezas({ token, sesion, onEnviada, onError }: Props) {
  const piezas = sesion.piezas ?? [];
  const [decisiones, setDecisiones] = React.useState<Record<string, ReviewDecision>>({});
  const [notas, setNotas] = React.useState<Record<string, Notas>>({});
  const [quien, setQuien] = React.useState('');
  const [faltaNombre, setFaltaNombre] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);

  const notasDe = (id: string): Notas => notas[id] ?? { feedbackCopy: '', feedbackDiseno: '' };
  const decididas = piezas.filter(p => decisiones[p.id]).length;
  const listo = decididas === piezas.length && piezas.length > 0;

  const enviar = async () => {
    if (!quien.trim()) {
      setFaltaNombre(true);
      return;
    }
    setFaltaNombre(false);
    setEnviando(true);
    try {
      const feedbacks: ReviewPiezaFeedback[] = piezas.map(p => ({
        piezaId: p.id,
        decision: decisiones[p.id],
        feedbackCopy: notasDe(p.id).feedbackCopy.trim() || undefined,
        feedbackDiseno: notasDe(p.id).feedbackDiseno.trim() || undefined,
      }));
      const r = await reviewApi.submit(token, { reviewerName: quien.trim(), feedbacks });
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
        <div className="mx-auto flex max-w-[1080px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Isotipo className="h-6 w-6" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868B]">
                Revisión de piezas
              </p>
              <h1 className="flex items-center gap-2 text-[15px] font-semibold text-[#1D1D1F]">
                {sesion.marca && (
                  <span className="rounded-md bg-[#1D1D1F] px-2 py-0.5 text-[12px] font-semibold text-white">
                    {sesion.marca}
                  </span>
                )}
                <span className="truncate">{sesion.title}</span>
              </h1>
            </div>
          </div>
          <p className="text-[12px] text-[#86868B]">
            {decididas} de {piezas.length} revisadas
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] space-y-5 px-6 py-7">
        <p className="text-[13px] text-[#6E6E73]">
          Estas piezas ya las revisó el equipo. Miralas contra el copy que aprobaste y marcá tu
          decisión.
        </p>

        {piezas.map((pieza, i) => (
          <Tarjeta
            key={pieza.id}
            indice={i + 1}
            pieza={pieza}
            decision={decisiones[pieza.id]}
            notas={notasDe(pieza.id)}
            onDecision={d => setDecisiones(prev => ({ ...prev, [pieza.id]: d }))}
            onNota={(clave, valor) =>
              setNotas(prev => ({ ...prev, [pieza.id]: { ...notasDe(pieza.id), [clave]: valor } }))
            }
          />
        ))}

        <section className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white p-5">
          <label htmlFor="quien" className="text-[12px] font-semibold text-[#1D1D1F]">
            Tu nombre
          </label>
          <input
            id="quien"
            value={quien}
            onChange={e => setQuien(e.target.value)}
            placeholder="Para que el equipo sepa quién revisó"
            className={`mt-1.5 w-full rounded-[10px] border px-3 py-2 text-[13px] ${
              faltaNombre ? 'border-[#C4351C]' : 'border-[rgba(0,0,0,0.1)]'
            }`}
          />
          {faltaNombre && <p className="mt-1 text-[11px] text-[#C4351C]">Hace falta tu nombre.</p>}

          <button
            onClick={() => void enviar()}
            disabled={!listo || enviando}
            className="mt-4 w-full rounded-[10px] bg-[#1D1D1F] px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-30"
          >
            {enviando ? 'Enviando…' : 'Enviar la revisión'}
          </button>
          {!listo && (
            <p className="mt-2 text-center text-[11px] text-[#86868B]">
              Falta decidir {piezas.length - decididas} de {piezas.length}.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

const Tarjeta: React.FC<{
  indice: number;
  pieza: PiezaEnRevision;
  decision?: ReviewDecision;
  notas: Notas;
  onDecision: (d: ReviewDecision) => void;
  onNota: (clave: keyof Notas, valor: string) => void;
}> = ({ indice, pieza, decision, notas, onDecision, onNota }) => (
  <article className="overflow-hidden rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white">
    <div className="flex flex-col md:flex-row">
      {/* La pieza. En video y audio no hay imagen: se entregan por enlace y el
          cliente los revisa fuera de la herramienta. Se dice, no se finge. */}
      <div className="flex min-h-[260px] w-full items-center justify-center bg-[#EEF0F3] md:w-[380px]">
        {pieza.previaUrl ? (
          <img src={pieza.previaUrl} alt={pieza.titulo} className="max-h-[340px] w-full object-contain" />
        ) : (
          <div className="px-6 py-10 text-center">
            <p className="text-[13px] font-semibold text-[#6E6E73]">{pieza.formato}</p>
            <p className="mt-1 text-[11px] leading-snug text-[#86868B]">
              Esta pieza es {pieza.tipo === 'VIDEO' ? 'un video' : 'un audio'} y se revisa fuera de
              la herramienta. El equipo te pasa el archivo aparte.
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3.5 p-5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-[#B0B0B5]">{indice}</span>
          <span className="text-[13px] font-semibold text-[#1D1D1F]">{pieza.platform}</span>
          <span className="text-[11px] text-[#86868B]">{pieza.formato}</span>
        </div>

        <div className="rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-[#FCFCFD] p-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[#B0B0B5]">
            El copy que aprobaste
          </p>
          <div className="mt-2 space-y-2">
            {pieza.slots.map(s => (
              <div key={s.slot}>
                <p className="text-[9px] font-semibold text-[#B0B0B5]">{s.slotLabel}</p>
                <p className="text-[12px] leading-snug text-[#1D1D1F]">{s.textoCongelado}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Boton activo={decision === 'APPROVED'} onClick={() => onDecision('APPROVED')} tono="ok">
            Aprobar
          </Boton>
          <Boton activo={decision === 'REJECTED'} onClick={() => onDecision('REJECTED')} tono="cambios">
            Pedir cambios
          </Boton>
        </div>

        {CAMPOS.map(campo => (
          <div key={campo.clave}>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: campo.color }} />
              <span className="text-[11px] font-semibold text-[#1D1D1F]">{campo.etiqueta}</span>
              <span className="text-[10px] text-[#86868B]">opcional</span>
            </div>
            <textarea
              rows={2}
              value={notas[campo.clave]}
              onChange={e => onNota(campo.clave, e.target.value)}
              placeholder={campo.ejemplo}
              className="mt-1 w-full rounded-[10px] border border-[rgba(0,0,0,0.1)] px-2.5 py-2 text-[12px]"
            />
          </div>
        ))}

        {/* Lo que cuesta cada tipo de cambio, en el momento de escribirlo. En un
            tooltip no lo lee nadie, y es lo que evita el cambio de mensaje de
            último momento — el caro. */}
        <p className="text-[10px] leading-snug text-[#86868B]">
          Un cambio del arte vuelve a producción. Un cambio del mensaje vuelve dos pasos: hay que
          reaprobar el copy y rehacer la pieza.
        </p>
      </div>
    </div>
  </article>
);

const Boton: React.FC<{
  activo: boolean;
  tono: 'ok' | 'cambios';
  onClick: () => void;
  children: React.ReactNode;
}> = ({ activo, tono, onClick, children }) => {
  const base = 'rounded-[9px] px-3.5 py-1.5 text-[12px] font-medium border transition-colors';
  const apagado = 'border-[rgba(0,0,0,0.1)] bg-white text-[#6E6E73] hover:bg-[#F5F5F7]';
  const encendido =
    tono === 'ok'
      ? 'border-transparent bg-[#047857] text-white'
      : 'border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]';
  return (
    <button onClick={onClick} className={`${base} ${activo ? encendido : apagado}`}>
      {children}
    </button>
  );
};
