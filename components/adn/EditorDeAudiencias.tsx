import React from 'react';
import { Archive, Check, Plus, Sparkles, X } from 'lucide-react';
import type { Audiencia, DescriptoresAudiencia } from '../../types';
import { clientApi } from '../../services/api';
import { DESCRIPTORES, FUENTES } from './catalogo';

/**
 * Las audiencias de una marca (ADN-1, docs/plan-adn-2.md): una lista fija que cada campaña reutiliza.
 * Se editan de a una. No se borran: se archivan, porque una campaña pudo haberlas usado. Las que propuso
 * la IA esperan un «Está bien» y hasta entonces no llegan al motor.
 */
interface Props {
  clientId: string;
  marca: string;
  onCambio: () => void;
  onCerrar: () => void;
}

const VACIA: DescriptoresAudiencia = { quienEs: '', queLeImporta: '', queLaFrena: '', comoHabla: '' };

const campo =
  'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12.5px] leading-relaxed text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-500';

const EditorDeAudiencias: React.FC<Props> = ({ clientId, marca, onCambio, onCerrar }) => {
  const [lista, setLista] = React.useState<Audiencia[] | null>(null);
  const [editando, setEditando] = React.useState<{ id: string | null; nombre: string; descriptores: DescriptoresAudiencia } | null>(null);
  const [ocupado, setOcupado] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [verArchivadas, setVerArchivadas] = React.useState(false);

  const cargar = React.useCallback(
    () => clientApi.audiencias(clientId).then(setLista).catch((e: Error) => setError(e.message)),
    [clientId]
  );
  React.useEffect(() => {
    cargar();
  }, [cargar]);

  const hacer = async (accion: () => Promise<unknown>) => {
    setOcupado(true);
    setError(null);
    try {
      await accion();
      await cargar();
      onCambio();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const guardar = async () => {
    if (!editando) return;
    const datos = { nombre: editando.nombre, descriptores: editando.descriptores };
    const ok = await hacer(() =>
      editando.id ? clientApi.actualizarAudiencia(clientId, editando.id, datos) : clientApi.crearAudiencia(clientId, datos)
    );
    if (ok) setEditando(null);
  };

  const vigentes = (lista ?? []).filter(a => !a.archivada);
  const archivadas = (lista ?? []).filter(a => a.archivada);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onCerrar}>
      <div className="flex max-h-[85vh] w-full max-w-[720px] flex-col rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-gray-900">Audiencias de {marca}</h3>
            <p className="mt-0.5 text-[12px] text-gray-500">
              Cada campaña elige de esta lista. Cada una necesita quién es, qué le importa, qué la frena y cómo habla.
            </p>
          </div>
          <button onClick={onCerrar} className="rounded-md p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
          {!lista && !error && <p className="text-[12px] text-gray-400">Cargando…</p>}
          {lista && vigentes.length === 0 && !editando && (
            <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-[12.5px] text-gray-500">
              Todavía no hay audiencias.
            </p>
          )}
          {vigentes.map(a =>
            editando?.id === a.id ? null : (
              <div
                key={a.id}
                className={`rounded-xl border p-3 ${a.origen === 'IA_PROPUESTA' ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200'}`}
              >
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-[13px] font-semibold text-gray-900">{a.nombre}</p>
                  {a.origen === 'IA_PROPUESTA' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10.5px] font-semibold text-blue-700">
                      <Sparkles className="h-3 w-3" /> IA{a.fuente ? ` · ${FUENTES[a.fuente] ?? a.fuente}` : ''} · sin confirmar
                    </span>
                  )}
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {DESCRIPTORES.map(d => (
                    <div key={d.clave}>
                      <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-400">{d.nombre}</dt>
                      <dd className={`text-[12px] leading-snug ${a.descriptores[d.clave] ? 'text-gray-700' : 'text-amber-600'}`}>
                        {a.descriptores[d.clave] || 'Falta'}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-2.5 flex justify-end gap-2">
                  <button
                    onClick={() => hacer(() => clientApi.actualizarAudiencia(clientId, a.id, { archivada: true }))}
                    disabled={ocupado}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] text-gray-400 hover:text-gray-700"
                  >
                    <Archive className="h-3.5 w-3.5" /> {a.origen === 'IA_PROPUESTA' ? 'Descartar' : 'Archivar'}
                  </button>
                  <button
                    onClick={() => setEditando({ id: a.id, nombre: a.nombre, descriptores: { ...VACIA, ...a.descriptores } })}
                    disabled={ocupado}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11.5px] text-gray-700 hover:bg-gray-50"
                  >
                    {a.origen === 'IA_PROPUESTA' ? 'Corregir' : 'Editar'}
                  </button>
                  {a.origen === 'IA_PROPUESTA' && (
                    <button
                      onClick={() => hacer(() => clientApi.actualizarAudiencia(clientId, a.id, { confirmar: true }))}
                      disabled={ocupado}
                      className="inline-flex items-center gap-1 rounded-lg bg-ink px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-ink-hover"
                    >
                      <Check className="h-3.5 w-3.5" /> Está bien
                    </button>
                  )}
                </div>
              </div>
            )
          )}

          {editando && (
            <div className="space-y-2 rounded-xl border-[1.5px] border-gray-900 p-3">
              <input
                autoFocus
                value={editando.nombre}
                onChange={e => setEditando({ ...editando, nombre: e.target.value })}
                placeholder="Nombre: Familias que viajan por carretera"
                className={`${campo} font-semibold`}
              />
              <div className="grid grid-cols-2 gap-2">
                {DESCRIPTORES.map(d => (
                  <label key={d.clave} className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-400">
                    {d.nombre}
                    <textarea
                      rows={2}
                      value={editando.descriptores[d.clave]}
                      onChange={e => setEditando({ ...editando, descriptores: { ...editando.descriptores, [d.clave]: e.target.value } })}
                      className={`${campo} mt-0.5 font-normal normal-case tracking-normal`}
                    />
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditando(null)} className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11.5px] text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={ocupado || !editando.nombre.trim()}
                  className="rounded-lg bg-ink px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-ink-hover disabled:opacity-50"
                >
                  {ocupado ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {!editando && lista && (
            <button
              onClick={() => setEditando({ id: null, nombre: '', descriptores: VACIA })}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2.5 text-[12.5px] font-medium text-gray-700 hover:border-gray-500"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar audiencia
            </button>
          )}

          {archivadas.length > 0 && (
            <div className="pt-1">
              <button onClick={() => setVerArchivadas(!verArchivadas)} className="text-[11.5px] text-gray-400 hover:text-gray-700">
                {verArchivadas ? 'Ocultar' : 'Ver'} archivadas ({archivadas.length})
              </button>
              {verArchivadas &&
                archivadas.map(a => (
                  <div key={a.id} className="mt-1.5 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5">
                    <span className="text-[12px] text-gray-500">{a.nombre}</span>
                    <button
                      onClick={() => hacer(() => clientApi.actualizarAudiencia(clientId, a.id, { archivada: false }))}
                      disabled={ocupado}
                      className="text-[11.5px] font-medium text-gray-700 hover:text-gray-900"
                    >
                      Recuperar
                    </button>
                  </div>
                ))}
            </div>
          )}
          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default EditorDeAudiencias;
