import React from 'react';
import * as XLSX from 'xlsx';
import { ChevronDown, ChevronRight, Download, Printer } from 'lucide-react';
import { implementacionApi, libraryApi } from '../../services/api';
import type { EtapaDeFunnel, EstadoAnuncio, Project, ReporteImplementacion } from '../../types';

/**
 * T5 · El reporte de implementación de una campaña (2026-11-24; plan de Implementación, PR #65, fase B). Lo planeado
 * en la sábana contra lo montado, línea por línea, con lo que se desvió; y el historial de aprobaciones, uno solo, del
 * equipo y del cliente. Se entrega como archivo (decisión 22): «Descargar Excel» e «Imprimir o guardar PDF». Hecho sin
 * el `.pen`.
 */

const ETAPA: Record<EtapaDeFunnel, string> = { RECONOCIMIENTO: 'Reconocimiento', CONSIDERACION: 'Consideración', CONVERSION: 'Conversión', RETENCION: 'Retención' };
const ESTADO: Record<EstadoAnuncio, string> = {
  POR_APROBAR: 'Por aprobar',
  CON_EL_CLIENTE: 'Con el cliente',
  POR_MONTAR: 'Por montar',
  MONTADO: 'Montado',
  CON_NOVEDAD: 'Con novedad',
};
const PASO_COLOR: Record<string, string> = {
  Sábana: 'bg-indigo-50 text-indigo-700',
  Copy: 'bg-violet-50 text-violet-700',
  Pieza: 'bg-amber-50 text-amber-800',
  Implementación: 'bg-cyan-50 text-cyan-800',
};
const dia = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '—');
const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const rango = (d: string | null, h: string | null) => (d || h ? `${dia(d)} – ${dia(h)}` : '—');
const destinoDe = (l: { destino: string | null; sinDestino: boolean }) => (l.destino ? l.destino : l.sinDestino ? 'No lleva destino' : '—');

interface Props {
  marcaId: string;
  campanaId: string | null;
  onElegirCampana: (id: string) => void;
}

export default function ReporteDeImplementacion({ marcaId, campanaId, onElegirCampana }: Props) {
  const [reporte, setReporte] = React.useState<ReporteImplementacion | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [campanas, setCampanas] = React.useState<Project[]>([]);
  const [abiertas, setAbiertas] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (campanaId) return;
    libraryApi
      .listProjects(marcaId)
      .then((ps: Project[]) => setCampanas(ps))
      .catch(() => setCampanas([]));
  }, [marcaId, campanaId]);

  React.useEffect(() => {
    setReporte(null);
    setError(null);
    if (!campanaId) return;
    implementacionApi
      .reporte(campanaId)
      .then(setReporte)
      .catch(e => setError(e instanceof Error ? e.message : 'No se pudo armar el reporte'));
  }, [campanaId]);

  if (!campanaId)
    return (
      <div className="mx-auto max-w-[760px] px-6 py-8">
        <h1 className="text-[22px] font-bold text-[#1D1D1F]">Reporte de implementación</h1>
        <p className="mt-1 text-[13px] text-[#6E6E73]">Elige la campaña: el reporte es de una a la vez.</p>
        <ul className="mt-5 space-y-2">
          {campanas.map(c => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onElegirCampana(c.id)}
                className="flex w-full items-center justify-between rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3 text-left text-[14px] font-semibold text-[#1D1D1F] hover:bg-[#FAFAFB]"
              >
                {c.name}
                <ChevronRight className="h-4 w-4 text-[#86868B]" />
              </button>
            </li>
          ))}
          {!campanas.length && <li className="text-[13px] text-[#86868B]">Esta marca no tiene campañas.</li>}
        </ul>
      </div>
    );
  if (error) return <p className="px-6 py-8 text-[13px] text-red-700">{error}</p>;
  if (!reporte) return <p className="px-6 py-8 text-[13px] text-[#86868B]">Armando el reporte…</p>;

  const r = reporte;
  const alternar = (id: string) =>
    setAbiertas(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const avance = r.resumen.planeadas ? r.resumen.montados / r.resumen.planeadas : r.resumen.anuncios ? r.resumen.montados / r.resumen.anuncios : 0;
  const tiles: [string, string | number, string][] = [
    ['Planeado', r.resumen.planeadas ?? 'Sin sábana', 'text-[#1D1D1F]'],
    ['Anuncios', r.resumen.anuncios, 'text-[#1D1D1F]'],
    ['Por aprobar', r.resumen.porAprobar, 'text-violet-700'],
    ['Por montar', r.resumen.porMontar, 'text-[#0E7490]'],
    ['Montados', r.resumen.montados, 'text-emerald-700'],
    ['Con novedad', r.resumen.conNovedad, r.resumen.conNovedad ? 'text-amber-700' : 'text-[#1D1D1F]'],
    ['Desviaciones', r.resumen.desviaciones, r.resumen.desviaciones ? 'text-amber-700' : 'text-[#1D1D1F]'],
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-6">
      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868B]">Reporte de implementación</p>
          <h1 className="text-[22px] font-bold text-[#1D1D1F]">{r.campana.nombre}</h1>
          <p className="text-[12.5px] text-[#6E6E73]">
            {r.campana.marca} · Responsable: {r.campana.responsable ?? 'sin asignar'} · Aprueba {r.campana.modoAprobacion === 'CLIENTE' ? 'el cliente' : 'el equipo'}
            {r.sabana ? ` · Sábana v${r.sabana.version}` : ' · Sin sábana de CDM'} · {fechaHora(r.generadoEn)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => descargarExcel(r)}
          className="flex items-center gap-1.5 rounded-lg bg-[#1D1D1F] px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-black"
        >
          <Download className="h-4 w-4" /> Descargar Excel
        </button>
        <button
          type="button"
          onClick={() => imprimir(r)}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#1D1D1F] ring-1 ring-[rgba(0,0,0,0.12)] hover:bg-[#F5F5F7]"
        >
          <Printer className="h-4 w-4" /> Imprimir o guardar PDF
        </button>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {tiles.map(([n, v, c]) => (
          <div key={n} className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3">
            <p className={`text-[22px] font-bold leading-none tabular-nums ${c}`}>{v}</p>
            <p className="mt-1.5 text-[12px] font-semibold text-[#6E6E73]">{n}</p>
          </div>
        ))}
      </section>
      <div className="h-2 overflow-hidden rounded-full bg-[#E5E5EA]" title={`${Math.round(avance * 100)} % montado`}>
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, avance * 100)}%` }} />
      </div>

      <section className="overflow-hidden rounded-xl border border-[rgba(0,0,0,0.08)] bg-white">
        <h2 className="border-b border-[rgba(0,0,0,0.06)] px-4 py-3 text-[15px] font-bold text-[#1D1D1F]">Planeado contra montado</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[12.5px]">
            <thead className="bg-[#FAFAFB] text-[11px] uppercase tracking-[0.06em] text-[#86868B]">
              <tr>
                <th className="px-4 py-2 font-semibold">Línea</th>
                <th className="px-4 py-2 font-semibold">Planeado</th>
                <th className="px-4 py-2 font-semibold">Montado</th>
                <th className="px-4 py-2 font-semibold">Destino</th>
                <th className="px-4 py-2 font-semibold">Desviaciones</th>
              </tr>
            </thead>
            <tbody>
              {r.lineas.map(l => {
                const abierta = abiertas.has(l.id);
                const total = l.planeadas ?? l.anuncios.length;
                return (
                  <React.Fragment key={l.id}>
                    <tr className="border-t border-[rgba(0,0,0,0.06)] align-top hover:bg-[#FAFAFB]">
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => alternar(l.id)} className="flex items-start gap-1.5 text-left">
                          {abierta ? <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                          <span>
                            <span className="block font-semibold text-[#1D1D1F]">{l.medio}</span>
                            <span className="text-[#6E6E73]">
                              {l.formato}
                              {l.etapa ? ` · ${ETAPA[l.etapa]}` : ''}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-[#3A3A3C]">
                        {l.planeadas === null ? (
                          <span className="text-[#86868B]">Sin sábana</span>
                        ) : (
                          <>
                            <span className="font-semibold tabular-nums">{l.planeadas}</span> · {rango(l.desde, l.hasta)}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold tabular-nums ${l.montados >= total && total > 0 ? 'text-emerald-700' : 'text-[#1D1D1F]'}`}>
                          {l.montados} de {total}
                        </span>
                        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-[#E5E5EA]">
                          <div className="h-full bg-emerald-500" style={{ width: `${total ? Math.min(100, (l.montados / total) * 100) : 0}%` }} />
                        </div>
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-[#6E6E73]" title={destinoDe(l)}>
                        {l.planeadas === null ? 'Por anuncio' : destinoDe(l)}
                      </td>
                      <td className="px-4 py-3">
                        {l.desviaciones.length ? (
                          <ul className="space-y-0.5 text-amber-800">
                            {l.desviaciones.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-emerald-700">Sin desviaciones</span>
                        )}
                      </td>
                    </tr>
                    {abierta && (
                      <tr className="bg-[#FAFAFB]">
                        <td colSpan={5} className="px-4 pb-3 pt-1">
                          <table className="w-full text-[12px]">
                            <thead className="text-[10.5px] uppercase tracking-[0.06em] text-[#86868B]">
                              <tr>
                                <th className="py-1 pl-6 font-semibold">Anuncio</th>
                                <th className="py-1 font-semibold">Estado</th>
                                <th className="py-1 font-semibold">Plataforma · ID</th>
                                <th className="py-1 font-semibold">Fecha</th>
                                <th className="py-1 font-semibold">Destino</th>
                              </tr>
                            </thead>
                            <tbody>
                              {l.anuncios.map((a, i) => (
                                <tr key={i} className="border-t border-[rgba(0,0,0,0.04)]">
                                  <td className="py-1.5 pl-6 text-[#1D1D1F]">{a.titulo}</td>
                                  <td className="py-1.5">{a.estado === 'MONTADO' && a.accion === 'publicar' ? 'Publicado' : ESTADO[a.estado]}</td>
                                  <td className="py-1.5 font-mono text-[11.5px]">{a.plataforma ? `${a.plataforma} · ${a.idEnPlataforma}` : '—'}</td>
                                  <td className="py-1.5">{dia(a.montadoEn)}</td>
                                  <td className="max-w-[260px] truncate py-1.5 text-[#6E6E73]" title={a.url ?? ''}>
                                    {a.url ?? (a.sinDestino ? 'No lleva destino' : '—')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {!r.lineas.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[13px] text-[#86868B]">
                    Esta campaña todavía no tiene nada para implementar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white">
        <h2 className="border-b border-[rgba(0,0,0,0.06)] px-4 py-3 text-[15px] font-bold text-[#1D1D1F]">
          Historial de aprobaciones <span className="font-normal text-[#86868B]">· del equipo y del cliente, en orden</span>
        </h2>
        <ol className="divide-y divide-[rgba(0,0,0,0.05)]">
          {r.historial.map((h, i) => (
            <li key={i} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-2.5 text-[12.5px]">
              <span className="w-[130px] shrink-0 whitespace-nowrap tabular-nums text-[#86868B]">{fechaHora(h.en)}</span>
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${PASO_COLOR[h.paso]}`}>{h.paso}</span>
              <span className="min-w-0 flex-1">
                <span className="font-semibold text-[#1D1D1F]">{h.quien}</span>
                {h.externo && <span className="ml-1 rounded bg-[#F5F5F7] px-1.5 text-[10.5px] text-[#6E6E73]">cliente</span>}{' '}
                <span className={h.tono === 'aprueba' ? 'text-emerald-700' : h.tono === 'devuelve' ? 'text-amber-800' : 'text-[#3A3A3C]'}>{h.accion.toLowerCase()}</span>{' '}
                <span className="text-[#3A3A3C]" title={h.cuales.join('\n')}>
                  {h.que}
                </span>
                {h.comentario && <span className="mt-0.5 block text-[#6E6E73]">«{h.comentario}»</span>}
              </span>
            </li>
          ))}
          {!r.historial.length && <li className="px-4 py-6 text-center text-[13px] text-[#86868B]">Todavía no hay decisiones registradas.</li>}
        </ol>
      </section>
    </div>
  );
}

const nombreArchivo = (r: ReporteImplementacion) =>
  `Implementación — ${r.campana.marca ?? ''} — ${r.campana.nombre} — ${r.generadoEn.slice(0, 10)}`.replace(/[\\/:*?"<>|]/g, '-');

/** El mismo reporte, en cuatro hojas: resumen, por línea, anuncio por anuncio y el historial. */
function descargarExcel(r: ReporteImplementacion) {
  const libro = XLSX.utils.book_new();
  const resumen = [
    ['Campaña', r.campana.nombre],
    ['Marca', r.campana.marca ?? ''],
    ['Responsable', r.campana.responsable ?? ''],
    ['Aprueba', r.campana.modoAprobacion === 'CLIENTE' ? 'El cliente' : 'El equipo'],
    ['Sábana', r.sabana ? `Versión ${r.sabana.version}` : 'Sin sábana de CDM'],
    ['Generado', fechaHora(r.generadoEn)],
    [],
    ['Planeado', r.resumen.planeadas ?? 'Sin sábana'],
    ['Anuncios', r.resumen.anuncios],
    ['Por aprobar', r.resumen.porAprobar],
    ['Por montar', r.resumen.porMontar],
    ['Montados', r.resumen.montados],
    ['Con novedad', r.resumen.conNovedad],
    ['Desviaciones', r.resumen.desviaciones],
  ];
  XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(resumen), 'Resumen');
  XLSX.utils.book_append_sheet(
    libro,
    XLSX.utils.json_to_sheet(
      r.lineas.map(l => ({
        Medio: l.medio,
        Formato: l.formato,
        Etapa: l.etapa ? ETAPA[l.etapa] : '',
        Planeado: l.planeadas ?? 'Sin sábana',
        Desde: l.desde?.slice(0, 10) ?? '',
        Hasta: l.hasta?.slice(0, 10) ?? '',
        Montados: l.montados,
        Anuncios: l.anuncios.length,
        Destino: l.planeadas === null ? 'Por anuncio' : destinoDe(l),
        UTM: l.utm ?? '',
        Desviaciones: l.desviaciones.join(' · '),
      }))
    ),
    'Por línea'
  );
  XLSX.utils.book_append_sheet(
    libro,
    XLSX.utils.json_to_sheet(
      r.lineas.flatMap(l =>
        l.anuncios.map(a => ({
          Línea: `${l.medio} · ${l.formato}`,
          Anuncio: a.titulo,
          Estado: a.estado === 'MONTADO' && a.accion === 'publicar' ? 'Publicado' : ESTADO[a.estado],
          Plataforma: a.plataforma ?? '',
          'ID en la plataforma': a.idEnPlataforma ?? '',
          Fecha: a.montadoEn?.slice(0, 10) ?? '',
          Destino: a.url ?? (a.sinDestino ? 'No lleva destino' : ''),
          Novedad: a.novedad ?? '',
        }))
      )
    ),
    'Anuncios'
  );
  XLSX.utils.book_append_sheet(
    libro,
    XLSX.utils.json_to_sheet(
      r.historial.map(h => ({
        Fecha: fechaHora(h.en),
        Paso: h.paso,
        Quién: h.quien + (h.externo ? ' (cliente)' : ''),
        Decisión: h.accion,
        Qué: h.que,
        Cuáles: h.cuales.join(' · '),
        Comentario: h.comentario ?? '',
      }))
    ),
    'Aprobaciones'
  );
  XLSX.writeFile(libro, `${nombreArchivo(r)}.xlsx`);
}

/** Una versión limpia del reporte en una ventana aparte, lista para imprimir o guardar como PDF. */
function imprimir(r: ReporteImplementacion) {
  const e = (s: string | number | null | undefined) =>
    String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const filas = r.lineas
    .map(
      l => `<tr><td><b>${e(l.medio)}</b><br>${e(l.formato)}${l.etapa ? ` · ${e(ETAPA[l.etapa])}` : ''}</td>
        <td>${l.planeadas === null ? 'Sin sábana' : `${l.planeadas} · ${e(rango(l.desde, l.hasta))}`}</td>
        <td>${l.montados} de ${l.planeadas ?? l.anuncios.length}</td>
        <td class="url">${e(l.planeadas === null ? 'Por anuncio' : destinoDe(l))}</td>
        <td>${l.desviaciones.length ? l.desviaciones.map(e).join('<br>') : 'Sin desviaciones'}</td></tr>`
    )
    .join('');
  const hitos = r.historial
    .map(
      h => `<tr><td>${e(fechaHora(h.en))}</td><td>${e(h.paso)}</td><td>${e(h.quien)}${h.externo ? ' (cliente)' : ''}</td>
        <td>${e(h.accion)} ${e(h.que)}${h.comentario ? `<br><i>«${e(h.comentario)}»</i>` : ''}</td></tr>`
    )
    .join('');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${e(nombreArchivo(r))}</title>
<style>body{font:12px -apple-system,Segoe UI,Roboto,sans-serif;color:#1d1d1f;margin:28px}h1{font-size:20px;margin:0}
h2{font-size:14px;margin:22px 0 8px}p.meta{color:#6e6e73;margin:4px 0 14px}.kpis{display:flex;gap:8px;flex-wrap:wrap}
.kpi{border:1px solid #ddd;border-radius:8px;padding:6px 10px}.kpi b{font-size:16px;display:block}
table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #eee;padding:6px;text-align:left;vertical-align:top}
th{font-size:10px;text-transform:uppercase;color:#86868b}td.url{max-width:200px;word-break:break-all}@page{margin:16mm}</style></head><body>
<p style="color:#86868b;text-transform:uppercase;font-size:10px;letter-spacing:.08em;margin:0">Reporte de implementación</p>
<h1>${e(r.campana.nombre)}</h1><p class="meta">${e(r.campana.marca)} · Responsable: ${e(r.campana.responsable ?? 'sin asignar')} · ${r.sabana ? `Sábana v${r.sabana.version}` : 'Sin sábana de CDM'} · ${e(fechaHora(r.generadoEn))}</p>
<div class="kpis">${[
    ['Planeado', r.resumen.planeadas ?? 'Sin sábana'],
    ['Anuncios', r.resumen.anuncios],
    ['Montados', r.resumen.montados],
    ['Por montar', r.resumen.porMontar],
    ['Por aprobar', r.resumen.porAprobar],
    ['Con novedad', r.resumen.conNovedad],
    ['Desviaciones', r.resumen.desviaciones],
  ]
    .map(([n, v]) => `<div class="kpi"><b>${e(v)}</b>${e(n)}</div>`)
    .join('')}</div>
<h2>Planeado contra montado</h2><table><thead><tr><th>Línea</th><th>Planeado</th><th>Montado</th><th>Destino</th><th>Desviaciones</th></tr></thead><tbody>${filas}</tbody></table>
<h2>Historial de aprobaciones</h2><table><thead><tr><th>Fecha</th><th>Paso</th><th>Quién</th><th>Decisión</th></tr></thead><tbody>${hitos}</tbody></table>
<script>window.onload=()=>window.print()</script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
