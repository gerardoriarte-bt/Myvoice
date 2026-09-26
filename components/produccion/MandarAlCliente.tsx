import React from 'react';
import { Send } from 'lucide-react';
import { Pieza } from '../../types';
import { reviewApi } from '../../services/api';

/**
 * La ronda 2, desde la columna Lista (H2.E).
 *
 * Vive acá y no en un menú general por la misma razón que el botón de exportar:
 * el alcance tiene que ser obvio — es esto, lo que está listo, lo que se manda.
 *
 * **Apagado es el estado normal.** Si ninguna campaña de estas piezas pide
 * aprobación del cliente, no se muestra un botón deshabilitado con un cartel
 * de ayuda: se muestra el interruptor, que es la acción que falta. Un botón que
 * no se puede tocar le hace creer a la gente que la herramienta está rota.
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

  const campanas = React.useMemo(() => {
    const mapa = new Map<string, { id: string; name: string; pide: boolean; piezas: number }>();
    for (const p of piezas) {
      if (!p.project) continue;
      const previo = mapa.get(p.project.id);
      mapa.set(p.project.id, {
        id: p.project.id,
        name: p.project.name,
        pide: !!p.project.pideAprobacionDeCliente,
        piezas: (previo?.piezas ?? 0) + 1,
      });
    }
    return [...mapa.values()];
  }, [piezas]);

  const elegibles = piezas.filter(p => p.project?.pideAprobacionDeCliente);

  const cambiarCampana = async (id: string, pide: boolean) => {
    setOcupado(true);
    try {
      await reviewApi.pedirAprobacionDePiezas(id, pide);
      onCambio();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo cambiar la campaña');
    } finally {
      setOcupado(false);
    }
  };

  const mandar = async () => {
    setOcupado(true);
    try {
      const sesion = await reviewApi.crearDePiezas({
        title: `${marca} — piezas para aprobar`,
        piezaIds: elegibles.map(p => p.id),
      });
      setEnlace(`${window.location.origin}/?review=${sesion.token}`);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo armar la revisión');
    } finally {
      setOcupado(false);
    }
  };

  if (campanas.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {campanas.map(c => (
        <label key={c.id} className="flex items-start gap-1.5 text-[9px] leading-snug text-apple-secondary">
          <input
            type="checkbox"
            checked={c.pide}
            disabled={ocupado}
            onChange={e => void cambiarCampana(c.id, e.target.checked)}
            className="mt-[1px]"
          />
          <span>
            <span className="font-semibold text-apple-text">{c.name}</span> pide la aprobación del
            cliente sobre las piezas
          </span>
        </label>
      ))}

      {elegibles.length > 0 && (
        <button
          onClick={() => void mandar()}
          disabled={ocupado}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-ink px-2 py-1.5 text-[10px] font-semibold text-white disabled:opacity-40"
        >
          <Send className="h-3 w-3" />
          Mandar {elegibles.length === 1 ? 'la pieza' : `las ${elegibles.length} piezas`} al cliente
        </button>
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
