import React from 'react';
import { copywritingApi } from '../../services/api';
import type { CampanaConPedidos, Client, ContentDNAProfile, EstadoPedido, EtapaDeFunnel, PedidoDeCopy } from '../../types';
import EscribirPedido from './EscribirPedido';

/**
 * Copywriting › Pedidos (F4, 2026-11-20): el copy que pidió CDM, ordenado por estado y por campaña. Cada línea de
 * una sábana aprobada es un pedido: un formato, una etapa y cuántas piezas, con el largo de cada texto ya decidido.
 * Arriba, las pestañas por estado; dentro, una tarjeta por campaña con su avance y sus pedidos por etapa.
 * Hecho sin el `.pen` (vuelve el 29-nov): se compara entonces.
 */

const ETAPAS: EtapaDeFunnel[] = ['RECONOCIMIENTO', 'CONSIDERACION', 'CONVERSION', 'RETENCION'];
const ETAPA: Record<EtapaDeFunnel, string> = {
  RECONOCIMIENTO: 'Reconocimiento',
  CONSIDERACION: 'Consideración',
  CONVERSION: 'Conversión',
  RETENCION: 'Retención',
};
const PESTANAS: { estado: EstadoPedido; nombre: string }[] = [
  { estado: 'POR_ESCRIBIR', nombre: 'Por escribir' },
  { estado: 'EN_APROBACION', nombre: 'En aprobación' },
  { estado: 'LISTO', nombre: 'Listos' },
];
const dia = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : null);
const textos = (p: PedidoDeCopy) =>
  p.textos.map(t => `${t.repeticiones > 1 ? `${t.repeticiones} ` : ''}${t.nombre.toLowerCase()}${t.maximo ? ` ${t.maximo}` : ''}`).join(' · ');

interface Props {
  marcaId: string;
  marcas: Client[];
  briefs: ContentDNAProfile[];
  /** Generar gasta crédito: quien administra o quien tiene la función Copy para la marca (2026-11-23). */
  puedeGenerar: boolean;
  onVerCopy: (campanaId: string) => void;
  onAviso: (mensaje: string, tipo: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function PedidosDeCopy({ marcaId, marcas, briefs, puedeGenerar, onVerCopy, onAviso }: Props) {
  const [campanas, setCampanas] = React.useState<CampanaConPedidos[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pestana, setPestana] = React.useState<EstadoPedido>('POR_ESCRIBIR');
  // El pedido que se está escribiendo en su tarjeta. Sigue abierto aunque cambie de estado al guardar.
  const [escribiendo, setEscribiendo] = React.useState<string | null>(null);

  const leer = React.useCallback(() => {
    copywritingApi
      .pedidos(marcaId)
      .then(setCampanas)
      .catch(err => setError(err instanceof Error ? err.message : 'No se pudieron leer los pedidos'));
  }, [marcaId]);
  React.useEffect(() => {
    setCampanas(null);
    leer();
  }, [leer]);

  if (error) return <p className="text-[13px] text-red-600">{error}</p>;
  if (!campanas) return <div className="h-48" />;

  const todos = campanas.flatMap(c => c.lineas);
  const cuantos = (e: EstadoPedido) => todos.filter(l => l.estado === e).length;
  const visibles = campanas
    .map(c => ({ ...c, deLaPestana: c.lineas.filter(l => l.estado === pestana || l.id === escribiendo) }))
    .filter(c => c.deLaPestana.length > 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-[#1D1D1F]">Pedidos de copy</h1>
        <p className="mt-1 text-[13px] text-[#6E6E73]">Lo que pidió CDM en las sábanas aprobadas, por campaña. Cada pedido ya trae su formato, su etapa y el largo de cada texto.</p>
      </div>

      <div className="flex gap-1.5">
        {PESTANAS.map(t => (
          <button
            key={t.estado}
            type="button"
            onClick={() => setPestana(t.estado)}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold ${
              pestana === t.estado ? 'bg-[#1D1D1F] text-white' : 'bg-white text-[#3A3A3C] ring-1 ring-[rgba(0,0,0,0.08)] hover:bg-[#F5F5F7]'
            }`}
          >
            {t.nombre} · {cuantos(t.estado)}
          </button>
        ))}
      </div>

      {campanas.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-[rgba(0,0,0,0.12)] bg-white px-6 py-10 text-center text-[13px] text-[#6E6E73]">
          Esta marca todavía no tiene sábanas aprobadas en CDM. Cuando se apruebe una, sus pedidos aparecen aquí.
        </div>
      ) : visibles.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-[rgba(0,0,0,0.12)] bg-white px-6 py-10 text-center text-[13px] text-[#6E6E73]">
          {pestana === 'POR_ESCRIBIR' ? 'No hay nada por escribir: todo lo pedido ya está escrito.' : pestana === 'EN_APROBACION' ? 'Nada espera aprobación.' : 'Todavía no hay pedidos listos.'}
        </div>
      ) : (
        visibles.map(c => {
          const listas = c.lineas.reduce((t, l) => t + Math.min(l.aprobadas, l.piezas), 0);
          const total = c.lineas.reduce((t, l) => t + l.piezas, 0);
          return (
            <section key={c.planningId} className="overflow-hidden rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white">
              <header className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-bold text-[#1D1D1F]">{c.campana.nombre}</h2>
                  <p className="text-[12px] text-[#6E6E73]">
                    {dia(c.desde) ? `Sale el ${dia(c.desde)}` : 'Sin fecha de salida'}
                    {c.aprueban.length > 0 && ` · aprueba ${c.aprueban.map(a => a.name).join(' o ')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[#F0F0F2]">
                    <div className="h-full rounded-full bg-[#047857]" style={{ width: `${total ? (listas / total) * 100 : 0}%` }} />
                  </div>
                  <span className="text-[12px] font-semibold tabular-nums text-[#3A3A3C]">
                    {listas} de {total} listas
                  </span>
                </div>
              </header>
              {ETAPAS.map(e => {
                const de = c.deLaPestana.filter(l => l.etapa === e);
                if (!de.length) return null;
                return (
                  <div key={e} className="border-t border-[rgba(0,0,0,0.06)]">
                    <p className="px-4 pb-1 pt-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#86868B]">{ETAPA[e]}</p>
                    <ul>
                      {de.map(l => {
                        const brief = briefs.find(b => b.id === c.campana.dnaProfileId);
                        return (
                        <li key={l.id} className="text-[13px]">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 hover:bg-[#FAFAFB]">
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-[#1D1D1F]">{l.formato}</span>
                            <span className="text-[#6E6E73]"> · {l.piezas} {l.piezas === 1 ? 'pieza' : 'piezas'}</span>
                            <p className="truncate text-[11.5px] text-[#86868B]">{textos(l)}</p>
                          </div>
                          <span className="text-[12px] tabular-nums text-[#6E6E73]">
                            {l.estado === 'POR_ESCRIBIR'
                              ? `${l.escritas} de ${l.piezas} escritas`
                              : l.estado === 'EN_APROBACION'
                                ? `${l.aprobadas} de ${l.piezas} aprobadas`
                                : 'Aprobado'}
                          </span>
                          {escribiendo === l.id ? null : l.estado === 'POR_ESCRIBIR' ? (
                            !l.canal ? (
                              <span className="text-[11.5px] text-amber-700">Todavía no se puede escribir este formato</span>
                            ) : !brief ? (
                              <span className="text-[11.5px] text-amber-700">La campaña no tiene brief</span>
                            ) : !puedeGenerar ? (
                              <span className="text-[11.5px] text-[#86868B]">Lo escribe quien tiene la función Copy</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEscribiendo(l.id)}
                                className="rounded-lg bg-[#1D1D1F] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-black"
                              >
                                Escribir
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() => onVerCopy(c.campana.id)}
                              className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#1D1D1F] hover:bg-[#F5F5F7]"
                            >
                              Ver el copy
                            </button>
                          )}
                          </div>
                          {escribiendo === l.id && brief && (
                            <EscribirPedido
                              pedido={l}
                              campanaId={c.campana.id}
                              brief={brief}
                              marca={marcas.find(m => m.id === marcaId)}
                              onAviso={onAviso}
                              onGuardado={cuantas => {
                                onAviso(`${cuantas} ${cuantas === 1 ? 'pieza guardada' : 'piezas guardadas'} en el pedido, por aprobar`, 'success');
                                leer();
                              }}
                              onCerrar={() => {
                                setEscribiendo(null);
                                leer();
                              }}
                            />
                          )}
                        </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </section>
          );
        })
      )}
    </div>
  );
}
