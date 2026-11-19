import React from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { SCREENS } from '../../screens';
import { cdmApi } from '../../services/api';
import type { MedioDetalle, MedioResumen } from '../../types';
import CargarPlanilla from './CargarPlanilla';
import GuiaVisual from './GuiaVisual';

/**
 * La biblioteca de medios de la agencia (F2b; en el `.pen`, B1 el catálogo y B2 un medio por pieza).
 * Abre con los medios, no con todos los formatos sueltos: una tarjeta por medio, y al abrirlo, sus piezas
 * maestras (decisión 18). La ve cualquiera; Planning (o un admin) carga planillas y activa los medios.
 */

type Filtro = 'todos' | 'activos' | 'borrador' | 'porConfirmar';

// La fecha de la guía es un día, guardado a medianoche UTC: en Colombia (UTC−5) se leía como el día anterior.
const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const miles = (n: number) => n.toLocaleString('es-CO');

const ESTADO: Record<MedioResumen['estado'], { texto: string; clase: string }> = {
  ACTIVO: { texto: 'Activo', clase: 'bg-emerald-50 text-emerald-700' },
  BORRADOR: { texto: 'En borrador', clase: 'bg-amber-50 text-amber-700' },
  OCULTO: { texto: 'Oculto', clase: 'bg-gray-100 text-gray-500' },
};

export default function Biblioteca({ puedeEditar }: { puedeEditar: boolean }) {
  const [medios, setMedios] = React.useState<MedioResumen[] | null>(null);
  const [error, setError] = React.useState(false);
  const [filtro, setFiltro] = React.useState<Filtro>('todos');
  const [abierto, setAbierto] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);

  const leer = React.useCallback(() => cdmApi.medios().then(setMedios).catch(() => setError(true)), []);
  React.useEffect(() => {
    void leer();
  }, [leer]);

  if (cargando)
    return (
      <CargarPlanilla
        onVolver={() => setCargando(false)}
        onCargado={async nombre => {
          setCargando(false);
          const lista = await cdmApi.medios();
          setMedios(lista);
          // Después de cargar, el medio: ahí se revisa y se activa.
          setAbierto(lista.find(m => m.nombre === nombre)?.id ?? null);
        }}
      />
    );
  if (abierto)
    return (
      <Medio
        id={abierto}
        puedeEditar={puedeEditar}
        onVolver={() => {
          setAbierto(null);
          void leer();
        }}
        onCargarVersion={() => setCargando(true)}
      />
    );
  if (error) return <p className="text-[13px] text-red-600">No se pudo leer la biblioteca. Recarga la página.</p>;
  if (!medios) return <div className="h-48" />;

  const piezas = medios.reduce((s, m) => s + m.formatos, 0);
  const cuentas: Record<Filtro, number> = {
    todos: medios.length,
    activos: medios.filter(m => m.estado === 'ACTIVO').length,
    borrador: medios.filter(m => m.estado === 'BORRADOR').length,
    porConfirmar: medios.filter(m => m.porConfirmar > 0).length,
  };
  const lista = medios.filter(
    m =>
      filtro === 'todos' ||
      (filtro === 'activos' && m.estado === 'ACTIVO') ||
      (filtro === 'borrador' && m.estado === 'BORRADOR') ||
      (filtro === 'porConfirmar' && m.porConfirmar > 0)
  );

  return (
    <div className="space-y-5 pb-8">
      <div className="rounded-[10px] border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-[12.5px] text-emerald-900">
        Biblioteca de la agencia: la comparten todas las marcas. Lo que se agregue o cambie aquí queda para todas.
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-bold text-[#1D1D1F] tracking-[-0.01em]">{SCREENS.biblioteca.name}</h2>
          <p className="text-[13px] text-[#6E6E73] mt-0.5">
            {medios.length} {medios.length === 1 ? 'medio' : 'medios'} · {piezas} {piezas === 1 ? 'pieza' : 'piezas'} · la mantiene
            Planning · My Voice y Producción la heredan
          </p>
        </div>
        {puedeEditar && (
          <button
            type="button"
            onClick={() => setCargando(true)}
            className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#1D1D1F] hover:bg-[#F5F5F7]"
          >
            Cargar desde planilla
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['todos', 'Todos'],
            ['activos', 'Activos'],
            ['borrador', 'En borrador'],
            ['porConfirmar', 'Con algo por confirmar'],
          ] as [Filtro, string][]
        ).map(([id, nombre]) => (
          <button
            key={id}
            type="button"
            aria-pressed={filtro === id}
            onClick={() => setFiltro(id)}
            className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold border border-[rgba(0,0,0,0.08)] ${
              filtro === id ? 'bg-ink text-white' : 'bg-white text-[#3A3A3C] hover:bg-[#F5F5F7]'
            }`}
          >
            {nombre} · {cuentas[id]}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-white p-10 text-center text-[13px] text-[#86868B]">
          {medios.length === 0 ? 'Todavía no hay medios en la biblioteca. Planning los carga desde la planilla de cada medio.' : 'Ningún medio con ese filtro.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {lista.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setAbierto(m.id)}
              className="flex flex-col rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white p-4 text-left hover:border-[rgba(0,0,0,0.2)]"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-[13px] font-bold text-white">
                  {m.nombre[0]?.toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="text-[14px] font-bold text-[#1D1D1F]">{m.nombre}</div>
                  <div className="text-[12px] text-[#6E6E73]">
                    {m.formatos} {m.formatos === 1 ? 'pieza' : 'piezas'} · {m.ubicaciones} {m.ubicaciones === 1 ? 'ubicación' : 'ubicaciones'}
                  </div>
                </div>
              </div>
              {m.plataformas.length > 0 && <p className="mt-2 text-[12px] text-[#6E6E73] line-clamp-2">{m.plataformas.join(' · ')}</p>}
              {m.proporciones.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.proporciones.map(p => (
                    <span key={p} className="rounded bg-[#F5F5F7] px-1.5 py-0.5 text-[11px] text-[#3A3A3C]">
                      {p}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${ESTADO[m.estado].clase}`}>{ESTADO[m.estado].texto}</span>
                {m.porConfirmar > 0 && <span className="text-[11.5px] text-amber-700">{m.porConfirmar} por confirmar</span>}
                {m.sinCampos && <span className="text-[11.5px] text-[#86868B]">sin campos de texto</span>}
                <span className="ml-auto text-[12px] font-semibold text-[#047857]">Ver →</span>
              </div>
              {m.actualizado && (
                <p className="mt-1.5 text-[11px] text-[#86868B]">
                  actualizado: {m.actualizado.fuente ? `${m.actualizado.fuente} · ` : ''}
                  {fecha(m.actualizado.fecha)}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** B2: el medio por pieza a producir, cada una con sus ubicaciones y sus campos de texto. */
function Medio({
  id,
  puedeEditar,
  onVolver,
  onCargarVersion,
}: {
  id: string;
  puedeEditar: boolean;
  onVolver: () => void;
  onCargarVersion: () => void;
}) {
  const [medio, setMedio] = React.useState<MedioDetalle | null>(null);
  const [error, setError] = React.useState(false);
  const [guia, setGuia] = React.useState(false);
  const [aviso, setAviso] = React.useState<string | null>(null);
  React.useEffect(() => {
    cdmApi.medio(id).then(setMedio).catch(() => setError(true));
  }, [id]);

  if (error) return <p className="text-[13px] text-red-600">No se pudo leer el medio.</p>;
  if (!medio) return <div className="h-48" />;
  if (guia) return <GuiaVisual medio={medio} onVolver={() => setGuia(false)} />;

  const cambiarEstado = async (estado: MedioDetalle['estado']) => {
    setAviso(null);
    try {
      await cdmApi.cambiarEstado(medio.id, estado);
      setMedio({ ...medio, estado });
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
    }
  };

  const ubicaciones = medio.formatos.reduce((s, f) => s + f.ubicaciones.length, 0);
  const porConfirmar = medio.formatos.reduce((s, f) => s + f.ubicaciones.filter(u => u.porConfirmar).length, 0);
  const plataformas = [...new Set(medio.formatos.flatMap(f => f.ubicaciones.map(u => u.plataforma)))];
  const fuente = medio.formatos.find(f => f.fuente);

  return (
    <div className="space-y-5 pb-8">
      <button type="button" onClick={onVolver} className="inline-flex items-center gap-1 text-[12.5px] text-[#6E6E73] hover:text-[#1D1D1F]">
        <ArrowLeft className="h-3.5 w-3.5" /> {SCREENS.biblioteca.name}
      </button>
      <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-[22px] font-bold text-[#1D1D1F] tracking-[-0.01em]">{medio.nombre}</h2>
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${ESTADO[medio.estado].clase}`}>{ESTADO[medio.estado].texto}</span>
        </div>
        <p className="text-[13px] text-[#6E6E73] mt-0.5">
          {plataformas.join(' · ')} · {ubicaciones} {ubicaciones === 1 ? 'ubicación' : 'ubicaciones'} en {medio.formatos.length}{' '}
          {medio.formatos.length === 1 ? 'pieza' : 'piezas'}
          {fuente?.fuenteFecha ? ` · ${fuente.fuente ?? 'guía'}, ${fecha(fuente.fuenteFecha)}` : ''}
        </p>
        {porConfirmar > 0 && (
          <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" /> {porConfirmar} {porConfirmar === 1 ? 'ubicación' : 'ubicaciones'} por confirmar: la guía
            se contradice; se pueden usar, y el planning lo avisa.
          </p>
        )}
      </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setGuia(true)}
            className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#1D1D1F] hover:bg-[#F5F5F7]"
          >
            Guía para Diseño
          </button>
          {puedeEditar && (
            <button
              type="button"
              onClick={onCargarVersion}
              className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#1D1D1F] hover:bg-[#F5F5F7]"
            >
              Cargar versión nueva
            </button>
          )}
          {puedeEditar && medio.estado !== 'ACTIVO' && (
            <button
              type="button"
              onClick={() => void cambiarEstado('ACTIVO')}
              className="rounded-lg bg-[#047857] px-3 py-1.5 text-[12.5px] font-semibold text-white"
            >
              Activar {medio.nombre}
            </button>
          )}
          {puedeEditar && medio.estado === 'ACTIVO' && (
            <button
              type="button"
              onClick={() => void cambiarEstado('OCULTO')}
              className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-1.5 text-[12.5px] text-[#6E6E73] hover:bg-[#F5F5F7]"
            >
              Ocultar
            </button>
          )}
        </div>
      </div>
      {aviso && <p className="text-[12.5px] text-red-600">{aviso}</p>}
      {medio.estado === 'BORRADOR' && (
        <p className="text-[12.5px] text-[#6E6E73]">En borrador: todavía no se puede elegir en un planning. Revísalo y actívalo.</p>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {medio.formatos.map(f => {
          const zona = f.guia?.zonaSegura;
          const pendientes = f.ubicaciones.filter(u => u.porConfirmar).length;
          return (
            <section key={f.id} className="rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-[15px] font-bold text-[#1D1D1F]">{f.nombre}</h3>
                  <p className="text-[12px] text-[#6E6E73]">
                    {f.anchoPx && f.altoPx ? `${miles(f.anchoPx)} × ${miles(f.altoPx)} · ` : ''}
                    {f.ubicaciones.length} {f.ubicaciones.length === 1 ? 'ubicación' : 'ubicaciones'} · versión {f.version}
                  </p>
                </div>
                {pendientes > 0 && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">{pendientes} por confirmar</span>}
              </div>
              <ul className="mt-2 space-y-0.5">
                {f.ubicaciones.map(u => (
                  <li key={u.id} className="flex items-center gap-1.5 text-[12px] text-[#3A3A3C]" title={u.alertaTexto ?? undefined}>
                    {u.porConfirmar && <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />}
                    <span className="truncate">{u.nombre}</span>
                  </li>
                ))}
              </ul>
              {f.campos.length > 0 && (
                <div className="mt-3 border-t border-[rgba(0,0,0,0.06)] pt-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868B]">Campos de texto · de la plataforma</div>
                  <ul className="mt-1 space-y-1">
                    {f.campos.map(c => (
                      <li key={c.clave} className="text-[12px]">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[#3A3A3C]">{c.nombre}</span>
                          <span className="font-semibold text-[#1D1D1F] tabular-nums">
                            {c.desde == null ? '—' : c.desde === c.hasta ? c.hasta : `${c.desde} a ${c.hasta}`}
                          </span>
                        </div>
                        {c.masCortoEn && <div className="text-[11px] text-[#86868B]">más corto en {c.masCortoEn}</div>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-2 text-[11.5px] text-[#86868B]">
                {[f.archivos, f.pesoMaximo].filter(Boolean).join(' · ')}
                {zona ? ` · Zona segura ${zona.superior ?? '–'} % · ${zona.inferior ?? '–'} % · ${zona.lados ?? '–'} %` : ''}
              </p>
            </section>
          );
        })}
      </div>
    </div>
  );
}
