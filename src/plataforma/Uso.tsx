import React from 'react';
import * as XLSX from 'xlsx';
import { Download, Info } from 'lucide-react';
import { controlApi } from '../../services/api';
import type { AreaDeUso, UsoDeControl, WorkspaceDeControl } from '../../types';

/**
 * Control › Uso (super admin, 2026-11-26): la adopción de la herramienta, para compararla con la línea base. Quién
 * entra, qué días y en qué áreas, de `UsoDiario`. No cuenta el sondeo de cada minuto ni a los super admin. Hecho sin
 * el `.pen`.
 */

const PERIODOS = [7, 30, 90, 180];
const AREAS: Record<AreaDeUso, string> = {
  marca: 'Marca y ADN',
  cdm: 'CDM',
  copy: 'Copywriting',
  aprobacion: 'Aprobación',
  produccion: 'Producción',
  implementacion: 'Implementación',
  reporte: 'Reportes',
  general: 'General',
};
const COMO_SE_MIDE =
  'Activo: hizo al menos una consulta o acción ese día (no cuenta el sondeo automático de «Por aprobar» y la bandeja). Acción: algo que cambia (guardar, aprobar, generar, montar…). No cuenta a los super admin ni los workspaces de prueba. El registro empezó el 2026-11-26.';
const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)} %`);
const fecha = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

export default function Uso({ workspaces }: { workspaces: WorkspaceDeControl[] }) {
  const [dias, setDias] = React.useState(30);
  const [workspaceId, setWorkspaceId] = React.useState('');
  const [datos, setDatos] = React.useState<UsoDeControl | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDatos(null);
    controlApi
      .uso(dias, workspaceId || undefined)
      .then(d => {
        setDatos(d);
        setError(null);
      })
      .catch(e => setError(e instanceof Error ? e.message : 'No se pudo medir el uso'));
  }, [dias, workspaceId]);

  const campo = 'bg-white border border-[rgba(0,0,0,0.1)] rounded-lg px-2 py-1 text-[13px] text-[#1D1D1F]';
  const r = datos?.resumen;
  const maxDia = datos ? Math.max(1, ...datos.porDia.map(d => d.personas)) : 1;
  const maxArea = datos ? Math.max(1, ...datos.porArea.map(a => a.acciones)) : 1;

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
          Últimos
          <select value={dias} onChange={e => setDias(Number(e.target.value))} className={campo}>
            {PERIODOS.map(p => (
              <option key={p} value={p}>
                {p} días
              </option>
            ))}
          </select>
        </label>
        <span title={COMO_SE_MIDE} className="flex cursor-help items-center gap-1 text-[#86868B]">
          <Info className="h-3.5 w-3.5" /> Cómo se mide
        </span>
        {datos && (
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

      {datos && r && (
        <>
          {(!datos.primerDato || datos.primerDato > datos.desde) && (
            <p className="rounded-lg bg-[#F5F5F7] px-3 py-2 text-[12.5px] text-[#6E6E73]">
              {datos.primerDato
                ? `El registro empieza el ${fecha(datos.primerDato)}: antes no hay datos, no es que nadie entrara.`
                : 'Todavía no hay uso registrado en este periodo.'}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile n={pct(r.adopcion)} rotulo={`adopción: ${r.activosPeriodo} de ${r.conAcceso} personas con acceso la usaron en el periodo`} />
            <Tile n={String(r.activos7)} rotulo="personas activas en los últimos 7 días" />
            <Tile n={r.promedioDiarioHabil === null ? '—' : r.promedioDiarioHabil.toLocaleString('es-CO', { maximumFractionDigits: 1 })} rotulo="personas activas por día hábil, en promedio" />
            <Tile n={r.acciones.toLocaleString('es-CO')} rotulo="acciones (guardar, aprobar, generar, montar…)" />
          </div>

          <section className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
            <p className="text-[13px] font-semibold text-[#1D1D1F]">Personas activas por día</p>
            <div className="mt-3 flex h-28 items-end gap-[2px]">
              {datos.porDia.map(d => (
                <div
                  key={d.dia}
                  className={`flex-1 rounded-t-sm ${d.habil ? 'bg-ink' : 'bg-[#D1D1D6]'}`}
                  style={{ height: `${Math.max((d.personas / maxDia) * 100, d.personas ? 3 : 0)}%` }}
                  title={`${fecha(d.dia)}: ${d.personas} ${d.personas === 1 ? 'persona' : 'personas'}, ${d.acciones} acciones`}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10.5px] text-[#86868B]">
              <span>{fecha(datos.porDia[0].dia)}</span>
              <span>Gris: fin de semana o festivo</span>
              <span>{fecha(datos.porDia[datos.porDia.length - 1].dia)}</span>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
              <p className="text-[13px] font-semibold text-[#1D1D1F]">Dónde trabajan</p>
              <p className="text-[11.5px] text-[#86868B]">Acciones por área, y cuántas personas actuaron en cada una.</p>
              <ul className="mt-3 space-y-1.5">
                {datos.porArea.map(a => (
                  <li key={a.area} className="grid grid-cols-[110px_1fr_90px] items-center gap-2 text-[12px]">
                    <span className="text-[#3A3A3C]">{AREAS[a.area]}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-[#EEEEF0]">
                      <span className="block h-full rounded-full bg-ink" style={{ width: `${(a.acciones / maxArea) * 100}%` }} />
                    </span>
                    <span className="text-right tabular-nums text-[#6E6E73]">
                      {a.acciones} · {a.personas} pers.
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
              <p className="text-[13px] font-semibold text-[#1D1D1F]">Por workspace</p>
              <ul className="mt-3 space-y-1.5 text-[12px]">
                {datos.porWorkspace.map(w => (
                  <li key={w.id} className="flex justify-between gap-2">
                    <span className="text-[#3A3A3C]">{w.nombre}</span>
                    <span className="tabular-nums text-[#6E6E73]">
                      {w.activos} de {w.conAcceso} activos · {w.acciones} acciones
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="overflow-hidden rounded-xl border border-[rgba(0,0,0,0.08)] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[12.5px]">
                <thead className="bg-[#FAFAFB] text-[10.5px] uppercase tracking-[0.06em] text-[#86868B]">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Persona</th>
                    <th className="px-3 py-2 font-semibold">Días activos</th>
                    <th className="px-3 py-2 font-semibold">Acciones</th>
                    <th className="px-3 py-2 font-semibold">Dónde más</th>
                    <th className="px-3 py-2 font-semibold">Última vez</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.porPersona.map(p => {
                    const top = (Object.entries(p.porArea) as [AreaDeUso, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 2);
                    return (
                      <tr key={p.id} className={`border-t border-[rgba(0,0,0,0.06)] ${p.diasActivos ? '' : 'text-[#86868B]'}`}>
                        <td className="px-4 py-2">
                          <span className="block font-semibold">{p.nombre}</span>
                          <span className="text-[11.5px] text-[#86868B]">{p.workspaces.join(' · ')}</span>
                        </td>
                        <td className="px-3 py-2 tabular-nums">{p.diasActivos}</td>
                        <td className="px-3 py-2 tabular-nums">{p.acciones}</td>
                        <td className="px-3 py-2">{top.length ? top.map(([a]) => AREAS[a]).join(', ') : '—'}</td>
                        <td className="px-3 py-2">{p.ultimoDia ? fecha(p.ultimoDia) : 'No entró'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Tile({ n, rotulo }: { n: string; rotulo: string }) {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3">
      <p className="text-[20px] font-bold leading-tight tabular-nums text-[#1D1D1F]">{n}</p>
      <p className="mt-1 text-[11.5px] leading-snug text-[#6E6E73]">{rotulo}</p>
    </div>
  );
}

/** Para cruzar con la línea base: por persona, por día y por área. */
function descargar(d: UsoDeControl) {
  const libro = XLSX.utils.book_new();
  const personas = d.porPersona.map(p => ({
    Persona: p.nombre,
    Email: p.email,
    Workspaces: p.workspaces.join(', '),
    'Días activos': p.diasActivos,
    Acciones: p.acciones,
    Consultas: p.lecturas,
    'Última vez': p.ultimoDia ?? '',
    ...Object.fromEntries((Object.keys(AREAS) as AreaDeUso[]).map(a => [`Acciones: ${AREAS[a]}`, p.porArea[a]])),
  }));
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(personas), 'Personas');
  XLSX.utils.book_append_sheet(
    libro,
    XLSX.utils.json_to_sheet(d.porDia.map(x => ({ Día: x.dia, Hábil: x.habil ? 'Sí' : 'No', 'Personas activas': x.personas, Acciones: x.acciones }))),
    'Por día'
  );
  XLSX.utils.book_append_sheet(
    libro,
    XLSX.utils.json_to_sheet(d.porArea.map(a => ({ Área: AREAS[a.area], Personas: a.personas, Acciones: a.acciones, Consultas: a.lecturas }))),
    'Por área'
  );
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet([{ Concepto: 'Cómo se mide', Definición: COMO_SE_MIDE }]), 'Cómo se mide');
  XLSX.writeFile(libro, `Uso — últimos ${d.dias} días — ${new Date().toISOString().slice(0, 10)}.xlsx`);
}
