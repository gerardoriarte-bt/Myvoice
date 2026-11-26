import React from 'react';
import * as XLSX from 'xlsx';
import { ChevronDown, ChevronRight, Download, Info } from 'lucide-react';
import { controlApi } from '../../services/api';
import type { EficienciaDeControl, FaseDeEficiencia, MedidaDeEficiencia, ResumenDeFase, WorkspaceDeControl } from '../../types';

/**
 * Control › Eficiencia (super admin, 2026-11-24; Gerardo: «no solo el consumo de IA, sino el tiempo que lleva todo el
 * flujo, las revisiones y ajustes solicitados por el cliente»). Arriba, cuánto tarda cada fase en la campaña típica
 * (la mediana de las que la terminaron, con el p75 y cuántas siguen abiertas) y dónde se va el tiempo; abajo, campaña
 * por campaña, con su avance, sus ajustes y su costo. Desde 2026-11-26 mide en horas hábiles o corridas, contra todo
 * lo esperado (docs/ecosistema/datos/medicion.md). Hecho sin el `.pen`.
 */

const FASES: { id: FaseDeEficiencia; nombre: string; color: string }[] = [
  { id: 'planeacion', nombre: 'Planeación', color: '#4F46E5' },
  { id: 'copy', nombre: 'Copy', color: '#7C3AED' },
  { id: 'produccion', nombre: 'Producción', color: '#B45309' },
  { id: 'aprobacionFinal', nombre: 'Aprobación final', color: '#6D28D9' },
  { id: 'montaje', nombre: 'Montaje', color: '#0E7490' },
];
const PERIODOS = [30, 90, 180, 365];
const COMO_SE_MIDE =
  'Horas hábiles: lunes a viernes, 8:00 a 18:00 de Bogotá, sin festivos. Una fase termina cuando está hecho todo lo esperado: lo pedido en la sábana aprobada o, sin sábana, lo que existe. La campaña termina con todo montado (o, sin Implementación, con las piezas listas). Entran las campañas con actividad en el periodo, de los workspaces que cuentan en las métricas.';

/** Minutos, horas o días, según el tamaño: «45 min», «6 h», «3,5 días». En hábiles, un día son 10 h de jornada. */
const duracion = (h: number | null, habiles: boolean) => {
  if (h === null) return '—';
  if (h * 60 < 1) return '< 1 min';
  if (h < 1) return `${Math.round(h * 60)} min`;
  const porDia = habiles ? 10 : 24;
  if (h < porDia * 2) return `${Math.round(h)} h`;
  return `${(h / porDia).toLocaleString('es-CO', { maximumFractionDigits: 1 })} días${habiles ? ' háb.' : ''}`;
};
const usd = (n: number) => `USD ${n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Campana = EficienciaDeControl['campanas'][number];
const CLIENTE: [keyof Campana['revisiones'], string][] = [
  ['sabanaDevueltaPorCliente', 'Sábana devuelta'],
  ['copyCambiosDelCliente', 'Copy con cambios'],
  ['piezasDevueltasPorCliente', 'Piezas devueltas'],
  ['implementacionCambiosDelCliente', 'Cambios antes de publicar'],
];
const EQUIPO: [keyof Campana['revisiones'], string][] = [
  ['sabanaDevueltaPorEquipo', 'Sábana devuelta'],
  ['copyRevocado', 'Copy con la aprobación quitada'],
  ['copyReeditado', 'Copy editado después de aprobado'],
  ['piezasDevueltasPorEquipo', 'Piezas devueltas'],
  ['novedadesAlMontar', 'Novedades al montar'],
];
const TERMINA_EN: Record<Campana['terminaEn'], string> = { montaje: 'todo montado', produccion: 'piezas listas', copy: 'copy aprobado' };

export default function Eficiencia({ workspaces }: { workspaces: WorkspaceDeControl[] }) {
  const [dias, setDias] = React.useState(90);
  const [workspaceId, setWorkspaceId] = React.useState('');
  const [habiles, setHabiles] = React.useState(true);
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
  const med = (x: ResumenDeFase) => (habiles ? x.medianaHabiles : x.mediana);
  const p75 = (x: ResumenDeFase) => (habiles ? x.p75Habiles : x.p75);
  const de = (x: MedidaDeEficiencia | null) => (x ? (habiles ? x.horasHabiles : x.horas) : null);
  const totalFases = r ? FASES.reduce((t, f) => t + (med(r.porFase[f.id]) ?? 0), 0) : 0;
  const elegido = workspaces.find(w => w.id === workspaceId);
  const campo = 'bg-white border border-[rgba(0,0,0,0.1)] rounded-lg px-2 py-1 text-[13px] text-[#1D1D1F]';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-[#6E6E73]">
        <label className="flex items-center gap-2">
          Workspace
          <select value={workspaceId} onChange={e => setWorkspaceId(e.target.value)} className={campo}>
            <option value="">Todos los que cuentan</option>
            {workspaces.map(w => (
              <option key={w.id} value={w.id}>
                {w.name}
                {w.cuentaEnMetricas ? '' : ' (prueba)'}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Con actividad en los últimos
          <select value={dias} onChange={e => setDias(Number(e.target.value))} className={campo}>
            {PERIODOS.map(p => (
              <option key={p} value={p}>
                {p} días
              </option>
            ))}
          </select>
        </label>
        <div className="flex overflow-hidden rounded-lg ring-1 ring-[rgba(0,0,0,0.1)]" role="group" aria-label="Cómo contar las horas">
          {[
            [true, 'Horas hábiles'],
            [false, 'Horas corridas'],
          ].map(([v, n]) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={habiles === v}
              onClick={() => setHabiles(v as boolean)}
              className={`px-2.5 py-1 text-[12.5px] font-semibold ${habiles === v ? 'bg-ink text-white' : 'bg-white text-[#3A3A3C] hover:bg-[#F5F5F7]'}`}
            >
              {n as string}
            </button>
          ))}
        </div>
        <span title={COMO_SE_MIDE} className="flex cursor-help items-center gap-1 text-[#86868B]">
          <Info className="h-3.5 w-3.5" /> Cómo se mide
        </span>
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

      {elegido && !elegido.cuentaEnMetricas && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
          {elegido.name} está marcado como prueba: lo ves porque lo elegiste, pero no entra en «Todos los que cuentan».
        </p>
      )}
      {error && <p className="text-[12.5px] text-red-600">{error}</p>}
      {!datos && !error && <div className="h-40" />}

      {r && datos && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Tile
              n={`${r.terminadas} de ${r.campanas}`}
              rotulo={`campañas terminadas${r.sinActividad ? ` · ${r.sinActividad} sin actividad fuera de la cuenta` : ''}`}
            />
            <Tile
              n={duracion(med(r.total), habiles)}
              rotulo={`de punta a punta en la típica · p75 ${duracion(p75(r.total), habiles)}${r.total.abiertas ? ` · ${r.total.abiertas} abiertas llevan ${duracion(r.total.edadAbiertasHabiles, true)}` : ''}`}
            />
            <Tile n={String(r.cambiosDelCliente)} rotulo={`cambios pedidos por el cliente, en ${r.campanasConCambiosDelCliente} ${r.campanasConCambiosDelCliente === 1 ? 'campaña' : 'campañas'}`} tono={r.cambiosDelCliente ? 'ambar' : undefined} />
            <Tile n={String(r.ajustesInternos)} rotulo="ajustes del equipo (devoluciones, ediciones, novedades)" />
            <Tile
              n={usd(r.costoUsd)}
              rotulo={`de IA${r.costoPorMontadoUsd !== null ? ` · ${usd(r.costoPorMontadoUsd)} por anuncio montado` : ''}${r.generacionesFallidas ? ` · ${r.generacionesFallidas} generaciones fallidas` : ''}`}
            />
          </div>

          {/* Dónde se va el tiempo: la mediana de cada fase, en proporción, y su detalle. */}
          <section className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
            <p className="text-[13px] font-semibold text-[#1D1D1F]">Cuánto tarda cada fase</p>
            <p className="text-[11.5px] text-[#86868B]">
              La mediana entre las campañas que la terminaron. Si las abiertas llevan más que la mediana, las lentas todavía no están en la cuenta.
            </p>
            {totalFases > 0 ? (
              <div className="mt-3 flex h-8 overflow-hidden rounded-lg">
                {FASES.filter(f => (med(r.porFase[f.id]) ?? 0) > 0).map(f => (
                  <div
                    key={f.id}
                    className="flex min-w-[2px] items-center justify-center overflow-hidden px-1 text-[11px] font-semibold text-white"
                    style={{ width: `${((med(r.porFase[f.id]) ?? 0) / totalFases) * 100}%`, background: f.color }}
                    title={`${f.nombre}: ${duracion(med(r.porFase[f.id]), habiles)}`}
                  >
                    <span className="truncate">{f.nombre}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[12px] text-[#86868B]">Todavía ninguna campaña terminó una fase en este periodo.</p>
            )}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-[12px]">
                <thead className="text-left text-[10.5px] uppercase tracking-[0.06em] text-[#86868B]">
                  <tr>
                    <th className="py-1 font-semibold">Fase</th>
                    <th className="py-1 font-semibold">Mediana</th>
                    <th className="py-1 font-semibold">p75</th>
                    <th className="py-1 font-semibold">Terminadas</th>
                    <th className="py-1 font-semibold">Abiertas</th>
                    <th className="py-1 font-semibold">Edad de las abiertas</th>
                  </tr>
                </thead>
                <tbody>
                  {FASES.map(f => {
                    const x = r.porFase[f.id];
                    const atrasadas = x.edadAbiertasHabiles !== null && x.medianaHabiles !== null && x.edadAbiertasHabiles > x.medianaHabiles;
                    return (
                      <tr key={f.id} className="border-t border-[rgba(0,0,0,0.05)]">
                        <td className="py-1.5">
                          <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: f.color }} />
                            {f.nombre}
                          </span>
                        </td>
                        <td className="py-1.5 font-semibold tabular-nums">{duracion(med(x), habiles)}</td>
                        <td className="py-1.5 tabular-nums">{duracion(p75(x), habiles)}</td>
                        <td className="py-1.5 tabular-nums">{x.terminadas}</td>
                        <td className="py-1.5 tabular-nums">{x.abiertas}</td>
                        <td className={`py-1.5 tabular-nums ${atrasadas ? 'font-semibold text-amber-700' : ''}`}>
                          {x.abiertas ? duracion(x.edadAbiertasHabiles, true) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
                          {duracion(de(c.total), habiles)}
                          {c.total.enCurso && <span className="ml-1 rounded bg-[#F5F5F7] px-1.5 text-[10px] font-medium text-[#6E6E73]">en curso</span>}
                        </td>
                        {FASES.map(f => {
                          const v = c.fases[f.id];
                          return (
                            <td key={f.id} className={`whitespace-nowrap px-3 py-2.5 tabular-nums ${v?.enCurso ? 'text-[#86868B]' : 'text-[#1D1D1F]'}`} title={v?.enCurso ? 'En curso: cuenta hasta hoy' : undefined}>
                              {v ? duracion(de(v), habiles) : '—'}
                              {v?.enCurso && <span className="block text-[10.5px]">{v.avance ? `${v.avance.listas} de ${v.avance.esperadas}` : 'en curso'}</span>}
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
                            <p className="mb-2 pl-5 text-[11.5px] text-[#6E6E73]">
                              {c.conSabana
                                ? `Con sábana: ${c.volumen.lineasDeSabana} ${c.volumen.lineasDeSabana === 1 ? 'línea' : 'líneas'}, ${c.volumen.piezasPlaneadas} ${c.volumen.piezasPlaneadas === 1 ? 'pieza pedida' : 'piezas pedidas'}`
                                : 'Sin sábana: se mide contra lo que existe'} · termina con{' '}
                              {TERMINA_EN[c.terminaEn]} · aprueba {c.modoAprobacion === 'CLIENTE' ? 'el cliente' : 'el equipo'}
                              {c.ultimaActividad && ` · último movimiento ${new Date(c.ultimaActividad).toLocaleDateString('es-CO')}`}
                            </p>
                            <div className="grid gap-4 pl-5 text-[12px] md:grid-cols-4">
                              <Desglose titulo="Pedidos por el cliente" filas={CLIENTE.map(([k, n]) => [n, c.revisiones[k]])} />
                              <Desglose titulo="Ajustes del equipo" filas={EQUIPO.map(([k, n]) => [n, c.revisiones[k]])} />
                              <Desglose
                                titulo="Rondas y versiones"
                                filas={[
                                  ['Versiones de la sábana', c.revisiones.sabanaVersiones],
                                  ['Rondas de copy con el cliente', c.revisiones.copyRondasConCliente],
                                  ['Versiones de arte subidas', c.revisiones.versionesDeArte],
                                  ['Generaciones de copy', `${c.volumen.generaciones}${c.volumen.generacionesFallidas ? ` (+${c.volumen.generacionesFallidas} fallidas)` : ''}`],
                                ]}
                              />
                              <Desglose
                                titulo="Volumen y costo"
                                filas={[
                                  ['Piezas de copy', c.volumen.piezasDeCopy],
                                  ['Piezas de diseño', c.volumen.piezas],
                                  ['Anuncios montados', `${c.volumen.montados} de ${c.volumen.anuncios}`],
                                  ['IA: copy · auditoría', `${usd(c.costoUsd.copy)} · ${usd(c.costoUsd.auditoria)}`],
                                  ['IA: refinar · fallidas', `${usd(c.costoUsd.refinar)} · ${usd(c.costoUsd.fallidas)}`],
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
                        No hay campañas con actividad en este periodo.
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

/**
 * Para la línea base: una hoja por campaña (horas hábiles y corridas por fase, avance, cada ajuste y cada costo en su
 * columna), una con el resumen por fase y otra con las definiciones, para que la comparación de mañana use las mismas.
 */
function descargar(d: EficienciaDeControl) {
  const n = (x: number | null) => (x == null ? '' : Math.round(x * 10) / 10);
  const filas = d.campanas.map(c => ({
    Workspace: c.workspace,
    Marca: c.marca ?? '',
    Campaña: c.campana,
    Aprueba: c.modoAprobacion === 'CLIENTE' ? 'Cliente' : 'Equipo',
    'Con sábana': c.conSabana ? 'Sí' : 'No',
    'Termina con': TERMINA_EN[c.terminaEn],
    Creada: c.creada.slice(0, 10),
    'Último movimiento': c.ultimaActividad?.slice(0, 10) ?? '',
    'Total (h hábiles)': n(c.total.horasHabiles),
    'Total (h corridas)': n(c.total.horas),
    'En curso': c.total.enCurso ? 'Sí' : 'No',
    ...Object.fromEntries(
      FASES.flatMap(f => {
        const v = c.fases[f.id];
        return [
          [`${f.nombre} (h hábiles)`, n(v?.horasHabiles ?? null)],
          [`${f.nombre} (h corridas)`, n(v?.horas ?? null)],
          [`${f.nombre}: en curso`, v ? (v.enCurso ? 'Sí' : 'No') : ''],
          [`${f.nombre}: avance`, v?.avance ? `${v.avance.listas}/${v.avance.esperadas}` : ''],
        ];
      })
    ),
    ...Object.fromEntries(CLIENTE.map(([k, nombre]) => [`Cliente: ${nombre}`, c.revisiones[k]])),
    ...Object.fromEntries(EQUIPO.map(([k, nombre]) => [`Equipo: ${nombre}`, c.revisiones[k]])),
    'Versiones de la sábana': c.revisiones.sabanaVersiones,
    'Rondas de copy con el cliente': c.revisiones.copyRondasConCliente,
    'Versiones de arte': c.revisiones.versionesDeArte,
    'Líneas de la sábana': c.volumen.lineasDeSabana,
    'Piezas pedidas': c.volumen.piezasPlaneadas,
    'Piezas de copy': c.volumen.piezasDeCopy,
    'Piezas de diseño': c.volumen.piezas,
    Anuncios: c.volumen.anuncios,
    Montados: c.volumen.montados,
    Generaciones: c.volumen.generaciones,
    'Generaciones fallidas': c.volumen.generacionesFallidas,
    'IA copy (USD)': Math.round(c.costoUsd.copy * 1000) / 1000,
    'IA auditoría (USD)': Math.round(c.costoUsd.auditoria * 1000) / 1000,
    'IA refinar (USD)': Math.round(c.costoUsd.refinar * 1000) / 1000,
    'IA fallidas (USD)': Math.round(c.costoUsd.fallidas * 1000) / 1000,
    'IA total (USD)': Math.round(c.costoUsd.total * 1000) / 1000,
  }));
  const resumen = [{ id: 'total' as const, nombre: 'Total' }, ...FASES].map(f => {
    const x = f.id === 'total' ? d.resumen.total : d.resumen.porFase[f.id];
    return {
      Fase: f.nombre,
      Terminadas: x.terminadas,
      Abiertas: x.abiertas,
      'Mediana (h hábiles)': n(x.medianaHabiles),
      'p75 (h hábiles)': n(x.p75Habiles),
      'Mediana (h corridas)': n(x.mediana),
      'p75 (h corridas)': n(x.p75),
      'Edad mediana de las abiertas (h hábiles)': n(x.edadAbiertasHabiles),
    };
  });
  const definiciones = [
    ['Periodo', `Campañas con actividad desde ${d.desde.slice(0, 10)} (${d.dias} días)`],
    ['Horas hábiles', 'Lunes a viernes, 8:00 a 18:00 hora de Bogotá, sin festivos de Colombia'],
    ['Planeación', 'De creada la sábana a aprobada (por el equipo o el cliente)'],
    ['Copy', 'De la sábana aprobada (o el primer copy) hasta que cada línea tiene aprobadas las piezas pedidas; sin sábana, todo lo guardado aprobado'],
    ['Producción', 'De la primera pieza hasta que todas (y todas las planeadas con diseño) están listas'],
    ['Aprobación final', 'De que el primer anuncio quedó listo para aprobar hasta que están aprobados todos los esperados'],
    ['Montaje', 'De la primera aprobación hasta que están montados todos los esperados'],
    ['Total', 'De la creación de la campaña (o su primera actividad) hasta el final de su flujo: todo montado, o piezas listas / copy aprobado si la marca no tiene Implementación'],
    ['Mediana y p75', 'Solo de lo terminado; las abiertas se cuentan aparte con su edad'],
    ['Fuera de la cuenta', 'Workspaces marcados como prueba en Control y campañas sin actividad'],
  ].map(([Concepto, Definición]) => ({ Concepto, Definición }));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), 'Campañas');
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(resumen), 'Resumen por fase');
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(definiciones), 'Cómo se mide');
  XLSX.writeFile(libro, `Eficiencia — últimos ${d.dias} días — ${new Date().toISOString().slice(0, 10)}.xlsx`);
}
