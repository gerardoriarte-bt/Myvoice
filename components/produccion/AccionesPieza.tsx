import React from 'react';
import { Pieza, PiezaEstado } from '../../types';
import { piezasApi } from '../../services/api';

/**
 * La acción que vacía cada columna (D5), y ninguna más.
 *
 * Cada estado tiene exactamente una salida hacia adelante y, donde corresponde,
 * una hacia atrás que exige motivo escrito. El servidor vuelve a validar la
 * transición: esto decide qué se muestra, no qué se permite.
 *
 * **El motivo se escribe acá adentro, no en un `window.prompt`.** Es un dato
 * que queda guardado en el historial y que alguien va a leer después —es lo
 * primero que busca un diseñador cuando le devuelven una pieza—, así que
 * merece un campo del producto: uno que se pueda revisar antes de mandar,
 * cancelar sin perder nada y que no congele la pestaña mientras está abierto.
 */

interface Props {
  pieza: Pieza;
  miembros: { id: string; name: string }[];
  onCambio: (pieza: Pieza) => void;
  onError: (mensaje: string) => void;
  /** En la tarjeta solo va la acción principal; en la orden de trabajo, todas. */
  compacto?: boolean;
}

const AYUDA: Record<PiezaEstado, string> = {
  POR_ASIGNAR: 'Elegí quién la diseña.',
  EN_DISENO: 'Cuando esté lista, pegá el enlace de Drive. Compartido como «cualquiera con el enlace» se ve la previa acá mismo.',
  POR_REVISAR: 'Miralo contra la orden de trabajo y decidí.',
  LISTA: 'Terminada. Se puede reabrir con un motivo.',
};

/** Las acciones que no existen sin motivo: el texto es el dato, no un adorno. */
type ConMotivo = 'devolver' | 'reabrir';

const PEDIDO: Record<ConMotivo, { titulo: string; ejemplo: string; boton: string }> = {
  devolver: {
    titulo: '¿Por qué vuelve a diseño?',
    ejemplo: 'El logo quedó sobre la foto y no se lee…',
    boton: 'Devolver',
  },
  reabrir: {
    titulo: '¿Por qué se reabre?',
    ejemplo: 'El cliente pidió cambiar la fecha del evento…',
    boton: 'Reabrir',
  },
};

export default function AccionesPieza({ pieza, miembros, onCambio, onError, compacto }: Props) {
  const [enlace, setEnlace] = React.useState(pieza.enlace ?? '');
  const [quien, setQuien] = React.useState(pieza.asignadaAId ?? '');
  const [ocupado, setOcupado] = React.useState(false);
  const [pidiendo, setPidiendo] = React.useState<ConMotivo | null>(null);
  const [motivo, setMotivo] = React.useState('');

  const correr = async (fn: () => Promise<Pieza>) => {
    setOcupado(true);
    try {
      onCambio(await fn());
    } catch (e) {
      // El 409 de una transición ilegal llega acá: alguien movió la pieza
      // mientras esta pantalla mostraba el estado viejo.
      onError(e instanceof Error ? e.message : 'No se pudo actualizar la pieza');
    } finally {
      setOcupado(false);
    }
  };

  const confirmarMotivo = async () => {
    const nota = motivo.trim();
    if (!pidiendo || !nota) return;
    const accion = pidiendo === 'devolver' ? piezasApi.devolver : piezasApi.reabrir;
    await correr(() => accion(pieza.id, nota));
    setPidiendo(null);
    setMotivo('');
  };

  const pedir = (cual: ConMotivo) => {
    setPidiendo(cual);
    setMotivo('');
  };

  const boton = 'rounded-lg px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-40';
  const primario = `${boton} bg-ink text-white hover:bg-ink-hover`;
  const secundario = `${boton} border border-apple-border text-apple-text hover:bg-apple-fill`;

  // Mientras se escribe el motivo, esa es la única acción visible: evita
  // aceptar por error una pieza que se estaba por devolver.
  if (pidiendo) {
    const { titulo, ejemplo, boton: etiqueta } = PEDIDO[pidiendo];
    return (
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-apple-text">{titulo}</p>
        <textarea
          autoFocus
          rows={2}
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') setPidiendo(null);
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void confirmarMotivo();
          }}
          placeholder={ejemplo}
          className="w-full rounded-lg border border-apple-border px-2 py-1.5 text-[11px] text-apple-text"
        />
        <p className="text-[10px] text-apple-tertiary">
          Queda en el historial de la pieza, con tu nombre y la fecha.
        </p>
        <div className="flex items-center gap-2">
          <button disabled={!motivo.trim() || ocupado} onClick={() => void confirmarMotivo()} className={primario}>
            {etiqueta}
          </button>
          <button disabled={ocupado} onClick={() => setPidiendo(null)} className={secundario}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!compacto && <p className="text-[11px] text-apple-tertiary">{AYUDA[pieza.estado]}</p>}

      {pieza.estado === 'POR_ASIGNAR' && (
        <div className="flex items-center gap-2">
          <select
            value={quien}
            onChange={e => setQuien(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-apple-border px-2 py-1.5 text-[11px] text-apple-text"
          >
            <option value="">Asignar a…</option>
            {miembros.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            disabled={!quien || ocupado}
            onClick={() => correr(() => piezasApi.asignar(pieza.id, quien))}
            className={primario}
          >
            Asignar
          </button>
        </div>
      )}

      {pieza.estado === 'EN_DISENO' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={enlace}
              onChange={e => setEnlace(e.target.value)}
              placeholder="https://drive.google.com/file/d/…"
              className="min-w-0 flex-1 rounded-lg border border-apple-border px-2 py-1.5 text-[11px] text-apple-text"
            />
            <button
              disabled={!enlace.trim() || ocupado}
              onClick={() => correr(() => piezasApi.entregar(pieza.id, enlace.trim()))}
              className={primario}
            >
              Entregar
            </button>
          </div>
          {!compacto && quien && (
            <button
              disabled={ocupado}
              onClick={() => correr(() => piezasApi.reasignar(pieza.id, quien))}
              className={secundario}
            >
              Reasignar a quien esté elegido
            </button>
          )}
        </div>
      )}

      {pieza.estado === 'POR_REVISAR' && (
        <div className="flex items-center gap-2">
          <button disabled={ocupado} onClick={() => correr(() => piezasApi.aceptar(pieza.id))} className={primario}>
            Aceptar
          </button>
          <button disabled={ocupado} onClick={() => pedir('devolver')} className={secundario}>
            Devolver a diseño
          </button>
        </div>
      )}

      {pieza.estado === 'LISTA' && (
        <button disabled={ocupado} onClick={() => pedir('reabrir')} className={secundario}>
          Reabrir
        </button>
      )}

      {/* En la tarjeta el enlace ya está arriba, con la previa: acá duplicaba. */}
      {pieza.enlace && pieza.estado !== 'EN_DISENO' && !compacto && (
        <a
          href={pieza.enlace}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-[11px] text-apple-blue hover:underline"
        >
          {pieza.enlace}
        </a>
      )}
    </div>
  );
}
