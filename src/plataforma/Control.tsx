import React from 'react';
import { SCREENS } from '../../screens';
import { controlApi } from '../../services/api';
import { GastoDeIA } from '../../components/Analytics';
import { WORKSPACE_ROLE_LABELS, type MarcaDeControl, type UsuarioDeControl, type WorkspaceDeControl, type WorkspaceRole } from '../../types';

/**
 * Control, la pantalla del super admin (decisión 27; en el `.pen`, «§ Marco · Control»). Está por encima de
 * los workspaces: el interruptor de cada uno, todas las personas con su rol en cada empresa y el gasto de
 * IA. Es la única pantalla que muestra costos. El servidor responde 404 a quien no es super admin.
 */

type Pestana = 'workspaces' | 'marcas' | 'usuarios' | 'gasto';
const ROLES: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MEMBER'];
const contar = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const usd = (n: number) => `USD ${n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Control() {
  const [pestana, setPestana] = React.useState<Pestana>('workspaces');
  const [workspaces, setWorkspaces] = React.useState<WorkspaceDeControl[] | null>(null);
  const [usuarios, setUsuarios] = React.useState<UsuarioDeControl[] | null>(null);
  const [marcas, setMarcas] = React.useState<MarcaDeControl[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [gastoDe, setGastoDe] = React.useState('');

  const cargar = React.useCallback(async () => {
    try {
      const [ws, us, ms] = await Promise.all([controlApi.workspaces(), controlApi.usuarios(), controlApi.marcas()]);
      setWorkspaces(ws.workspaces);
      setUsuarios(us);
      setMarcas(ms);
      setGastoDe(prev => prev || ws.workspaces[0]?.id || '');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar Control');
    }
  }, []);
  React.useEffect(() => {
    void cargar();
  }, [cargar]);

  /** Cada cambio se guarda y se relee: la pantalla muestra lo que quedó, no lo que se pidió. */
  const hacer = async (accion: () => Promise<unknown>) => {
    try {
      await accion();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el cambio');
    }
  };

  if (!workspaces || !usuarios) {
    return error ? <p className="text-[13px] text-red-600">{error}</p> : <div className="h-48" />;
  }

  const gasto = workspaces.reduce((s, w) => s + w.gastoUsd, 0);
  const cuota = workspaces.reduce((s, w) => s + w.cuotaUsd, 0);
  const mes = new Date().toLocaleDateString('es-CO', { month: 'long' });

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[22px] font-bold text-[#1D1D1F] tracking-[-0.01em]">{SCREENS.control.name}</h2>
          <p className="text-[13px] text-[#6E6E73] mt-0.5">
            {contar(workspaces.length, 'workspace', 'workspaces')} · {contar(usuarios.length, 'persona', 'personas')} · {usd(gasto)} de IA en {mes}
          </p>
        </div>
        <div className="flex gap-2" role="tablist">
          {(
            [
              ['workspaces', 'Workspaces'],
              ['marcas', 'Marcas'],
              ['usuarios', 'Usuarios'],
              ['gasto', 'Gasto de IA'],
            ] as [Pestana, string][]
          ).map(([id, nombre]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={pestana === id}
              onClick={() => setPestana(id)}
              className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold border border-[rgba(0,0,0,0.08)] ${
                pestana === id ? 'bg-ink text-white' : 'bg-white text-[#3A3A3C] hover:bg-[#F5F5F7]'
              }`}
            >
              {nombre}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-[12.5px] text-red-600">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Cifra n={String(workspaces.length)} rotulo={workspaces.length === 1 ? 'workspace' : 'workspaces'} />
        <Cifra n={String(usuarios.length)} rotulo={usuarios.length === 1 ? 'persona en todas las empresas' : 'personas en todas las empresas'} />
        <Cifra n={usd(gasto)} rotulo={`de IA en ${mes}`} />
        <Cifra n={`${cuota ? Math.round((gasto / cuota) * 100) : 0} %`} rotulo={`de la cuota del mes (${usd(cuota)})`} />
      </div>

      {pestana === 'workspaces' && (
        <Tabla columnas={['Workspace', 'Personas · marcas', 'Plataforma por procesos', 'Gasto del mes', 'Cuota']}>
          {workspaces.map(w => {
            const pct = w.cuotaUsd ? Math.min(100, Math.round((w.gastoUsd / w.cuotaUsd) * 100)) : 0;
            return (
              <tr key={w.id} className="border-t border-[rgba(0,0,0,0.06)]">
                <td className="px-4 py-3">
                  <div className="text-[13.5px] font-bold text-[#1D1D1F]">{w.name}</div>
                  <div className="text-[12px] text-[#86868B]">Plan {w.plan}</div>
                </td>
                <td className="px-4 py-3 text-[13px] text-[#3A3A3C]">
                  {w.personas} · {w.marcas}
                </td>
                <td className="px-4 py-3">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={w.plataformaPorProcesos}
                      aria-label={`Plataforma por procesos en ${w.name}`}
                      onClick={() => void hacer(() => controlApi.cambiarPlataforma(w.id, !w.plataformaPorProcesos))}
                      className={`relative w-[34px] h-5 rounded-full transition-colors ${w.plataformaPorProcesos ? 'bg-emerald-500' : 'bg-[#D1D1D6]'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          w.plataformaPorProcesos ? 'translate-x-[14px]' : ''
                        }`}
                      />
                    </button>
                    <span className={`text-[12.5px] font-semibold ${w.plataformaPorProcesos ? 'text-emerald-700' : 'text-[#86868B]'}`}>
                      {w.plataformaPorProcesos ? 'Encendida' : 'Apagada'}
                    </span>
                  </label>
                </td>
                <td className="px-4 py-3 text-[13px] font-semibold text-[#1D1D1F]">{usd(w.gastoUsd)}</td>
                <td className="px-4 py-3">
                  <div className="w-[180px] h-1.5 rounded-full bg-[#EEEEF0] overflow-hidden">
                    <div className="h-full rounded-full bg-ink" style={{ width: `${Math.max(pct, w.gastoUsd > 0 ? 2 : 0)}%` }} />
                  </div>
                  <div className="text-[12px] text-[#86868B] mt-1">
                    {pct} % de {usd(w.cuotaUsd)}
                  </div>
                </td>
              </tr>
            );
          })}
        </Tabla>
      )}

      {pestana === 'marcas' && (
        <>
        <Tabla columnas={['Marca', 'Workspace', 'CDM', 'Implementación']}>
          {marcas.map(m => (
            <tr key={m.id} className="border-t border-[rgba(0,0,0,0.06)]">
              <td className="px-4 py-3 text-[13.5px] font-bold text-[#1D1D1F]">
                {m.name}
                {m.submarca && <span className="ml-2 text-[11px] font-normal text-[#86868B]">submarca</span>}
              </td>
              <td className="px-4 py-3 text-[13px] text-[#3A3A3C]">{m.workspaceName}</td>
              {/*
                Los módulos por marca (ModuloDeMarca). Sin CDM, el paso ② no aparece y el copy se genera como hoy; sin
                Implementación, el paso ⑤ no aparece (F5).
              */}
              {(['CDM', 'IMPLEMENTACION'] as const).map(modulo => {
                const prendido = m.modulos.includes(modulo);
                const nombre = modulo === 'CDM' ? 'CDM' : 'Implementación';
                return (
                  <td key={modulo} className="px-4 py-3">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={prendido}
                        aria-label={`${nombre} en ${m.name}`}
                        onClick={() => void hacer(() => controlApi.cambiarModulo(m.id, modulo, !prendido))}
                        className={`relative w-[34px] h-5 rounded-full transition-colors ${prendido ? 'bg-emerald-500' : 'bg-[#D1D1D6]'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${prendido ? 'translate-x-[14px]' : ''}`} />
                      </button>
                      <span className={`text-[12.5px] font-semibold ${prendido ? 'text-emerald-700' : 'text-[#86868B]'}`}>{prendido ? 'Prendido' : 'Apagado'}</span>
                    </label>
                  </td>
                );
              })}
            </tr>
          ))}
        </Tabla>
        <VerificadorDeFormatos />
        </>
      )}

      {pestana === 'usuarios' && (
        <Tabla columnas={['Persona', 'Workspaces y rol', 'Agregar a']}>
          {usuarios.map(u => (
            <FilaUsuario key={u.id} usuario={u} workspaces={workspaces} hacer={hacer} />
          ))}
        </Tabla>
      )}

      {pestana === 'gasto' && (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-[12.5px] text-[#6E6E73]">
            Workspace
            <select
              value={gastoDe}
              onChange={e => setGastoDe(e.target.value)}
              className="bg-white border border-[rgba(0,0,0,0.1)] rounded-lg px-2 py-1 text-[13px] text-[#1D1D1F]"
            >
              {workspaces.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          {gastoDe && <GastoDeIA workspaceId={gastoDe} />}
        </div>
      )}

      <p className="text-[12px] text-[#86868B]">
        Los costos se ven solo acá. Dueños, administradores y miembros generan como siempre y, si llegan al tope, el aviso no
        dice montos. Los cambios de interruptor y de rol se ven en la próxima carga de cada persona.
      </p>
    </div>
  );
}

function Cifra({ n, rotulo }: { n: string; rotulo: string }) {
  return (
    <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] px-4 py-3.5">
      <div className="text-[22px] font-bold text-[#1D1D1F] leading-tight">{n}</div>
      <div className="text-[12.5px] text-[#6E6E73]">{rotulo}</div>
    </div>
  );
}

function Tabla({ columnas, children }: { columnas: string[]; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-[#F5F5F7]">
          <tr>
            {columnas.map(c => (
              <th key={c} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.04em] text-[#86868B]">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function FilaUsuario({
  usuario,
  workspaces,
  hacer,
}: {
  usuario: UsuarioDeControl;
  workspaces: WorkspaceDeControl[];
  hacer: (accion: () => Promise<unknown>) => Promise<void>;
}) {
  const [destino, setDestino] = React.useState('');
  const fuera = workspaces.filter(w => !usuario.membresias.some(m => m.workspaceId === w.id));
  return (
    <tr className="border-t border-[rgba(0,0,0,0.06)] align-top">
      <td className="px-4 py-3">
        <div className="text-[13.5px] font-bold text-[#1D1D1F]">
          {usuario.name}
          {usuario.superAdmin && (
            <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-[0.06em] text-indigo-600">super admin</span>
          )}
        </div>
        <div className="text-[12px] text-[#86868B]">{usuario.email}</div>
      </td>
      <td className="px-4 py-3">
        {usuario.membresias.length === 0 && <span className="text-[12.5px] text-[#86868B]">Sin workspace</span>}
        <ul className="space-y-1.5">
          {usuario.membresias.map(m => (
            <li key={m.workspaceId} className="flex items-center gap-2 text-[12.5px]">
              <span className="text-[#3A3A3C] min-w-[160px]">{m.workspaceName}</span>
              <select
                aria-label={`Rol de ${usuario.name} en ${m.workspaceName}`}
                value={m.role}
                onChange={e => void hacer(() => controlApi.guardarMembresia(usuario.id, m.workspaceId, e.target.value))}
                className="bg-white border border-[rgba(0,0,0,0.1)] rounded-md px-1.5 py-0.5 text-[12px]"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>
                    {WORKSPACE_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Sacar a ${usuario.name} de ${m.workspaceName}? Su cuenta y su trabajo se quedan.`))
                    void hacer(() => controlApi.quitarMembresia(usuario.id, m.workspaceId));
                }}
                className="text-[12px] text-[#86868B] hover:text-red-600"
              >
                Sacar
              </button>
            </li>
          ))}
        </ul>
      </td>
      <td className="px-4 py-3">
        {fuera.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              aria-label={`Agregar a ${usuario.name} a un workspace`}
              value={destino}
              onChange={e => setDestino(e.target.value)}
              className="bg-white border border-[rgba(0,0,0,0.1)] rounded-md px-1.5 py-0.5 text-[12px]"
            >
              <option value="">Elige un workspace</option>
              {fuera.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!destino}
              onClick={() => {
                void hacer(() => controlApi.guardarMembresia(usuario.id, destino, 'MEMBER'));
                setDestino('');
              }}
              className="text-[12px] font-semibold text-[#1D1D1F] disabled:text-[#C7C7CC]"
            >
              Agregar como miembro
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

/**
 * El verificador de formatos (2026-11-24): la biblioteca de CDM y el motor tienen que decir lo mismo de cada
 * formato. Uno de solo texto va directo a Implementación; uno con archivo espera su pieza. Si no coinciden, el copy
 * puede perderse entre Producción e Implementación.
 */
function VerificadorDeFormatos() {
  const [datos, setDatos] = React.useState<Awaited<ReturnType<typeof controlApi.formatos>> | null>(null);
  React.useEffect(() => {
    controlApi.formatos().then(setDatos).catch(() => setDatos(null));
  }, []);
  if (!datos) return null;
  return (
    <section className="mt-4 rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3">
      <h3 className="text-[13px] font-bold text-[#1D1D1F]">Formatos y canales</h3>
      {datos.problemas.length === 0 ? (
        <p className="mt-1 text-[12.5px] text-emerald-700">
          Los {datos.revisados} formatos de la biblioteca coinciden con su canal: los de solo texto van directo a Implementación y los
          que llevan archivo esperan su pieza.
        </p>
      ) : (
        <>
          <p className="mt-1 text-[12.5px] text-amber-800">
            {datos.problemas.length} de {datos.revisados} formatos no coinciden con su canal. Corrígelos en la biblioteca o en el motor:
            si no, su copy puede quedarse sin llegar a Implementación.
          </p>
          <ul className="mt-2 space-y-1 text-[12.5px] text-[#3A3A3C]">
            {datos.problemas.map((p, i) => (
              <li key={i}>
                <span className="font-semibold">
                  {p.medio} · {p.formato}
                </span>{' '}
                ({p.workspace}, canal {p.canal}, {p.tipoArchivo.toLowerCase()}): {p.problema}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
