import React from 'react';
import { ArrowUpRight, Check, Lock, Pencil, Sparkles, Star } from 'lucide-react';
import type { AdnDeMarca as Adn, ClaveAdn, ContenidoSeccionAdn } from '../../types';
import { clientApi } from '../../services/api';
import Info from '../ui/Info';
import { COLOR_ESTADO, elementos, FUENTES, GRUPOS, SECCIONES, SeccionEnPantalla, seccionDe } from './catalogo';
import EditorDeSeccion from './EditorDeSeccion';
import EditorDeAudiencias from './EditorDeAudiencias';
import PropuestaDeIa, { textoDeContenido } from './PropuestaDeIa';

/**
 * El ADN 2.0 de una marca (docs/plan-adn-2.md, F2; diseño en el .pen: «§ ADN 2.0 · una marca madre» y
 * «§ ADN 2.0 · una submarca»). Una sola pantalla para madre, submarca y marca suelta: el anillo de
 * completitud con el mínimo, y las diez secciones en tres grupos, cada una con su estado, su origen y
 * su acción.
 *
 * Todo lo calcula el server (`GET /clients/:id/adn`): la pantalla no decide si una sección está completa.
 * Después de cada cambio vuelve a pedirlo y avisa a Marcas (`onCambio`) para que el chip se actualice.
 */
interface Props {
  clientId: string;
  marca: string;
  /** La madre declarada, aunque su ADN no esté confirmado: para decir de quién va a heredar. */
  madreDeclarada: { id: string; name: string } | null;
  submarcas: number;
  /**
   * Madre con el ADN por confirmar: una sección vacía o débil también se puede dar por buena, como en
   * la revisión de antes; si no, una madre sin keywords no podía confirmar nunca.
   */
  pideRevision?: boolean;
  onAbrirMarca: (id: string) => void;
  onCambio: () => void;
  /** Cambia cuando algo de afuera tocó el ADN (la revisión de la madre): se vuelve a pedir. */
  recarga?: number;
}

type Edicion =
  | { tipo: 'seccion'; clave: ClaveAdn; inicial: ContenidoSeccionAdn; modo?: 'PROPIA'; propuesta?: boolean }
  | { tipo: 'audiencias' }
  | { tipo: 'propuesta'; clave: ClaveAdn };

const fecha = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const Anillo: React.FC<{ porcentaje: number; minimo: number; apta: boolean }> = ({ porcentaje, minimo, apta }) => {
  const r = 40;
  const c = 2 * Math.PI * r;
  const angulo = (minimo / 100) * 2 * Math.PI - Math.PI / 2;
  return (
    <svg viewBox="0 0 100 100" className="h-[92px] w-[92px] shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#E5E7EB" strokeWidth="10" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={apta ? '#10B981' : '#F59E0B'}
        strokeWidth="10"
        strokeDasharray={`${(porcentaje / 100) * c} ${c}`}
        transform="rotate(-90 50 50)"
      />
      {/* La marca del mínimo. */}
      <line
        x1={50 + 31 * Math.cos(angulo)}
        y1={50 + 31 * Math.sin(angulo)}
        x2={50 + 49 * Math.cos(angulo)}
        y2={50 + 49 * Math.sin(angulo)}
        stroke="#111827"
        strokeWidth="2"
      />
      <text x="50" y="56" textAnchor="middle" className="fill-gray-900 text-[19px] font-semibold">
        {porcentaje} %
      </text>
    </svg>
  );
};

const AdnDeMarca: React.FC<Props> = ({ clientId, marca, madreDeclarada, submarcas, pideRevision, onAbrirMarca, onCambio, recarga }) => {
  const [adn, setAdn] = React.useState<Adn | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [edicion, setEdicion] = React.useState<Edicion | null>(null);
  const [ocupado, setOcupado] = React.useState<string | null>(null);

  const cargar = React.useCallback(
    () =>
      clientApi
        .adn(clientId)
        .then((a: Adn) => setAdn(a))
        .catch((e: Error) => setError(e.message)),
    [clientId]
  );
  // Otra marca: se limpia. Un cambio (`recarga`): se vuelve a leer sin borrar lo que se ve.
  React.useEffect(() => {
    setAdn(null);
    setError(null);
  }, [clientId]);
  React.useEffect(() => {
    cargar();
  }, [cargar, recarga]);

  if (!adn) return error ? <p className="text-[12px] text-red-600">{error}</p> : <p className="text-[12px] text-gray-400">Cargando el ADN…</p>;

  const madre = adn.marcaMadre;
  const { completitud } = adn;
  const evaluada = (clave: ClaveAdn) => completitud.secciones.find(s => s.clave === clave)!;
  const pendientes = completitud.secciones.filter(s => s.propuestaPendiente).map(s => s.clave);

  /**
   * Un cambio: se hace y se avisa a Marcas, que sube `recarga` (esta pantalla y la franja de revisión
   * vuelven a leer) y recarga las marcas para el chip. Un error queda arriba de las tarjetas.
   */
  const hacer = async (clave: string, accion: () => Promise<unknown>) => {
    setOcupado(clave);
    setError(null);
    try {
      await accion();
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
      throw e;
    } finally {
      setOcupado(null);
    }
  };

  /** Lo propio de la sección, que es lo que se edita. Sin filas (antes del backfill), lo resuelto es lo propio. */
  const propio = (clave: ClaveAdn): ContenidoSeccionAdn =>
    adn.filas[clave]?.contenido ?? (madre ? { texto: adn.secciones[clave].propio } : adn.secciones[clave].contenido);

  const editar = (s: SeccionEnPantalla) => {
    if (s.clave === 'audiencias') return setEdicion({ tipo: 'audiencias' });
    setEdicion({ tipo: 'seccion', clave: s.clave, inicial: propio(s.clave) });
  };

  /** «Propia» en una submarca: se edita partiendo de lo de la madre, y al guardar deja de heredar. */
  const hacerPropia = async (s: SeccionEnPantalla) => {
    if (s.clave === 'audiencias') {
      await hacer(s.clave, () => clientApi.guardarSeccionAdn(clientId, s.clave, { modo: 'PROPIA' })).catch(() => {});
      return setEdicion({ tipo: 'audiencias' });
    }
    setEdicion({ tipo: 'seccion', clave: s.clave, inicial: adn.secciones[s.clave].contenido, modo: 'PROPIA' });
  };

  const conteo = {
    completas: completitud.secciones.filter(s => s.estado === 'COMPLETA').length,
    debiles: completitud.secciones.filter(s => s.estado === 'DEBIL').length,
    vacias: completitud.secciones.filter(s => s.estado === 'VACIA').length,
  };
  const porOrigen = {
    deMadre: SECCIONES.filter(s => adn.secciones[s.clave].origen === 'MADRE').length,
    propias: SECCIONES.filter(s => adn.secciones[s.clave].origen === 'PROPIA').length,
    suman: SECCIONES.filter(s => adn.secciones[s.clave].origen === 'SUMA').length,
  };

  const irA = (clave: ClaveAdn) => document.getElementById(`adn-${clave}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const tarjeta = (s: SeccionEnPantalla) => {
    const resuelta = adn.secciones[s.clave];
    const ev = evaluada(s.clave);
    const fila = adn.filas[s.clave];
    const fija = s.modos.length === 1;
    const hereda = Boolean(madre) && !fija && resuelta.modo === 'HEREDA';
    const color = COLOR_ESTADO[ev.propuestaPendiente ? 'PROPUESTA' : ev.estado];
    const vacia = ev.estado === 'VACIA';
    const revisada = Boolean(fila?.revisadaEn);
    // Una submarca en una sección que suma, sin nada propio: todo lo que se ve es de la madre.
    const sinPropio = Boolean(madre) && fija && !resuelta.propio;
    const lineas = textoDeContenido(s.clave, resuelta.contenido);
    const resumen =
      s.clave === 'audiencias'
        ? (resuelta.contenido.audiencias ?? []).map(a => a.nombre).join(' · ')
        : s.clave === 'asiSuena' && resuelta.contenido.ejemplos?.length
          ? `${lineas[0]} · ${resuelta.contenido.ejemplos.length} de 3`
          : s.separador && s.separador !== '\n'
            ? elementos(resuelta.texto, s.separador).join(' · ')
            : s.separador === '\n'
              ? elementos(resuelta.texto, '\n').join(' · ')
              : lineas.join(' · ');
    const quien = [
      fila?.autor && `Escribió ${fila.autor} el ${fecha(fila.actualizadaEn)}`,
      fila?.revisadaPor && `Revisó ${fila.revisadaPor} el ${fecha(fila.revisadaEn)}`,
    ]
      .filter(Boolean)
      .join('. ');
    const ayuda = quien ? `${s.ayuda} ${quien}.` : s.ayuda;
    const ocupada = ocupado === s.clave;

    return (
      <div id={`adn-${s.clave}`} className={`flex min-h-[150px] flex-col rounded-xl border-[1.5px] bg-white p-3.5 ${color.borde}`}>
        <div className="flex items-start gap-2">
          <span className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${color.punto}`} />
          <p className="flex-1 text-[13px] font-semibold leading-snug text-gray-900">
            {s.nombre}
            {s.critica && <Star className="ml-1 inline h-3 w-3 fill-amber-400 text-amber-400" aria-label="Imprescindible" />}
          </p>
          {madre && fija && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10.5px] font-semibold text-violet-700">
              <Lock className="h-2.5 w-2.5" /> Suma
            </span>
          )}
          {madre && !fija && (
            <div className="flex shrink-0 rounded-md bg-gray-100 p-[2px] text-[10.5px]">
              <button
                onClick={() => !hereda && hacer(s.clave, () => clientApi.guardarSeccionAdn(clientId, s.clave, { modo: 'HEREDA' })).catch(() => {})}
                disabled={ocupado !== null}
                className={`rounded px-1.5 py-0.5 ${hereda ? 'bg-white font-semibold text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                = {madre.name}
              </button>
              <button
                onClick={() => hereda && hacerPropia(s)}
                disabled={ocupado !== null}
                className={`rounded px-1.5 py-0.5 ${!hereda ? 'bg-white font-semibold text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                Propia
              </button>
            </div>
          )}
        </div>

        <div className="mt-2 min-w-0 flex-1 text-[12.5px] leading-relaxed">
          {madre && (hereda || (fija && resuelta.deMadre)) ? (
            <>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                <span className="h-2 w-2 rounded-sm bg-red-600" /> de {madre.name}
              </p>
              <p className="line-clamp-2 text-gray-400">
                {hereda ? resumen || '—' : elementos(resuelta.deMadre, s.separador).join(' · ')}
              </p>
              {fija && (
                <>
                  <p className="mt-1 text-[11px] font-semibold text-violet-700">+ propias</p>
                  <p className="line-clamp-2 text-gray-800">
                    {elementos(resuelta.propio, s.separador).join(' · ') || <span className="text-gray-400">ninguna</span>}
                  </p>
                </>
              )}
            </>
          ) : (
            <p className={`line-clamp-3 ${vacia ? 'text-gray-400' : 'text-gray-700'}`}>{resumen || '—'}</p>
          )}
          {ev.motivo && !vacia && <p className="mt-1 text-[11px] text-amber-700">{ev.motivo}</p>}
          {s.clave === 'asiSuena' && vacia && (
            <p className="mt-1 text-[11px] text-gray-500">Mientras tanto el motor usa los 5 últimos textos aprobados.</p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 whitespace-nowrap">
          {fila && !vacia && !hereda && !sinPropio && (
            <span
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] ${
                fila.origen === 'IA_CONFIRMADA' ? 'bg-violet-50 text-violet-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {fila.origen === 'IA_CONFIRMADA' && <Sparkles className="h-2.5 w-2.5" />}
              {fila.origen === 'IA_CONFIRMADA' ? 'IA · confirmada' : 'Persona'}
            </span>
          )}
          {ev.propuestaPendiente && (
            <span className="inline-flex items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 text-[10.5px] text-violet-700">
              <Sparkles className="h-2.5 w-2.5" /> IA{fila?.propuestaFuente ? ` · ${FUENTES[fila.propuestaFuente] ?? fila.propuestaFuente}` : ''}
            </span>
          )}
          <Info texto={ayuda} arriba />
          <span className="flex-1" />
          {ev.propuestaPendiente ? (
            <button
              onClick={() => setEdicion({ tipo: 'propuesta', clave: s.clave })}
              className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-blue-700"
            >
              Revisar
            </button>
          ) : hereda ? (
            <button onClick={() => onAbrirMarca(madre!.id)} className="inline-flex items-center gap-0.5 text-[11.5px] text-blue-600 hover:text-blue-800">
              Ver en {madre!.name} <ArrowUpRight className="h-3 w-3" />
            </button>
          ) : vacia || ev.estado === 'DEBIL' ? (
            <>
              {pideRevision && !revisada && (
                <button
                  onClick={() => hacer(s.clave, () => clientApi.seccionAdnRevisada(clientId, s.clave)).catch(() => {})}
                  disabled={ocupado !== null}
                  className="px-1 py-1 text-[11px] text-gray-500 hover:text-gray-900"
                >
                  {ocupada ? 'Guardando…' : 'Está bien así'}
                </button>
              )}
              {pideRevision && revisada && <Check className="h-3.5 w-3.5 text-emerald-600" aria-label="Revisada" />}
              <button
                onClick={() => editar(s)}
                className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11.5px] font-medium text-gray-800 hover:bg-gray-50"
              >
                Completar
              </button>
            </>
          ) : madre ? (
            // En una submarca no hay revisión: «Está bien» es de la madre antes de heredar.
            <button
              onClick={() => editar(s)}
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11.5px] font-medium text-gray-800 hover:bg-gray-50"
            >
              {sinPropio ? 'Agregar' : 'Editar'}
            </button>
          ) : (
            <>
              <button
                onClick={() => editar(s)}
                title="Editar"
                aria-label={`Editar ${s.nombre}`}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-900"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {revisada ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                  <Check className="h-3 w-3" /> Está bien
                </span>
              ) : (
                <button
                  onClick={() => hacer(s.clave, () => clientApi.seccionAdnRevisada(clientId, s.clave)).catch(() => {})}
                  disabled={ocupado !== null}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-900 px-2.5 py-1 text-[11.5px] font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Check className="h-3 w-3" /> {ocupada ? 'Guardando…' : 'Está bien'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const enEdicion = edicion?.tipo === 'seccion' || edicion?.tipo === 'propuesta' ? seccionDe(edicion.clave) : null;
  const filaPropuesta = edicion?.tipo === 'propuesta' ? adn.filas[edicion.clave] : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-5 rounded-xl border border-gray-200 bg-white p-4">
        <Anillo porcentaje={completitud.porcentaje} minimo={completitud.minimo} apta={completitud.apta} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[15px] font-semibold text-gray-900">
              {completitud.apta
                ? 'Lista para campañas'
                : `Falta${completitud.faltan.length === 1 ? '' : 'n'} ${completitud.faltan.length} para abrir campañas`}
            </h3>
            <Info
              texto={`Para abrir campañas el ADN necesita ${completitud.minimo} % y todas las secciones con ★ completas. Lo heredado de la madre cuenta; lo que propone la IA, no hasta que alguien lo confirma.`}
            />
          </div>
          {!completitud.apta && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {completitud.faltan.map(clave => (
                <button
                  key={clave}
                  onClick={() => irA(clave)}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-2 py-0.5 text-[11px] text-gray-700 hover:border-gray-500"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${COLOR_ESTADO[evaluada(clave).estado].punto}`} />
                  {seccionDe(clave).nombre}
                </button>
              ))}
            </div>
          )}
          <p className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-gray-500">
            {madre ? (
              <>
                <span>● {porOrigen.deMadre} de {madre.name}</span>
                <span>● {porOrigen.propias} propias</span>
                <span className="text-violet-700">● {porOrigen.suman} suman</span>
              </>
            ) : (
              <>
                <span className="text-emerald-700">● {conteo.completas} completas</span>
                <span className="text-amber-700">● {conteo.debiles} débiles</span>
                <span>● {conteo.vacias} vacías</span>
              </>
            )}
            {pendientes.length > 0 && (
              <button onClick={() => setEdicion({ tipo: 'propuesta', clave: pendientes[0] })} className="text-blue-700 hover:underline">
                ● {pendientes.length} sin confirmar
              </button>
            )}
          </p>
        </div>
        <p className="hidden w-[220px] shrink-0 text-right text-[11.5px] leading-relaxed text-gray-500 md:block">
          {madre
            ? `Submarca de ${madre.name}: hereda su ADN confirmado.`
            : madreDeclarada
              ? `Hereda de ${madreDeclarada.name} cuando su ADN esté confirmado.`
              : submarcas > 0
                ? `Lo usan sus campañas y ${submarcas === 1 ? 'su submarca' : `sus ${submarcas} submarcas`}.`
                : 'Lo usan todas sus campañas.'}
          {adn.version != null && <span className="block text-gray-400">Versión {adn.version}</span>}
        </p>
      </div>

      {error && <p className="text-[12px] text-red-600">{error}</p>}

      {GRUPOS.map(g => (
        <section key={g.id}>
          <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            {g.nombre} <Info texto={g.ayuda} />
          </h4>
          <div className={`grid gap-3 ${g.secciones.length === 4 ? 'md:grid-cols-2 2xl:grid-cols-4' : 'md:grid-cols-3'}`}>
            {g.secciones.map(s => (
              <React.Fragment key={s.clave}>{tarjeta(s)}</React.Fragment>
            ))}
          </div>
        </section>
      ))}

      {edicion?.tipo === 'seccion' && enEdicion && (
        <EditorDeSeccion
          seccion={enEdicion}
          inicial={edicion.inicial}
          sumaA={madre && enEdicion.modos.length === 1 ? madre.name : null}
          corrigiendoPropuesta={edicion.propuesta}
          onCerrar={() => setEdicion(null)}
          onGuardar={async contenido => {
            await hacer(enEdicion.clave, async () => {
              await clientApi.guardarSeccionAdn(clientId, enEdicion.clave, { contenido, ...(edicion.modo ? { modo: edicion.modo } : {}) });
              // Lo que se corrigió a mano reemplaza la propuesta: ya no queda nada que revisar.
              if (edicion.propuesta) await clientApi.propuestaAdn(clientId, enEdicion.clave, 'descartar');
            });
            setEdicion(null);
          }}
        />
      )}

      {edicion?.tipo === 'audiencias' && (
        <EditorDeAudiencias
          clientId={clientId}
          marca={marca}
          onCambio={onCambio}
          onCerrar={() => setEdicion(null)}
        />
      )}

      {edicion?.tipo === 'propuesta' && enEdicion && filaPropuesta?.propuesta && (
        <PropuestaDeIa
          seccion={enEdicion}
          propuesta={filaPropuesta.propuesta}
          fuente={filaPropuesta.propuestaFuente}
          posicion={{ actual: pendientes.indexOf(enEdicion.clave) + 1, total: pendientes.length }}
          onCerrar={() => setEdicion(null)}
          onCorregir={() =>
            setEdicion({ tipo: 'seccion', clave: enEdicion.clave, inicial: filaPropuesta.propuesta!, propuesta: true })
          }
          onConfirmar={async () => {
            await hacer(enEdicion.clave, () => clientApi.propuestaAdn(clientId, enEdicion.clave, 'confirmar'));
            const siguiente = pendientes.find(c => c !== enEdicion.clave);
            setEdicion(siguiente ? { tipo: 'propuesta', clave: siguiente } : null);
          }}
          onDescartar={async () => {
            await hacer(enEdicion.clave, () => clientApi.propuestaAdn(clientId, enEdicion.clave, 'descartar'));
            const siguiente = pendientes.find(c => c !== enEdicion.clave);
            setEdicion(siguiente ? { tipo: 'propuesta', clave: siguiente } : null);
          }}
        />
      )}
    </div>
  );
};

export default AdnDeMarca;
