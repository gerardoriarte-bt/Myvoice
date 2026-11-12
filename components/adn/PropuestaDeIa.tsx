import React from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import type { ContenidoSeccionAdn } from '../../types';
import { FUENTES, SeccionEnPantalla, TRATAMIENTOS } from './catalogo';

/**
 * Lo que propuso la IA para una sección, para revisarlo (ADN-7, diseño en el .pen: «§ ADN 2.0 · lo que
 * propone la IA»). No cuenta para el mínimo ni llega al motor hasta «Está bien». «Corregir» abre el
 * editor con lo propuesto: lo que se guarde ahí es de una persona.
 */
interface Props {
  seccion: SeccionEnPantalla;
  propuesta: ContenidoSeccionAdn;
  fuente: string | null;
  /** «1 de 3» cuando hay varias por revisar. */
  posicion?: { actual: number; total: number };
  onConfirmar: () => Promise<void>;
  onDescartar: () => Promise<void>;
  onCorregir: () => void;
  onCerrar: () => void;
}

export const textoDeContenido = (clave: string, c: ContenidoSeccionAdn): string[] => {
  if (clave === 'tratamiento') return [TRATAMIENTOS.find(t => t.valor === c.texto)?.nombre ?? c.texto];
  if (clave === 'asiSuena') return (c.ejemplos ?? []).map(e => `«${e.texto}»`);
  if (clave === 'reglasDeEstilo') {
    const r = c.reglas ?? {};
    return [
      r.emojis && `Emojis: ${{ no: 'ninguno', pocos: 'hasta dos por texto', libre: 'libres' }[r.emojis]}`,
      r.signosDeApertura && 'Siempre con ¡ y ¿ de apertura',
      r.formatoDePrecio && `Precios: ${r.formatoDePrecio}`,
      r.sinMayusculasSostenidas && 'Sin palabras enteras en mayúsculas',
      c.texto,
    ].filter((x): x is string => Boolean(x));
  }
  return c.texto ? [c.texto] : [];
};

const PropuestaDeIa: React.FC<Props> = ({ seccion, propuesta, fuente, posicion, onConfirmar, onDescartar, onCorregir, onCerrar }) => {
  const [ocupado, setOcupado] = React.useState<'confirmar' | 'descartar' | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const hacer = async (cual: 'confirmar' | 'descartar') => {
    setOcupado(cual);
    setError(null);
    try {
      await (cual === 'confirmar' ? onConfirmar() : onDescartar());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
      setOcupado(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onCerrar}>
      <div className="w-full max-w-[640px] rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-gray-900">{seccion.nombre} · propuesta de la IA</h3>
            {fuente && <p className="text-[12px] text-gray-500">Desde {FUENTES[fuente] ?? fuente}</p>}
          </div>
          {posicion && posicion.total > 1 && (
            <span className="text-[12px] text-gray-500">
              {posicion.actual} de {posicion.total}
            </span>
          )}
          <button onClick={onCerrar} className="rounded-md p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11.5px] font-medium text-blue-700">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Sin confirmar · todavía no cuenta
        </span>
        <div className="mt-3 space-y-2 rounded-xl bg-gray-50 p-4">
          {textoDeContenido(seccion.clave, propuesta).map((t, i) => (
            <p key={i} className="whitespace-pre-line text-[13.5px] leading-relaxed text-gray-800">
              {t}
            </p>
          ))}
        </div>
        {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={() => hacer('descartar')}
            disabled={ocupado !== null}
            className="text-[12.5px] text-gray-500 hover:text-gray-800"
          >
            {ocupado === 'descartar' ? 'Descartando…' : 'Descartar'}
          </button>
          <span className="flex-1" />
          <button
            onClick={onCorregir}
            disabled={ocupado !== null}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12.5px] text-gray-700 hover:bg-gray-50"
          >
            Corregir
          </button>
          <button
            onClick={() => hacer('confirmar')}
            disabled={ocupado !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-ink-hover disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> {ocupado === 'confirmar' ? 'Guardando…' : 'Está bien'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropuestaDeIa;
