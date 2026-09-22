import React from 'react';
import { AlertTriangle, Copy, Loader2, X } from 'lucide-react';
import { Pieza, PiezaDetalle } from '../../types';
import { piezasApi } from '../../services/api';
import AccionesPieza from './AccionesPieza';

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
  miembros: { id: string; name: string }[];
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
            <h2 className="text-[17px] font-semibold text-apple-text">
              {pieza ? pieza.titulo : 'Orden de trabajo'}
            </h2>
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

          {pieza && pieza.eventos.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-apple-tertiary">
                Historial
              </h3>
              <ul className="mt-2 space-y-1.5">
                {pieza.eventos.map(e => (
                  <li key={e.id} className="text-[11px] text-apple-secondary">
                    <span className="font-medium text-apple-text">{e.tipo.toLowerCase()}</span>
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
