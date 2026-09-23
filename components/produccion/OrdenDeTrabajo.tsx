import React from 'react';
import { AlertTriangle, Check, Copy, Loader2, Pencil, Send, X } from 'lucide-react';
import { Pieza, PiezaDetalle } from '../../types';
import { piezasApi } from '../../services/api';
import AccionesPieza from './AccionesPieza';
import Informe from './Informe';

/**
 * La orden de trabajo: lo que ve el diseñador antes de abrir Figma.
 *
 * Existe para que la auditoría de la fase 3 no tenga nada que encontrar. Por
 * eso el copy se muestra para copiar y pegar, no para retipear, y el brief de
 * producción que el motor ya emite —y que hasta ahora no consumía nadie— va
 * separado del texto publicable: uno se transcribe, el otro se interpreta.
 */

interface Props {
  piezaId: string;
  miembros: { id: string; name: string; etiqueta?: string }[];
  onCerrar: () => void;
  onCambio: (pieza: Pieza) => void;
  onError: (mensaje: string) => void;
}

const MOTIVO: Record<string, string> = {
  editado: 'cambió en la Biblioteca',
  desaprobado: 'ya no está aprobado',
  borrado: 'se borró de la Biblioteca',
};

export default function OrdenDeTrabajo({ piezaId, miembros, onCerrar, onCambio, onError }: Props) {
  const [pieza, setPieza] = React.useState<PiezaDetalle | null>(null);
  const [copiado, setCopiado] = React.useState<string | null>(null);
  /** El título es lo único editable a mano: el estado se mueve con acciones. */
  const [titulo, setTitulo] = React.useState<string | null>(null);
  const [comentario, setComentario] = React.useState('');

  const cargar = React.useCallback(async () => {
    try {
      setPieza(await piezasApi.detalle(piezaId));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo abrir la pieza');
      onCerrar();
    }
  }, [piezaId, onCerrar, onError]);

  React.useEffect(() => {
    void cargar();
  }, [cargar]);

  const copiar = async (texto: string, id: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(id);
      window.setTimeout(() => setCopiado(null), 1500);
    } catch {
      onError('El navegador no dejó copiar');
    }
  };

  const guardarTitulo = async () => {
    const nuevo = (titulo ?? '').trim();
    if (!pieza || !nuevo || nuevo === pieza.titulo) {
      setTitulo(null);
      return;
    }
    try {
      onCambio(await piezasApi.renombrar(pieza.id, nuevo));
      setPieza({ ...pieza, titulo: nuevo });
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo renombrar la pieza');
    } finally {
      setTitulo(null);
    }
  };

  /**
   * Un comentario no mueve la pieza: va al mismo historial que las decisiones,
   * porque al leer una pieza lo que importa es la secuencia completa.
   */
  const comentar = async () => {
    const nota = comentario.trim();
    if (!pieza || !nota) return;
    try {
      onCambio(await piezasApi.comentar(pieza.id, nota));
      setComentario('');
      await cargar();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo comentar');
    }
  };

  const tras = (actualizada: Pieza) => {
    onCambio(actualizada);
    void cargar();
  };

  const publicables = pieza?.slots.filter(s => !s.esInstruccion) ?? [];
  const brief = pieza?.slots.filter(s => s.esInstruccion) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-apple-border px-6 py-5">
          <div>
            {titulo === null ? (
              <h2 className="group flex items-center gap-2 text-[17px] font-semibold text-apple-text">
                {pieza ? pieza.titulo : 'Orden de trabajo'}
                {pieza && (
                  <button
                    onClick={() => setTitulo(pieza.titulo)}
                    title="Renombrar"
                    className="text-apple-tertiary opacity-0 transition-opacity hover:text-apple-text group-hover:opacity-100"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </h2>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') void guardarTitulo();
                    if (e.key === 'Escape') setTitulo(null);
                  }}
                  className="rounded-lg border border-apple-border px-2 py-1 text-[15px] font-semibold text-apple-text"
                />
                <button onClick={() => void guardarTitulo()} className="text-apple-secondary hover:text-apple-text">
                  <Check className="h-4 w-4" />
                </button>
              </div>
            )}
            {pieza && (
              <p className="mt-1 text-[12px] text-apple-secondary">
                {pieza.platform} · {pieza.formato}
                {pieza.client ? ` · ${pieza.client.name}` : ''}
                {pieza.project ? ` · ${pieza.project.name}` : ''}
              </p>
            )}
          </div>
          <button onClick={onCerrar} className="rounded-lg p-1 text-apple-secondary hover:bg-apple-fill">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {!pieza && (
            <div className="flex items-center gap-2 text-[13px] text-apple-secondary">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          )}

          {pieza && pieza.desfases.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5" /> El copy cambió después de mandarla a producir
              </p>
              <ul className="mt-2 space-y-1">
                {pieza.desfases.map(d => (
                  <li key={d.slot} className="text-[11px] text-apple-text">
                    <span className="font-medium">{d.slotLabel}</span> {MOTIVO[d.motivo]}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-apple-secondary">
                La pieza sigue con el texto que se mandó a producir. Actualizarla es una decisión, no algo que pase solo.
              </p>
              <button
                onClick={async () => {
                  try {
                    tras(await piezasApi.actualizarCopy(pieza.id));
                  } catch (e) {
                    onError(e instanceof Error ? e.message : 'No se pudo actualizar el copy');
                  }
                }}
                className="mt-3 rounded-lg bg-ink px-3 py-1.5 text-[11px] font-medium text-white hover:bg-ink-hover"
              >
                Actualizar la orden
              </button>
            </div>
          )}

          {pieza && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-apple-tertiary">
                Copy aprobado
              </h3>
              <p className="mt-1 text-[11px] text-apple-secondary">
                Copiar y pegar, no retipear: la auditoría después compara carácter por carácter.
              </p>
              <ul className="mt-3 space-y-2">
                {publicables.map(s => (
                  <li key={s.id} className="rounded-xl border border-apple-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-apple-tertiary">
                        {s.slotLabel}
                      </span>
                      <button
                        onClick={() => copiar(s.textoCongelado, s.id)}
                        className="flex shrink-0 items-center gap-1 text-[10px] text-apple-secondary hover:text-apple-text"
                      >
                        <Copy className="h-3 w-3" />
                        {copiado === s.id ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[12px] text-apple-text">{s.textoCongelado}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {brief.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-apple-tertiary">
                Brief de producción
              </h3>
              <p className="mt-1 text-[11px] text-apple-secondary">
                Lo emite el motor junto con el copy. No va en el arte: se interpreta.
              </p>
              <ul className="mt-3 space-y-2">
                {brief.map(s => (
                  <li key={s.id} className="rounded-xl bg-apple-bg p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-apple-tertiary">
                      {s.slotLabel}
                    </span>
                    <p className="mt-1 whitespace-pre-wrap text-[12px] text-apple-text">{s.textoCongelado}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {pieza && pieza.hermanas.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-apple-tertiary">
                Va con
              </h3>
              <ul className="mt-2 space-y-1">
                {pieza.hermanas.map(h => (
                  <li key={h.id} className="text-[11px] text-apple-text">
                    {h.platform} · {h.formato} — {h.titulo}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* El informe va ARRIBA de los comentarios y abajo del copy: quien
              aprueba entra a esto, y el diseñador lo lee antes que nadie (D3). */}
          {pieza?.informe && (
            <Informe pieza={pieza} onCambio={onCambio} onError={onError} onRecargar={() => void cargar()} />
          )}

          {pieza && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-apple-tertiary">
                Comentarios
              </h3>
              <p className="mt-1 text-[11px] text-apple-secondary">
                Para lo que hay que decir sobre la pieza y no es un motivo de devolución. No cambia su estado.
              </p>
              <div className="mt-2 flex items-start gap-2">
                <textarea
                  value={comentario}
                  onChange={e => setComentario(e.target.value)}
                  rows={2}
                  placeholder="El logo tiene que ir sobre fondo claro…"
                  className="flex-1 rounded-lg border border-apple-border px-2.5 py-2 text-[12px] text-apple-text"
                />
                <button
                  onClick={() => void comentar()}
                  disabled={!comentario.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-[11px] font-medium text-white hover:bg-ink-hover disabled:opacity-40"
                >
                  <Send className="h-3 w-3" />
                  Comentar
                </button>
              </div>
            </section>
          )}

          {pieza && pieza.eventos.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-apple-tertiary">
                Historial
              </h3>
              <ul className="mt-2 space-y-1.5">
                {pieza.eventos.map(e => (
                  <li key={e.id} className="text-[11px] text-apple-secondary">
                    <span className="font-medium text-apple-text">
                      {e.tipo === 'COMENTARIO' ? 'comentario' : e.tipo.toLowerCase()}
                    </span>
                    {e.autor ? ` · ${e.autor.name}` : ''} ·{' '}
                    {new Date(e.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    {e.nota && <span className="block text-apple-text">«{e.nota}»</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {pieza && (
          <footer className="border-t border-apple-border px-6 py-4">
            <AccionesPieza pieza={pieza} miembros={miembros} onCambio={tras} onError={onError} />
          </footer>
        )}
      </div>
    </div>
  );
}
