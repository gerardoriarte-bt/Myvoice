import React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { ContenidoSeccionAdn, ReglasMedibles } from '../../types';
import { SeccionEnPantalla, TRATAMIENTOS } from './catalogo';

/**
 * Editar una sección del ADN (docs/plan-adn-2.md, F2). Un modal por sección, con el campo que pide cada
 * una: texto, tratamiento, ejemplos de así suena o reglas medibles más notas. Las audiencias tienen el
 * suyo (`EditorDeAudiencias`): se editan de a una.
 *
 * En una submarca, lo que se escribe en una sección que suma es solo lo propio: lo de la madre llega
 * igual y no se puede quitar.
 */
interface Props {
  seccion: SeccionEnPantalla;
  inicial: ContenidoSeccionAdn;
  /** El nombre de la madre si la sección suma: se aclara que esto se agrega a lo de ella. */
  sumaA?: string | null;
  /** «Corregir» una propuesta de la IA: el título lo dice. */
  corrigiendoPropuesta?: boolean;
  onGuardar: (contenido: ContenidoSeccionAdn) => Promise<void>;
  onCerrar: () => void;
}

const campo =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] leading-relaxed text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-500';

const PISTAS: Partial<Record<string, string>> = {
  propuestaDeValor: 'Qué la hace distinta, en una o dos frases completas.',
  productos: 'Lo que vende: productos, servicios, programas. Con precios solo si son fijos.',
  voz: 'Cómo habla: cercana, experta, divertida… y en qué se nota.',
  prohibiciones: 'no prometer ahorro de combustible, no nombrar a la competencia',
  frasesIntocables: 'ViveTerpel\nPuntos ViveTerpel\nTienda Altoque',
  keywords: 'energía, movilidad, estaciones',
};

const EditorDeSeccion: React.FC<Props> = ({ seccion, inicial, sumaA, corrigiendoPropuesta, onGuardar, onCerrar }) => {
  const [texto, setTexto] = React.useState(inicial.texto ?? '');
  const [ejemplos, setEjemplos] = React.useState<string[]>(
    inicial.ejemplos?.length ? inicial.ejemplos.map(e => e.texto) : ['']
  );
  const [reglas, setReglas] = React.useState<ReglasMedibles>(inicial.reglas ?? {});
  const [guardando, setGuardando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    const contenido: ContenidoSeccionAdn = { texto };
    if (seccion.clave === 'asiSuena') {
      // Se conservan los datos de los ejemplos que no cambiaron (de qué medio y de qué copy vienen).
      contenido.ejemplos = ejemplos
        .map(t => t.trim())
        .filter(Boolean)
        .map(t => inicial.ejemplos?.find(e => e.texto === t) ?? { texto: t });
    }
    if (seccion.clave === 'reglasDeEstilo') contenido.reglas = reglas;
    try {
      await onGuardar(contenido);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
      setGuardando(false);
    }
  };

  const regla = <K extends keyof ReglasMedibles>(k: K, v: ReglasMedibles[K] | undefined) => {
    const r = { ...reglas };
    if (v === undefined || v === '' || v === false) delete r[k];
    else r[k] = v;
    setReglas(r);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onCerrar}>
      <div className="w-full max-w-[560px] rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-gray-900">
              {corrigiendoPropuesta ? `Corregir lo que propuso la IA · ${seccion.nombre}` : seccion.nombre}
            </h3>
            <p className="mt-0.5 text-[12px] text-gray-500">{seccion.ayuda}</p>
          </div>
          <button onClick={onCerrar} className="rounded-md p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-5 py-4">
          {sumaA && (
            <p className="rounded-lg bg-violet-50 px-3 py-2 text-[12px] text-violet-800">
              Esto se suma a lo de {sumaA}, que llega igual y no se puede quitar desde acá.
            </p>
          )}

          {seccion.clave === 'tratamiento' ? (
            <div className="space-y-2">
              {TRATAMIENTOS.map(t => (
                <button
                  key={t.valor}
                  type="button"
                  onClick={() => setTexto(texto === t.valor ? '' : t.valor)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left ${
                    texto === t.valor ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span className="text-[13px] font-semibold text-gray-900">{t.nombre}</span>
                  <span className="text-[12px] text-gray-500">{t.ejemplo}</span>
                </button>
              ))}
              <p className="text-[11px] text-gray-400">Sin elegir, el motor escribe de usted (el default de Colombia).</p>
            </div>
          ) : seccion.clave === 'asiSuena' ? (
            <div className="space-y-2">
              {ejemplos.map((e, i) => (
                <div key={i} className="flex gap-2">
                  <textarea
                    rows={2}
                    value={e}
                    onChange={ev => setEjemplos(ejemplos.map((x, j) => (j === i ? ev.target.value : x)))}
                    placeholder="Un texto que la marca dio por bueno"
                    className={campo}
                  />
                  <button
                    onClick={() => setEjemplos(ejemplos.length === 1 ? [''] : ejemplos.filter((_, j) => j !== i))}
                    className="self-start rounded-md p-2 text-gray-300 hover:text-red-500"
                    aria-label="Quitar ejemplo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setEjemplos([...ejemplos, ''])}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-gray-700 hover:text-gray-900"
              >
                <Plus className="h-3.5 w-3.5" /> Otro ejemplo
              </button>
            </div>
          ) : seccion.clave === 'reglasDeEstilo' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-[12px] font-medium text-gray-700">
                  Emojis
                  <select
                    value={reglas.emojis ?? ''}
                    onChange={e => regla('emojis', (e.target.value || undefined) as ReglasMedibles['emojis'])}
                    className={`${campo} mt-1`}
                  >
                    <option value="">Sin regla</option>
                    <option value="no">Ninguno</option>
                    <option value="pocos">Hasta dos por texto</option>
                    <option value="libre">Libres</option>
                  </select>
                </label>
                <label className="text-[12px] font-medium text-gray-700">
                  Cómo se escriben los precios
                  <input
                    value={reglas.formatoDePrecio ?? ''}
                    onChange={e => regla('formatoDePrecio', e.target.value)}
                    placeholder="$12.900"
                    className={`${campo} mt-1`}
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-[12.5px] text-gray-800">
                <input
                  type="checkbox"
                  checked={Boolean(reglas.signosDeApertura)}
                  onChange={e => regla('signosDeApertura', e.target.checked)}
                />
                Siempre con ¡ y ¿ de apertura
              </label>
              <label className="flex items-center gap-2 text-[12.5px] text-gray-800">
                <input
                  type="checkbox"
                  checked={Boolean(reglas.sinMayusculasSostenidas)}
                  onChange={e => regla('sinMayusculasSostenidas', e.target.checked)}
                />
                Sin palabras enteras en MAYÚSCULAS
              </label>
              <label className="block text-[12px] font-medium text-gray-700">
                Notas para el redactor
                <textarea rows={4} value={texto} onChange={e => setTexto(e.target.value)} className={`${campo} mt-1`} />
              </label>
            </div>
          ) : (
            <textarea
              autoFocus
              rows={seccion.clave === 'frasesIntocables' ? 6 : 5}
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder={PISTAS[seccion.clave]}
              className={campo}
            />
          )}
          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button onClick={onCerrar} className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12.5px] text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="rounded-lg bg-ink px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-ink-hover disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorDeSeccion;
