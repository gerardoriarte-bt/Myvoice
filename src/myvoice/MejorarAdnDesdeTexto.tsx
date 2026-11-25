import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { clientApi, negativeFeedbackApi } from '../../services/api';
import type { ClaveAdn, CopyVariation } from '../../types';
import { NOMBRE_SECCION, alertasDelAdn, seccionSugerida } from './trazasDelAdn';

/**
 * «¿No suena a la marca?» (fase 2 de la decisión 35, 2026-11-25). El equipo dice qué está mal en un texto y en qué
 * sección del ADN cree que está la causa; la IA propone esa sección corregida —se muestra aquí— y queda esperando que
 * alguien la apruebe en Marca › ADN. El texto además se guarda como ejemplo de lo que no se quiere, como el rechazo de
 * siempre. Hecho sin el `.pen`.
 */

const MEJORABLES: ClaveAdn[] = ['voz', 'propuestaDeValor', 'tratamiento', 'prohibiciones', 'reglasDeEstilo', 'frasesIntocables', 'keywords', 'productos'];

interface Props {
  clientId: string;
  texto: CopyVariation;
  onCerrar: () => void;
  /** Lleva a la sección en Marca › ADN, donde se aprueba la propuesta. */
  onIrAlAdn?: (clave: ClaveAdn) => void;
}

export default function MejorarAdnDesdeTexto({ clientId, texto, onCerrar, onIrAlAdn }: Props) {
  const [seccion, setSeccion] = React.useState<ClaveAdn>(seccionSugerida(texto));
  const [motivo, setMotivo] = React.useState('');
  const [ocupado, setOcupado] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hecho, setHecho] = React.useState<Awaited<ReturnType<typeof clientApi.mejoraAdn>> | null>(null);
  const alertas = alertasDelAdn(texto).filter(a => a.seccion);

  const proponer = async () => {
    setOcupado(true);
    setError(null);
    try {
      const r = await clientApi.mejoraAdn(clientId, { seccion, texto: texto.content, motivo });
      // El rechazo de siempre: el motor no repite lo que la marca no quiere.
      await negativeFeedbackApi.save({ clientId, platform: String(texto.platform), content: texto.content, reason: motivo }).catch(() => undefined);
      setHecho(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo proponer la mejora');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onCerrar}>
      <div className="flex max-h-[90vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <header className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-semibold text-gray-900">¿No suena a la marca?</h3>
            <p className="mt-0.5 text-[12px] text-gray-500">Cuéntale a la IA qué está mal: propone cómo corregir el ADN para que no se repita. Tú lo apruebas.</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <blockquote className="whitespace-pre-line rounded-lg bg-gray-50 px-3 py-2 text-[13px] text-gray-800">{texto.content}</blockquote>

          {hecho ? (
            hecho.propuesta ? (
              <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50 p-3">
                <p className="text-[12px] font-semibold text-violet-900">Propuesta para «{hecho.nombre}»</p>
                <p className="whitespace-pre-line text-[13px] text-gray-900">{hecho.propuesta}</p>
                {hecho.porque && <p className="text-[12px] text-violet-800">{hecho.porque}</p>}
                <p className="text-[11.5px] text-gray-600">Todavía no cambió nada: queda esperando que alguien la apruebe en el ADN.</p>
              </div>
            ) : (
              <p className="rounded-lg bg-gray-50 px-3 py-2 text-[12.5px] text-gray-700">La IA no encontró qué cambiar en «{hecho.nombre}» con eso. El texto quedó guardado como ejemplo de lo que no se quiere.</p>
            )
          ) : (
            <>
              <label className="block">
                <span className="text-[12px] font-semibold text-gray-700">¿Qué está mal?</span>
                <textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="Ej.: la marca nunca promete «el mejor»; suena demasiado formal; el producto no se llama así…"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:border-gray-400 focus:outline-none"
                />
              </label>
              <div>
                <span className="text-[12px] font-semibold text-gray-700">¿En qué parte del ADN está la causa?</span>
                {alertas.length > 0 && (
                  <p className="mt-0.5 text-[11.5px] text-gray-500">
                    El motor marcó: {alertas.map(a => `${a.mensaje} (${NOMBRE_SECCION[a.seccion!]})`).join(' · ')}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {MEJORABLES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSeccion(c)}
                      className={`rounded-full px-3 py-1 text-[12px] font-semibold ${seccion === c ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50'}`}
                    >
                      {NOMBRE_SECCION[c]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-gray-100 bg-gray-50 px-5 py-3">
          <p className="min-w-0 flex-1 text-[11.5px] text-gray-500">{error ? <span className="text-red-600">{error}</span> : hecho ? '' : 'Usa crédito de IA.'}</p>
          {hecho ? (
            <>
              <button type="button" onClick={onCerrar} className="rounded-lg px-3 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-100">
                Cerrar
              </button>
              {hecho.propuesta && onIrAlAdn && (
                <button
                  type="button"
                  onClick={() => onIrAlAdn(hecho.seccion as ClaveAdn)}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-black"
                >
                  Revisar en el ADN
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              disabled={ocupado || !motivo.trim()}
              onClick={() => void proponer()}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" /> {ocupado ? 'Pensando…' : 'Proponer cambio al ADN'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
