import React from 'react';
import { Pieza, PiezaEstado } from '../../types';
import { piezasApi } from '../../services/api';

/**
 * La acción que vacía cada columna (D5), y ninguna más.
 *
 * Cada estado tiene exactamente una salida hacia adelante y, donde corresponde,
 * una hacia atrás que exige motivo escrito. El servidor vuelve a validar la
 * transición: esto decide qué se muestra, no qué se permite.
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

export default function AccionesPieza({ pieza, miembros, onCambio, onError, compacto }: Props) {
  const [enlace, setEnlace] = React.useState(pieza.enlace ?? '');
  const [quien, setQuien] = React.useState(pieza.asignadaAId ?? '');
  const [ocupado, setOcupado] = React.useState(false);

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

  /** Devolver y reabrir no existen sin motivo: es el dato, no un adorno. */
  const conMotivo = (pregunta: string, fn: (nota: string) => Promise<Pieza>) => {
    const nota = window.prompt(pregunta)?.trim();
    if (!nota) return;
    void correr(() => fn(nota));
  };

  const boton = 'rounded-lg px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-40';
  const primario = `${boton} bg-ink text-white hover:bg-ink-hover`;
  const secundario = `${boton} border border-apple-border text-apple-text hover:bg-apple-fill`;

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
          <button
            disabled={ocupado}
            onClick={() => correr(() => piezasApi.aceptar(pieza.id))}
            className={primario}
          >
            Aceptar
          </button>
          <button
            disabled={ocupado}
            onClick={() => conMotivo('¿Por qué vuelve a diseño?', nota => piezasApi.devolver(pieza.id, nota))}
            className={secundario}
          >
            Devolver a diseño
          </button>
        </div>
      )}

      {pieza.estado === 'LISTA' && (
        <button
          disabled={ocupado}
          onClick={() => conMotivo('¿Por qué se reabre?', nota => piezasApi.reabrir(pieza.id, nota))}
          className={secundario}
        >
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
