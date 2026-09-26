import React from 'react';
import { Loader2, Minus, Plus, X } from 'lucide-react';
import { piezasApi } from '../../services/api';
import { PiezaAConfirmar, PiezaPropuesta, PropuestaDePiezas } from '../../types';

/**
 * D7 · cómo nace una pieza.
 *
 * El servidor arma la propuesta y acá se confirma o se corrige. Tres cosas que
 * parecen detalles y no lo son:
 *
 *   · El alta es EXPLÍCITA. Nada entra al tablero solo, porque los aprobados
 *     llegan de a uno y la pieza nacería incompleta.
 *   · Cuando un slot tiene dos aprobados, se pregunta: una pieza con uno, o dos
 *     piezas (un A/B). El que no entra no se borra ni se desaprueba.
 *   · Las piezas nacen en «Por asignar» y sin dueño: crear y asignar son dos
 *     decisiones, y la segunda es del dueño de esa columna.
 */

interface Props {
  savedVariationIds: string[];
  onClose: () => void;
  onCreadas: (cantidad: number) => void;
}

/** Lo que el usuario puede cambiar de cada pieza propuesta. */
interface Ajuste {
  incluida: boolean;
  formato: string;
  titulo: string;
  /** Por slot: cuál de los aprobados va. */
  elegidos: Record<string, string>;
  /** Slots con más de un aprobado que el usuario decidió abrir como A/B. */
  comoAB: Record<string, boolean>;
  /** Índice de la pieza con la que comparte el visual, o null si va sola. */
  hermanaDe: number | null;
}

const ajusteInicial = (p: PiezaPropuesta): Ajuste => ({
  incluida: true,
  formato: p.formato,
  titulo: p.titulo,
  elegidos: Object.fromEntries(p.slots.map(s => [s.slot, s.savedVariationId])),
  comoAB: {},
  hermanaDe: null,
});

/**
 * Dos piezas pueden llevar el mismo visual en canales distintos —el Post y la
 * Historia de la misma campaña (estado límite 1)—. No se fusionan, porque cada
 * una tiene su formato y su copy: se enlazan, y así viajan juntas a la misma
 * persona y cada orden de trabajo muestra a la otra.
 */
const candidataAHermana = (piezas: PiezaPropuesta[], i: number): number | null => {
  for (let j = i - 1; j >= 0; j--) {
    if (piezas[j].projectId === piezas[i].projectId && piezas[j].platform !== piezas[i].platform) return j;
  }
  return null;
};

export default function CrearPiezasModal({ savedVariationIds, onClose, onCreadas }: Props) {
  const [propuesta, setPropuesta] = React.useState<PropuestaDePiezas | null>(null);
  const [ajustes, setAjustes] = React.useState<Ajuste[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [creando, setCreando] = React.useState(false);

  React.useEffect(() => {
    let vigente = true;
    piezasApi
      .proponer(savedVariationIds)
      .then(p => {
        if (!vigente) return;
        setPropuesta(p);
        setAjustes(p.piezas.map(ajusteInicial));
      })
      .catch(e => vigente && setError(e instanceof Error ? e.message : 'No se pudo armar la propuesta'));
    return () => {
      vigente = false;
    };
  }, [savedVariationIds]);

  const cambiar = (i: number, cambio: Partial<Ajuste>) =>
    setAjustes(prev => prev.map((a, j) => (j === i ? { ...a, ...cambio } : a)));

  /**
   * Una pieza por canal, más una extra por cada slot abierto como A/B. La
   * hermana del A/B comparte todo menos el aprobado en disputa.
   */
  const aConfirmar = (): PiezaAConfirmar[] => {
    if (!propuesta) return [];
    const salida: PiezaAConfirmar[] = [];
    const indiceEnSalida = new Map<number, number>();
    propuesta.piezas.forEach((p, i) => {
      const a = ajustes[i];
      if (!a?.incluida) return;
      const base = p.slots.map(s => a.elegidos[s.slot] ?? s.savedVariationId);
      // `hermanaDe` apunta al índice en ESTA lista, no al de la propuesta: una
      // pieza destildada no ocupa lugar, así que los índices se corren.
      const hermanaDe =
        a.hermanaDe !== null && ajustes[a.hermanaDe]?.incluida
          ? indiceEnSalida.get(a.hermanaDe) ?? -1
          : -1;
      indiceEnSalida.set(i, salida.length);
      salida.push({
        platform: p.platform,
        formato: a.formato,
        titulo: a.titulo,
        savedVariationIds: base,
        ...(hermanaDe >= 0 ? { hermanaDe } : {}),
      });

      for (const slot of p.slots) {
        if (!a.comoAB[slot.slot]) continue;
        for (const alt of slot.alternativas) {
          salida.push({
            platform: p.platform,
            formato: a.formato,
            titulo: `${a.titulo} — variante`,
            savedVariationIds: base.map(id => (id === a.elegidos[slot.slot] ? alt.savedVariationId : id)),
          });
        }
      }
    });
    return salida;
  };

  const crear = async () => {
    const piezas = aConfirmar();
    if (!piezas.length) return;
    setCreando(true);
    setError(null);
    try {
      const creadas = await piezasApi.crear(piezas);
      onCreadas(creadas.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron crear las piezas');
    } finally {
      setCreando(false);
    }
  };

  const total = aConfirmar().length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-apple-border px-6 py-5">
          <div>
            <h2 className="text-[17px] font-semibold text-apple-text">Mandar a producción</h2>
            <p className="mt-1 text-[12px] text-apple-secondary">
              {propuesta
                ? `${savedVariationIds.length} seleccionados → ${total} pieza${total === 1 ? '' : 's'}`
                : 'Armando la propuesta…'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-apple-secondary hover:bg-apple-fill">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          {!propuesta && !error && (
            <div className="flex items-center gap-2 text-[13px] text-apple-secondary">
              <Loader2 className="h-4 w-4 animate-spin" /> Leyendo lo aprobado…
            </div>
          )}

          {propuesta?.piezas.map((p, i) => {
            const a = ajustes[i];
            if (!a) return null;
            return (
              <div
                key={`${p.platform}-${p.projectId ?? 'sin-campaña'}`}
                className={`rounded-xl border p-4 ${a.incluida ? 'border-apple-border bg-white' : 'border-apple-border bg-apple-bg opacity-60'}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="checkbox"
                    checked={a.incluida}
                    onChange={e => cambiar(i, { incluida: e.target.checked })}
                    className="h-4 w-4 accent-ink"
                  />
                  <span className="rounded-md border border-apple-border bg-apple-fill px-2 py-0.5 text-[11px] font-semibold text-apple-text">
                    {p.platform}
                  </span>
                  {p.formatosDisponibles.length > 1 ? (
                    <select
                      value={a.formato}
                      onChange={e => cambiar(i, { formato: e.target.value })}
                      className="rounded-md border border-apple-border px-2 py-1 text-[11px] text-apple-text"
                    >
                      {p.formatosDisponibles.map(f => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[11px] text-apple-secondary">{a.formato}</span>
                  )}
                  <input
                    value={a.titulo}
                    onChange={e => cambiar(i, { titulo: e.target.value })}
                    className="min-w-[200px] flex-1 rounded-md border border-apple-border px-2 py-1 text-[12px] text-apple-text"
                  />
                </div>

                {candidataAHermana(propuesta.piezas, i) !== null && (
                  <label className="mt-3 flex items-center gap-2 text-[11px] text-apple-text">
                    <input
                      type="checkbox"
                      checked={a.hermanaDe !== null}
                      onChange={e =>
                        cambiar(i, { hermanaDe: e.target.checked ? candidataAHermana(propuesta.piezas, i) : null })
                      }
                      className="h-3.5 w-3.5 accent-ink"
                    />
                    Mismo visual que {propuesta.piezas[candidataAHermana(propuesta.piezas, i)!].platform} — se asignan juntas
                  </label>
                )}

                <ul className="mt-3 space-y-1.5">
                  {p.slots.map(s => (
                    <li key={s.slot} className="text-[12px]">
                      <div className="flex gap-2">
                        <span className="w-32 shrink-0 text-apple-tertiary">{s.slotLabel}</span>
                        <span className="flex-1 truncate text-apple-text">
                          {s.alternativas.length > 0
                            ? [{ savedVariationId: s.savedVariationId, contenido: s.contenido }, ...s.alternativas].find(
                                o => o.savedVariationId === a.elegidos[s.slot]
                              )?.contenido ?? s.contenido
                            : s.contenido}
                        </span>
                        {s.esInstruccion && (
                          <span className="shrink-0 text-[10px] text-apple-tertiary">brief, no va en el arte</span>
                        )}
                      </div>

                      {s.alternativas.length > 0 && (
                        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                          <p className="text-[11px] font-semibold text-apple-text">
                            Hay {s.alternativas.length + 1} aprobados para {s.slotLabel}. ¿Qué se produce?
                          </p>
                          {[{ savedVariationId: s.savedVariationId, contenido: s.contenido }, ...s.alternativas].map(o => (
                            <label key={o.savedVariationId} className="mt-1.5 flex items-start gap-2 text-[11px] text-apple-text">
                              <input
                                type="radio"
                                name={`${p.platform}-${s.slot}`}
                                checked={a.elegidos[s.slot] === o.savedVariationId && !a.comoAB[s.slot]}
                                onChange={() =>
                                  cambiar(i, {
                                    elegidos: { ...a.elegidos, [s.slot]: o.savedVariationId },
                                    comoAB: { ...a.comoAB, [s.slot]: false },
                                  })
                                }
                                className="mt-0.5 accent-ink"
                              />
                              <span className="line-clamp-2">{o.contenido}</span>
                            </label>
                          ))}
                          <label className="mt-1.5 flex items-center gap-2 text-[11px] text-apple-text">
                            <input
                              type="radio"
                              name={`${p.platform}-${s.slot}`}
                              checked={!!a.comoAB[s.slot]}
                              onChange={() => cambiar(i, { comoAB: { ...a.comoAB, [s.slot]: true } })}
                              className="accent-ink"
                            />
                            Una pieza por cada uno — un A/B
                          </label>
                          <p className="mt-2 text-[10px] text-apple-tertiary">
                            El que no entra no se borra ni se desaprueba: queda entre los aprobados, libre para otra pieza.
                          </p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {propuesta && propuesta.piezas.length === 0 && (
            <p className="text-[13px] text-apple-secondary">
              Nada de lo seleccionado produce una pieza de diseño.
            </p>
          )}

          {propuesta && propuesta.excluidos.length > 0 && (
            <div className="rounded-xl bg-apple-bg p-4">
              <p className="text-[12px] font-semibold text-apple-text">Fuera de la propuesta</p>
              <ul className="mt-2 space-y-1">
                {propuesta.excluidos.map(e => (
                  <li key={e.savedVariationId} className="flex items-center gap-2 text-[11px] text-apple-secondary">
                    <Minus className="h-3 w-3 shrink-0" />
                    <span className="font-medium text-apple-text">{e.platform}</span>
                    {e.detalle}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>

        <footer className="flex items-center justify-between border-t border-apple-border px-6 py-4">
          <p className="text-[11px] text-apple-tertiary">Nacen en Por asignar, sin nadie asignado.</p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-apple-border px-3 py-2 text-[12px] font-medium text-apple-text hover:bg-apple-fill"
            >
              Cancelar
            </button>
            <button
              onClick={crear}
              disabled={creando || total === 0}
              className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-[12px] font-medium text-white hover:bg-ink-hover disabled:opacity-40"
            >
              {creando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Crear {total} pieza{total === 1 ? '' : 's'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
