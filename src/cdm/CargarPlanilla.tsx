import React from 'react';
import { AlertTriangle, ArrowLeft, Upload } from 'lucide-react';
import { SCREENS } from '../../screens';
import { cdmApi } from '../../services/api';
import type { PlanDeCarga, PlanillaDeMedio } from '../../types';
import { leerPlanilla } from './leerPlanilla';
import { CLASES, ClaseDeMedio, nombreDeClase } from './clases';

/**
 * B5 · Cargar un medio desde su planilla (en el `.pen`, «§ CDM · Biblioteca · cargar Meta desde la planilla»).
 * Tres pasos: subir (el navegador lee el .xlsx), revisar (el servidor dice qué haría, en seco) y cargar. Las
 * ubicaciones por confirmar entran marcadas: se pueden usar en un planning y la línea lo avisa.
 */

const hoy = () => new Date().toISOString().slice(0, 10);
/** «meta-especificaciones-2026-11-09.xlsx» → medio «Meta», fecha 2026-11-09: lo que se pueda adivinar del nombre. */
const delNombre = (nombre: string) => {
  const fecha = /(\d{4}-\d{2}-\d{2})/.exec(nombre)?.[1] ?? hoy();
  const base = nombre.replace(/\.[^.]+$/, '').split(/[-_ ]/)[0] ?? '';
  return { medio: base ? base[0].toUpperCase() + base.slice(1) : '', fecha };
};

const ACCION: Record<PlanDeCarga['formatos'][number]['accion'], string> = {
  nuevo: 'nueva',
  version: 'cambia',
  igual: 'igual',
};

export default function CargarPlanilla({ onVolver, onCargado }: { onVolver: () => void; onCargado: (medio: string) => void }) {
  const [archivo, setArchivo] = React.useState<File | null>(null);
  const [medio, setMedio] = React.useState('');
  const [fecha, setFecha] = React.useState(hoy());
  const [clase, setClase] = React.useState<ClaseDeMedio>('PAGOS');
  const [planilla, setPlanilla] = React.useState<PlanillaDeMedio | null>(null);
  const [plan, setPlan] = React.useState<PlanDeCarga | null>(null);
  const [ocupado, setOcupado] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const elegir = (f: File | null) => {
    setArchivo(f);
    setPlan(null);
    setPlanilla(null);
    setError(null);
    if (f) {
      const sugerido = delNombre(f.name);
      setMedio(m => m || sugerido.medio);
      setFecha(sugerido.fecha);
    }
  };

  const revisar = async () => {
    if (!archivo || !medio.trim()) return;
    setOcupado(true);
    setError(null);
    try {
      const leida = { ...(await leerPlanilla(archivo, medio.trim(), fecha)), clase };
      if (!leida.especificaciones.length) throw new Error('La planilla no tiene la hoja «Especificaciones» o está vacía');
      setPlanilla(leida);
      setPlan(await cdmApi.cargar(leida, false));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer la planilla');
    } finally {
      setOcupado(false);
    }
  };

  const cargar = async () => {
    if (!planilla) return;
    setOcupado(true);
    setError(null);
    try {
      await cdmApi.cargar(planilla, true);
      onCargado(planilla.medio);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar');
    } finally {
      setOcupado(false);
    }
  };

  const ubicaciones = plan ? plan.leidas.imagen + plan.leidas.video : 0;
  const porConfirmar = plan ? plan.formatos.reduce((s, f) => s + f.porConfirmar, 0) : 0;
  const cambia = plan ? plan.formatos.filter(f => f.accion !== 'igual').length : 0;

  return (
    <div className="space-y-5 pb-8">
      <button type="button" onClick={onVolver} className="inline-flex items-center gap-1 text-[12.5px] text-[#6E6E73] hover:text-[#1D1D1F]">
        <ArrowLeft className="h-3.5 w-3.5" /> {SCREENS.biblioteca.name}
      </button>
      <div>
        <h2 className="text-[22px] font-bold text-[#1D1D1F] tracking-[-0.01em]">Cargar desde planilla</h2>
        <p className="text-[13px] text-[#6E6E73] mt-0.5">
          La planilla de especificaciones de un medio, con sus hojas Especificaciones, Zonas seguras y Alertas. Primero se revisa; nada se
          carga hasta que lo confirmes.
        </p>
      </div>

      <section className="rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_160px_160px_auto] md:items-end">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868B]">Planilla (.xlsx)</span>
            <input
              type="file"
              accept=".xlsx"
              onChange={e => elegir(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-[12.5px] text-[#3A3A3C] file:mr-3 file:rounded-md file:border-0 file:bg-[#F5F5F7] file:px-3 file:py-1.5 file:text-[12.5px] file:font-semibold"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868B]">Medio</span>
            <input
              value={medio}
              onChange={e => {
                setMedio(e.target.value);
                setPlan(null);
              }}
              placeholder="Meta, Google…"
              className="mt-1 w-full rounded-md border border-[rgba(0,0,0,0.12)] px-2.5 py-1.5 text-[13px]"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868B]">Clase</span>
            <select
              value={clase}
              onChange={e => {
                setClase(e.target.value as ClaseDeMedio);
                setPlan(null);
              }}
              className="mt-1 w-full rounded-md border border-[rgba(0,0,0,0.12)] bg-white px-2 py-1.5 text-[13px]"
            >
              {CLASES.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868B]">Fecha de la guía</span>
            <input
              type="date"
              value={fecha}
              onChange={e => {
                setFecha(e.target.value);
                setPlan(null);
              }}
              className="mt-1 w-full rounded-md border border-[rgba(0,0,0,0.12)] px-2.5 py-1.5 text-[13px]"
            />
          </label>
          <button
            type="button"
            disabled={!archivo || !medio.trim() || ocupado}
            onClick={() => void revisar()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-40"
          >
            <Upload className="h-3.5 w-3.5" /> {ocupado && !plan ? 'Leyendo…' : 'Revisar'}
          </button>
        </div>
        {error && <p className="mt-2 text-[12.5px] text-red-600">{error}</p>}
      </section>

      {plan && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              [String(ubicaciones), 'ubicaciones leídas', `${plan.leidas.imagen} imagen · ${plan.leidas.video} video`],
              [String(plan.formatos.length), 'piezas a producir', plan.formatos.map(f => f.nombre).join(', ')],
              [String(porConfirmar), 'por confirmar', `${plan.alertas.length} alertas de la guía`],
              [String(plan.errores.length), 'errores', plan.errores.length ? 'esas filas no se cargan' : 'todas las filas se leyeron'],
            ].map(([n, rotulo, sub]) => (
              <div key={rotulo} className="rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3">
                <div className="text-[22px] font-bold text-[#1D1D1F]">{n}</div>
                <div className="text-[12.5px] font-semibold text-[#3A3A3C]">{rotulo}</div>
                <div className="text-[11.5px] text-[#86868B] truncate">{sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <section className="rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white p-4">
              <h3 className="text-[13px] font-bold text-[#1D1D1F]">Cómo quedan agrupadas</h3>
              <table className="mt-2 w-full text-[12.5px]">
                <tbody>
                  {plan.formatos.map(f => (
                    <tr key={f.nombre} className="border-t border-[rgba(0,0,0,0.05)]">
                      <td className="py-1.5 font-semibold text-[#1D1D1F]">{f.nombre}</td>
                      <td className="py-1.5 text-[#3A3A3C]">{f.ubicaciones} {f.ubicaciones === 1 ? 'ubicación' : 'ubicaciones'}</td>
                      <td className="py-1.5 text-[#3A3A3C]">
                        {f.textoPrincipal ? `texto ${f.textoPrincipal.desde === f.textoPrincipal.hasta ? f.textoPrincipal.hasta : `${f.textoPrincipal.desde} a ${f.textoPrincipal.hasta}`}` : ''}
                      </td>
                      <td className="py-1.5 text-right text-[11.5px] text-[#86868B]">
                        {ACCION[f.accion]}
                        {f.accion !== 'igual' ? ` · versión ${f.version}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11.5px] text-[#86868B]">
                Las ubicaciones que aceptan un rango van a la pieza que ya se produce: nadie hace una 1,91:1 ni una 16:9 aparte.
              </p>
            </section>
            <section className="rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white p-4">
              <h3 className="text-[13px] font-bold text-[#1D1D1F]">Alertas de la guía · qué hacer con cada una</h3>
              {plan.alertas.length === 0 ? (
                <p className="mt-2 text-[12.5px] text-[#86868B]">La planilla no trae alertas.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {plan.alertas.map(a => (
                    <li key={a.numero} className="flex gap-2 text-[12px]">
                      <span className="w-5 shrink-0 font-semibold text-amber-700 tabular-nums">{a.numero}</span>
                      <span className="text-[#3A3A3C]">
                        {a.ubicacion}: {a.inconsistencia} <span className="text-[#86868B]">· {a.accion}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {plan.errores.length > 0 && (
            <section className="rounded-[12px] border border-red-100 bg-red-50 p-4">
              <h3 className="inline-flex items-center gap-1.5 text-[13px] font-bold text-red-800">
                <AlertTriangle className="h-3.5 w-3.5" /> Filas que no se cargan
              </h3>
              <ul className="mt-1.5 space-y-0.5 text-[12px] text-red-800">
                {plan.errores.map(e => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white p-4">
            <p className="text-[12.5px] text-[#3A3A3C]">
              {cambia === 0
                ? `${plan.medio.nombre} ya está así en la biblioteca: no hay nada que cargar.`
                : `${plan.medio.nuevo ? `Medio nuevo: ${plan.medio.nombre} (${nombreDeClase(plan.medio.clase)}), en borrador` : plan.medio.nombre} · ${cambia} ${
                    cambia === 1 ? 'pieza nueva o cambiada' : 'piezas nuevas o cambiadas'
                  }. Las ubicaciones por confirmar entran marcadas.`}
            </p>
            <button
              type="button"
              disabled={cambia === 0 || ocupado}
              onClick={() => void cargar()}
              className="rounded-lg bg-[#047857] px-3.5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-40"
            >
              {ocupado ? 'Cargando…' : `Cargar en ${plan.medio.nombre}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
