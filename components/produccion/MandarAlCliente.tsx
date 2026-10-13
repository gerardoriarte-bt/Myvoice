import React from 'react';
import { Send } from 'lucide-react';
import { Pieza } from '../../types';
import { reviewApi } from '../../services/api';

/**
 * La ronda 2, desde la columna «Con el cliente» (H2.E).
 *
 * Vive acá y no en un menú general por la misma razón que el botón de exportar:
 * el alcance tiene que ser obvio — es esto, lo que el equipo aceptó y el
 * cliente todavía no vio, lo que se manda.
 *
 * Ya no hay interruptor: si el cliente ve las piezas lo dice el modo de la
 * campaña, el mismo que rige el copy (docs/plan-produccion-con-responsable.md).
 * Y se manda solo lo que falta enviar: antes cada clic reenviaba todo, incluido
 * lo ya aprobado.
 */

interface Props {
  piezas: Pieza[];
  marca: string;
  onCambio: () => void;
  onError: (m: string) => void;
}

export default function MandarAlCliente({ piezas, marca, onCambio, onError }: Props) {
  const [ocupado, setOcupado] = React.useState(false);
  const [enlace, setEnlace] = React.useState<string | null>(null);

  const sinEnviar = piezas.filter(p => !p.enviadaAlCliente);
  const puedoMandar = sinEnviar.filter(p => p.puedo.mandarAlCliente);

  const mandar = async () => {
    setOcupado(true);
    try {
      const sesion = await reviewApi.crearDePiezas({
        title: `${marca} — piezas para aprobar`,
        piezaIds: puedoMandar.map(p => p.id),
      });
      setEnlace(`${window.location.origin}/?review=${sesion.token}`);
      onCambio();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo armar la revisión');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="mt-2 space-y-1.5">
      {puedoMandar.length > 0 && (
        <button
          onClick={() => void mandar()}
          disabled={ocupado}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-ink px-2 py-1.5 text-[10px] font-semibold text-white disabled:opacity-40"
        >
          <Send className="h-3 w-3" />
          Mandar {puedoMandar.length === 1 ? '1 sin enviar' : `${puedoMandar.length} sin enviar`} al cliente
        </button>
      )}
      {sinEnviar.length > 0 && puedoMandar.length === 0 && (
        <p className="text-[9px] leading-snug text-apple-secondary">
          {sinEnviar.length === 1 ? 'Hay una sin enviar' : `Hay ${sinEnviar.length} sin enviar`}: se las manda el
          responsable de su campaña.
        </p>
      )}

      {enlace && (
        <div className="rounded-md border border-apple-border bg-white p-2">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-apple-tertiary">
            El enlace para el cliente
          </p>
          <p className="mt-0.5 break-all text-[9px] text-apple-text">{enlace}</p>
          <button
            onClick={() => void navigator.clipboard.writeText(enlace)}
            className="mt-1 text-[9px] font-semibold text-apple-text underline"
          >
            Copiar
          </button>
        </div>
      )}
    </div>
  );
}
