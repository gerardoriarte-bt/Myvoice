import React from 'react';
import { ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { implementacionApi } from '../../services/api';
import type { AnuncioEnCola, AnuncioParaMontar } from '../../types';
import { Detalle } from './Implementacion';

/**
 * «Mi cola» (F5, 2026-11-25; plan de Implementación, pantalla 7): lo que te toca en todas las marcas con Implementación,
 * por fecha de salida —lo atrasado primero—. Montar o publicar lo aprobado, autorizar lo listo de tus campañas internas
 * y corregir lo devuelto con novedad. Cada anuncio se abre aquí mismo, con el mismo detalle que en Anuncios: no hace
 * falta cambiar de marca. Hecho sin el `.pen`.
 */

type Tarea = AnuncioEnCola['tarea'];
const TAREA: Record<Tarea, { nombre: string; estilo: string }> = {
  montar: { nombre: 'Montar', estilo: 'bg-cyan-50 text-cyan-800' },
  publicar: { nombre: 'Publicar', estilo: 'bg-cyan-50 text-cyan-800' },
  autorizar: { nombre: 'Autorizar', estilo: 'bg-violet-50 text-violet-800' },
  corregir: { nombre: 'Corregir', estilo: 'bg-amber-50 text-amber-800' },
};
const FILTROS: { id: 'todo' | 'montar' | 'autorizar' | 'corregir'; nombre: string; tareas: Tarea[] }[] = [
  { id: 'todo', nombre: 'Todo', tareas: ['montar', 'publicar', 'autorizar', 'corregir'] },
  { id: 'montar', nombre: 'Montar o publicar', tareas: ['montar', 'publicar'] },
  { id: 'autorizar', nombre: 'Autorizar', tareas: ['autorizar'] },
  { id: 'corregir', nombre: 'Corregir', tareas: ['corregir'] },
];

const hoy = () => new Date().toISOString().slice(0, 10);
const enDias = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const dia = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** El tramo de la fecha de salida: lo atrasado arriba, lo sin fecha al final. */
const tramoDe = (desde: string | null | undefined) => {
  if (!desde) return 'Sin fecha de salida';
  const d = desde.slice(0, 10);
  if (d < hoy()) return 'Atrasado';
  if (d === hoy()) return 'Sale hoy';
  if (d <= enDias(7)) return 'Esta semana';
  return 'Más adelante';
};
const TRAMOS = ['Atrasado', 'Sale hoy', 'Esta semana', 'Más adelante', 'Sin fecha de salida'];

interface Props {
  onAviso: (mensaje: string, tipo: 'success' | 'error' | 'info' | 'warning') => void;
  /** Ir a la campaña del anuncio en Anuncios (cambia la marca y la campaña del encabezado). */
  onIrALaCampana: (clientId: string, campanaId: string | null) => void;
}

export default function MiCola({ onAviso, onIrALaCampana }: Props) {
  const [cola, setCola] = React.useState<AnuncioEnCola[] | null>(null);
  const [filtro, setFiltro] = React.useState<(typeof FILTROS)[number]['id']>('todo');
  const [abierto, setAbierto] = React.useState<string | null>(null);

  // `onAviso` llega nuevo en cada render de App: se guarda en una referencia para no releer la cola por eso.
  const aviso = React.useRef(onAviso);
  aviso.current = onAviso;
  const leer = React.useCallback(() => {
    implementacionApi
      .miCola()
      .then(setCola)
      .catch(err => aviso.current(err instanceof Error ? err.message : 'No se pudo leer tu cola', 'error'));
  }, []);
  React.useEffect(() => {
    leer();
  }, [leer]);

  if (!cola) return <div className="h-48" />;

  const tareas = FILTROS.find(f => f.id === filtro)!.tareas;
  const visibles = cola.filter(a => tareas.includes(a.tarea));
  const cuantos = (f: (typeof FILTROS)[number]) => cola.filter(a => f.tareas.includes(a.tarea)).length;
  const marcas = new Set(cola.map(a => a.clientId)).size;

  // Lo que se hace en el detalle saca el anuncio de la cola (o lo cambia de tarea): se relee la cola entera.
  const alCambiar = (_a: AnuncioParaMontar) => leer();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-bold text-[#1D1D1F]">Mi cola</h1>
        <p className="mt-0.5 text-[13px] text-[#6E6E73]">
          {cola.length
            ? `${cola.length} ${cola.length === 1 ? 'anuncio te espera' : 'anuncios te esperan'} en ${marcas} ${marcas === 1 ? 'marca' : 'marcas'}, por fecha de salida.`
            : 'Nada te espera en ninguna marca.'}
        </p>
      </header>

      {cola.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${filtro === f.id ? 'bg-[#1D1D1F] text-white' : 'bg-white text-[#3A3A3C] ring-1 ring-[rgba(0,0,0,0.1)] hover:bg-[#F5F5F7]'}`}
            >
              {f.nombre} · {cuantos(f)}
            </button>
          ))}
        </div>
      )}

      {cola.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-[rgba(0,0,0,0.12)] bg-white px-6 py-10 text-center text-[13px] text-[#6E6E73]">
          Cuando haya algo para montar, publicar, autorizar o corregir en una marca con Implementación, aparece aquí.
        </div>
      ) : (
        TRAMOS.map(tramo => {
          const deEste = visibles.filter(a => tramoDe(a.linea?.desde) === tramo);
          if (!deEste.length) return null;
          return (
            <section key={tramo} className="overflow-hidden rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white">
              <h2 className={`px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.06em] ${tramo === 'Atrasado' ? 'bg-amber-50 text-amber-800' : 'bg-[#FAFAFB] text-[#6E6E73]'}`}>
                {tramo} · {deEste.length}
              </h2>
              <ul>
                {deEste.map(a => (
                  <li key={a.id} className="border-t border-[rgba(0,0,0,0.06)]">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-[#FAFAFB]">
                      <button type="button" onClick={() => setAbierto(abierto === a.id ? null : a.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        {abierto === a.id ? <ChevronDown className="h-4 w-4 shrink-0 text-[#86868B]" /> : <ChevronRight className="h-4 w-4 shrink-0 text-[#86868B]" />}
                        <span className="shrink-0 rounded-md bg-[#1D1D1F] px-2 py-0.5 text-[11px] font-semibold text-white">{a.marca}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-semibold text-[#1D1D1F]">{a.titulo}</span>
                          <span className="block truncate text-[12px] text-[#6E6E73]">
                            {a.campana?.nombre ?? 'Sin campaña'} · {a.linea ? `${a.linea.medio} · ${a.linea.formato}` : `${a.platform} · ${a.formato}`}
                          </span>
                        </span>
                      </button>
                      {a.linea?.desde && <span className="text-[12px] tabular-nums text-[#6E6E73]">Sale {dia(a.linea.desde)}</span>}
                      <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${TAREA[a.tarea].estilo}`}>{TAREA[a.tarea].nombre}</span>
                      <button
                        type="button"
                        onClick={() => onIrALaCampana(a.clientId, a.campana?.id ?? null)}
                        className="flex items-center gap-1 text-[12px] font-semibold text-[#0E7490] hover:underline"
                        title="Abrir la campaña en Anuncios"
                      >
                        Campaña <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {abierto === a.id && <Detalle a={a} onCambio={alCambiar} onAviso={onAviso} />}
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
