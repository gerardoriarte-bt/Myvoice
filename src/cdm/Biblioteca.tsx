import React from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, Circle, MessageSquareWarning } from 'lucide-react';
import { SCREENS } from '../../screens';
import { cdmApi } from '../../services/api';
import type { MedioDetalle, MedioResumen, RevisionDeUbicacion } from '../../types';
import CargarPlanilla from './CargarPlanilla';
import GuiaVisual from './GuiaVisual';
import { CLASES, ClaseDeMedio, nombreDeClase } from './clases';

/**
 * La biblioteca de medios de la agencia (F2b; en el `.pen`, B1 el catálogo y B2 un medio por pieza).
 * Abre con los medios, no con todos los formatos sueltos: una tarjeta por medio, y al abrirlo, sus piezas
 * maestras (decisión 18). La ve cualquiera; Planning (o un admin) carga planillas y activa los medios.
 */

/** Por clase (decisión 29): «Todos» las muestra en secciones, una por clase. */
type Filtro = 'todos' | ClaseDeMedio;

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
  const deClase = (c: ClaseDeMedio) => medios.filter(m => m.clase === c);
  const secciones = CLASES.filter(c => filtro === 'todos' || filtro === c.id).map(c => ({ ...c, medios: deClase(c.id) }));
  const tarjeta = (m: MedioResumen) => (
    <button
      key={m.id}
      type="button"
      onClick={() => setAbierto(m.id)}
      className="flex flex-col rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white p-4 text-left hover:border-[rgba(0,0,0,0.2)]"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-[13px] font-bold text-white">{m.nombre[0]?.toUpperCase()}</span>
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-[#1D1D1F]">{m.nombre}</div>
          <div className="text-[12px] text-[#6E6E73]">
            {m.formatos} {m.formatos === 1 ? 'pieza' : 'piezas'}
            {m.ubicaciones > 0 ? ` · ${m.ubicaciones} ${m.ubicaciones === 1 ? 'ubicación' : 'ubicaciones'}` : ''}
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
        {m.conObservacion > 0 && <span className="text-[11.5px] text-red-700">{m.conObservacion} con algo mal</span>}
        {m.sinValidar > 0 && <span className="text-[11.5px] text-[#86868B]">{m.sinValidar} sin validar</span>}
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
            Planning · Copywriting y Producción la heredan
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
        {([['todos', 'Todos', medios.length], ...CLASES.map(c => [c.id, c.nombre, deClase(c.id).length])] as [Filtro, string, number][]).map(
          ([id, nombre, n]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filtro === id}
              onClick={() => setFiltro(id)}
              className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold border border-[rgba(0,0,0,0.08)] ${
                filtro === id ? 'bg-ink text-white' : 'bg-white text-[#3A3A3C] hover:bg-[#F5F5F7]'
              }`}
            >
              {nombre} · {n}
            </button>
          )
        )}
      </div>

      {medios.length === 0 ? (
        <div className="rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-white p-10 text-center text-[13px] text-[#86868B]">
          Todavía no hay medios en la biblioteca. Planning los carga desde la planilla de cada medio.
        </div>
      ) : (
        secciones.map(c =>
          c.medios.length === 0 && filtro === 'todos' ? null : (
            <section key={c.id} className="space-y-2">
              <h3 className="text-[13px] font-bold text-[#1D1D1F]">
                {c.nombre} <span className="font-normal text-[#86868B]">· al final, {c.alFinal}</span>
              </h3>
              {c.medios.length === 0 ? (
                <p className="text-[12.5px] text-[#86868B]">Ningún medio de esta clase todavía.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">{c.medios.map(tarjeta)}</div>
              )}
            </section>
          )
        )
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
  const [soloPendientes, setSoloPendientes] = React.useState(false);
  const [aviso, setAviso] = React.useState<string | null>(null);
  React.useEffect(() => {
    cdmApi.medio(id).then(setMedio).catch(() => setError(true));
  }, [id]);

  if (error) return <p className="text-[13px] text-red-600">No se pudo leer el medio.</p>;
  if (!medio) return <div className="h-48" />;
  if (guia) return <GuiaVisual medio={medio} onVolver={() => setGuia(false)} />;

  const cambiarClase = async (clase: ClaseDeMedio) => {
    setAviso(null);
    try {
      await cdmApi.cambiarClase(medio.id, clase);
      setMedio({ ...medio, clase });
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'No se pudo cambiar la clase');
    }
  };

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
  const todas = medio.formatos.flatMap(f => f.ubicaciones);
  const validadas = todas.filter(u => u.revision?.estado === 'VALIDADA').length;
  const conObservacion = todas.filter(u => u.revision?.estado === 'CON_OBSERVACION').length;
  // La respuesta de revisar una ubicación se aplica aquí, sin volver a leer el medio.
  const alRevisar = (id: string, revision: Revision) =>
    setMedio({ ...medio, formatos: medio.formatos.map(f => ({ ...f, ubicaciones: f.ubicaciones.map(u => (u.id === id ? { ...u, revision } : u)) })) });
  const visibles = (f: MedioDetalle['formatos'][number]) => (soloPendientes ? f.ubicaciones.filter(u => u.revision?.estado !== 'VALIDADA') : f.ubicaciones);
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
          {puedeEditar ? (
            <select
              aria-label="Clase del medio"
              value={medio.clase}
              onChange={e => void cambiarClase(e.target.value as ClaseDeMedio)}
              className="rounded-md border border-[rgba(0,0,0,0.12)] bg-white px-1.5 py-0.5 text-[12px] text-[#3A3A3C]"
            >
              {CLASES.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          ) : (
            <span className="rounded bg-[#F5F5F7] px-1.5 py-0.5 text-[11px] text-[#3A3A3C]">{nombreDeClase(medio.clase)}</span>
          )}
        </div>
        <p className="text-[13px] text-[#6E6E73] mt-0.5">
          {ubicaciones > 0
            ? `${plataformas.join(' · ')} · ${ubicaciones} ${ubicaciones === 1 ? 'ubicación' : 'ubicaciones'} en ${medio.formatos.length} ${
                medio.formatos.length === 1 ? 'pieza' : 'piezas'
              }`
            : `${medio.formatos.length} ${medio.formatos.length === 1 ? 'formato' : 'formatos'}`}
          {fuente?.fuenteFecha ? ` · ${fuente.fuente ?? 'guía'}, ${fecha(fuente.fuenteFecha)}` : ''}
        </p>
        {todas.length > 0 && (
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
            <span className={validadas === todas.length ? 'text-emerald-700' : 'text-[#3A3A3C]'}>
              {validadas} de {todas.length} ubicaciones validadas
            </span>
            {conObservacion > 0 && <span className="text-red-700">{conObservacion} con algo mal</span>}
            {validadas < todas.length && (
              <label className="inline-flex items-center gap-1 text-[#6E6E73]">
                <input type="checkbox" checked={soloPendientes} onChange={e => setSoloPendientes(e.target.checked)} /> Solo lo que falta
              </label>
            )}
          </p>
        )}
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
          {/* Los canales de My Voice no vienen de una planilla: se actualizan con `npm run cdm:canales`. */}
          {puedeEditar && medio.formatos.some(f => !f.canal) && (
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
        {medio.formatos.filter(f => !soloPendientes || visibles(f).length > 0).map(f => {
          const zona = f.guia?.zonaSegura;
          const pendientes = f.ubicaciones.filter(u => u.porConfirmar).length;
          return (
            <section key={f.id} className="rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-[15px] font-bold text-[#1D1D1F]">{f.nombre}</h3>
                  <p className="text-[12px] text-[#6E6E73]">
                    {f.guia?.medidas?.length
                      ? `${f.guia.medidas.join(' · ')} · `
                      : f.anchoPx && f.altoPx
                        ? `${miles(f.anchoPx)} × ${miles(f.altoPx)} · `
                        : ''}
                    {f.ubicaciones.length > 0 ? `${f.ubicaciones.length} ${f.ubicaciones.length === 1 ? 'ubicación' : 'ubicaciones'} · ` : ''}
                    versión {f.version}
                  </p>
                </div>
                {pendientes > 0 && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">{pendientes} por confirmar</span>}
              </div>
              <ul className="mt-2 space-y-0.5">
                {visibles(f).map(u => (
                  <UbicacionRevisable key={u.id} u={u} puedeEditar={puedeEditar} onRevisada={r => alRevisar(u.id, r)} />
                ))}
              </ul>
              {(['PIEZA', 'PLATAFORMA'] as const).map(zonaDeCampo => {
                const deZona = f.campos.filter(c => (zonaDeCampo === 'PIEZA' ? c.zona === 'PIEZA' : c.zona !== 'PIEZA'));
                if (!deZona.length) return null;
                return (
                <div key={zonaDeCampo} className="mt-3 border-t border-[rgba(0,0,0,0.06)] pt-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868B]">
                    Campos de texto · {zonaDeCampo === 'PIEZA' ? 'en la pieza' : 'de la plataforma'}
                  </div>
                  <ul className="mt-1 space-y-1">
                    {deZona.map(c => (
                      <li key={c.clave} className="text-[12px]">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[#3A3A3C]">
                            {c.repeticiones > 1 ? `${c.repeticiones} × ` : ''}
                            {c.nombre}
                          </span>
                          <span className="font-semibold text-[#1D1D1F] tabular-nums">
                            {c.desde == null ? '—' : c.desde === c.hasta ? c.hasta : `${c.desde} a ${c.hasta}`}
                          </span>
                        </div>
                        {c.masCortoEn && <div className="text-[11px] text-[#86868B]">más corto en {c.masCortoEn}</div>}
                      </li>
                    ))}
                  </ul>
                </div>
                );
              })}
              {f.camposDelFormato.length > 0 && <CamposDelFormato campos={f.camposDelFormato} />}
              {f.canal && <p className="mt-2 text-[11px] text-[#86868B]">Lo escribe Copywriting como «{f.canal}».</p>}
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

const ZONAS: { id: MedioDetalle['formatos'][number]['camposDelFormato'][number]['zona']; nombre: string }[] = [
  { id: 'PIEZA', nombre: 'En la pieza' },
  { id: 'PLATAFORMA', nombre: 'En la plataforma' },
  { id: 'INDICACION', nombre: 'Para Diseño · no se publica' },
];

/** Los campos de un formato de My Voice (B6): dónde va cada texto, su largo y cuántos lleva la pieza. */
function CamposDelFormato({ campos }: { campos: MedioDetalle['formatos'][number]['camposDelFormato'] }) {
  return (
    <div className="mt-3 space-y-2 border-t border-[rgba(0,0,0,0.06)] pt-2">
      {ZONAS.map(z => {
        const deZona = campos.filter(c => c.zona === z.id);
        if (!deZona.length) return null;
        return (
          <div key={z.id}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868B]">{z.nombre}</div>
            <ul className="mt-1 space-y-0.5">
              {deZona.map(c => (
                <li key={c.clave} className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="text-[#3A3A3C]">
                    {c.repeticiones > 1 ? `${c.repeticiones} × ` : ''}
                    {c.nombre}
                  </span>
                  <span className="font-semibold text-[#1D1D1F] tabular-nums">
                    {c.maximo == null ? '—' : c.minimo != null ? `${c.minimo} a ${c.maximo}` : c.maximo}
                    {c.maximo != null && c.unidad === 'palabras' ? ' palabras' : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

type Ubicacion = MedioDetalle['formatos'][number]['ubicaciones'][number];
type Revision = Ubicacion['revision'];

const DETALLE: [string, string][] = [
  ['archivos', 'Archivo'],
  ['peso', 'Peso'],
  ['duracion', 'Duración'],
  ['anchoMinimo', 'Ancho mínimo'],
  ['altoMinimo', 'Alto mínimo'],
  ['tolerancia', 'Tolerancia'],
  ['video', 'Video'],
  ['subtitulos', 'Subtítulos'],
  ['sonido', 'Sonido'],
  ['otras', 'Otras'],
];

/**
 * Una ubicación que el equipo valida en la herramienta (2026-11-25): al abrirla muestra lo que dice la guía —medidas,
 * archivo, duración y sus textos— y se marca «Está bien» o «Algo está mal» con una nota. Hecho sin el `.pen`.
 */
function UbicacionRevisable({ u, puedeEditar, onRevisada }: { u: Ubicacion; puedeEditar: boolean; onRevisada: (r: Revision) => void }) {
  const [abierta, setAbierta] = React.useState(false);
  const [nota, setNota] = React.useState<string | null>(null);
  const [ocupado, setOcupado] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const estado = u.revision?.estado;

  const revisar = async (revision: RevisionDeUbicacion | null, texto?: string) => {
    setOcupado(true);
    setError(null);
    try {
      await cdmApi.revisarUbicacion(u.id, revision, texto);
      onRevisada(revision ? { estado: revision, nota: texto ?? null, por: 'Tú', en: new Date().toISOString() } : null);
      setNota(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setOcupado(false);
    }
  };

  const filas = [
    ['Proporción', u.proporcion],
    ['Medidas', u.resolucion],
    ...DETALLE.map(([k, nombre]) => [nombre, u.detalles?.[k] ?? null]),
  ].filter((f): f is [string, string] => Boolean(f[1]));

  return (
    <li className="text-[12px] text-[#3A3A3C]">
      <button type="button" onClick={() => setAbierta(!abierta)} className="flex w-full items-center gap-1.5 text-left hover:text-[#1D1D1F]" title={u.alertaTexto ?? undefined}>
        {estado === 'VALIDADA' ? (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="Validada" />
        ) : estado === 'CON_OBSERVACION' ? (
          <MessageSquareWarning className="h-3.5 w-3.5 shrink-0 text-red-600" aria-label="Algo está mal" />
        ) : (
          <Circle className="h-3.5 w-3.5 shrink-0 text-[#C7C7CC]" aria-label="Sin validar" />
        )}
        {u.porConfirmar && <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />}
        <span className="min-w-0 flex-1 truncate">{u.nombre}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 text-[#86868B] transition-transform ${abierta ? 'rotate-180' : ''}`} />
      </button>
      {abierta && (
        <div className="mb-2 ml-5 mt-1 space-y-2 rounded-lg bg-[#F5F5F7] p-2.5">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11.5px]">
            <dt className="text-[#86868B]">Plataforma</dt>
            <dd>{u.plataforma}</dd>
            {filas.map(([k, v]) => (
              <React.Fragment key={k}>
                <dt className="text-[#86868B]">{k}</dt>
                <dd>{v}</dd>
              </React.Fragment>
            ))}
            {u.campos.length > 0 && (
              <>
                <dt className="text-[#86868B]">Textos</dt>
                <dd>{u.campos.map(c => `${c.repeticiones > 1 ? `${c.repeticiones} × ` : ''}${c.nombre} ${c.maximo ?? '—'}`).join(' · ')}</dd>
              </>
            )}
          </dl>
          {u.alertaTexto && <p className="text-[11.5px] text-amber-700">{u.alertaTexto}</p>}
          {u.urlFuente && (
            <a href={u.urlFuente} target="_blank" rel="noreferrer" className="text-[11.5px] text-[#0071E3] hover:underline">
              Ver la guía de la plataforma
            </a>
          )}
          {u.revision && (
            <p className={`text-[11.5px] ${estado === 'VALIDADA' ? 'text-emerald-700' : 'text-red-700'}`}>
              {estado === 'VALIDADA' ? 'Validada' : `Algo está mal: ${u.revision.nota}`}
              {u.revision.por ? ` · ${u.revision.por}` : ''}
              {u.revision.en ? `, ${fecha(u.revision.en)}` : ''}
            </p>
          )}
          {puedeEditar &&
            (nota !== null ? (
              <div className="space-y-1.5">
                <textarea
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  rows={2}
                  autoFocus
                  placeholder="Qué está mal y cómo es en realidad: «el título es de 30, no de 40»"
                  className="w-full rounded-md border border-[rgba(0,0,0,0.12)] bg-white px-2 py-1 text-[12px]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={ocupado || !nota.trim()}
                    onClick={() => void revisar('CON_OBSERVACION', nota.trim())}
                    className="rounded-md bg-red-600 px-2.5 py-1 text-[11.5px] font-semibold text-white disabled:opacity-40"
                  >
                    Guardar
                  </button>
                  <button type="button" onClick={() => setNota(null)} className="rounded-md px-2 py-1 text-[11.5px] text-[#6E6E73] hover:bg-white">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {estado !== 'VALIDADA' && (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => void revisar('VALIDADA')}
                    className="rounded-md bg-[#047857] px-2.5 py-1 text-[11.5px] font-semibold text-white disabled:opacity-40"
                  >
                    Está bien
                  </button>
                )}
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => setNota(u.revision?.nota ?? '')}
                  className="rounded-md border border-[rgba(0,0,0,0.12)] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#1D1D1F] disabled:opacity-40"
                >
                  Algo está mal
                </button>
                {u.revision && (
                  <button type="button" disabled={ocupado} onClick={() => void revisar(null)} className="px-1 text-[11.5px] text-[#6E6E73] hover:underline">
                    Deshacer
                  </button>
                )}
              </div>
            ))}
          {error && <p className="text-[11.5px] text-red-600">{error}</p>}
        </div>
      )}
    </li>
  );
}
