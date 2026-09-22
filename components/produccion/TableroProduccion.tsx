import React from 'react';
import { Loader2 } from 'lucide-react';
import { SCREENS } from '../../screens';
import { Client, Pieza, PiezaEstado } from '../../types';
import { authApi, piezasApi } from '../../services/api';
import TarjetaPieza from './TarjetaPieza';
import OrdenDeTrabajo from './OrdenDeTrabajo';

/**
 * El tablero de producción (H2 fase 2).
 *
 * Dos vistas sobre el mismo dato, y el orden de cada una es la diferencia:
 *
 *   · **Por marca** — cuatro columnas, como el proceso. Es el alcance de todo
 *     el producto: una marca a la vez.
 *   · **Mis piezas** — cruza marcas, porque un diseñador trabaja en varias, y
 *     ordena por lo que él tiene que hacer, no por el estado: primero lo que
 *     está en sus manos, después lo que espera a otro.
 *
 * La pantalla pide sus propios datos en vez de recibirlos de `App.tsx`. Es
 * deliberado: `App.tsx` ya concentra casi todo el estado del producto (E3), y
 * agregarle el tablero sería empeorar el problema que el H2 va a tener que
 * resolver igual cuando crezca.
 */

interface Props {
  clients: Client[];
  addNotification: (mensaje: string, tipo?: string) => void;
}

const COLUMNAS: { estado: PiezaEstado; nombre: string; dueño: string }[] = [
  { estado: 'POR_ASIGNAR', nombre: 'Por asignar', dueño: 'quien produce' },
  { estado: 'EN_DISENO', nombre: 'En diseño', dueño: 'el diseñador' },
  { estado: 'POR_REVISAR', nombre: 'Por revisar', dueño: 'quien aprueba' },
  { estado: 'LISTA', nombre: 'Lista', dueño: 'nadie: es el final' },
];

export default function TableroProduccion({ clients, addNotification }: Props) {
  const [vista, setVista] = React.useState<'marca' | 'mias'>('marca');
  const [clientId, setClientId] = React.useState(clients[0]?.id ?? '');
  const [piezas, setPiezas] = React.useState<Pieza[]>([]);
  const [miembros, setMiembros] = React.useState<{ id: string; name: string }[]>([]);
  const [cargando, setCargando] = React.useState(true);
  const [abierta, setAbierta] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!clientId && clients[0]) setClientId(clients[0].id);
  }, [clients, clientId]);

  React.useEffect(() => {
    authApi
      .list()
      .then((data: { id: string; name: string }[]) => Array.isArray(data) && setMiembros(data))
      .catch(() => setMiembros([]));
  }, []);

  const cargar = React.useCallback(async () => {
    if (vista === 'marca' && !clientId) {
      setPiezas([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      setPiezas(vista === 'marca' ? await piezasApi.listar(clientId) : await piezasApi.mias());
    } catch (e) {
      addNotification(e instanceof Error ? e.message : 'Error al cargar el tablero', 'error');
    } finally {
      setCargando(false);
    }
  }, [vista, clientId, addNotification]);

  React.useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * Una transición puede sacar la pieza de la vista actual (Mis piezas deja de
   * mostrarla al reasignarla), así que se recarga en vez de parchear la lista.
   */
  const trasCambio = (actualizada: Pieza) => {
    setPiezas(prev => prev.map(p => (p.id === actualizada.id ? actualizada : p)));
    void cargar();
  };

  const error = (mensaje: string) => addNotification(mensaje, 'error');

  const enDiseno = piezas.filter(p => p.estado === 'EN_DISENO');
  const porColumna = (estado: PiezaEstado) => piezas.filter(p => p.estado === estado);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold text-apple-text">{SCREENS.produccion.name}</h2>
          <p className="mt-1 text-[13px] text-apple-secondary">{SCREENS.produccion.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {vista === 'marca' && (
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="rounded-lg border border-apple-border px-3 py-2 text-[12px] text-apple-text"
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex rounded-lg border border-apple-border p-0.5">
            {([['marca', 'Por marca'], ['mias', 'Mis piezas']] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setVista(id)}
                className={`rounded-md px-3 py-1.5 text-[12px] font-medium ${
                  vista === id ? 'bg-ink text-white' : 'text-apple-secondary hover:text-apple-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {cargando && (
        <div className="flex items-center gap-2 text-[13px] text-apple-secondary">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando piezas…
        </div>
      )}

      {!cargando && piezas.length === 0 && (
        <div className="rounded-xl border border-dashed border-apple-border p-8 text-center">
          <p className="text-[13px] font-medium text-apple-text">
            {vista === 'marca' ? 'Todavía no hay piezas en producción' : 'No tenés piezas asignadas'}
          </p>
          <p className="mt-1 text-[12px] text-apple-secondary">
            Las piezas nacen en la Biblioteca: seleccioná copy aprobado y mandalo a producción.
          </p>
        </div>
      )}

      {!cargando && piezas.length > 0 && vista === 'marca' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNAS.map(col => {
            const suyas = porColumna(col.estado);
            return (
              <section key={col.estado} className="rounded-xl bg-apple-bg p-3">
                <header className="flex items-baseline justify-between px-1">
                  <h3 className="text-[12px] font-semibold text-apple-text">{col.nombre}</h3>
                  <span className="text-[11px] text-apple-tertiary">{suyas.length}</span>
                </header>
                <p className="px-1 text-[10px] text-apple-tertiary">{col.dueño}</p>
                <div className="mt-3 space-y-3">
                  {suyas.map(p => (
                    <TarjetaPieza
                      key={p.id}
                      pieza={p}
                      miembros={miembros}
                      onAbrir={setAbierta}
                      onCambio={trasCambio}
                      onError={error}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {!cargando && piezas.length > 0 && vista === 'mias' && (
        <div className="space-y-6">
          {/*
            Para el diseñador la urgencia no es el estado: lo que tiene que
            hacer va primero, y lo que está esperando a otro, después. El motivo
            de una devolución se lee en el historial de la orden de trabajo.
          */}
          {enDiseno.length > 0 && (
            <section>
              <h3 className="text-[12px] font-semibold text-apple-text">En diseño</h3>
              <p className="text-[11px] text-apple-tertiary">Asignadas y todavía sin entregar.</p>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {enDiseno.map(p => (
                  <TarjetaPieza
                    key={p.id}
                    pieza={p}
                    miembros={miembros}
                    mostrarMarca
                    onAbrir={setAbierta}
                    onCambio={trasCambio}
                    onError={error}
                  />
                ))}
              </div>
            </section>
          )}
          {(['POR_REVISAR', 'LISTA', 'POR_ASIGNAR'] as PiezaEstado[]).map(estado => {
            const suyas = porColumna(estado);
            if (suyas.length === 0) return null;
            const col = COLUMNAS.find(c => c.estado === estado)!;
            return (
              <section key={estado}>
                <h3 className="text-[12px] font-semibold text-apple-text">{col.nombre}</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {suyas.map(p => (
                    <TarjetaPieza
                      key={p.id}
                      pieza={p}
                      miembros={miembros}
                      mostrarMarca
                      onAbrir={setAbierta}
                      onCambio={trasCambio}
                      onError={error}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {abierta && (
        <OrdenDeTrabajo
          piezaId={abierta}
          miembros={miembros}
          onCerrar={() => setAbierta(null)}
          onCambio={trasCambio}
          onError={error}
        />
      )}
    </div>
  );
}
