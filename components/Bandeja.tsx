import React from 'react';
import { Bell, Check, PenLine, Stamp } from 'lucide-react';
import { Notificacion } from '../types';
import { notificacionesApi } from '../services/api';

/**
 * La campana y su bandeja (H3.D fase 2).
 *
 * **La bandeja vacía es la pantalla habitual, no un caso raro**: un equipo al
 * día no tiene avisos. Por eso el vacío no dice «no hay nada» —eso deja a la
 * persona mirando un cartel— sino dónde está el trabajo, con un botón al
 * tablero.
 *
 * Un aviso es un **enlace a una pieza**, no un texto que se lee y se descarta:
 * al abrirlo se marca leído y la pantalla salta a lo que hay que hacer. Si
 * leerlo no llevara a ninguna parte, la bandeja sería una segunda lista de
 * pendientes que compite con el tablero.
 *
 * Ver docs/plan-h3d-funciones-notificaciones.md.
 */

/** El destino de un aviso: una tarjeta, o el tablero de la marca si es un lote. */
export interface DestinoAviso {
  clientId: string;
  piezaId: string | null;
}

interface Props {
  /** Lleva a Producción. Lo resuelve App.tsx, que es quien maneja la pestaña. */
  onIr: (destino: DestinoAviso) => void;
  /** Lleva al tablero sin pieza: es la salida de la bandeja vacía. */
  onIrAlTablero: () => void;
}

const ICONO: Record<string, React.ComponentType<{ className?: string }>> = {
  ASIGNACION: PenLine,
  ENTREGA: Stamp,
};

const COLOR: Record<string, string> = {
  ASIGNACION: '#7C5CFF',
  ENTREGA: '#F59E0B',
};

const desde = (fecha: string): string => {
  const min = Math.floor((Date.now() - new Date(fecha).getTime()) / 60_000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'ayer' : `hace ${dias} días`;
};

export default function Bandeja({ onIr, onIrAlTablero }: Props) {
  const [abierta, setAbierta] = React.useState(false);
  const [avisos, setAvisos] = React.useState<Notificacion[]>([]);
  const [sinLeer, setSinLeer] = React.useState(0);

  const cargar = React.useCallback(async () => {
    try {
      const data = await notificacionesApi.listar();
      setAvisos(data.notificaciones ?? []);
      setSinLeer(data.sinLeer ?? 0);
    } catch {
      // Un aviso que no carga no puede romper la pantalla: la campana se
      // queda como está y se reintenta en el siguiente pulso.
    }
  }, []);

  /**
   * Un minuto. No hay websocket todavía y no hace falta: estos dos avisos no
   * son urgentes al segundo —alguien asignó una pieza, alguien entregó— y un
   * pulso más corto sería una consulta por persona cada pocos segundos a
   * cambio de nada.
   */
  React.useEffect(() => {
    cargar();
    const t = setInterval(cargar, 60_000);
    return () => clearInterval(t);
  }, [cargar]);

  const abrir = async (aviso: Notificacion) => {
    setAbierta(false);
    if (aviso.clientId) onIr({ clientId: aviso.clientId, piezaId: aviso.piezaId });
    if (aviso.leida) return;
    // Optimista: la campana baja al instante y si la llamada falla, el
    // siguiente pulso la devuelve a su número real.
    setSinLeer(n => Math.max(0, n - 1));
    setAvisos(lista => lista.map(a => (a.id === aviso.id ? { ...a, leida: true } : a)));
    try {
      const data = await notificacionesApi.leida(aviso.id);
      setAvisos(data.notificaciones ?? []);
      setSinLeer(data.sinLeer ?? 0);
    } catch {
      cargar();
    }
  };

  const marcarTodas = async () => {
    setSinLeer(0);
    setAvisos(lista => lista.map(a => ({ ...a, leida: true })));
    try {
      const data = await notificacionesApi.todasLeidas();
      setAvisos(data.notificaciones ?? []);
      setSinLeer(data.sinLeer ?? 0);
    } catch {
      cargar();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setAbierta(v => !v)}
        aria-label={sinLeer > 0 ? `${sinLeer} avisos sin leer` : 'Avisos'}
        className="relative flex h-7 w-7 items-center justify-center rounded-[7px] text-[#6E6E73] transition-colors hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1D1D1F]"
      >
        <Bell className="h-[15px] w-[15px]" strokeWidth={1.75} />
        {sinLeer > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#FF3B30] px-1 text-[9px] font-bold leading-none text-white">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      {abierta && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierta(false)} />
          <div className="absolute right-0 top-9 z-50 w-[340px] overflow-hidden rounded-xl border border-[rgba(0,0,0,0.08)] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.14)]">
            <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.06)] px-4 py-2.5">
              <span className="text-[12px] font-semibold text-[#1D1D1F]">Avisos</span>
              {sinLeer > 0 && (
                <button
                  onClick={marcarTodas}
                  className="flex items-center gap-1 text-[10px] font-medium text-[#6E6E73] hover:text-[#1D1D1F]"
                >
                  <Check className="h-3 w-3" />
                  Marcar todo leído
                </button>
              )}
            </div>

            {avisos.length === 0 ? (
              /* El vacío es el estado normal de un equipo al día: no se
                 disculpa por no tener nada, señala dónde está el trabajo. */
              <div className="px-4 py-7 text-center">
                <p className="text-[12px] font-medium text-[#1D1D1F]">Estás al día</p>
                <p className="mt-1 text-[11px] leading-snug text-[#86868B]">
                  Acá te avisamos cuando te asignen una pieza o cuando alguien entregue una que te
                  toca revisar.
                </p>
                {/* La salida: el vacío no es el final del camino, es el momento
                    de ir a ver el trabajo que sí está en curso. */}
                <button
                  onClick={() => {
                    setAbierta(false);
                    onIrAlTablero();
                  }}
                  className="mt-3 rounded-[7px] bg-[#1D1D1F] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-black"
                >
                  Ver el tablero
                </button>
              </div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto">
                {avisos.map(aviso => {
                  const Icono = ICONO[aviso.tipo] ?? Bell;
                  const color = COLOR[aviso.tipo] ?? '#86868B';
                  return (
                    <button
                      key={aviso.id}
                      onClick={() => abrir(aviso)}
                      className={`flex w-full items-start gap-2.5 border-b border-[rgba(0,0,0,0.04)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#F5F5F7] ${
                        aviso.leida ? '' : 'bg-[#FAFAFD]'
                      }`}
                    >
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px]"
                        style={{ background: `${color}18`, color }}
                      >
                        <Icono className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`truncate text-[12px] ${
                              aviso.leida ? 'font-medium text-[#6E6E73]' : 'font-semibold text-[#1D1D1F]'
                            }`}
                          >
                            {aviso.titulo}
                          </span>
                          {!aviso.leida && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0071E3]" />
                          )}
                        </span>
                        {aviso.detalle && (
                          <span className="mt-0.5 block truncate text-[11px] text-[#86868B]">
                            {aviso.detalle}
                          </span>
                        )}
                        <span className="mt-0.5 block text-[10px] text-[#B0B0B5]">
                          {desde(aviso.updatedAt)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
