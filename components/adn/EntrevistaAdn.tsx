import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { clientApi } from '../../services/api';

/**
 * «Completar con IA» (Gerardo, 2026-11-25): una entrevista corta —una pregunta por cada sección esencial que falta o
 * está débil, y dos opcionales— y la IA redacta una propuesta por sección con las respuestas. Nada se guarda en el ADN:
 * las propuestas quedan para que alguien las apruebe, corrija o descarte. Hecho sin el `.pen`.
 */

type Pregunta = Awaited<ReturnType<typeof clientApi.preguntasAdn>>[number];

interface Props {
  clientId: string;
  marca: string;
  onCerrar: () => void;
  /** Terminó: cuántas secciones y audiencias quedaron propuestas. */
  onPropuesto: (r: { secciones: string[]; audiencias: number }) => void;
}

export default function EntrevistaAdn({ clientId, marca, onCerrar, onPropuesto }: Props) {
  const [preguntas, setPreguntas] = React.useState<Pregunta[] | null>(null);
  const [respuestas, setRespuestas] = React.useState<Record<string, string>>({});
  const [ocupado, setOcupado] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    clientApi
      .preguntasAdn(clientId)
      .then(setPreguntas)
      .catch(e => setError(e instanceof Error ? e.message : 'No se pudo preparar la entrevista'));
  }, [clientId]);

  const respondidas = Object.values(respuestas).filter(v => v.trim()).length;
  const enviar = async () => {
    setOcupado(true);
    setError(null);
    try {
      onPropuesto(await clientApi.entrevistaAdn(clientId, respuestas));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron redactar las propuestas');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onCerrar}>
      <div className="flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <header className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-semibold text-gray-900">Completar el ADN de {marca} con IA</h3>
            <p className="mt-0.5 text-[12px] text-gray-500">
              Responde con tus palabras, aunque sea corto. La IA redacta cada sección y tú la apruebas, la corriges o la descartas: nada entra al ADN sin
              que alguien lo apruebe.
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {!preguntas && !error && <p className="text-[13px] text-gray-500">Preparando las preguntas…</p>}
          {preguntas?.length === 0 && <p className="text-[13px] text-gray-600">Lo esencial del ADN ya está completo. Puedes mejorar cada sección desde su tarjeta.</p>}
          {preguntas?.map((p, i) => (
            <div key={p.clave}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">
                {i + 1}. {p.seccion}
              </p>
              <p className="mt-0.5 text-[13.5px] font-medium text-gray-900">{p.pregunta}</p>
              {p.opciones ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.opciones.map(o => (
                    <button
                      key={o.valor}
                      type="button"
                      onClick={() => setRespuestas(r => ({ ...r, [p.clave]: o.valor }))}
                      className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold ${respuestas[p.clave] === o.valor ? 'bg-gray-900 text-white' : 'bg-white text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50'}`}
                    >
                      {o.nombre}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  value={respuestas[p.clave] ?? ''}
                  onChange={e => setRespuestas(r => ({ ...r, [p.clave]: e.target.value }))}
                  rows={3}
                  placeholder={p.ayuda}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:border-gray-400 focus:outline-none"
                />
              )}
            </div>
          ))}
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-gray-100 bg-gray-50 px-5 py-3">
          <p className="min-w-0 flex-1 text-[11.5px] text-gray-500">{error ? <span className="text-red-600">{error}</span> : 'Usa crédito de IA. Tarda unos segundos.'}</p>
          <button type="button" onClick={onCerrar} className="rounded-lg px-3 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-100">
            Cancelar
          </button>
          <button
            type="button"
            disabled={ocupado || respondidas === 0}
            onClick={() => void enviar()}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
          >
            <Sparkles className="h-4 w-4" /> {ocupado ? 'Redactando…' : 'Proponer el ADN'}
          </button>
        </footer>
      </div>
    </div>
  );
}
