import React from 'react';
import { AlertTriangle, Link2, User } from 'lucide-react';
import { Pieza } from '../../types';
import AccionesPieza from './AccionesPieza';

/**
 * Una tarjeta = una pieza (D1): el diseñador ve un trabajo, no tres fragmentos
 * de copy sueltos.
 *
 * Lo que no merece columna va acá como estado de la tarjeta (D5). Hoy eso es un
 * solo aviso —«el copy cambió»—; en la fase 3 se le suman los de la auditoría.
 */

interface Props {
  pieza: Pieza;
  miembros: { id: string; name: string }[];
  mostrarMarca?: boolean;
  onAbrir: (id: string) => void;
  onCambio: (pieza: Pieza) => void;
  onError: (mensaje: string) => void;
}

const MOTIVO: Record<string, string> = {
  editado: 'El copy cambió en la Biblioteca',
  desaprobado: 'El copy ya no está aprobado',
  borrado: 'El copy original se borró',
};

const desde = (fecha: string): string => {
  const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'hace 1 día';
  return `hace ${dias} días`;
};

export default function TarjetaPieza({ pieza, miembros, mostrarMarca, onAbrir, onCambio, onError }: Props) {
  const publicables = pieza.slots.filter(s => !s.esInstruccion);

  return (
    <article className="rounded-xl border border-apple-border bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-md border border-apple-border bg-apple-fill px-2 py-0.5 text-[10px] font-semibold text-apple-text">
          {pieza.platform}
        </span>
        <span className="text-[10px] text-apple-tertiary">{pieza.formato}</span>
      </div>

      <button onClick={() => onAbrir(pieza.id)} className="mt-2 block w-full text-left">
        <h4 className="text-[12px] font-medium text-apple-text hover:underline">{pieza.titulo}</h4>
        {mostrarMarca && pieza.client && (
          <p className="mt-0.5 text-[10px] text-apple-tertiary">{pieza.client.name}</p>
        )}
      </button>

      <ul className="mt-2 space-y-0.5 rounded-lg bg-apple-bg px-2.5 py-2">
        {publicables.slice(0, 3).map(s => (
          <li key={s.id} className="flex gap-2 text-[10px]">
            <span className="w-20 shrink-0 text-apple-tertiary">{s.slotLabel}</span>
            <span className="truncate text-apple-secondary">{s.textoCongelado}</span>
          </li>
        ))}
        {publicables.length > 3 && (
          <li className="text-[10px] text-apple-tertiary">+{publicables.length - 3} más</li>
        )}
      </ul>

      {pieza.desfases.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-medium text-amber-700">
          <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
          {MOTIVO[pieza.desfases[0].motivo]}
          {pieza.desfases.length > 1 && ` · ${pieza.desfases.length} slots`}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between text-[10px] text-apple-tertiary">
        <span className="flex items-center gap-1">
          {pieza.asignadaA ? (
            <>
              <User className="h-3 w-3" />
              {pieza.asignadaA.name}
            </>
          ) : (
            'Sin asignar'
          )}
        </span>
        <span className="flex items-center gap-1">
          {pieza.enlace && <Link2 className="h-3 w-3" />}
          {desde(pieza.estadoDesde)}
        </span>
      </div>

      <div className="mt-2 border-t border-apple-border pt-2">
        <AccionesPieza pieza={pieza} miembros={miembros} onCambio={onCambio} onError={onError} compacto />
      </div>
    </article>
  );
}
