import React from 'react';
import { Loader2, Upload, UserRoundCheck } from 'lucide-react';
import { Pieza, PiezaEstado } from '../../types';
import { piezasApi } from '../../services/api';

/**
 * La acción que vacía cada columna (D5), y ninguna más.
 *
 * Cada estado tiene exactamente una salida hacia adelante y, donde corresponde,
 * una hacia atrás que exige motivo escrito. **Solo se muestra lo que quien mira
 * puede hacer** (`pieza.puedo`, calculado por el servidor); en lugar del botón
 * que no le toca, se lee quién lo hace. Antes todos veían todo, y el servidor
 * se lo permitía a todos.
 *
 * **El motivo se escribe acá adentro, no en un `window.prompt`.** Es un dato
 * que queda guardado en el historial y que alguien va a leer después —es lo
 * primero que busca un diseñador cuando le devuelven una pieza—, así que
 * merece un campo del producto: uno que se pueda revisar antes de mandar,
 * cancelar sin perder nada y que no congele la pestaña mientras está abierto.
 */

interface Props {
  pieza: Pieza;
  miembros: { id: string; name: string; etiqueta?: string }[];
  onCambio: (pieza: Pieza) => void;
  onError: (mensaje: string) => void;
  /** En la tarjeta solo va la acción principal; en la orden de trabajo, todas. */
  compacto?: boolean;
}

const AYUDA: Record<PiezaEstado, string> = {
  POR_ASIGNAR: 'Elegí quién la diseña.',
  EN_DISENO: 'Cuando esté lista, subila. Se audita y recién ahí pasa a revisión.',
  POR_REVISAR: 'Miralo contra la orden de trabajo y decidí.',
  CON_EL_CLIENTE: 'El equipo ya la aceptó. Falta la aprobación del cliente.',
  LISTA: 'Terminada. Se puede reabrir con un motivo.',
};

/** Las acciones que no existen sin motivo: el texto es el dato, no un adorno. */
type ConMotivo = 'devolver' | 'reabrir';

const PEDIDO: Record<ConMotivo, { titulo: string; boton: string }> = {
  devolver: { titulo: '¿Por qué vuelve a diseño?', boton: 'Devolver' },
  reabrir: { titulo: '¿Por qué se reabre?', boton: 'Reabrir' },
};

/** Quien no puede decidir lee quién lo hace, en vez de un botón que no le toca. */
const QuienDecide = ({ texto }: { texto: string }) => (
  <p className="flex items-start gap-1.5 rounded-lg bg-apple-bg px-2 py-1.5 text-[10.5px] leading-snug text-apple-secondary">
    <UserRoundCheck className="mt-px h-3 w-3 shrink-0" />
    {texto}
  </p>
);

/**
 * El motivo va separado en dos, y no es un capricho de formulario: **lo de copy
 * y lo de diseño no los resuelve la misma persona**. Escribirlos juntos obliga
 * a quien recibe la pieza a leer un párrafo y decidir qué parte es suya.
 *
 * Los dos son opcionales y basta con uno. Pedir los dos hace que se escriba
 * «ok» en el segundo, y ahí se perdió la señal que el desglose venía a dar.
 */
const CAMPOS = [
  {
    clave: 'notaDiseno' as const,
    etiqueta: 'Del arte',
    color: '#7C5CFF',
    ejemplo: 'El logo quedó sobre la foto y no se lee…',
  },
  {
    clave: 'notaCopy' as const,
    etiqueta: 'Del mensaje',
    color: '#0071E3',
    ejemplo: 'El hook no es el que aprobó el cliente…',
  },
];

export default function AccionesPieza({ pieza, miembros, onCambio, onError, compacto }: Props) {
  const [enlace, setEnlace] = React.useState(pieza.enlace ?? '');
  const [quien, setQuien] = React.useState(pieza.asignadaAId ?? '');
  const [ocupado, setOcupado] = React.useState(false);
  const [pidiendo, setPidiendo] = React.useState<ConMotivo | null>(null);
  const [motivos, setMotivos] = React.useState<{ notaCopy: string; notaDiseno: string }>({
    notaCopy: '',
    notaDiseno: '',
  });
  const [subiendo, setSubiendo] = React.useState(false);
  /** Aceptar con hallazgos sin decidir pide una línea de por qué. */
  const [notaAceptar, setNotaAceptar] = React.useState<string | null>(null);
  const archivoRef = React.useRef<HTMLInputElement>(null);
  const { puedo } = pieza;
  const pendientes = pieza.version?.pendientes ?? 0;
  const responsable = pieza.project?.responsable?.name ?? 'el responsable de la campaña';

  /**
   * Los canales gráficos entregan el ARCHIVO: es lo único que la auditoría
   * puede leer, y lo que convierte la previa en evidencia. El video y el audio
   * siguen con enlace — con el tope de 10 MB un reel no entra.
   */
  const grafica = pieza.tipo === 'GRAFICA';

  const subir = async (archivo: File | undefined) => {
    if (!archivo) return;
    setSubiendo(true);
    try {
      onCambio(await piezasApi.subirArchivo(pieza.id, archivo));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo subir la pieza');
    } finally {
      setSubiendo(false);
      if (archivoRef.current) archivoRef.current.value = '';
    }
  };

  const correr = async (fn: () => Promise<Pieza>) => {
    setOcupado(true);
    try {
      onCambio(await fn());
    } catch (e) {
      // El 409 de una transición ilegal llega acá: alguien movió la pieza
      // mientras esta pantalla mostraba el estado viejo.
      onError(e instanceof Error ? e.message : 'No se pudo actualizar la pieza');
    } finally {
      setOcupado(false);
    }
  };

  const limpios = {
    notaCopy: motivos.notaCopy.trim(),
    notaDiseno: motivos.notaDiseno.trim(),
  };
  const hayMotivo = !!(limpios.notaCopy || limpios.notaDiseno);

  const confirmarMotivo = async () => {
    if (!pidiendo || !hayMotivo) return;
    const accion = pidiendo === 'devolver' ? piezasApi.devolver : piezasApi.reabrir;
    await correr(() => accion(pieza.id, limpios));
    setPidiendo(null);
    setMotivos({ notaCopy: '', notaDiseno: '' });
  };

  const pedir = (cual: ConMotivo) => {
    setPidiendo(cual);
    setMotivos({ notaCopy: '', notaDiseno: '' });
  };

  const boton = 'rounded-lg px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-40';
  const primario = `${boton} bg-ink text-white hover:bg-ink-hover`;
  const secundario = `${boton} border border-apple-border text-apple-text hover:bg-apple-fill`;

  if (notaAceptar !== null) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-apple-text">
          {pendientes === 1 ? 'Hay un hallazgo sin decidir.' : `Hay ${pendientes} hallazgos sin decidir.`} ¿Por qué va igual?
        </p>
        <textarea
          autoFocus
          rows={2}
          value={notaAceptar}
          onChange={e => setNotaAceptar(e.target.value)}
          onKeyDown={e => e.key === 'Escape' && setNotaAceptar(null)}
          placeholder="La diferencia es de la miniatura; en el tamaño real se lee bien…"
          className="w-full rounded-lg border border-apple-border px-2 py-1.5 text-[11px] text-apple-text"
        />
        <p className="text-[10px] text-apple-tertiary">Queda en el historial. También podés decidir cada hallazgo en la orden de trabajo.</p>
        <div className="flex items-center gap-2">
          <button
            disabled={!notaAceptar.trim() || ocupado}
            onClick={async () => {
              await correr(() => piezasApi.aceptar(pieza.id, notaAceptar.trim()));
              setNotaAceptar(null);
            }}
            className={primario}
          >
            Aceptar igual
          </button>
          <button disabled={ocupado} onClick={() => setNotaAceptar(null)} className={secundario}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // Mientras se escribe el motivo, esa es la única acción visible: evita
  // aceptar por error una pieza que se estaba por devolver.
  if (pidiendo) {
    const { titulo, boton: etiqueta } = PEDIDO[pidiendo];
    return (
      <div className="space-y-2.5">
        <p className="text-[11px] font-semibold text-apple-text">{titulo}</p>

        {CAMPOS.map((campo, i) => (
          <div key={campo.clave} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: campo.color }} />
              <span className="text-[10px] font-semibold text-apple-text">{campo.etiqueta}</span>
              <span className="text-[10px] text-apple-tertiary">opcional</span>
            </div>
            <textarea
              autoFocus={i === 0}
              rows={2}
              value={motivos[campo.clave]}
              onChange={e => setMotivos(m => ({ ...m, [campo.clave]: e.target.value }))}
              onKeyDown={e => {
                if (e.key === 'Escape') setPidiendo(null);
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void confirmarMotivo();
              }}
              placeholder={campo.ejemplo}
              className="w-full rounded-lg border border-apple-border px-2 py-1.5 text-[11px] text-apple-text"
            />
          </div>
        ))}

        <p className="text-[10px] text-apple-tertiary">
          Con uno alcanza. Cada uno queda en el historial por separado, porque no los resuelve la
          misma persona.
        </p>
        <div className="flex items-center gap-2">
          <button disabled={!hayMotivo || ocupado} onClick={() => void confirmarMotivo()} className={primario}>
            {etiqueta}
          </button>
          <button disabled={ocupado} onClick={() => setPidiendo(null)} className={secundario}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!compacto && <p className="text-[11px] text-apple-tertiary">{AYUDA[pieza.estado]}</p>}

      {pieza.estado === 'POR_ASIGNAR' && !puedo.asignar && (
        <QuienDecide texto={`Asigna quien administra o ${responsable}.`} />
      )}

      {pieza.estado === 'POR_ASIGNAR' && puedo.asignar && (
        <div className="flex items-center gap-2">
          <select
            value={quien}
            onChange={e => setQuien(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-apple-border px-2 py-1.5 text-[11px] text-apple-text"
          >
            <option value="">Asignar a…</option>
            {miembros.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.etiqueta ? ` · ${m.etiqueta}` : ''}
              </option>
            ))}
          </select>
          <button
            disabled={!quien || ocupado}
            onClick={() => correr(() => piezasApi.asignar(pieza.id, quien))}
            className={primario}
          >
            Asignar
          </button>
        </div>
      )}

      {pieza.estado === 'EN_DISENO' && pieza.devolucion?.esperaCopy && (
        <p className="rounded-lg bg-sky-50 px-2 py-1.5 text-[10.5px] leading-snug text-sky-800">
          Hay un cambio de mensaje pendiente: {responsable} corrige el copy en la orden de trabajo antes de que
          se actualice el arte.
        </p>
      )}

      {pieza.estado === 'EN_DISENO' && !puedo.entregar && (
        <QuienDecide
          texto={pieza.asignadaA ? `La está diseñando ${pieza.asignadaA.name}.` : 'Todavía no tiene a quién se le asignó.'}
        />
      )}

      {pieza.estado === 'EN_DISENO' && grafica && puedo.entregar && (
        <div className="space-y-2">
          <input
            ref={archivoRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={e => void subir(e.target.files?.[0])}
            className="hidden"
          />
          <button
            disabled={subiendo || ocupado}
            onClick={() => archivoRef.current?.click()}
            className={`${primario} flex w-full items-center justify-center gap-1.5`}
          >
            {subiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {subiendo
              ? 'Subiendo…'
              : pieza.semaforo === 'auditando'
                ? 'Subir otra versión'
                : 'Subir la pieza'}
          </button>
          <p className="text-[10px] text-apple-tertiary">
            {pieza.semaforo === 'auditando'
              ? `Auditando la versión ${pieza.version?.numero ?? ''}: pasa a revisión cuando termine.`
              : 'PNG, JPG o WEBP · hasta 10 MB'}
          </p>
        </div>
      )}

      {pieza.estado === 'EN_DISENO' && !grafica && puedo.entregar && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={enlace}
              onChange={e => setEnlace(e.target.value)}
              placeholder="https://drive.google.com/file/d/…"
              title="El video y el audio se entregan con un enlace"
              className="min-w-0 flex-1 rounded-lg border border-apple-border px-2 py-1.5 text-[11px] text-apple-text"
            />
            <button
              disabled={!enlace.trim() || ocupado}
              onClick={() => correr(() => piezasApi.entregar(pieza.id, enlace.trim()))}
              className={primario}
            >
              Entregar
            </button>
          </div>
        </div>
      )}

      {/* Reasignar: antes el selector solo existía en Por asignar, y el botón
          reasignaba a la misma persona. */}
      {pieza.estado === 'EN_DISENO' && puedo.asignar && !compacto && (
        <div className="flex items-center gap-2">
          <select
            value={quien}
            onChange={e => setQuien(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-apple-border px-2 py-1.5 text-[11px] text-apple-text"
          >
            {miembros.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.etiqueta ? ` · ${m.etiqueta}` : ''}
              </option>
            ))}
          </select>
          <button
            disabled={!quien || quien === pieza.asignadaAId || ocupado}
            onClick={() => correr(() => piezasApi.reasignar(pieza.id, quien))}
            className={secundario}
          >
            Reasignar
          </button>
        </div>
      )}

      {pieza.estado === 'POR_REVISAR' && puedo.aceptar && (
        <div className="flex items-center gap-2">
          <button
            disabled={ocupado}
            onClick={() => (pendientes > 0 ? setNotaAceptar('') : correr(() => piezasApi.aceptar(pieza.id)))}
            className={primario}
          >
            Aceptar
          </button>
          <button disabled={ocupado} onClick={() => pedir('devolver')} className={secundario}>
            Devolver a diseño
          </button>
        </div>
      )}
      {pieza.estado === 'POR_REVISAR' && !puedo.aceptar && pieza.quienDecide && (
        <QuienDecide texto={pieza.quienDecide} />
      )}

      {pieza.estado === 'CON_EL_CLIENTE' && (
        <div className="space-y-2">
          {!compacto && (
            <p className="text-[10.5px] text-apple-secondary">
              {pieza.enviadaAlCliente
                ? 'Enviada: espera la respuesta del cliente.'
                : 'Sin enviar: se manda desde la cabecera de la columna «Con el cliente».'}
            </p>
          )}
          {puedo.devolver && !compacto && (
            <button disabled={ocupado} onClick={() => pedir('devolver')} className={secundario}>
              Devolver a diseño
            </button>
          )}
        </div>
      )}

      {pieza.estado === 'LISTA' && puedo.reabrir && (
        <button disabled={ocupado} onClick={() => pedir('reabrir')} className={secundario}>
          Reabrir
        </button>
      )}

      {/* En la tarjeta el enlace ya está arriba, con la previa: acá duplicaba. */}
      {pieza.enlace && pieza.estado !== 'EN_DISENO' && !compacto && (
        <a
          href={pieza.enlace}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-[11px] text-apple-blue hover:underline"
        >
          {pieza.enlace}
        </a>
      )}
    </div>
  );
}
