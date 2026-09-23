import React from 'react';
import { Plus, X } from 'lucide-react';
import {
  Client,
  FUNCION_HINTS,
  FUNCION_LABELS,
  FuncionAsignada,
  FuncionEquipo,
  WorkspaceMember,
} from '../types';
import { funcionesApi } from '../services/api';

/**
 * Las funciones de una persona, en la fila del equipo.
 *
 * **El rol y la función son dos ejes y tienen que verse distinto**: si se
 * leyeran igual, el primero que vea «ADMIN» y «Aprobación» juntos va a pensar
 * que uno reemplaza al otro. El rol queda en su selector gris; las funciones
 * van en el color de su etapa del producto —azul el copy, violeta el diseño,
 * ámbar la aprobación—, separadas por una línea fina.
 *
 * Ninguna restringe nada: deciden a quién se le avisa y quién aparece primero
 * al asignar una pieza.
 */

const COLOR: Record<FuncionEquipo, { fondo: string; texto: string; borde: string }> = {
  COPY: { fondo: '#EFF6FF', texto: '#1D4ED8', borde: '#BFDBFE' },
  DISENO: { fondo: '#F5F3FF', texto: '#6D28D9', borde: '#DDD6FE' },
  APROBACION: { fondo: '#FFFBEB', texto: '#B45309', borde: '#FDE68A' },
};

const TODAS: FuncionEquipo[] = ['COPY', 'DISENO', 'APROBACION'];

interface Props {
  miembro: WorkspaceMember;
  clients: Client[];
  puedeEditar: boolean;
  onCambio: () => void;
  onError: (mensaje: string) => void;
}

export default function FuncionesDelMiembro({ miembro, clients, puedeEditar, onCambio, onError }: Props) {
  const [abierto, setAbierto] = React.useState(false);
  const [ocupado, setOcupado] = React.useState(false);
  const funciones = miembro.funciones ?? [];

  const correr = async (fn: () => Promise<unknown>) => {
    setOcupado(true);
    try {
      await fn();
      onCambio();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo cambiar la función');
    } finally {
      setOcupado(false);
    }
  };

  /** Una ficha por función asignada, con la marca cuando está acotada. */
  const Ficha = ({ f }: { f: FuncionAsignada }) => {
    const c = COLOR[f.funcion];
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold"
        style={{ background: c.fondo, color: c.texto }}
        title={f.marca ? `${FUNCION_LABELS[f.funcion]} · solo ${f.marca}` : `${FUNCION_LABELS[f.funcion]} · todas las marcas`}
      >
        {FUNCION_LABELS[f.funcion]}
        {f.marca && <span className="font-medium opacity-75">{f.marca}</span>}
        {puedeEditar && (
          <button
            onClick={() => correr(() => funcionesApi.quitar(miembro.id, f.id))}
            disabled={ocupado}
            aria-label={`Quitar ${FUNCION_LABELS[f.funcion]}`}
            className="opacity-50 hover:opacity-100"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </span>
    );
  };

  return (
    <div className="relative flex items-center gap-2">
      {/* La línea fina: es lo que hace ver que el rol y las funciones son dos
          cosas distintas, mejor que cualquier texto de ayuda. */}
      <span className="h-4 w-px shrink-0 bg-[#E5E7EB]" />

      <div className="flex flex-wrap items-center gap-1.5">
        {funciones.map(f => (
          <Ficha key={f.id} f={f} />
        ))}

        {puedeEditar && (
          <button
            onClick={() => setAbierto(v => !v)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
          >
            <Plus className="h-2.5 w-2.5" />
            {funciones.length === 0 ? 'asignar función' : ''}
          </button>
        )}
      </div>

      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 top-7 z-20 w-72 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-3 shadow-xl">
            <p className="text-[11px] font-semibold text-[#1D1D1F]">Qué hace {miembro.name.split(' ')[0]}</p>
            <p className="mt-0.5 text-[10px] text-[#86868B]">
              No cambia sus permisos: decide a quién se le avisa.
            </p>

            <div className="mt-2.5 space-y-2.5">
              {TODAS.map(f => (
                <div key={f}>
                  <p className="text-[11px] font-semibold" style={{ color: COLOR[f].texto }}>
                    {FUNCION_LABELS[f]}
                  </p>
                  <p className="text-[10px] text-[#86868B]">{FUNCION_HINTS[f]}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {/* «Todas las marcas» primero: es el caso normal, y dejarlo
                        fácil evita que alguien se quede sin avisos por acotar
                        de más. */}
                    <button
                      onClick={() => correr(() => funcionesApi.asignar(miembro.id, f, null))}
                      disabled={ocupado}
                      className="rounded-md border border-[rgba(0,0,0,0.08)] px-2 py-1 text-[10px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7]"
                    >
                      Todas las marcas
                    </button>
                    {clients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => correr(() => funcionesApi.asignar(miembro.id, f, c.id))}
                        disabled={ocupado}
                        className="rounded-md border border-[rgba(0,0,0,0.08)] px-2 py-1 text-[10px] text-[#6E6E73] hover:bg-[#F5F5F7]"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
