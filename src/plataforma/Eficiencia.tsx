import React from 'react';
import * as XLSX from 'xlsx';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { controlApi } from '../../services/api';
import type { EficienciaDeControl, FaseDeEficiencia, WorkspaceDeControl } from '../../types';

/**
 * Control › Eficiencia (super admin, 2026-11-24; Gerardo: «no solo el consumo de IA, sino el tiempo que lleva todo el
 * flujo, las revisiones y ajustes solicitados por el cliente»). Arriba, cuánto tarda cada fase en la campaña típica
 * (la mediana de las que la terminaron) y dónde se va el tiempo; abajo, campaña por campaña, con sus ajustes y su costo.
 * Hecho sin el `.pen`.
 */

const FASES: { id: FaseDeEficiencia; nombre: string; color: string }[] = [
  { id: 'planeacion', nombre: 'Planeación', color: '#4F46E5' },
  { id: 'copy', nombre: 'Copy', color: '#7C3AED' },
  { id: 'produccion', nombre: 'Producción', color: '#B45309' },
  { id: 'aprobacionFinal', nombre: 'Aprobación final', color: '#6D28D9' },
  { id: 'montaje', nombre: 'Montaje', color: '#0E7490' },
];
const PERIODOS = [30, 90, 180, 365];

/** Minutos, horas o días, según el tamaño: «45 min», «6 h», «3,5 días». */
const duracion = (h: number | null) => {
  if (h === null) return '—';
  if (h * 60 < 1) return '< 1 min';
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${(h / 24).toLocaleString('es-CO', { maximumFractionDigits: 1 })} días`;
};
const usd = (n: number) => `USD ${n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CLIENTE: [keyof EficienciaDeControl['campanas'][number]['revisiones'], string][] = [
  ['sabanaDevueltaPorCliente', 'Sábana devuelta'],
  ['copyCambiosDelCliente', 'Copy con cambios'],
  ['piezasDevueltasPorCliente', 'Piezas devueltas'],
  ['implementacionCambiosDelCliente', 'Cambios antes de publicar'],
];
const EQUIPO: [keyof EficienciaDeControl['campanas'][number]['revisiones'], string][] = [
  ['sabanaDevueltaPorEquipo', 'Sábana devuelta'],
  ['copyRevocado', 'Copy con la aprobación quitada'],
  ['copyReeditado', 'Copy editado después de aprobado'],
  ['piezasDevueltasPorEquipo', 'Piezas devueltas'],
  ['novedadesAlMontar', 'Novedades al montar'],
];

export default function Eficiencia({ workspaces }: { workspaces: WorkspaceDeControl[] }) {
  const [dias, setDias] = React.useState(90);
  const [workspaceId, setWorkspaceId] = React.useState('');
  const [datos, setDatos] = React.useState<EficienciaDeControl | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [abierta, setAbierta] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDatos(null);
    controlApi
      .eficiencia(dias, workspaceId || undefined)
      .then(d => {
        setDatos(d);
        setError(null);
      })
      .catch(e => setError(e instanceof Error ? e.message : 'No se pudo medir la eficiencia'));
  }, [dias, workspaceId]);

  const r = datos?.resumen;
  const totalFases = r ? FASES.reduce((t, f) => t + (r.medianaPorFase[f.id] ?? 0), 0) : 0;
  const campo = 'bg-white border border-[rgba(0,0,0,0.1)] rounded-lg px-2 py-1 text-[13px] text-[#1D1D1F]';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-[#6E6E73]">
        <label className="flex items-center gap-2">
          Workspace
          <select value={workspaceId} onChange={e => setWorkspaceId(e.target.value)} className={campo}>
            <option value="">Todos</option>
            {workspaces.map(w => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Campañas creadas en los últimos
          <select value={dias} onChange={e => setDias(Number(e.target.value))} className={campo}>
            {PERIODOS.map(p => (
              <option key={p} value={p}>
                {p} días
              </option>
            ))}
          </select>
        </label>
        {datos && datos.campanas.length > 0 && (
          <button
            type="button"
            onClick={() => descargar(datos)}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#1D1D1F] ring-1 ring-[rgba(0,0,0,0.12)] hover:bg-[#F5F5F7]"
          >
            <Download className="h-3.5 w-3.5" /> Descargar Excel
          </button>
        )}
      </div>

      {error && <p className="text-[12.5px] text-red-600">{error}</p>}
      {!datos && !error && <div className="h-40" />}

      {r && datos && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Tile n={`${r.terminadas} de ${r.campanas}`} rotulo="campañas terminadas (todo montado)" />
            <Tile n={duracion(r.medianaTotalHoras)} rotulo="de punta a punta, en la campaña típica" />
            <Tile n={String(r.cambiosDelCliente)} rotulo={`cambios pedidos por el cliente, en ${r.campanasConCambiosDelCliente} ${r.campanasConCambiosDelCliente === 1 ? 'campaña' : 'campañas'}`} tono={r.cambiosDelCliente ? 'ambar' : undefined} />
            <Tile n={String(r.ajustesInternos)} rotulo="ajustes del equipo (devoluciones, ediciones, novedades)" />
            <Tile n={usd(r.costoUsd)} rotulo={r.costoPorMontadoUsd !== null ? `de IA · ${usd(r.costoPorMontadoUsd)} por anuncio montado` : 'de IA'} />
          </div>

          {/* Dónde se va el tiempo: la mediana de cada fase, en proporción. */}
          <section className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
            <p className="text-[13px] font-semibold text-[#1D1D1F]">Cuánto tarda cada fase</p>
            <p className="text-[11.5px] text-[#86868B]">La mediana entre las campañas que ya terminaron esa fase.</p>
            {totalFases > 0 ? (
              <div className="mt-3 flex h-8 overflow-hidden rounded-lg">
                {FASES.filter(f => (r.medianaPorFase[f.id] ?? 0) > 0).map(f => (
                  <div
                    key={f.id}
                    className="flex min-w-[2px] items-center justify-center overflow-hidden px-1 text-[11px] font-semibold text-white"
                    style={{ width: `${((r.medianaPorFase[f.id] ?? 0) / totalFases) * 100}%`, background: f.color }}
                    title={`${f.nombre}: ${duracion(r.medianaPorFase[f.id])}`}
                  >
                    <span className="truncate">{f.nombre}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[12px] text-[#86868B]">Todavía ninguna campaña terminó una fase en este periodo.</p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {FASES.map(f => (
                <div key={f.id} className="flex items-center gap-2 text-[12px]">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: f.color }} />
                  <span className="text-[#6E6E73]">{f.nombre}</span>
                  <span className="ml-auto font-semibold tabular-nums text-[#1D1D1F]">{duracion(r.medianaPorFase[f.id])}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-[rgba(0,0,0,0.08)] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-[12.5px]">
                <thead className="bg-[#FAFAFB] text-[10.5px] uppercase tracking-[0.06em] text-[#86868B]">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Campaña</th>
                    <th className="px-3 py-2 font-semibold">Total</th>
                    {FASES.map(f => (
                      <th key={f.id} className="px-3 py-2 font-semibold">
                        {f.nombre}
                      </th>
                    ))}
                    <th className="px-3 py-2 font-semibold">Cliente</th>
                    <th className="px-3 py-2 font-semibold">Equipo</th>
                    <th className="px-3 py-2 font-semibold">IA</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.campanas.map(c => (
                    <React.Fragment key={c.id}>
                      <tr className="cursor-pointer border-t border-[rgba(0,0,0,0.06)] align-top hover:bg-[#FAFAFB]" onClick={() => setAbierta(abierta === c.id ? null : c.id)}>
                        <td className="px-4 py-2.5">
                          <span className="flex items-start gap-1.5">
                            {abierta === c.id ? <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                            <span>
                              <span className="block font-semibold text-[#1D1D1F]">{c.campana}</span>
                              <span className="text-[11.5px] text-[#86868B]">
                                {c.marca} · {c.workspace}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-semibold tabular-nums">
                          {duracion(c.total.horas)}
                          {c.total.enCurso && <span className="ml-1 rounded bg-[#F5F5F7] px-1.5 text-[10px] font-medium text-[#6E6E73]">en curso</span>}
                        </td>
                        {FASES.map(f => {
                          const v = c.fases[f.id];
                          return (
                            <td key={f.id} className={`whitespace-nowrap px-3 py-2.5 tabular-nums ${v?.enCurso ? 'text-[#86868B]' : 'text-[#1D1D1F]'}`} title={v?.enCurso ? 'En curso: cuenta hasta hoy' : undefined}>
                              {v ? `${duracion(v.horas)}${v.enCurso ? '…' : ''}` : '—'}
                            </td>
                          );
                        })}
                        <td className={`px-3 py-2.5 font-semibold tabular-nums ${c.cambiosDelCliente ? 'text-amber-700' : 'text-[#86868B]'}`}>{c.cambiosDelCliente}</td>
                        <td className="px-3 py-2.5 tabular-nums">{c.ajustesInternos}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{usd(c.costoUsd.total)}</td>
                      </tr>
                      {abierta === c.id && (
                        <tr className="bg-[#FAFAFB]">
                          <td colSpan={10} className="px-4 pb-4 pt-1">
                            <div className="grid gap-4 pl-5 text-[12px] md:grid-cols-4">
                              <Desglose titulo="Pedidos por el cliente" filas={CLIENTE.map(([k, n]) => [n, c.revisiones[k]])} />
                              <Desglose titulo="Ajustes del equipo" filas={EQUIPO.map(([k, n]) => [n, c.revisiones[k]])} />
                              <Desglose
                                titulo="Rondas y versiones"
                                filas={[
                                  ['Versiones de la sábana', c.revisiones.sabanaVersiones],
                                  ['Rondas de copy con el cliente', c.revisiones.copyRondasConCliente],
                                  ['Versiones de arte subidas', c.revisiones.versionesDeArte],
                                  ['Generaciones de copy', c.volumen.generaciones],
                                ]}
                              />
                              <Desglose
                                titulo="Volumen y costo"
                                filas={[
                                  ['Piezas de copy', c.volumen.piezasDeCopy],
                                  ['Piezas de diseño', c.volumen.piezas],
                                  ['Anuncios montados', `${c.volumen.montados} de ${c.volumen.anuncios}`],
                                  ['IA: copy · auditoría', `${usd(c.costoUsd.copy)} · ${usd(c.costoUsd.auditoria)}`],
                                ]}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {!datos.campanas.length && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-[13px] text-[#86868B]">
                        No hay campañas creadas en este periodo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Tile({ n, rotulo, tono }: { n: string; rotulo: string; tono?: 'ambar' }) {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3">
      <p className={`text-[20px] font-bold leading-tight tabular-nums ${tono === 'ambar' ? 'text-amber-700' : 'text-[#1D1D1F]'}`}>{n}</p>
      <p className="mt-1 text-[11.5px] leading-snug text-[#6E6E73]">{rotulo}</p>
    </div>
  );
}

function Desglose({ titulo, filas }: { titulo: string; filas: [string, number | string][] }) {
  return (
    <div>
      <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#86868B]">{titulo}</p>
      <ul className="space-y-0.5">
        {filas.map(([n, v]) => (
          <li key={n} className="flex justify-between gap-2">
            <span className="text-[#6E6E73]">{n}</span>
            <span className="font-semibold tabular-nums text-[#1D1D1F]">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Una fila por campaña, con horas por fase y cada ajuste en su columna, para cruzarlo en una hoja de cálculo. */
function descargar(d: EficienciaDeControl) {
  const h = (x: { horas: number | null } | null) => (x?.horas == null ? '' : Math.round(x.horas * 10) / 10);
  const filas = d.campanas.map(c => ({
    Workspace: c.workspace,
    Marca: c.marca ?? '',
    Campaña: c.campana,
    Aprueba: c.modoAprobacion === 'CLIENTE' ? 'Cliente' : 'Equipo',
    Creada: c.creada.slice(0, 10),
    'Total (h)': h(c.total),
    'En curso': c.total.enCurso ? 'Sí' : 'No',
    ...Object.fromEntries(FASES.map(f => [`${f.nombre} (h)`, h(c.fases[f.id])])),
    ...Object.fromEntries(CLIENTE.map(([k, n]) => [`Cliente: ${n}`, c.revisiones[k]])),
    ...Object.fromEntries(EQUIPO.map(([k, n]) => [`Equipo: ${n}`, c.revisiones[k]])),
    'Versiones de la sábana': c.revisiones.sabanaVersiones,
    'Rondas de copy con el cliente': c.revisiones.copyRondasConCliente,
    'Versiones de arte': c.revisiones.versionesDeArte,
    'Piezas de copy': c.volumen.piezasDeCopy,
    'Piezas de diseño': c.volumen.piezas,
    Anuncios: c.volumen.anuncios,
    Montados: c.volumen.montados,
    'IA copy (USD)': Math.round(c.costoUsd.copy * 1000) / 1000,
    'IA auditoría (USD)': Math.round(c.costoUsd.auditoria * 1000) / 1000,
  }));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), 'Campañas');
  XLSX.writeFile(libro, `Eficiencia — últimos ${d.dias} días — ${new Date().toISOString().slice(0, 10)}.xlsx`);
}
