import React from 'react';
import { Check, ChevronDown, Lock, LogOut } from 'lucide-react';
import { SCREENS, ScreenId } from '../../screens';
import type { Client, PasoDeProceso, Project, User } from '../../types';
import { clientApi, libraryApi } from '../../services/api';
import SelectorDeMarca from '../../components/SelectorDeMarca';
import Isotipo from '../../components/ui/Isotipo';
import { PASOS, PasoDef, pasoDe } from './rutas';

/**
 * El marco de la plataforma por procesos (F0, docs/plan-plataforma-por-procesos.md; en el `.pen`, el
 * componente «Barra de la plataforma» y la hoja de estados). Dos filas:
 *
 * 1. **Barra**: identidad, marca, avisos y cuenta. No cambia entre pantallas.
 * 2. **Proceso**: abre con la campaña y sigue con los pasos. El recuadro dice **dónde estás**; el número y
 *    la línea chica de cada paso, **cómo va la campaña** (decisión 24). Con «Todas las campañas» los pasos
 *    solo navegan.
 *
 * Abajo, el menú del paso donde estás y la pantalla. Las pantallas son las de siempre: el marco no las
 * reescribe, solo decide dónde se montan.
 */

interface Props {
  usuario: User;
  administra: boolean;
  onCambiarWorkspace: (id: string) => void;
  onSalir: () => void;
  marcas: Client[];
  marcaId: string;
  onElegirMarca: (id: string) => void;
  pantalla: ScreenId;
  onIr: (pantalla: ScreenId) => void;
  campanaId: string | null;
  onElegirCampana: (id: string | null) => void;
  /** Avisa algo en la notificación de la app: cambiar de marca por una campaña ajena, por ejemplo. */
  onAviso: (mensaje: string) => void;
  bandeja: React.ReactNode;
  novedadPendiente: boolean;
  respuestasNuevas: number;
  children: React.ReactNode;
}

const PANTALLAS_DE_CUENTA: ScreenId[] = ['users', 'settings', 'help', 'novedades'];

export default function Marco(props: Props) {
  const { usuario, administra, marcas, marcaId, pantalla, campanaId, onIr } = props;
  const [campanas, setCampanas] = React.useState<Project[] | null>(null);
  const [pasos, setPasos] = React.useState<PasoDeProceso[]>([]);

  const visible = (id: ScreenId) => !SCREENS[id].adminOnly || administra;
  const primeraDe = (paso: PasoDef) => paso.grupos.flatMap(g => g.pantallas).find(visible) ?? null;

  // Las campañas del workspace, una vez: así una campaña de otra marca (un enlace, un aviso) se reconoce.
  React.useEffect(() => {
    libraryApi.listProjects().then(setCampanas).catch(() => setCampanas([]));
  }, [usuario.workspaceId]);

  // Abrir la campaña de otra marca cambia la marca y lo dice; una campaña que ya no existe se suelta.
  React.useEffect(() => {
    if (!campanaId || !campanas) return;
    const campana = campanas.find(c => c.id === campanaId);
    if (!campana?.clientId) {
      props.onElegirCampana(null);
    } else if (campana.clientId !== marcaId) {
      props.onElegirMarca(campana.clientId);
      const marca = marcas.find(m => m.id === campana.clientId);
      props.onAviso(`Cambiaste a ${marca?.name ?? 'otra marca'}: la campaña «${campana.name}» es suya`);
    }
  }, [campanaId, campanas]);

  // Se relee al moverse: aprobar un copy o cerrar una pieza cambia el avance sin recargar la página.
  React.useEffect(() => {
    if (!marcaId) return setPasos([]);
    let vigente = true;
    clientApi
      .proceso(marcaId, campanaId)
      .then(p => vigente && setPasos(p))
      .catch(() => vigente && setPasos([]));
    return () => {
      vigente = false;
    };
  }, [marcaId, campanaId, pantalla]);

  const deLaMarca = (campanas ?? []).filter(c => c.clientId === marcaId);
  const aqui = pasoDe(pantalla);
  const numero = (paso: PasoDef) => PASOS.indexOf(paso) + 1;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F5F7' }}>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[rgba(0,0,0,0.08)]">
        {/* 1 · Barra */}
        <div className="h-[48px] flex items-center gap-4 px-5">
          <div className="flex items-center gap-2.5 w-[192px] shrink-0">
            <Isotipo size={22} />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-[#1D1D1F] leading-none">My Voice</div>
              <div className="text-[10px] text-[#86868B] mt-0.5 leading-none truncate">{usuario.workspaceName || 'Workspace'}</div>
            </div>
          </div>
          {marcas.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#86868B]">Marca</span>
              <SelectorDeMarca
                marcas={marcas}
                activa={marcaId}
                onElegir={id => {
                  props.onElegirMarca(id);
                  props.onElegirCampana(null);
                }}
                onRevisarRepetidos={administra ? () => onIr('clients') : undefined}
              />
            </div>
          )}
          <div className="flex-1" />
          {props.bandeja}
          <Cuenta {...props} />
        </div>

        {/* 2 · Proceso */}
        <div className="h-[56px] flex items-stretch gap-2 px-5 border-t border-[rgba(0,0,0,0.05)]">
          <label className="flex flex-col justify-center w-[192px] shrink-0">
            <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#86868B]">Campaña</span>
            <select
              aria-label="Campaña"
              className="mt-0.5 -ml-1 bg-transparent text-[13px] font-medium text-[#1D1D1F] outline-none cursor-pointer truncate rounded focus-visible:ring-1 focus-visible:ring-[#1D1D1F]"
              value={campanaId ?? ''}
              onChange={e => props.onElegirCampana(e.target.value || null)}
            >
              <option value="">Todas las campañas</option>
              {deLaMarca.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <ol className="flex items-stretch gap-1 flex-1 min-w-0">
            {PASOS.map((paso, i) => {
              const estado = pasos.find(p => p.paso === paso.id);
              const destino = primeraDe(paso);
              const esAqui = aqui?.id === paso.id;
              return (
                <li key={paso.id} className="flex items-center gap-1 min-w-0">
                  {i > 0 && <span className="text-[#C7C7CC] text-[12px] px-1">›</span>}
                  <button
                    type="button"
                    disabled={!destino}
                    onClick={() => destino && onIr(destino)}
                    title={estado?.falta ? `${estado.falta}${estado.quien ? ` · le toca a ${estado.quien.nombre}` : ''}` : undefined}
                    aria-current={esAqui ? 'step' : undefined}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-left min-w-0 transition-colors ${
                      esAqui ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.10)] ring-1 ring-[rgba(0,0,0,0.08)]' : 'hover:bg-[rgba(0,0,0,0.04)]'
                    } disabled:opacity-50 disabled:cursor-default disabled:hover:bg-transparent`}
                  >
                    <Numero n={numero(paso)} color={paso.color} estado={estado?.estado ?? 'neutro'} />
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-semibold text-[#1D1D1F] leading-tight truncate">{paso.nombre}</span>
                      {estado?.texto && estado.estado !== 'neutro' && (
                        <span className="block text-[10.5px] text-[#86868B] leading-tight truncate">{estado.texto}</span>
                      )}
                      {estado?.estado === 'bloqueado' && estado.falta && (
                        <span className="block text-[10.5px] text-[#86868B] leading-tight truncate">{estado.falta}</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <Menu {...props} aqui={aqui} numero={aqui ? numero(aqui) : null} visible={visible} />
        {/* El encabezado mide dos filas: lo que se queda fijo al bajar (el formulario de Generar) va más abajo. */}
        <main className="flex-1 min-w-0 p-7" style={{ ['--tope-fijo' as string]: '133px' }}>
          {props.children}
        </main>
      </div>
    </div>
  );
}

function Numero({ n, color, estado }: { n: number; color: string; estado: PasoDeProceso['estado'] }) {
  const base = 'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0';
  if (estado === 'hecho')
    return (
      <span className={`${base} text-white`} style={{ background: color }} aria-label="Hecho">
        <Check className="w-3 h-3" strokeWidth={3} />
      </span>
    );
  if (estado === 'bloqueado')
    return (
      <span className={`${base} bg-[#F2F2F7] text-[#86868B]`} aria-label="Espera otro paso">
        <Lock className="w-2.5 h-2.5" strokeWidth={2.5} />
      </span>
    );
  // En curso: el número con el color del paso; pendiente o sin campaña, el número en gris.
  return estado === 'activo' ? (
    <span className={`${base} text-white`} style={{ background: color }}>
      {n}
    </span>
  ) : (
    <span className={`${base} bg-[#F2F2F7] text-[#6E6E73]`}>{n}</span>
  );
}

function Menu({
  aqui,
  numero,
  pantalla,
  onIr,
  visible,
  novedadPendiente,
  respuestasNuevas,
}: Props & { aqui: PasoDef | null; numero: number | null; visible: (id: ScreenId) => boolean }) {
  const grupos = aqui ? aqui.grupos : [{ titulo: 'Cuenta', pantallas: PANTALLAS_DE_CUENTA }];
  return (
    <aside className="w-[216px] shrink-0 border-r border-[rgba(0,0,0,0.06)] flex flex-col sticky top-[105px] h-[calc(100vh-105px)]">
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {aqui && numero && (
          <div className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: aqui.color }}>
            {numero} · {aqui.nombre} · {aqui.tema}
          </div>
        )}
        {grupos.map((grupo, i) => {
          const pantallas = grupo.pantallas.filter(visible);
          if (!pantallas.length) return null;
          return (
            <div key={grupo.titulo} className={i === 0 ? 'space-y-0.5' : 'mt-4 space-y-0.5'}>
              <div className="px-3 pb-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#86868B]">{grupo.titulo}</div>
              {pantallas.map(id => {
                const activa = pantalla === id;
                const Icono = SCREENS[id].icon;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onIr(id)}
                    className={`w-full text-left px-3 py-[7px] rounded-[8px] text-[13px] flex items-center gap-2.5 ${
                      activa
                        ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-[#1D1D1F] font-medium'
                        : 'text-[#6E6E73] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1D1D1F]'
                    }`}
                  >
                    <Icono className={`w-[15px] h-[15px] shrink-0 ${activa ? 'text-[#1D1D1F]' : 'text-[#86868B]'}`} strokeWidth={1.75} />
                    <span className="flex-1">{SCREENS[id].name}</span>
                    {id === 'collaboration' && respuestasNuevas > 0 && !activa && (
                      <span
                        title="Respuestas del cliente sin ver"
                        className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center leading-none shrink-0"
                      >
                        {respuestasNuevas > 9 ? '9+' : respuestasNuevas}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="shrink-0 border-t border-[rgba(0,0,0,0.07)] px-4 py-3 flex items-center justify-between">
        <button type="button" onClick={() => onIr('help')} className="text-[11px] text-[#86868B] hover:text-[#1D1D1F] hover:underline">
          {SCREENS.help.name}
        </button>
        <button type="button" onClick={() => onIr('novedades')} className="text-[11px] text-[#86868B] hover:text-[#1D1D1F] hover:underline">
          {SCREENS.novedades.name}
          {novedadPendiente && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 align-middle" />}
        </button>
      </div>
    </aside>
  );
}

/** El menú de la cuenta (el avatar): lo que no es de ningún paso. Decisión 26. */
function Cuenta({ usuario, administra, onIr, onSalir, onCambiarWorkspace }: Props) {
  const [abierto, setAbierto] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAbierto(false);
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', cerrar);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', cerrar);
      document.removeEventListener('keydown', escape);
    };
  }, [abierto]);
  const ir = (id: ScreenId) => {
    setAbierto(false);
    onIr(id);
  };
  const workspaces = usuario.workspaces ?? [];
  const item = 'w-full text-left px-3 py-2 rounded-[8px] text-[13px] text-[#1D1D1F] hover:bg-[rgba(0,0,0,0.05)]';
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        aria-expanded={abierto}
        aria-label="Tu cuenta"
        className="flex items-center gap-1 rounded-full p-0.5 hover:bg-[rgba(0,0,0,0.05)]"
      >
        <span className="w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center text-[11px] font-semibold">
          {usuario.name[0]?.toUpperCase()}
        </span>
        <ChevronDown className="w-3 h-3 text-[#86868B]" />
      </button>
      {abierto && (
        <div className="absolute right-0 top-[40px] w-[248px] bg-white rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-[rgba(0,0,0,0.06)] p-1.5 z-50">
          <div className="px-3 py-2 border-b border-[rgba(0,0,0,0.06)] mb-1">
            <div className="text-[13px] font-medium text-[#1D1D1F] truncate">{usuario.name}</div>
            <div className="text-[11px] text-[#86868B] truncate">{usuario.email}</div>
          </div>
          {administra && (
            <button type="button" className={item} onClick={() => ir('users')}>
              {SCREENS.users.name}
            </button>
          )}
          {administra && (
            <button type="button" className={item} onClick={() => ir('settings')}>
              {SCREENS.settings.name}
            </button>
          )}
          <button type="button" className={item} onClick={() => ir('help')}>
            {SCREENS.help.name}
          </button>
          <button type="button" className={item} onClick={() => ir('novedades')}>
            {SCREENS.novedades.name}
          </button>
          {workspaces.length > 1 && (
            <div className="border-t border-[rgba(0,0,0,0.06)] mt-1 pt-1">
              <div className="px-3 pt-1 pb-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#86868B]">Workspace</div>
              {workspaces.map(ws => (
                <button
                  key={ws.id}
                  type="button"
                  className={`${item} flex items-center justify-between`}
                  onClick={() => {
                    setAbierto(false);
                    onCambiarWorkspace(ws.id);
                  }}
                >
                  <span className="truncate">{ws.name}</span>
                  {ws.id === usuario.workspaceId && <Check className="w-3.5 h-3.5 text-[#86868B]" />}
                </button>
              ))}
            </div>
          )}
          <div className="border-t border-[rgba(0,0,0,0.06)] mt-1 pt-1">
            <button type="button" className={`${item} flex items-center gap-2`} onClick={onSalir}>
              <LogOut className="w-3.5 h-3.5 text-[#86868B]" /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
