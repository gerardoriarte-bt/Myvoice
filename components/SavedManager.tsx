
import React from 'react';
import { SCREENS, ScreenId, screenName } from '../screens';
import { Search, Copy, Pencil, Trash2, Check, BookmarkCheck, LayoutGrid, Tag, X, Send, ShieldCheck, Undo2, Link2, ArrowRight } from 'lucide-react';
import { SavedVariation, Project, Client, Platform, EtapaCopy, ETAPAS_COPY, WorkspaceMember } from '../types';
import { PlatformIcon } from './ui/platformIcons';
import CrearPiezasModal from './produccion/CrearPiezasModal';
import AprobacionDeCampana from './AprobacionDeCampana';
import { libraryApi, reviewApi } from '../services/api';

/**
 * El copy de la marca y en qué paso va (docs/plan-aprobacion-por-campana.md).
 *
 * Antes era «Copy aprobado» y mostraba pendientes; tenía una barra flotante
 * pegada a la ventana —no al contenido— con tres acciones fijas en el orden
 * inverso al proceso (borrar, producir, mandar al cliente), que no avisaba
 * nada al terminar. Ahora:
 *
 *   · **la marca viene del encabezado**, no de un filtro más;
 *   · **el carril** cuenta cuántos copys hay en cada paso y filtra con un clic;
 *   · **la barra ofrece solo lo que hace avanzar lo seleccionado**, dice por
 *     qué lo demás no se puede, y termina mostrando el resultado ahí mismo.
 */

interface SavedManagerProps {
  saved: SavedVariation[];
  clients: Client[];
  /** La marca activa, la del encabezado. */
  clientId: string;
  currentUserId?: string;
  isAdmin: boolean;
  miembros: WorkspaceMember[];
  onRemove: (variationId: string) => void;
  onUpdate: (variationId: string, updates: Partial<SavedVariation>) => void;
  onRefreshSaved: () => Promise<void> | void;
  addNotification: (message: string, type?: string) => void;
  onIrA: (pantalla: ScreenId) => void;
}

/** Lo que muestra la barra después de actuar, en vez de desaparecer. */
interface Resultado {
  texto: string;
  enlace?: string;
  ir?: ScreenId;
}

const ESTILO_ETAPA: Record<EtapaCopy, string> = {
  SIN_CAMPANA: 'bg-amber-50 text-amber-800 border-amber-200',
  POR_APROBAR: 'bg-gray-100 text-gray-700 border-gray-200',
  DEVUELTO: 'bg-red-50 text-red-700 border-red-200',
  CON_EL_CLIENTE: 'bg-blue-50 text-blue-700 border-blue-200',
  APROBADO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  EN_PRODUCCION: 'bg-violet-50 text-violet-700 border-violet-200',
};

const etiquetaEtapa = (e: EtapaCopy) => ETAPAS_COPY.find(x => x.id === e)?.label ?? e;
const etapaDe = (v: SavedVariation): EtapaCopy => v.etapa ?? (v.projectId ? 'POR_APROBAR' : 'SIN_CAMPANA');
const fecha = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '';

const SavedManager: React.FC<SavedManagerProps> = ({
  saved,
  clients,
  clientId,
  currentUserId,
  isAdmin,
  miembros,
  onRemove,
  onUpdate,
  onRefreshSaved,
  addNotification,
  onIrA,
}) => {
  const marca = clients.find(c => c.id === clientId);
  const [campanas, setCampanas] = React.useState<Project[]>([]);
  const [campanaFiltro, setCampanaFiltro] = React.useState<string>('all');
  const [etapaFiltro, setEtapaFiltro] = React.useState<EtapaCopy | 'all'>('all');
  const [plataformaFiltro, setPlataformaFiltro] = React.useState<string>('all');
  const [busqueda, setBusqueda] = React.useState('');
  const [seleccion, setSeleccion] = React.useState<Set<string>>(new Set());
  const [ocupado, setOcupado] = React.useState(false);
  const [resultado, setResultado] = React.useState<Resultado | null>(null);
  const [mandandoAProduccion, setMandandoAProduccion] = React.useState<string[] | null>(null);
  const [enviando, setEnviando] = React.useState<string[] | null>(null);
  const [copiado, setCopiado] = React.useState<string | null>(null);
  const [editandoId, setEditandoId] = React.useState<string | null>(null);
  const [buffer, setBuffer] = React.useState('');
  const [etiquetandoId, setEtiquetandoId] = React.useState<string | null>(null);
  const [etiqueta, setEtiqueta] = React.useState('');
  const [versiones, setVersiones] = React.useState<SavedVariation | null>(null);

  // Al cambiar de marca, todo lo elegido pertenece a la anterior.
  React.useEffect(() => {
    setCampanaFiltro('all');
    setEtapaFiltro('all');
    setSeleccion(new Set());
    setResultado(null);
    if (!clientId) return setCampanas([]);
    libraryApi
      .listProjects(clientId)
      .then((data: Project[]) => setCampanas(Array.isArray(data) ? data : []))
      .catch(() => setCampanas([]));
  }, [clientId]);

  const campanaPorId = React.useMemo(() => new Map(campanas.map(c => [c.id, c])), [campanas]);
  /** La campaña de un copy, con la versión más nueva si se editó acá. */
  const campanaDe = (v: SavedVariation): Project | null =>
    (v.projectId && (campanaPorId.get(v.projectId) ?? v.project)) || null;

  const deLaMarca = React.useMemo(() => saved.filter(v => v.clientId === clientId), [saved, clientId]);
  const deLaCampana = React.useMemo(
    () =>
      deLaMarca.filter(v =>
        campanaFiltro === 'all' ? true : campanaFiltro === 'none' ? !v.projectId : v.projectId === campanaFiltro
      ),
    [deLaMarca, campanaFiltro]
  );
  const visibles = React.useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return deLaCampana.filter(
      v =>
        (etapaFiltro === 'all' || etapaDe(v) === etapaFiltro) &&
        (plataformaFiltro === 'all' || v.platform === plataformaFiltro) &&
        (!q || v.content.toLowerCase().includes(q))
    );
  }, [deLaCampana, etapaFiltro, plataformaFiltro, busqueda]);

  const conteo = React.useMemo(() => {
    const c = new Map<EtapaCopy, number>();
    for (const v of deLaCampana) c.set(etapaDe(v), (c.get(etapaDe(v)) ?? 0) + 1);
    return c;
  }, [deLaCampana]);

  const campanaElegida = campanaFiltro !== 'all' && campanaFiltro !== 'none' ? campanaPorId.get(campanaFiltro) : undefined;

  // ── Qué se puede hacer con lo seleccionado ─────────────────────────────────

  const seleccionados = React.useMemo(() => saved.filter(v => seleccion.has(v.id)), [saved, seleccion]);
  const soyResponsable = (v: SavedVariation) => !!currentUserId && campanaDe(v)?.responsableId === currentUserId;
  const pendiente = (v: SavedVariation) => etapaDe(v) === 'POR_APROBAR' || etapaDe(v) === 'DEVUELTO';

  const acciones = React.useMemo(() => {
    const aprobar: string[] = [];
    const enviar: string[] = [];
    const producir: string[] = [];
    const revocar: string[] = [];
    const sinCampana: string[] = [];
    const motivos = new Set<string>();
    for (const v of seleccionados) {
      const c = campanaDe(v);
      const etapa = etapaDe(v);
      if (etapa === 'SIN_CAMPANA') {
        if (isAdmin) sinCampana.push(v.id);
        else motivos.add('Hay copy sin campaña: quien administra se la asigna.');
      } else if (etapa === 'EN_PRODUCCION') {
        motivos.add('Hay copy que ya está en producción.');
      } else if (etapa === 'CON_EL_CLIENTE') {
        motivos.add('Hay copy esperando la respuesta del cliente.');
      } else if (etapa === 'APROBADO') {
        if (isAdmin) producir.push(v.id);
        else motivos.add('Mandar a producción lo hace quien administra.');
        if (soyResponsable(v)) revocar.push(v.id);
      } else if (!c?.responsableId) {
        motivos.add(`«${c?.name}» no tiene responsable de aprobación.`);
      } else if (c.modoAprobacion === 'CLIENTE') {
        if (soyResponsable(v) || isAdmin) enviar.push(v.id);
        else motivos.add(`«${c.name}» se la manda al cliente ${c.responsable?.name}.`);
      } else if (soyResponsable(v)) {
        aprobar.push(v.id);
      } else {
        motivos.add(`Lo de «${c.name}» lo aprueba ${c.responsable?.name}.`);
      }
    }
    return { aprobar, enviar, producir, revocar, sinCampana, motivos: [...motivos] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionados, campanaPorId, currentUserId, isAdmin]);

  const alternar = (id: string) =>
    setSeleccion(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const todosVisibles = visibles.length > 0 && visibles.every(v => seleccion.has(v.id));
  const alternarTodos = () => setSeleccion(todosVisibles ? new Set() : new Set(visibles.map(v => v.id)));

  const terminar = async (r: Resultado) => {
    setSeleccion(new Set());
    setResultado(r);
    await onRefreshSaved();
  };

  const decidir = async (ids: string[], aprobar: boolean) => {
    setOcupado(true);
    try {
      const { aplicados, rechazados } = await libraryApi.decidirAprobacion(ids, aprobar);
      if (rechazados.length) addNotification(rechazados[0].motivo, 'warning');
      const n = aplicados.length;
      await terminar({
        texto: aprobar
          ? `${n} copy${n === 1 ? '' : 's'} aprobado${n === 1 ? '' : 's'}. Ya se pueden mandar a producción.`
          : `${n} copy${n === 1 ? '' : 's'} volvió a «Por aprobar».`,
      });
      if (aprobar) setEtapaFiltro('APROBADO');
    } catch (e) {
      addNotification(e instanceof Error ? e.message : 'No se pudo decidir la aprobación', 'error');
    } finally {
      setOcupado(false);
    }
  };

  const asignarCampana = async (ids: string[], projectId: string) => {
    if (!projectId) return;
    setOcupado(true);
    try {
      for (const id of ids) await libraryApi.updateVariation(id, { projectId });
      await terminar({ texto: `${ids.length} copy${ids.length === 1 ? '' : 's'} en «${campanaPorId.get(projectId)?.name}», por aprobar.` });
    } catch (e) {
      addNotification(e instanceof Error ? e.message : 'No se pudo asignar la campaña', 'error');
    } finally {
      setOcupado(false);
    }
  };

  const confirmarEdicion = (v: SavedVariation) => {
    if (buffer === v.content) return setEditandoId(null);
    if (v.isApproved && !window.confirm('Este copy está aprobado. Si lo editás vuelve a «Por aprobar» y hay que aprobarlo de nuevo. ¿Seguir?'))
      return;
    onUpdate(v.id, { content: buffer, charCount: buffer.length });
    setEditandoId(null);
  };

  const guardarEtiqueta = async (v: SavedVariation) => {
    const nueva = etiqueta.trim();
    setEtiquetandoId(null);
    setEtiqueta('');
    if (!nueva || (v.tags || []).includes(nueva)) return;
    onUpdate(v.id, { tags: [...(v.tags || []), nueva] });
  };

  const actualizarCampana = (c: Project) => {
    setCampanas(prev => prev.map(x => (x.id === c.id ? { ...x, ...c } : x)));
    addNotification(`«${c.name}» actualizada`, 'success');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!marca) {
    return (
      <div className="rounded-xl border border-dashed border-apple-border p-8 text-center text-[13px] text-apple-secondary">
        Elegí una marca arriba para ver su copy.
      </div>
    );
  }

  const hayBarra = seleccion.size > 0 || resultado;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Encabezado */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-white">
              <BookmarkCheck className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
                {SCREENS.saved.name} <span className="text-gray-400">· {marca.name}</span>
              </h2>
              <p className="mt-0.5 text-[12px] text-gray-500">{SCREENS.saved.description}</p>
            </div>
          </div>
          <div className="w-full md:w-80 space-y-2">
            <select
              value={campanaFiltro}
              onChange={e => {
                setCampanaFiltro(e.target.value);
                setSeleccion(new Set());
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-medium text-gray-800"
            >
              <option value="all">Todas las campañas</option>
              {campanas.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              {deLaMarca.some(v => !v.projectId) && <option value="none">Sin campaña</option>}
            </select>
            {campanaElegida && (
              <AprobacionDeCampana
                campana={campanaElegida}
                miembros={miembros}
                puedeEditar={isAdmin}
                onCambio={actualizarCampana}
                onError={m => addNotification(m, 'error')}
              />
            )}
          </div>
        </div>

        {/*
          El carril. Cada paso dice cuántos hay y filtra con un clic; el orden
          es el del proceso. «Sin campaña» y «Devuelto» solo aparecen si hay
          algo: son desvíos, no pasos por los que todo pasa.
        */}
        <div className="flex flex-wrap items-stretch gap-1 border-t border-gray-100 bg-gray-50/40 px-4 py-3">
          <button
            onClick={() => setEtapaFiltro('all')}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium ${
              etapaFiltro === 'all' ? 'bg-ink text-white' : 'text-gray-600 hover:bg-white'
            }`}
          >
            Todo · {deLaCampana.length}
          </button>
          {ETAPAS_COPY.filter(e => (e.id !== 'SIN_CAMPANA' && e.id !== 'DEVUELTO') || (conteo.get(e.id) ?? 0) > 0).map(
            (e, i, arr) => (
              <React.Fragment key={e.id}>
                <button
                  onClick={() => setEtapaFiltro(e.id)}
                  title={e.que}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium ${
                    etapaFiltro === e.id ? 'border-ink bg-ink text-white' : `${ESTILO_ETAPA[e.id]} hover:brightness-95`
                  }`}
                >
                  {e.label}
                  <span className="tabular-nums opacity-70">{conteo.get(e.id) ?? 0}</span>
                </button>
                {i < arr.length - 1 && <ArrowRight className="h-3 w-3 self-center text-gray-300" />}
              </React.Fragment>
            )
          )}
        </div>
        {etapaFiltro !== 'all' && (
          <p className="border-t border-gray-100 px-6 py-2 text-[11px] text-gray-500">
            {ETAPAS_COPY.find(e => e.id === etapaFiltro)?.que}
          </p>
        )}
      </div>

      {/* Búsqueda */}
      <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm md:flex-row">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar en el copy…"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-[13px] outline-none placeholder:text-gray-400 focus:border-gray-400"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        </div>
        <select
          value={plataformaFiltro}
          onChange={e => setPlataformaFiltro(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-700"
        >
          <option value="all">Todos los canales</option>
          {Object.values(Platform).map(p => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 text-[12px] font-medium text-gray-500">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todo lo visible"
                    checked={todosVisibles}
                    onChange={alternarTodos}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300"
                  />
                </th>
                <th className="w-44 px-4 py-3">Canal</th>
                <th className="min-w-[300px] px-4 py-3">Copy</th>
                <th className="w-56 px-4 py-3">Campaña y paso</th>
                <th className="w-28 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibles.map(v => {
                const etapa = etapaDe(v);
                const c = campanaDe(v);
                const elegido = seleccion.has(v.id);
                const intocable = etapa === 'EN_PRODUCCION' || !!v.isApproved;
                return (
                  <tr
                    key={v.id}
                    onClick={() => alternar(v.id)}
                    className={`group cursor-pointer transition-colors hover:bg-gray-50/60 ${elegido ? 'bg-blue-50/50' : ''}`}
                  >
                    <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={elegido}
                        onChange={() => alternar(v.id)}
                        onClick={e => e.stopPropagation()}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-start gap-2.5">
                        <PlatformIcon platform={v.platform} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-medium leading-tight text-gray-900">{v.platform}</p>
                          {(v.slotLabel || v.slot) && (
                            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                              {v.slotLabel || v.slot}
                              {typeof v.variationIndex === 'number' && ` #${v.variationIndex}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top" onClick={e => editandoId === v.id && e.stopPropagation()}>
                      {editandoId === v.id ? (
                        <div className="space-y-2">
                          <textarea
                            className="min-h-[80px] w-full resize-y rounded-md border border-gray-300 p-3 text-[13px] text-gray-900 outline-none focus:border-gray-500"
                            value={buffer}
                            onChange={e => setBuffer(e.target.value)}
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditandoId(null)} className="px-3 py-1.5 text-[12px] text-gray-500 hover:text-gray-900">
                              Cancelar
                            </button>
                            <button
                              onClick={() => confirmarEdicion(v)}
                              className="rounded-md bg-ink px-3 py-1.5 text-[12px] font-medium text-white hover:bg-ink-hover"
                            >
                              Guardar cambios
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="line-clamp-3 max-w-2xl text-[13px] leading-relaxed text-gray-800">{v.content}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1" onClick={e => e.stopPropagation()}>
                            {(v.tags || []).map(t => (
                              <span key={t} className="group/tag inline-flex items-center gap-0.5 rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                                {t}
                                {isAdmin && (
                                  <button
                                    onClick={() => onUpdate(v.id, { tags: (v.tags || []).filter(x => x !== t) })}
                                    className="ml-0.5 text-blue-400 opacity-0 hover:text-blue-700 group-hover/tag:opacity-100"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                )}
                              </span>
                            ))}
                            {isAdmin &&
                              (etiquetandoId === v.id ? (
                                <input
                                  autoFocus
                                  className="w-24 rounded border border-gray-300 px-1.5 py-0.5 text-[11px] outline-none focus:border-blue-400"
                                  value={etiqueta}
                                  onChange={e => setEtiqueta(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') guardarEtiqueta(v);
                                    if (e.key === 'Escape') setEtiquetandoId(null);
                                  }}
                                  onBlur={() => guardarEtiqueta(v)}
                                  placeholder="etiqueta"
                                />
                              ) : (
                                <button
                                  onClick={() => setEtiquetandoId(v.id)}
                                  className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 opacity-0 transition-opacity hover:text-blue-500 group-hover:opacity-100"
                                >
                                  <Tag className="h-2.5 w-2.5" /> etiqueta
                                </button>
                              ))}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-medium ${ESTILO_ETAPA[etapa]}`}>
                        {etiquetaEtapa(etapa)}
                      </span>
                      <p className="mt-1 truncate text-[11px] text-gray-500" title={c?.name}>
                        {c?.name ?? 'Sin campaña'}
                      </p>
                      {v.isApproved && v.aprobadoPorNombre && (
                        <p className="mt-0.5 text-[10px] text-gray-400">
                          {v.aprobadoVia === 'CLIENTE' ? 'Cliente' : 'Aprobó'}: {v.aprobadoPorNombre} · {fecha(v.aprobadoEn)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right align-top" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        {(v.previousVersions?.length ?? 0) > 0 && (
                          <button
                            onClick={() => setVersiones(v)}
                            className="rounded px-1.5 py-0.5 text-[10px] text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="Versiones anteriores"
                          >
                            {v.previousVersions!.length}v
                          </button>
                        )}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(v.content);
                            setCopiado(v.id);
                            setTimeout(() => setCopiado(null), 2000);
                          }}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                          title="Copiar el texto"
                        >
                          {copiado === v.id ? <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        {isAdmin && etapa !== 'EN_PRODUCCION' && (
                          <button
                            onClick={() => {
                              setEditandoId(v.id);
                              setBuffer(v.content);
                            }}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            disabled={intocable}
                            onClick={() => onRemove(v.id)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:text-gray-200 disabled:hover:bg-transparent"
                            title={intocable ? 'Lo aprobado o en producción no se borra' : 'Eliminar'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[13px] text-gray-500">
                    {deLaMarca.length === 0 ? (
                      <>
                        {marca.name} todavía no tiene copy guardado.{' '}
                        {isAdmin && (
                          <button onClick={() => onIrA('generator')} className="font-medium text-gray-900 underline">
                            Ir a {screenName('generator')}
                          </button>
                        )}
                      </>
                    ) : (
                      'No hay copy en este paso.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/*
        La barra vive DENTRO del contenido (sticky, no fixed): queda alineada con
        la tabla y no con la ventana, que con la barra lateral la corría 108 px.
        Ofrece solo lo que hace avanzar lo seleccionado y explica lo demás.
      */}
      {hayBarra && (
        <div className="sticky bottom-4 z-30 space-y-2">
          {seleccion.size > 0 && acciones.motivos.length > 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-900 shadow">
              {acciones.motivos.join(' ')}
            </p>
          )}
          {seleccion.size > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-700 bg-ink px-4 py-3 text-white shadow-2xl">
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[12px] font-medium">{marca.name}</span>
              <span className="text-[13px] text-gray-300">
                {seleccion.size} seleccionado{seleccion.size === 1 ? '' : 's'}
              </span>
              <div className="flex-1" />
              {acciones.sinCampana.length > 0 && (
                <select
                  disabled={ocupado}
                  value=""
                  onChange={e => asignarCampana(acciones.sinCampana, e.target.value)}
                  className="rounded-lg bg-white/10 px-2 py-1.5 text-[12px] text-white"
                >
                  <option value="">Asignar campaña ({acciones.sinCampana.length})…</option>
                  {campanas.map(c => (
                    <option key={c.id} value={c.id} className="text-gray-900">
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              {acciones.revocar.length > 0 && (
                <button
                  disabled={ocupado}
                  onClick={() => decidir(acciones.revocar, false)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  <Undo2 className="h-3.5 w-3.5" /> Quitar aprobación ({acciones.revocar.length})
                </button>
              )}
              {acciones.aprobar.length > 0 && (
                <button
                  disabled={ocupado}
                  onClick={() => decidir(acciones.aprobar, true)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Aprobar ({acciones.aprobar.length})
                </button>
              )}
              {acciones.enviar.length > 0 && (
                <button
                  disabled={ocupado}
                  onClick={() => setEnviando(acciones.enviar)}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" /> Enviar al cliente ({acciones.enviar.length})
                </button>
              )}
              {acciones.producir.length > 0 && (
                <button
                  disabled={ocupado}
                  onClick={() => setMandandoAProduccion(acciones.producir)}
                  className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-gray-100 disabled:opacity-40"
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Mandar a producción ({acciones.producir.length})
                </button>
              )}
              <button
                onClick={() => setSeleccion(new Set())}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
                title="Deseleccionar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            resultado && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-900 shadow-lg">
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="flex-1">{resultado.texto}</span>
                {resultado.enlace && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(resultado.enlace!);
                      addNotification('Enlace copiado', 'success');
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-[12px] font-medium hover:bg-emerald-100"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Copiar enlace
                  </button>
                )}
                {resultado.ir && (
                  <button
                    onClick={() => onIrA(resultado.ir!)}
                    className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[12px] font-medium text-white hover:bg-ink-hover"
                  >
                    Ir a {screenName(resultado.ir)} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
                <button onClick={() => setResultado(null)} className="text-emerald-700 hover:text-emerald-900" title="Cerrar">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )
          )}
        </div>
      )}

      {versiones && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40" onClick={() => setVersiones(null)}>
          <div className="mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <p className="text-[13px] font-semibold text-gray-900">Versiones anteriores · {versiones.platform}</p>
              <button onClick={() => setVersiones(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Versión actual</p>
                <p className="text-[12px] leading-snug text-gray-800">{versiones.content}</p>
              </div>
              {[...(versiones.previousVersions ?? [])].reverse().map((pv, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">{fecha(pv.editedAt)}</span>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (versiones.isApproved && !window.confirm('Restaurar cambia el texto aprobado: vuelve a «Por aprobar». ¿Seguir?')) return;
                          onUpdate(versiones.id, { content: pv.content, charCount: pv.charCount });
                          setVersiones(null);
                        }}
                        className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-gray-200"
                      >
                        Restaurar
                      </button>
                    )}
                  </div>
                  <p className="text-[12px] leading-snug text-gray-700">{pv.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {enviando && (
        <EnviarAlCliente
          ids={enviando}
          marca={marca.name}
          campanas={[...new Set(seleccionados.filter(v => enviando.includes(v.id)).map(v => campanaDe(v)?.name).filter(Boolean))] as string[]}
          onCerrar={() => setEnviando(null)}
          onEnviado={async enlace => {
            setEnviando(null);
            await terminar({
              texto: `Revisión creada para ${marca.name}. Mandale el enlace al cliente: el copy queda «Con el cliente» hasta que responda.`,
              enlace,
              ir: 'collaboration',
            });
          }}
          onError={m => addNotification(m, 'error')}
        />
      )}

      {/*
        D7 · el alta de piezas es explícita y sale de acá. El servidor arma la
        propuesta y excluye lo que no tiene aprobación con responsable.
      */}
      {mandandoAProduccion && (
        <CrearPiezasModal
          savedVariationIds={mandandoAProduccion}
          onClose={() => setMandandoAProduccion(null)}
          onCreadas={async cantidad => {
            setMandandoAProduccion(null);
            await terminar({
              texto: `${cantidad} pieza${cantidad === 1 ? '' : 's'} en el tablero de ${marca.name}, por asignar.`,
              ir: 'produccion',
            });
          }}
        />
      )}
    </div>
  );
};

/**
 * Armar la revisión del cliente. Antes la barra la creaba con un título
 * automático, sin vencimiento y sin entregar el enlace: había que ir a otra
 * pantalla a buscarlo. Ahora termina mostrándolo.
 */
function EnviarAlCliente({
  ids,
  marca,
  campanas,
  onCerrar,
  onEnviado,
  onError,
}: {
  ids: string[];
  marca: string;
  campanas: string[];
  onCerrar: () => void;
  onEnviado: (enlace: string) => void;
  onError: (m: string) => void;
}) {
  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  const [titulo, setTitulo] = React.useState(`${marca} · ${campanas.join(', ') || 'Copy'} · ${hoy}`);
  const [dias, setDias] = React.useState(7);
  const [ocupado, setOcupado] = React.useState(false);

  const crear = async () => {
    setOcupado(true);
    try {
      const sesion = await reviewApi.create({ title: titulo.trim(), variationIds: ids, expiresInDays: dias });
      const enlace = `${window.location.origin}/?review=${sesion.token}`;
      try {
        await navigator.clipboard.writeText(enlace);
      } catch {
        /* sin permiso de portapapeles: el enlace igual queda a la vista */
      }
      onEnviado(enlace);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo crear la revisión');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/40 p-6" onClick={onCerrar}>
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-[16px] font-medium text-gray-900">Enviar al cliente</h3>
        <p className="mt-0.5 text-[12px] text-gray-500">
          {ids.length} copy{ids.length === 1 ? '' : 's'} de <strong>{marca}</strong>. El enlace no pide cuenta: solo va
          copy de esta marca.
        </p>
        <label className="mt-5 block text-[12px] font-medium text-gray-700">
          Título que ve el cliente
          <input
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-gray-400"
          />
        </label>
        <label className="mt-3 block text-[12px] font-medium text-gray-700">
          Vence en
          <select
            value={dias}
            onChange={e => setDias(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px]"
          >
            {[3, 7, 14, 30].map(d => (
              <option key={d} value={d}>
                {d} días
              </option>
            ))}
          </select>
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCerrar} className="px-3 py-2 text-[13px] text-gray-500 hover:text-gray-900">
            Cancelar
          </button>
          <button
            onClick={crear}
            disabled={ocupado || !titulo.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" /> {ocupado ? 'Creando…' : 'Crear y copiar enlace'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SavedManager;
