import React from 'react';
import { ArrowRight, Check, ChevronDown, Copy, CornerDownRight } from 'lucide-react';
import { Client } from '../types';
import { distincion, familias, tieneNombreRepetido } from '../marcas';

/**
 * El selector de marca del encabezado (docs/plan-marcas-relacionadas.md).
 *
 * Reemplaza un `<select>` nativo que no podía mostrar lo que hace falta para
 * no equivocarse de marca: las complementarias sangradas bajo su madre, el
 * aviso de nombre repetido y la línea que distingue a dos marcas iguales. Así
 * se coló trabajo en la marca equivocada.
 *
 * Es una lista navegable con teclado (flechas, Enter, Escape) y `role=listbox`.
 */

interface Props {
  marcas: Client[];
  activa: string;
  onElegir: (id: string) => void;
  /** Lleva a Marcas, donde se resuelve un nombre repetido. Solo para quien administra. */
  onRevisarRepetidos?: () => void;
}

const Distintivo = ({ marca, chico }: { marca: Client; chico?: boolean }) => (
  <span
    className={`flex shrink-0 items-center justify-center rounded-[5px] bg-ink font-bold text-white ${
      chico ? 'h-5 w-5 text-[9px]' : 'h-6 w-6 text-[10px]'
    }`}
  >
    {marca.name.trim()[0]?.toUpperCase() ?? '·'}
  </span>
);

export default function SelectorDeMarca({ marcas, activa, onElegir, onRevisarRepetidos }: Props) {
  const [abierto, setAbierto] = React.useState(false);
  const [foco, setFoco] = React.useState(0);
  const contenedor = React.useRef<HTMLDivElement>(null);

  // El orden de la lista es el de las familias: madre y, debajo, sus complementarias.
  const orden = React.useMemo(
    () => familias(marcas).flatMap(f => [{ marca: f.madre, hija: false }, ...f.complementarias.map(c => ({ marca: c, hija: true }))]),
    [marcas]
  );
  const actual = marcas.find(m => m.id === activa);
  const hayRepetidos = marcas.some(tieneNombreRepetido);

  React.useEffect(() => {
    if (!abierto) return;
    setFoco(Math.max(0, orden.findIndex(o => o.marca.id === activa)));
    const fuera = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto, activa, orden]);

  const elegir = (id: string) => {
    onElegir(id);
    setAbierto(false);
  };

  const teclado = (e: React.KeyboardEvent) => {
    if (!abierto && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setAbierto(true);
      return;
    }
    if (!abierto) return;
    if (e.key === 'Escape') setAbierto(false);
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFoco(f => Math.min(orden.length - 1, f + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFoco(f => Math.max(0, f - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (orden[foco]) elegir(orden[foco].marca.id);
    }
  };

  if (!actual) return null;
  const madre = actual.marcaMadreId ? marcas.find(m => m.id === actual.marcaMadreId) : undefined;

  return (
    <div ref={contenedor} className="relative" onKeyDown={teclado}>
      <button
        type="button"
        aria-label="Marca activa"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        onClick={() => setAbierto(a => !a)}
        className="flex items-center gap-1.5 rounded-md border border-[rgba(0,0,0,0.12)] bg-white px-2 py-1 text-[13px] outline-none focus-visible:ring-1 focus-visible:ring-[#1D1D1F]"
      >
        <span className="font-semibold text-[#1D1D1F]">{actual.name}</span>
        {madre && <span className="text-[12px] text-[#86868B]">· de {madre.name}</span>}
        <ChevronDown className="h-3.5 w-3.5 text-[#86868B]" />
      </button>

      {abierto && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[340px] rounded-[10px] border border-[rgba(0,0,0,0.1)] bg-white py-1.5 shadow-xl">
          <p className="px-3 pb-1 pt-1.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#86868B]">
            {marcas.length === 1 ? '1 marca' : `${marcas.length} marcas`}
          </p>
          <ul role="listbox" aria-label="Marcas" className="max-h-[60vh] overflow-y-auto">
            {orden.map(({ marca, hija }, i) => {
              const repetido = tieneNombreRepetido(marca);
              const elegida = marca.id === activa;
              return (
                <li
                  key={marca.id}
                  role="option"
                  aria-selected={elegida}
                  onMouseEnter={() => setFoco(i)}
                  onClick={() => elegir(marca.id)}
                  className={`flex cursor-pointer items-center gap-2 py-1.5 pr-3 ${hija ? 'pl-8' : 'pl-3'} ${
                    foco === i ? 'bg-[#F2F2F7]' : ''
                  }`}
                >
                  {hija && <CornerDownRight className="h-3 w-3 shrink-0 text-[#C7C7CC]" />}
                  <Distintivo marca={marca} chico={hija} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className={`truncate text-[13px] text-[#1D1D1F] ${hija ? 'font-medium' : 'font-semibold'}`}>
                        {marca.name}
                      </span>
                      {repetido && (
                        <span className="flex shrink-0 items-center gap-0.5 rounded border border-amber-200 bg-amber-50 px-1 text-[9px] font-semibold text-amber-700">
                          <Copy className="h-2.5 w-2.5" />
                          nombre repetido
                        </span>
                      )}
                    </span>
                    {/* Solo cuando hace falta distinguir: con nombres únicos, la línea es ruido. */}
                    {repetido && <span className="block truncate text-[10.5px] text-[#86868B]">{distincion(marca)}</span>}
                  </span>
                  {elegida && <Check className="h-3.5 w-3.5 shrink-0 text-[#1D1D1F]" />}
                </li>
              );
            })}
          </ul>
          {hayRepetidos && onRevisarRepetidos && (
            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                onRevisarRepetidos();
              }}
              className="mt-1 flex w-full items-center gap-1.5 border-t border-[rgba(0,0,0,0.06)] px-3 pt-2 text-[11.5px] font-medium text-[#3A3A3C] hover:text-[#1D1D1F]"
            >
              Revisar nombres repetidos en Marcas
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

