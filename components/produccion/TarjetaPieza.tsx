import React from 'react';
import { AlertTriangle, ExternalLink, EyeOff, ImageIcon, MessageSquare, User } from 'lucide-react';
import { Pieza, PiezaEstado } from '../../types';
import AccionesPieza from './AccionesPieza';
import { motivoSinPrevia, previaDelEnlace } from './previa';
import { COLORES_ESTADO } from './columnas';

/**
 * Una tarjeta = una pieza (D1): el diseñador ve un trabajo, no tres fragmentos
 * de copy sueltos.
 *
 * La jerarquía sale de a quién le sirve cada dato. El **formato** es lo que el
 * diseñador no puede buscar dos veces, así que es lo más grande. El canal y el
 * estado suben a una barra del color de su columna, para reconocer una pieza
 * sin leerla. El copy va agrupado y rotulado, no mezclado con el título. Y los
 * comentarios existen porque siempre hay algo que decir sobre una pieza que no
 * es ni un motivo de devolución ni un cambio de estado.
 *
 * Lo que no merece columna va acá como estado de la tarjeta (D5): hoy el aviso
 * de «el copy cambió»; en la fase 3, los hallazgos de la auditoría.
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

/** La previa se muestra desde que la pieza se entrega: antes no hay qué ver. */
const CON_PREVIA: PiezaEstado[] = ['POR_REVISAR', 'LISTA'];

const desde = (fecha: string): string => {
  const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'hace 1 día';
  return `hace ${dias} días`;
};

export default function TarjetaPieza({ pieza, miembros, mostrarMarca, onAbrir, onCambio, onError }: Props) {
  const publicables = pieza.slots.filter(s => !s.esInstruccion);
  const color = COLORES_ESTADO[pieza.estado];
  const previa = CON_PREVIA.includes(pieza.estado) ? previaDelEnlace(pieza.enlace) : null;
  const [previaRota, setPreviaRota] = React.useState(false);

  return (
    <article className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: color.borde }}>
      {/* La barra dice canal y estado con el color de la columna: el estado de
          una pieza se reconoce sin leer. */}
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ backgroundColor: color.fondo }}
      >
        <span className="truncate text-[11px] font-bold" style={{ color: color.texto }}>
          {pieza.platform}
        </span>
        <span className="shrink-0 text-[9px] font-bold tracking-wide" style={{ color: color.texto }}>
          {color.etiqueta}
        </span>
      </div>

      <div className="space-y-2.5 p-3">
        {CON_PREVIA.includes(pieza.estado) && (
          <div className="flex gap-3">
            <div
              className="flex h-[72px] w-[88px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border bg-apple-bg"
              style={{ borderColor: color.borde }}
            >
              {previa && !previaRota ? (
                <img
                  src={previa}
                  alt={`Previa de ${pieza.titulo}`}
                  className="h-full w-full object-cover"
                  onError={() => setPreviaRota(true)}
                />
              ) : (
                <>
                  {previa ? (
                    <ImageIcon className="h-4 w-4 text-apple-tertiary" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-apple-tertiary" />
                  )}
                  <span className="mt-1 text-[8px] text-apple-tertiary">sin previa</span>
                </>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold leading-tight text-apple-text">{pieza.formato}</p>
              <p className="mt-1 text-[10px] leading-snug text-apple-tertiary">
                {previa && !previaRota ? 'Previa del enlace entregado.' : motivoSinPrevia(pieza.enlace)}
              </p>
            </div>
          </div>
        )}

        {!CON_PREVIA.includes(pieza.estado) && (
          <p className="text-[15px] font-bold leading-tight text-apple-text">{pieza.formato}</p>
        )}

        <button onClick={() => onAbrir(pieza.id)} className="block w-full text-left">
          <h4 className="text-[11px] leading-snug text-apple-body hover:underline">{pieza.titulo}</h4>
          {mostrarMarca && pieza.client && (
            <p className="mt-0.5 text-[10px] text-apple-tertiary">{pieza.client.name}</p>
          )}
        </button>

        <div className="rounded-lg bg-apple-bg px-2.5 py-2">
          <p className="text-[8px] font-bold uppercase tracking-wide text-apple-tertiary">
            El copy que va adentro · {publicables.length} slot{publicables.length === 1 ? '' : 's'}
          </p>
          <ul className="mt-1 space-y-0.5">
            {publicables.slice(0, 3).map(s => (
              <li key={s.id} className="flex gap-2 text-[10px]">
                <span className="w-16 shrink-0 font-semibold text-apple-text">{s.slotLabel}</span>
                <span className="truncate text-apple-secondary">{s.textoCongelado}</span>
              </li>
            ))}
            {publicables.length > 3 && (
              <li className="text-[10px] text-apple-tertiary">+{publicables.length - 3} más</li>
            )}
          </ul>
        </div>

        {pieza.desfases.length > 0 && (
          <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-medium text-amber-700">
            <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
            {MOTIVO[pieza.desfases[0].motivo]}
            {pieza.desfases.length > 1 && ` · ${pieza.desfases.length} slots`}
          </p>
        )}

        {pieza.comentarios > 0 && (
          <button
            onClick={() => onAbrir(pieza.id)}
            className="flex w-full items-start gap-1.5 text-left text-[10px] text-apple-secondary hover:text-apple-text"
          >
            <MessageSquare className="mt-px h-3 w-3 shrink-0" />
            <span className="truncate">
              {pieza.comentarios} comentario{pieza.comentarios === 1 ? '' : 's'}
              {pieza.ultimoComentario?.nota && ` · «${pieza.ultimoComentario.nota}»`}
            </span>
          </button>
        )}

        <div className="flex items-center justify-between text-[10px] text-apple-tertiary">
          <span className="flex items-center gap-1 truncate">
            {pieza.asignadaA ? (
              <>
                <User className="h-3 w-3 shrink-0" />
                {pieza.asignadaA.name}
              </>
            ) : (
              'Sin asignar'
            )}
          </span>
          <span className="shrink-0">{desde(pieza.estadoDesde)}</span>
        </div>

        {pieza.enlace && (
          <a
            href={pieza.enlace}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 truncate text-[10px] font-medium text-apple-blue hover:underline"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            Abrir la pieza
          </a>
        )}

        <div className="border-t border-apple-border pt-2">
          <AccionesPieza pieza={pieza} miembros={miembros} onCambio={onCambio} onError={onError} compacto />
        </div>
      </div>
    </article>
  );
}
