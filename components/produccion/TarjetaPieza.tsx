import React from 'react';
import { AlertTriangle, ExternalLink, EyeOff, ImageIcon, Maximize2, MessageSquare, User } from 'lucide-react';
import { Pieza, PiezaEstado } from '../../types';
import AccionesPieza from './AccionesPieza';
import PreviaGrande from './PreviaGrande';
import ChipSemaforo from './semaforo';
import { motivoSinPrevia, previaDelEnlace } from './previa';
import { COLORES_ESTADO } from './columnas';

/**
 * Una tarjeta = una pieza (D1): el diseñador ve un trabajo, no tres fragmentos
 * de copy sueltos.
 *
 * La jerarquía sale de a quién le sirve cada dato. El **formato** es lo que el
 * diseñador no puede buscar dos veces, así que es lo más grande. El canal y el
 * estado suben a una barra del color de su columna, para reconocer una pieza
 * sin leerla. El copy va agrupado y rotulado, no mezclado con el título.
 *
 * **La tarjeta entera abre la orden de trabajo.** Los controles que hacen otra
 * cosa —asignar, entregar, abrir el enlace, ampliar la previa— cortan ese clic
 * con `stopPropagation`: es la única forma de que un contenedor clickeable no
 * se coma lo que tiene adentro.
 */

interface Props {
  pieza: Pieza;
  miembros: { id: string; name: string; etiqueta?: string }[];
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
  // El snapshot gana sobre el enlace: es nuestro, no depende de permisos
  // ajenos y es la misma imagen que miró la auditoría.
  const previa = CON_PREVIA.includes(pieza.estado)
    ? pieza.previaUrl ?? previaDelEnlace(pieza.enlace)
    : null;
  const [previaRota, setPreviaRota] = React.useState(false);
  const [ampliada, setAmpliada] = React.useState(false);
  const previaVisible = previa && !previaRota;

  /** Lo que no debe abrir la orden de trabajo se envuelve acá. */
  const Aparte = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className} onClick={e => e.stopPropagation()}>
      {children}
    </div>
  );

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={() => onAbrir(pieza.id)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onAbrir(pieza.id);
          }
        }}
        title="Ver la orden de trabajo"
        className="cursor-pointer overflow-hidden rounded-xl border bg-white text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-apple-blue/40"
        style={{ borderColor: color.borde }}
      >
        {/* La barra dice canal y estado con el color de la columna: el estado de
            una pieza se reconoce sin leer. */}
        <div className="flex items-center justify-between px-3 py-1.5" style={{ backgroundColor: color.fondo }}>
          <span className="truncate text-[11px] font-bold" style={{ color: color.texto }}>
            {pieza.platform}
          </span>
          <span className="shrink-0 text-[9px] font-bold tracking-wide" style={{ color: color.texto }}>
            {color.etiqueta}
          </span>
        </div>

        <div className="space-y-2.5 p-3">
          {pieza.semaforo && (
            <div className="flex items-center justify-between gap-2">
              <ChipSemaforo estado={pieza.semaforo} hallazgos={pieza.version?.hallazgos ?? 0} />
              {pieza.version && pieza.version.numero > 1 && (
                <span className="text-[9px] text-apple-tertiary">v{pieza.version.numero}</span>
              )}
            </div>
          )}
          {CON_PREVIA.includes(pieza.estado) && (
            <div className="flex gap-3">
              <Aparte className="shrink-0">
                <button
                  type="button"
                  onClick={() => previaVisible && setAmpliada(true)}
                  disabled={!previaVisible}
                  title={previaVisible ? 'Ver en grande' : undefined}
                  className="group relative flex h-[72px] w-[88px] flex-col items-center justify-center overflow-hidden rounded-lg border bg-apple-bg disabled:cursor-default"
                  style={{ borderColor: color.borde }}
                >
                  {previaVisible ? (
                    <>
                      <img
                        src={previa}
                        alt={`Previa de ${pieza.titulo}`}
                        className="h-full w-full object-cover"
                        onError={() => setPreviaRota(true)}
                      />
                      <span className="absolute inset-0 hidden items-center justify-center bg-ink/45 group-hover:flex">
                        <Maximize2 className="h-4 w-4 text-white" />
                      </span>
                    </>
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
                </button>
              </Aparte>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold leading-tight text-apple-text">{pieza.formato}</p>
                <p className="mt-1 text-[10px] leading-snug text-apple-secondary">
                  {previaVisible
                    ? pieza.previaUrl
                      ? 'La pieza subida · clic para verla en grande'
                      : 'Previa del enlace · clic para verla en grande'
                    : motivoSinPrevia(pieza.enlace)}
                </p>
              </div>
            </div>
          )}

          {!CON_PREVIA.includes(pieza.estado) && (
            <p className="text-[15px] font-bold leading-tight text-apple-text">{pieza.formato}</p>
          )}

          <h4 className="text-[11px] leading-snug text-apple-text">{pieza.titulo}</h4>
          {mostrarMarca && pieza.client && (
            <p className="-mt-1.5 text-[10px] text-apple-secondary">{pieza.client.name}</p>
          )}

          {/* El copy es lo que el diseñador tiene que leer, así que va sobre
              blanco y con su propio contraste: sobre el gris de la tarjeta, a
              10 px y en gris claro, no se leía. */}
          <div className="rounded-lg border border-apple-border bg-white px-2.5 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wide text-apple-secondary">
              El copy que va adentro · {publicables.length} slot{publicables.length === 1 ? '' : 's'}
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {publicables.slice(0, 3).map(s => (
                <li key={s.id}>
                  <p className="text-[10px] font-semibold text-apple-secondary">{s.slotLabel}</p>
                  <p className="line-clamp-2 text-[11px] leading-snug text-apple-text">{s.textoCongelado}</p>
                </li>
              ))}
              {publicables.length > 3 && (
                <li className="text-[10px] font-medium text-apple-secondary">
                  +{publicables.length - 3} slot{publicables.length - 3 === 1 ? '' : 's'} más
                </li>
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
            <p className="flex items-start gap-1.5 text-[10px] text-apple-secondary">
              <MessageSquare className="mt-px h-3 w-3 shrink-0" />
              <span className="line-clamp-2">
                {pieza.comentarios} comentario{pieza.comentarios === 1 ? '' : 's'}
                {pieza.ultimoComentario?.nota && ` · «${pieza.ultimoComentario.nota}»`}
              </span>
            </p>
          )}

          <div className="flex items-center justify-between text-[10px] text-apple-secondary">
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
            <Aparte>
              <a
                href={pieza.enlace}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 truncate text-[10px] font-medium text-apple-blue hover:underline"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                Abrir la pieza
              </a>
            </Aparte>
          )}

          <Aparte className="border-t border-apple-border pt-2">
            <AccionesPieza pieza={pieza} miembros={miembros} onCambio={onCambio} onError={onError} compacto />
          </Aparte>
        </div>
      </article>

      {ampliada && previa && (
        <PreviaGrande
          url={previa}
          titulo={pieza.titulo}
          formato={`${pieza.platform} · ${pieza.formato}`}
          enlace={pieza.enlace}
          onCerrar={() => setAmpliada(false)}
        />
      )}
    </>
  );
}
