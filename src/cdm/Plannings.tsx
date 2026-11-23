import QuienesAprueban from '../comun/QuienesAprueban';
import React from 'react';
import { ArrowLeft, Check, Minus, Plus } from 'lucide-react';
import { SCREENS } from '../../screens';
import { cdmApi, libraryApi } from '../../services/api';
import type { EtapaDeFunnel, MedioDetalle, MedioResumen, PlanningDetalle, PlanningResumen, Project } from '../../types';
import { nombreDeClase } from './clases';

/**
 * Los plannings de la marca (F3; en el `.pen`, P1 a P5). P1 lista lo que pide atención; un planning se arma en
 * cuatro pasos —datos, medios, sábana, aprobación—, siempre sobre una campaña que ya existe (decisión 24).
 * Una línea es un formato en una etapa, con sus piezas (decisión 19). Lo aprueba el responsable de la campaña.
 */

export const ETAPAS: { id: EtapaDeFunnel; nombre: string }[] = [
  { id: 'RECONOCIMIENTO', nombre: 'Reconocimiento' },
  { id: 'CONSIDERACION', nombre: 'Consideración' },
  { id: 'CONVERSION', nombre: 'Conversión' },
  { id: 'RETENCION', nombre: 'Retención' },
];

/** «Laura», «Laura o Gerardo»: quienes pueden decidir (decisión 30). */
const nombres = (ps: { name: string }[]) =>
  ps.length === 0 ? 'el responsable' : ps.length === 1 ? ps[0].name : `${ps.slice(0, -1).map(x => x.name).join(', ')} o ${ps[ps.length - 1].name}`;
const nombreEtapa = (e: EtapaDeFunnel) => ETAPAS.find(x => x.id === e)?.nombre ?? e;

const dia = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '');
const rango = (desde: string | null, hasta: string | null) => (desde || hasta ? `${dia(desde)} a ${dia(hasta)}` : 'sin fechas');
const soloFecha = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const contar = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

const boton = 'rounded-lg px-3.5 py-2 text-[12.5px] font-semibold disabled:opacity-40';
const primario = `${boton} bg-[#047857] text-white`;
const secundario = `${boton} border border-[rgba(0,0,0,0.12)] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]`;

interface Props {
  marcaId: string;
  marcaNombre: string;
  /** La campaña del encabezado: «Nuevo planning» la propone, y si ya tiene planning, se abre el suyo. */
  campanaId: string | null;
  onAviso: (mensaje: string) => void;
}

export default function Plannings({ marcaId, marcaNombre, campanaId, onAviso }: Props) {
  const [lista, setLista] = React.useState<PlanningResumen[] | null>(null);
  const [abierto, setAbierto] = React.useState<string | null>(null);
  const [nuevo, setNuevo] = React.useState(false);

  const leer = React.useCallback(() => {
    if (!marcaId) return;
    cdmApi.plannings(marcaId).then(setLista).catch(() => setLista([]));
  }, [marcaId]);
  React.useEffect(() => {
    setAbierto(null);
    setNuevo(false);
    leer();
  }, [leer]);
  // Con una campaña elegida arriba, su planning se abre solo.
  React.useEffect(() => {
    if (!campanaId || !lista) return;
    const suyo = lista.find(p => p.campana.id === campanaId);
    if (suyo) setAbierto(suyo.id);
  }, [campanaId, lista]);

  // Estable entre renders: el formulario de «Nuevo» pide las campañas cada vez que cambia.
  const conPlanning = React.useMemo(() => new Set((lista ?? []).map(p => p.campana.id)), [lista]);

  if (abierto)
    return (
      <Planning
        id={abierto}
        onVolver={() => {
          setAbierto(null);
          leer();
        }}
        onAviso={onAviso}
      />
    );
  if (nuevo)
    return (
      <NuevoPlanning
        marcaId={marcaId}
        marcaNombre={marcaNombre}
        campanaId={campanaId}
        conPlanning={conPlanning}
        onVolver={() => setNuevo(false)}
        onCreado={id => {
          setNuevo(false);
          setAbierto(id);
          leer();
        }}
      />
    );
  if (!lista) return <div className="h-48" />;

  const grupos: { titulo: string; estados: PlanningResumen['estado'][] }[] = [
    { titulo: 'Por aprobar', estados: ['POR_APROBAR', 'CON_EL_CLIENTE'] },
    { titulo: 'Sin enviar', estados: ['EN_ARMADO', 'DEVUELTO'] },
    { titulo: 'Aprobados', estados: ['APROBADO'] },
  ];

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-bold text-[#1D1D1F] tracking-[-0.01em]">
            {SCREENS.plannings.name} de {marcaNombre}
          </h2>
          <p className="text-[13px] text-[#6E6E73] mt-0.5">{SCREENS.plannings.description}</p>
        </div>
        <button type="button" onClick={() => setNuevo(true)} className={primario}>
          + Nuevo planning
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-white p-10 text-center text-[13px] text-[#86868B]">
          Todavía no hay plannings en {marcaNombre}. Cada campaña tiene el suyo: empieza con «Nuevo planning».
        </div>
      ) : (
        grupos.map(g => {
          const de = lista.filter(p => g.estados.includes(p.estado));
          if (!de.length) return null;
          return (
            <section key={g.titulo} className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868B]">
                {g.titulo} · {de.length}
              </h3>
              {de.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setAbierto(p.id)}
                  className="flex w-full flex-wrap items-center gap-3 rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3 text-left hover:border-[rgba(0,0,0,0.2)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold text-[#1D1D1F]">{p.campana.nombre}</div>
                    <div className="text-[12px] text-[#6E6E73]">
                      {p.medios} {p.medios === 1 ? 'medio' : 'medios'} · {p.formatos} {p.formatos === 1 ? 'formato' : 'formatos'} · {p.piezas}{' '}
                      {p.piezas === 1 ? 'pieza' : 'piezas'} · {rango(p.desde, p.hasta)}
                    </div>
                    {p.estado === 'DEVUELTO' && p.ultimo?.comentario && (
                      <div className="mt-0.5 text-[12px] text-amber-700">Devuelto: «{p.ultimo.comentario}»</div>
                    )}
                  </div>
                  {p.estado === 'POR_APROBAR' && <span className="text-[12px] text-[#3A3A3C]">Espera a {nombres(p.aprueban)}</span>}
                  {p.estado === 'CON_EL_CLIENTE' && <span className="text-[12px] text-[#3A3A3C]">Con el cliente</span>}
                  <span className="text-[12px] font-semibold text-[#047857]">{p.estado === 'APROBADO' ? 'Abrir' : 'Seguir'} →</span>
                </button>
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}

/** P2 · Nuevo planning: la campaña (que ya existe), las fechas y las etapas. No pide nombre. */
function NuevoPlanning({
  marcaId,
  marcaNombre,
  campanaId,
  conPlanning,
  onVolver,
  onCreado,
}: {
  marcaId: string;
  marcaNombre: string;
  campanaId: string | null;
  conPlanning: Set<string>;
  onVolver: () => void;
  onCreado: (id: string) => void;
}) {
  const [campanas, setCampanas] = React.useState<Project[] | null>(null);
  const [campana, setCampana] = React.useState(campanaId ?? '');
  const [desde, setDesde] = React.useState('');
  const [hasta, setHasta] = React.useState('');
  const [etapas, setEtapas] = React.useState<EtapaDeFunnel[]>(['RECONOCIMIENTO', 'CONSIDERACION']);
  const [error, setError] = React.useState<string | null>(null);
  const [ocupado, setOcupado] = React.useState(false);

  React.useEffect(() => {
    libraryApi
      .listProjects(marcaId)
      .then((l: Project[]) => setCampanas(l.filter(c => c.clientId === marcaId && !conPlanning.has(c.id))))
      .catch(() => setCampanas([]));
  }, [marcaId, conPlanning]);

  const elegida = campanas?.find(c => c.id === campana);
  const crear = async () => {
    setOcupado(true);
    setError(null);
    try {
      const r = await cdmApi.crearPlanning({ campanaId: campana, desde: desde || null, hasta: hasta || null, etapas });
      onCreado(r.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el planning');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <button type="button" onClick={onVolver} className="inline-flex items-center gap-1 text-[12.5px] text-[#6E6E73] hover:text-[#1D1D1F]">
        <ArrowLeft className="h-3.5 w-3.5" /> {SCREENS.plannings.name}
      </button>
      <Pasos actual={0} />
      <h2 className="text-[22px] font-bold text-[#1D1D1F]">Nuevo planning</h2>
      <section className="max-w-[640px] space-y-4 rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white p-5">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868B]">Campaña</span>
          <select
            value={campana}
            onChange={e => setCampana(e.target.value)}
            className="mt-1 w-full rounded-md border border-[rgba(0,0,0,0.12)] bg-white px-2.5 py-2 text-[13px]"
          >
            <option value="">Elige una campaña de {marcaNombre}</option>
            {(campanas ?? []).map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11.5px] text-[#86868B]">
            El planning se hace sobre una campaña que ya existe. Las que ya tienen planning no aparecen.
          </span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868B]">Desde</span>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="mt-1 w-full rounded-md border border-[rgba(0,0,0,0.12)] px-2.5 py-2 text-[13px]" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868B]">Hasta</span>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="mt-1 w-full rounded-md border border-[rgba(0,0,0,0.12)] px-2.5 py-2 text-[13px]" />
          </label>
        </div>
        <SelectorDeEtapas etapas={etapas} onCambio={setEtapas} />
        {elegida && (
          <p className="text-[12.5px] text-[#3A3A3C]">
            La sábana la aprueba <strong>{elegida.responsable?.name ?? 'el responsable de la campaña'}</strong>
            {elegida.modoAprobacion === 'CLIENTE' ? '; después el cliente, por enlace.' : '.'}
            {!elegida.responsable && <span className="text-amber-700"> La campaña todavía no tiene responsable: asígnalo en Copy antes de enviar.</span>}
          </p>
        )}
        {error && <p className="text-[12.5px] text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onVolver} className={secundario}>
            Cancelar
          </button>
          <button type="button" disabled={!campana || !etapas.length || ocupado} onClick={() => void crear()} className={primario}>
            Seguir: elegir medios
          </button>
        </div>
      </section>
    </div>
  );
}

function SelectorDeEtapas({ etapas, onCambio, deshabilitado }: { etapas: EtapaDeFunnel[]; onCambio: (e: EtapaDeFunnel[]) => void; deshabilitado?: boolean }) {
  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868B]">Etapas del funnel</span>
      <div className="mt-1 flex flex-wrap gap-2">
        {ETAPAS.map(e => {
          const on = etapas.includes(e.id);
          return (
            <button
              key={e.id}
              type="button"
              disabled={deshabilitado}
              aria-pressed={on}
              onClick={() => onCambio(on ? etapas.filter(x => x !== e.id) : ETAPAS.map(x => x.id).filter(x => x === e.id || etapas.includes(x)))}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${
                on ? 'border-[#047857] bg-emerald-50 text-[#047857]' : 'border-[rgba(0,0,0,0.12)] bg-white text-[#6E6E73]'
              } disabled:opacity-60`}
            >
              {on && <Check className="h-3 w-3" />} {e.nombre}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const PASOS_DEL_PLANNING = ['Datos', 'Medios', 'Sábana', 'Aprobación'];

function Pasos({ actual }: { actual: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-[12px]">
      {PASOS_DEL_PLANNING.map((p, i) => (
        <li key={p} className={`flex items-center gap-1.5 ${i === actual ? 'font-semibold text-[#1D1D1F]' : i < actual ? 'text-[#047857]' : 'text-[#86868B]'}`}>
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${i <= actual ? 'bg-[#047857] text-white' : 'bg-[#F2F2F7]'}`}>
            {i < actual ? <Check className="h-3 w-3" /> : i + 1}
          </span>
          {p}
          {i < PASOS_DEL_PLANNING.length - 1 && <span className="text-[#C7C7CC]">›</span>}
        </li>
      ))}
    </ol>
  );
}

type Vista = 'medios' | 'sabana';

/** Un planning: P3 (medios), P4 (sábana) y P5 (aprobar), según su estado y quién mira. */
function Planning({ id, onVolver, onAviso }: { id: string; onVolver: () => void; onAviso: (m: string) => void }) {
  const [p, setP] = React.useState<PlanningDetalle | null>(null);
  const [vista, setVista] = React.useState<Vista>('sabana');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    cdmApi
      .planning(id)
      .then(d => {
        setP(d);
        // Recién creado, sin líneas: se empieza eligiendo medios.
        setVista(d.lineas.length === 0 && d.puedo.editar ? 'medios' : 'sabana');
      })
      .catch(() => setError('No se pudo leer el planning'));
  }, [id]);

  const hacer = async (accion: () => Promise<PlanningDetalle>, aviso?: string) => {
    setError(null);
    try {
      setP(await accion());
      if (aviso) onAviso(aviso);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  };

  if (!p) return error ? <p className="text-[13px] text-red-600">{error}</p> : <div className="h-48" />;

  const paso = p.estado === 'APROBADO' || p.estado === 'POR_APROBAR' || p.estado === 'CON_EL_CLIENTE' ? 3 : vista === 'medios' ? 1 : 2;
  const devuelto = p.estado === 'DEVUELTO' ? p.eventos.find(e => e.tipo === 'DEVUELTO' || e.tipo === 'DEVUELTO_POR_CLIENTE') : null;

  return (
    <div className="space-y-5 pb-8">
      <button type="button" onClick={onVolver} className="inline-flex items-center gap-1 text-[12.5px] text-[#6E6E73] hover:text-[#1D1D1F]">
        <ArrowLeft className="h-3.5 w-3.5" /> {SCREENS.plannings.name}
      </button>
      <Pasos actual={paso} />
      <div>
        <h2 className="text-[22px] font-bold text-[#1D1D1F]">{p.campana.nombre}</h2>
        <p className="text-[13px] text-[#6E6E73] mt-0.5">
          {p.etapas.map(nombreEtapa).join(' y ')} · {rango(p.desde, p.hasta)} · versión {p.version}
        </p>
      </div>
      {devuelto && (
        <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12.5px] text-amber-900">
          {devuelto.tipo === 'DEVUELTO_POR_CLIENTE'
            ? `El cliente la devolvió (${devuelto.comentario}).`
            : `${devuelto.autor ?? 'El responsable'} la devolvió: «${devuelto.comentario}».`}{' '}
          Ajústala y vuelve a enviarla.
        </div>
      )}
      {error && <p className="text-[12.5px] text-red-600">{error}</p>}

      {vista === 'medios' && p.puedo.editar ? (
        <ElegirMedios
          planning={p}
          onDatos={datos => hacer(() => cdmApi.actualizarPlanning(p.id, datos))}
          onGuardar={async lineas => {
            await hacer(() => cdmApi.guardarLineas(p.id, lineas));
            setVista('sabana');
          }}
        />
      ) : (
        <Sabana
          planning={p}
          onMedios={() => setVista('medios')}
          onEnviar={() => hacer(() => cdmApi.enviarPlanning(p.id), `Enviada a ${nombres(p.aprueban)}`)}
          onAprobar={comentario => hacer(() => cdmApi.aprobarPlanning(p.id, comentario), 'Sábana aprobada')}
          onDevolver={comentario => hacer(() => cdmApi.devolverPlanning(p.id, comentario), 'Sábana devuelta con tu comentario')}
          onReabrir={() => hacer(() => cdmApi.reabrirPlanning(p.id))}
          onUbicaciones={(lineaId, ids) => hacer(() => cdmApi.elegirUbicaciones(p.id, lineaId, ids))}
          onEnlace={async () => {
            setError(null);
            try {
              const e = await cdmApi.enlaceCliente(p.id);
              setP({ ...p, enlace: e });
              await navigator.clipboard?.writeText(e.url).catch(() => undefined);
              onAviso('Enlace copiado: compártelo con el cliente');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'No se pudo crear el enlace');
            }
          }}
        />
      )}

      {p.eventos.length > 0 && (
        <section className="rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white p-4">
          <h3 className="text-[13px] font-bold text-[#1D1D1F]">Historial</h3>
          <ul className="mt-2 space-y-1 text-[12px] text-[#3A3A3C]">
            {p.eventos.map((e, i) => (
              <li key={i}>
                <span className="text-[#86868B]">{new Date(e.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</span> ·{' '}
                {{
                  CREADO: 'Creado',
                  ENVIADO: 'Enviado a aprobación',
                  APROBADO: 'Aprobado',
                  DEVUELTO: 'Devuelto',
                  REABIERTO: 'Reabierto',
                  ENVIADO_AL_CLIENTE: 'Enlace para el cliente',
                  APROBADO_POR_CLIENTE: 'Aprobado por el cliente',
                  DEVUELTO_POR_CLIENTE: 'Devuelto por el cliente',
                }[e.tipo] ?? e.tipo} (v{e.version})
                {/* Del cliente: el comentario ya trae su nombre; el autor guardado es quien mandó el enlace. */}
                {e.tipo.endsWith('_POR_CLIENTE')
                  ? ` · ${e.comentario}`
                  : `${e.autor ? ` por ${e.autor}` : ''}${e.comentario ? `: «${e.comentario}»` : ''}`}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** P3 · Elegir medios: cada formato activo de la biblioteca, con cuántas piezas en cada etapa del planning. */
function ElegirMedios({
  planning,
  onDatos,
  onGuardar,
}: {
  planning: PlanningDetalle;
  onDatos: (d: { desde?: string | null; hasta?: string | null; etapas?: EtapaDeFunnel[] }) => Promise<void>;
  onGuardar: (lineas: { formatoId: string; etapa: EtapaDeFunnel; piezas: number }[]) => Promise<void>;
}) {
  const [medios, setMedios] = React.useState<MedioDetalle[] | null>(null);
  const [abiertos, setAbiertos] = React.useState<Set<string>>(new Set(planning.lineas.map(l => l.medio.id)));
  // `formatoId·etapa` → piezas. Arranca con la sábana que ya hay.
  const [piezas, setPiezas] = React.useState<Map<string, number>>(
    () => new Map(planning.lineas.map(l => [`${l.formato.id}·${l.etapa}`, l.piezas]))
  );
  const [ocupado, setOcupado] = React.useState(false);

  React.useEffect(() => {
    cdmApi
      .medios()
      .then(async (ms: MedioResumen[]) => setMedios(await Promise.all(ms.filter(m => m.estado === 'ACTIVO').map(m => cdmApi.medio(m.id)))))
      .catch(() => setMedios([]));
  }, []);

  const valor = (f: string, e: EtapaDeFunnel) => piezas.get(`${f}·${e}`) ?? 0;
  // Suma sobre el valor más reciente, no sobre el de este render: dos clics seguidos suman dos.
  const cambiar = (f: string, e: EtapaDeFunnel, delta: number) =>
    setPiezas(prev => {
      const sig = new Map(prev);
      const n = Math.min(50, (prev.get(`${f}·${e}`) ?? 0) + delta);
      if (n <= 0) sig.delete(`${f}·${e}`);
      else sig.set(`${f}·${e}`, n);
      return sig;
    });
  const lineas = [...piezas.entries()]
    .map(([k, n]) => {
      const [formatoId, etapa] = k.split('·') as [string, EtapaDeFunnel];
      return { formatoId, etapa, piezas: n };
    })
    .filter(l => planning.etapas.includes(l.etapa));
  const total = lineas.reduce((s, l) => s + l.piezas, 0);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
      <div className="space-y-3">
        <section className="rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[150px_150px_1fr]">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868B]">Desde</span>
              <input
                type="date"
                defaultValue={soloFecha(planning.desde)}
                onBlur={e => void onDatos({ desde: e.target.value || null })}
                className="mt-1 w-full rounded-md border border-[rgba(0,0,0,0.12)] px-2 py-1.5 text-[13px]"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868B]">Hasta</span>
              <input
                type="date"
                defaultValue={soloFecha(planning.hasta)}
                onBlur={e => void onDatos({ hasta: e.target.value || null })}
                className="mt-1 w-full rounded-md border border-[rgba(0,0,0,0.12)] px-2 py-1.5 text-[13px]"
              />
            </label>
            <SelectorDeEtapas etapas={planning.etapas} onCambio={e => e.length && void onDatos({ etapas: e })} />
          </div>
        </section>
        <h3 className="text-[15px] font-bold text-[#1D1D1F]">¿En qué medios sale?</h3>
        {!medios ? (
          <div className="h-24" />
        ) : medios.length === 0 ? (
          <p className="rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-white p-6 text-[13px] text-[#86868B]">
            No hay medios activos en la biblioteca. Actívalos en «Biblioteca de medios» para usarlos aquí.
          </p>
        ) : (
          medios.map(m => {
            const abierto = abiertos.has(m.id);
            const enUso = m.formatos.filter(f => planning.etapas.some(e => valor(f.id, e) > 0));
            const piezasMedio = m.formatos.reduce((s, f) => s + planning.etapas.reduce((t, e) => t + valor(f.id, e), 0), 0);
            return (
              <section key={m.id} className="rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white">
                <button
                  type="button"
                  onClick={() => setAbiertos(prev => new Set(prev.has(m.id) ? [...prev].filter(x => x !== m.id) : [...prev, m.id]))}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span>
                    <span className="text-[14px] font-bold text-[#1D1D1F]">{m.nombre}</span>
                    <span className="ml-2 text-[11.5px] text-[#86868B]">{nombreDeClase(m.clase)}</span>
                  </span>
                  <span className="text-[12px] text-[#6E6E73]">
                    {enUso.length} de {m.formatos.length} formatos · {piezasMedio} piezas {abierto ? '▴' : '▾'}
                  </span>
                </button>
                {abierto && (
                  <ul className="divide-y divide-[rgba(0,0,0,0.05)] border-t border-[rgba(0,0,0,0.06)]">
                    {m.formatos.map(f => (
                      <li key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                        <div className="min-w-[180px] flex-1">
                          <div className="text-[13px] font-semibold text-[#1D1D1F]">{f.nombre}</div>
                          <div className="text-[11.5px] text-[#86868B]">
                            {f.guia?.medidas?.join(' · ') ?? (f.anchoPx && f.altoPx ? `${f.anchoPx} × ${f.altoPx}` : 'solo texto')}
                          </div>
                        </div>
                        {planning.etapas.map(e => (
                          <div key={e} className="flex items-center gap-1.5">
                            <span className="w-[96px] text-right text-[11.5px] text-[#6E6E73]">{nombreEtapa(e)}</span>
                            <button
                              type="button"
                              aria-label={`Menos piezas de ${f.nombre} en ${nombreEtapa(e)}`}
                              onClick={() => cambiar(f.id, e, -1)}
                              className="flex h-6 w-6 items-center justify-center rounded-md border border-[rgba(0,0,0,0.12)] text-[#6E6E73] disabled:opacity-30"
                              disabled={!valor(f.id, e)}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-5 text-center text-[13px] font-semibold tabular-nums">{valor(f.id, e)}</span>
                            <button
                              type="button"
                              aria-label={`Más piezas de ${f.nombre} en ${nombreEtapa(e)}`}
                              onClick={() => cambiar(f.id, e, 1)}
                              className="flex h-6 w-6 items-center justify-center rounded-md border border-[rgba(0,0,0,0.12)] text-[#6E6E73]"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })
        )}
      </div>
      <aside className="h-fit space-y-3 rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white p-4 xl:sticky xl:top-[133px]">
        <h3 className="text-[13px] font-bold text-[#1D1D1F]">Lo que va a la sábana</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            [new Set(lineas.map(l => medios?.find(m => m.formatos.some(f => f.id === l.formatoId))?.id)).size, 'medios'],
            [new Set(lineas.map(l => l.formatoId)).size, 'formatos'],
            [total, 'piezas'],
          ].map(([n, r]) => (
            <div key={String(r)}>
              <div className="text-[20px] font-bold text-[#1D1D1F]">{n}</div>
              <div className="text-[11px] text-[#86868B]">{r}</div>
            </div>
          ))}
        </div>
        <ul className="space-y-1 text-[12px] text-[#3A3A3C]">
          {planning.etapas.map(e => {
            const de = lineas.filter(l => l.etapa === e);
            return (
              <li key={e}>
                {nombreEtapa(e)}: {contar(de.reduce((s, l) => s + l.piezas, 0), 'pieza', 'piezas')} · {contar(de.length, 'formato', 'formatos')}
              </li>
            );
          })}
        </ul>
        <p className="text-[11.5px] text-[#86868B]">Cada etapa es una pieza distinta para Diseño, con su propio mensaje.</p>
        <button
          type="button"
          disabled={!lineas.length || ocupado}
          onClick={async () => {
            setOcupado(true);
            await onGuardar(lineas);
            setOcupado(false);
          }}
          className={`${primario} w-full`}
        >
          Ver la sábana · {total} piezas
        </button>
      </aside>
    </div>
  );
}

/** P4 · La sábana, y P5 · aprobarla, cuando quien mira es el responsable y está por aprobar. */
function Sabana({
  planning: p,
  onMedios,
  onEnviar,
  onAprobar,
  onDevolver,
  onReabrir,
  onUbicaciones,
  onEnlace,
}: {
  planning: PlanningDetalle;
  onMedios: () => void;
  onEnviar: () => void;
  onAprobar: (comentario?: string) => void;
  onDevolver: (comentario: string) => void;
  onReabrir: () => void;
  onUbicaciones: (lineaId: string, ubicacionIds: string[]) => void;
  onEnlace: () => void;
}) {
  const [comentario, setComentario] = React.useState('');
  const [abierta, setAbierta] = React.useState<string | null>(null);
  const textos = (l: PlanningDetalle['lineas'][number]) =>
    l.textos
      .map(t => `${t.repeticiones > 1 ? `${t.repeticiones} ` : ''}${t.nombre.toLowerCase()}${t.maximo ? ` ${t.maximo}` : ''}`)
      .join(' · ');

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <h3 className="text-[15px] font-bold text-[#1D1D1F]">Sábana</h3>
          <span className="text-[12px] text-[#6E6E73]">
            {contar(p.resumen.medios, 'medio', 'medios')} · {contar(p.resumen.formatos, 'formato', 'formatos')} ·{' '}
            {contar(p.resumen.lineas, 'línea', 'líneas')} (formato × etapa) · {contar(p.resumen.piezas, 'pieza', 'piezas')}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead className="bg-[#F5F5F7]">
              <tr>
                {['Medio', 'Formato', 'Medidas', 'Etapa', 'Piezas', 'Fechas', 'Textos para Copywriting', 'Estado'].map(c => (
                  <th key={c} className="px-3 py-2 text-[11px] font-bold uppercase tracking-[0.04em] text-[#86868B]">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.lineas.map(l => (
                <React.Fragment key={l.id}>
                <tr className="border-t border-[rgba(0,0,0,0.06)] align-top">
                  <td className="px-3 py-2 font-semibold text-[#1D1D1F]">{l.medio.nombre}</td>
                  <td className="px-3 py-2 text-[#1D1D1F]">
                    {l.formato.nombre}
                    {/* P4b: solo las piezas con varias ubicaciones (Meta) eligen dónde salen. */}
                    {l.ubicaciones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setAbierta(abierta === l.id ? null : l.id)}
                        className="mt-0.5 block text-[11.5px] font-semibold text-[#047857] hover:underline"
                      >
                        Ubicaciones · {l.ubicacionIds.length || l.ubicaciones.length} de {l.ubicaciones.length} {abierta === l.id ? '▴' : '▾'}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[#6E6E73]">{l.medidas ?? 'solo texto'}</td>
                  <td className="px-3 py-2 text-[#3A3A3C]">{nombreEtapa(l.etapa)}</td>
                  <td className="px-3 py-2 font-semibold tabular-nums">{l.piezas}</td>
                  <td className="px-3 py-2 text-[#6E6E73]">{rango(l.desde ?? p.desde, l.hasta ?? p.hasta)}</td>
                  <td className="px-3 py-2 text-[11.5px] text-[#6E6E73]">{textos(l)}</td>
                  <td className="px-3 py-2 text-[11.5px]">
                    {l.porConfirmar ? <span className="text-amber-700">Ubicación por confirmar</span> : <span className="text-[#047857]">Listo</span>}
                  </td>
                </tr>
                {abierta === l.id && (
                  <tr className="bg-[#FAFAFA]">
                    <td colSpan={8} className="px-3 py-3">
                      <p className="mb-2 text-[11.5px] text-[#6E6E73]">
                        Dónde sale esta línea. El largo de cada texto para Copywriting es el más corto entre las ubicaciones elegidas.
                      </p>
                      <div className="grid grid-cols-1 gap-1 md:grid-cols-2 xl:grid-cols-3">
                        {l.ubicaciones.map(u => {
                          const marcada = !l.ubicacionIds.length || l.ubicacionIds.includes(u.id);
                          const actuales = l.ubicacionIds.length ? l.ubicacionIds : l.ubicaciones.map(x => x.id);
                          return (
                            <label key={u.id} className="flex items-start gap-2 text-[12px] text-[#3A3A3C]" title={u.alertaTexto ?? undefined}>
                              <input
                                type="checkbox"
                                checked={marcada}
                                disabled={!p.puedo.editar || (marcada && actuales.length === 1)}
                                onChange={() => onUbicaciones(l.id, marcada ? actuales.filter(x => x !== u.id) : [...actuales, u.id])}
                                className="mt-0.5"
                              />
                              <span>
                                {u.nombre}
                                {u.porConfirmar && <span className="ml-1 text-amber-700">· por confirmar</span>}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white p-4 text-[12.5px] text-[#3A3A3C]">
          <h3 className="text-[13px] font-bold text-[#1D1D1F]">Al aprobarla</h3>
          <p className="mt-1">
            <strong>Copywriting</strong> recibe {p.resumen.lineas} pedidos de copy, uno por formato y etapa, con el largo de cada texto ya calculado.
          </p>
          <p className="mt-1">
            <strong>Producción</strong> recibe {p.resumen.piezas} piezas con sus medidas, cada una sabiendo su formato y su etapa.
          </p>
          <p className="mt-2 text-[11.5px] text-[#86868B]">Por ahora a Copywriting le llega un aviso; los pedidos con el largo de cada texto llegan en la próxima entrega.</p>
        </div>
        <div className="rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white p-4">
          <h3 className="text-[13px] font-bold text-[#1D1D1F]">{p.aprueban.length > 1 ? 'La aprueba cualquiera de ellos' : 'La aprueba'}</h3>
          <p className="mt-1 text-[12.5px] text-[#3A3A3C]">
            {p.aprueba ? `${p.aprueba.name} · responsable` : 'Falta el responsable de la campaña'}
            {p.campana.modoAprobacion === 'CLIENTE' ? ' · después, el cliente por enlace' : ''}
          </p>
          {p.aprueba && <QuienesAprueban campanaId={p.campana.id} />}
          {p.estado === 'POR_APROBAR' && !p.puedo.decidir && <p className="mt-2 text-[12.5px] text-amber-700">Enviada: espera a {nombres(p.aprueban)}.</p>}
          {p.estado === 'APROBADO' && <p className="mt-2 text-[12.5px] font-semibold text-[#047857]">Aprobada.</p>}
          {p.estado === 'CON_EL_CLIENTE' && (
            <p className="mt-2 text-[12.5px] text-amber-700">
              El equipo la aprobó. Falta el cliente: {p.enlace ? 'el enlace ya está creado.' : 'crea el enlace y compártelo.'}
            </p>
          )}
        </div>
      </section>

      {p.puedo.decidir && (
        <section className="space-y-2 rounded-[12px] border border-[#047857]/30 bg-emerald-50/40 p-4">
          <h3 className="text-[13px] font-bold text-[#1D1D1F]">Te toca aprobar</h3>
          <textarea
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="Comentario (obligatorio si la devuelves). Ej.: sumar TikTok también en Consideración"
            className="h-20 w-full rounded-md border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-[13px]"
          />
          <div className="flex justify-end gap-2">
            <button type="button" disabled={!comentario.trim()} onClick={() => onDevolver(comentario.trim())} className={secundario}>
              Devolver con comentario
            </button>
            <button type="button" onClick={() => onAprobar(comentario.trim() || undefined)} className={primario}>
              Aprobar la sábana
            </button>
          </div>
        </section>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        {p.puedo.editar ? (
          <button type="button" onClick={onMedios} className={secundario}>
            ← Medios
          </button>
        ) : (
          <span />
        )}
        {p.puedo.enviar && (
          <button type="button" onClick={onEnviar} disabled={!p.aprueba} className={primario}>
            Enviar a aprobación
          </button>
        )}
        {p.puedo.enviarAlCliente && (
          <div className="flex items-center gap-2">
            {p.enlace && (
              <span className="text-[11.5px] text-[#86868B]">
                Vence el {new Date(p.enlace.venceEn).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
              </span>
            )}
            <button type="button" onClick={onEnlace} className={primario}>
              {p.enlace ? 'Copiar el enlace para el cliente' : 'Crear el enlace para el cliente'}
            </button>
          </div>
        )}
        {p.puedo.reabrir && (
          <button type="button" onClick={onReabrir} className={secundario}>
            Cambiarla: versión {p.version + 1}
          </button>
        )}
      </div>
    </div>
  );
}
