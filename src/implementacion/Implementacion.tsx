import React from 'react';
import { AlertTriangle, Check, Copy, ExternalLink, RotateCcw, Undo2 } from 'lucide-react';
import { implementacionApi } from '../../services/api';
import type { AnuncioParaMontar, EstadoAnuncio, EtapaDeFunnel } from '../../types';

/**
 * ⑤ Implementación · Anuncios (F5, T1 a T4; plan de Implementación, PR #65). El trafficker o el community
 * manager ven los anuncios listos de cada campaña, abren uno a la vez, copian lo que va en la plataforma y dejan
 * constancia: «Marcar montado» (plataforma, ID, fecha) o «Devolver con novedad». Hecho sin el `.pen`.
 */

const PESTANAS: { estado: EstadoAnuncio; nombre: string }[] = [
  // La aprobación final (2026-11-24): nada se monta sin la del cliente o la de un aprobador, según la campaña.
  { estado: 'POR_APROBAR', nombre: 'Por aprobar' },
  { estado: 'CON_EL_CLIENTE', nombre: 'Con el cliente' },
  { estado: 'POR_MONTAR', nombre: 'Por montar' },
  { estado: 'CON_NOVEDAD', nombre: 'Con novedad' },
  { estado: 'MONTADO', nombre: 'Hechos' },
];
const ETAPA: Record<EtapaDeFunnel, string> = { RECONOCIMIENTO: 'Reconocimiento', CONSIDERACION: 'Consideración', CONVERSION: 'Conversión', RETENCION: 'Retención' };
const MOTIVOS: [string, string][] = [
  ['destino', 'El destino no funciona'],
  ['texto', 'La plataforma no acepta un texto'],
  ['medida', 'La pieza no tiene la medida correcta'],
  ['otra', 'Otra cosa'],
];
/** La plataforma que se sugiere al montar, según el canal de la pieza. */
const PLATAFORMA: Record<string, string> = {
  'Meta Ads': 'Meta',
  'Instagram Post': 'Instagram',
  'Instagram Historia': 'Instagram',
  'Instagram Carrusel': 'Instagram',
  'Instagram Reel': 'Instagram',
  TikTok: 'TikTok',
  YouTube: 'YouTube',
  'Google Ads': 'Google Ads',
  'Google Display': 'Google Ads',
};
const dia = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : null);
const hoy = () => new Date().toISOString().slice(0, 10);

const Copiar = ({ texto }: { texto: string }) => {
  const [hecho, setHecho] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(texto);
        setHecho(true);
        setTimeout(() => setHecho(false), 1500);
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-semibold text-[#0E7490] hover:bg-cyan-50"
    >
      {hecho ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {hecho ? 'Copiado' : 'Copiar'}
    </button>
  );
};

interface Props {
  marcaId: string;
  onAviso: (mensaje: string, tipo: 'success' | 'error' | 'info' | 'warning') => void;
}

/**
 * Cada uno ve lo suyo (decisión 29): el community manager, las publicaciones de redes sociales; el trafficker, los
 * pagos y lo demás. El servidor filtra y dice en cada anuncio si quien mira puede actuar (`puedo`).
 */
export default function Implementacion({ marcaId, onAviso }: Props) {
  const [anuncios, setAnuncios] = React.useState<AnuncioParaMontar[] | null>(null);
  const [pestana, setPestana] = React.useState<EstadoAnuncio>('POR_APROBAR');
  const [enlaces, setEnlaces] = React.useState<Record<string, string>>({});
  const [abierto, setAbierto] = React.useState<string | null>(null);

  const leer = React.useCallback(() => {
    implementacionApi
      .anuncios(marcaId)
      .then(setAnuncios)
      .catch(err => onAviso(err instanceof Error ? err.message : 'No se pudieron leer los anuncios', 'error'));
  }, [marcaId, onAviso]);
  React.useEffect(() => {
    setAnuncios(null);
    leer();
  }, [leer]);

  if (!anuncios) return <div className="h-48" />;

  const cuantos = (e: EstadoAnuncio) => anuncios.filter(a => a.estado === e).length;
  const visibles = anuncios.filter(a => a.estado === pestana || a.id === abierto);
  const porCampana = new Map<string, { nombre: string; anuncios: AnuncioParaMontar[] }>();
  for (const a of visibles) {
    const clave = a.campana?.id ?? 'sin-campana';
    const g = porCampana.get(clave) ?? { nombre: a.campana?.nombre ?? 'Sin campaña', anuncios: [] };
    g.anuncios.push(a);
    porCampana.set(clave, g);
  }

  const actualizar = (a: AnuncioParaMontar) => setAnuncios(prev => (prev ?? []).map(x => (x.id === a.id ? a : x)));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-[#1D1D1F]">Anuncios</h1>
        <p className="mt-1 text-[13px] text-[#6E6E73]">
          Lo listo de cada campaña. Primero la aprobación final —la del cliente por enlace o la de un aprobador, según la
          campaña—; después el trafficker lo monta y el community manager publica lo de redes sociales.
        </p>
      </div>

      <div className="flex gap-1.5">
        {PESTANAS.map(t => (
          <button
            key={t.estado}
            type="button"
            onClick={() => setPestana(t.estado)}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold ${
              pestana === t.estado ? 'bg-[#1D1D1F] text-white' : 'bg-white text-[#3A3A3C] ring-1 ring-[rgba(0,0,0,0.08)] hover:bg-[#F5F5F7]'
            }`}
          >
            {t.nombre} · {cuantos(t.estado)}
          </button>
        ))}
      </div>

      {anuncios.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-[rgba(0,0,0,0.12)] bg-white px-6 py-10 text-center text-[13px] text-[#6E6E73]">
          Esta marca todavía no tiene nada para implementar. Aparece aquí cuando Producción acepta una pieza o, en los anuncios
          de solo texto como la búsqueda de Google Ads, cuando se aprueba el copy.
        </div>
      ) : porCampana.size === 0 ? (
        <div className="rounded-[12px] border border-dashed border-[rgba(0,0,0,0.12)] bg-white px-6 py-10 text-center text-[13px] text-[#6E6E73]">
          {
            {
              POR_APROBAR: 'Nada espera la aprobación final.',
              CON_EL_CLIENTE: 'No hay nada esperando al cliente.',
              POR_MONTAR: 'No hay nada por montar ni por publicar.',
              CON_NOVEDAD: 'Nada tiene novedad.',
              MONTADO: 'Todavía no hay nada montado ni publicado.',
            }[pestana]
          }
        </div>
      ) : (
        [...porCampana.entries()].map(([clave, g]) => {
          const deLaCampana = anuncios.filter(a => (a.campana?.id ?? 'sin-campana') === clave);
          const montados = deLaCampana.filter(a => a.estado === 'MONTADO').length;
          return (
            <section key={clave} className="overflow-hidden rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white">
              <header className="flex flex-wrap items-center gap-3 px-4 py-3">
                <h2 className="min-w-0 flex-1 text-[15px] font-bold text-[#1D1D1F]">{g.nombre}</h2>
                {pestana === 'POR_APROBAR' && (
                  <AprobacionFinal
                    anuncios={g.anuncios.filter(a => a.estado === 'POR_APROBAR')}
                    enlace={enlaces[clave]}
                    onEnlace={url => setEnlaces(prev => ({ ...prev, [clave]: url }))}
                    onHecho={leer}
                    onAviso={onAviso}
                  />
                )}
                {pestana === 'CON_EL_CLIENTE' && g.anuncios[0]?.campana?.puedoEnlace && (
                  // El enlace abierto, para volver a mandarlo: el servidor devuelve el mismo, no crea otro.
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const r = await implementacionApi.enlace(g.anuncios[0].campana!.id);
                        await navigator.clipboard?.writeText(r.url).catch(() => undefined);
                        setEnlaces(prev => ({ ...prev, [clave]: r.url }));
                        onAviso('Enlace del cliente copiado', 'success');
                      } catch (err) {
                        onAviso(err instanceof Error ? err.message : 'No se pudo leer el enlace', 'error');
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-[12.5px] font-semibold text-violet-800 hover:bg-violet-100"
                  >
                    <Copy className="h-3.5 w-3.5" /> {enlaces[clave] ? 'Copiado' : 'Copiar el enlace del cliente'}
                  </button>
                )}
                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[#F0F0F2]">
                  <div className="h-full rounded-full bg-[#0E7490]" style={{ width: `${deLaCampana.length ? (montados / deLaCampana.length) * 100 : 0}%` }} />
                </div>
                <span className="text-[12px] font-semibold tabular-nums text-[#3A3A3C]">
                  {montados} de {deLaCampana.length} hechos
                </span>
              </header>
              <ul className="divide-y divide-[rgba(0,0,0,0.05)] border-t border-[rgba(0,0,0,0.06)]">
                {g.anuncios.map(a => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setAbierto(abierto === a.id ? null : a.id)}
                      className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-left text-[13px] hover:bg-[#FAFAFB]"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-[#1D1D1F]">{a.titulo}</span>
                        <span className="text-[#6E6E73]">
                          {' '}
                          · {a.linea ? `${a.linea.medio} · ${a.linea.formato} · ${ETAPA[a.linea.etapa]}` : `${a.platform} · ${a.formato}`}
                        </span>
                      </div>
                      {a.linea?.desde && <span className="text-[12px] text-[#6E6E73]">Sale el {dia(a.linea.desde)}</span>}
                      {a.estado === 'POR_APROBAR' ? (
                        a.novedad ? (
                          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-amber-800">El cliente pidió cambios</span>
                        ) : a.listo ? (
                          <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-violet-700">
                            Listo para aprobar{a.faltas.length ? ' · falta la UTM' : ''}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-amber-800">
                            {a.faltas.filter(f => f.bloquea).map(f => f.texto).join(' · ')}
                          </span>
                        )
                      ) : a.estado === 'CON_EL_CLIENTE' ? (
                        <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-violet-700">Esperando al cliente</span>
                      ) : a.estado === 'MONTADO' ? (
                        <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-[#0E7490]">
                          {a.accion === 'publicar' ? 'Publicado' : 'Montado'} · {a.montado?.plataforma}
                        </span>
                      ) : a.estado === 'CON_NOVEDAD' ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-amber-800">Con novedad</span>
                      ) : a.listo ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-emerald-700">
                          Listo{a.faltas.length ? ' · falta la UTM' : ''}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-amber-800">
                          {a.faltas.filter(f => f.bloquea).map(f => f.texto).join(' · ')}
                        </span>
                      )}
                    </button>
                    {abierto === a.id && (
                      <Detalle a={a} onCambio={actualizar} onAviso={onAviso} />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

function Detalle({
  a,
  onCambio,
  onAviso,
}: {
  a: AnuncioParaMontar;
  onCambio: (a: AnuncioParaMontar) => void;
  onAviso: (mensaje: string, tipo: 'success' | 'error' | 'info' | 'warning') => void;
}) {
  const [modo, setModo] = React.useState<'ver' | 'montar' | 'devolver' | 'destino'>('ver');
  const [plataforma, setPlataforma] = React.useState(PLATAFORMA[a.platform] ?? '');
  const [idEnPlataforma, setIdEnPlataforma] = React.useState('');
  const [fecha, setFecha] = React.useState(hoy());
  const [motivo, setMotivo] = React.useState('otra');
  const [texto, setTexto] = React.useState('');
  const [destino, setDestino] = React.useState(a.destino ?? '');
  const [utm, setUtm] = React.useState(a.utm ?? '');
  const [ocupado, setOcupado] = React.useState(false);

  const hacer = async (accion: () => Promise<AnuncioParaMontar>, aviso: string) => {
    setOcupado(true);
    try {
      onCambio(await accion());
      setModo('ver');
      onAviso(aviso, 'success');
    } catch (err) {
      onAviso(err instanceof Error ? err.message : 'No se pudo guardar', 'error');
    } finally {
      setOcupado(false);
    }
  };

  const campo = 'w-full rounded-md border border-[rgba(0,0,0,0.12)] bg-white px-2.5 py-1.5 text-[13px]';
  const titulo = 'text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#86868B]';

  return (
    <div className="grid gap-4 border-t border-cyan-100 bg-cyan-50/30 px-4 py-4 md:grid-cols-[1fr_260px]">
      <div className="space-y-4">
        {a.novedad && (
          <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {a.novedad}
          </p>
        )}

        <div>
          <p className={titulo}>Textos</p>
          <ul className="mt-1.5 space-y-1.5">
            {a.textos.map(t => (
              <li key={t.slot} className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-[rgba(0,0,0,0.06)]">
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-semibold text-[#6E6E73]">{t.nombre}</p>
                  <p className="whitespace-pre-wrap text-[13px] text-[#1D1D1F]">{t.texto}</p>
                </div>
                <Copiar texto={t.texto} />
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className={titulo}>Destino</p>
          {a.url ? (
            <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-[rgba(0,0,0,0.06)]">
              <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-[#1D1D1F]">{a.url}</span>
              <Copiar texto={a.url} />
            </div>
          ) : null}
          {a.faltas.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {a.faltas.map(f => (
                <li key={f.que} className={`text-[12px] ${f.bloquea ? 'text-amber-800' : 'text-[#6E6E73]'}`}>
                  {f.texto}
                  {f.bloquea ? '' : ' (no impide montarlo)'} · lo pega {f.quien}
                </li>
              ))}
            </ul>
          )}
          {!a.destinoEnLaLinea && modo !== 'destino' && (
            <button type="button" onClick={() => setModo('destino')} className="mt-1.5 text-[12px] font-semibold text-[#0E7490] hover:underline">
              {a.destino ? 'Cambiar el destino o la UTM' : 'Pegar el destino y la UTM'}
            </button>
          )}
          {modo === 'destino' && (
            <div className="mt-2 space-y-2">
              <input value={destino} onChange={e => setDestino(e.target.value)} placeholder="https://…" className={campo} />
              <input value={utm} onChange={e => setUtm(e.target.value)} placeholder="utm_source=…&utm_campaign=… (opcional)" className={campo} />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => void hacer(() => implementacionApi.destino(a.id, { destino, utm }), 'Destino guardado')}
                  className="rounded-lg bg-[#1D1D1F] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
                >
                  Guardar
                </button>
                <button type="button" onClick={() => setModo('ver')} className="text-[12px] text-[#6E6E73]">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className={titulo}>Pieza</p>
          {a.previaUrl ? (
            <img src={a.previaUrl} alt={a.titulo} className="mt-1.5 max-h-48 w-full rounded-lg bg-white object-contain ring-1 ring-[rgba(0,0,0,0.06)]" />
          ) : null}
          {a.enlace && (
            <a href={a.enlace} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-[#0E7490] hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> Abrir el archivo
            </a>
          )}
          {!a.previaUrl && !a.enlace && (
            <p className="mt-1 text-[12px] text-[#86868B]">{a.piezaId ? 'Sin archivo adjunto.' : 'Solo texto: este anuncio no lleva pieza de diseño.'}</p>
          )}
        </div>

        <div>
          <p className={titulo}>Quién aprobó</p>
          <ul className="mt-1 space-y-0.5 text-[12px] text-[#3A3A3C]">
            {a.aprobaciones.copy.map(c => (
              <li key={`${c.por}${c.via}`}>
                Copy: {c.por}
                {c.via === 'CLIENTE' ? ' (cliente)' : ''}
                {c.en ? ` · ${dia(c.en)}` : ''}
              </li>
            ))}
            {a.aprobaciones.pieza && (
              <li>
                Pieza: {a.aprobaciones.pieza.por}
                {a.aprobaciones.pieza.via === 'CLIENTE' ? ' (cliente)' : ''} · {dia(a.aprobaciones.pieza.en)}
              </li>
            )}
          </ul>
        </div>

        {a.montado && (
          <p className="text-[12px] text-[#0E7490]">
            {a.accion === 'publicar' ? 'Publicado' : 'Montado'} en {a.montado.plataforma} · ID {a.montado.idEnPlataforma} · {dia(a.montado.en)}
          </p>
        )}

        {!a.puedo && (
          <p className="text-[12px] text-[#86868B]">{a.accion === 'publicar' ? 'Lo publica el community manager.' : 'Lo monta el trafficker.'}</p>
        )}
        {a.puedo && modo === 'ver' && (
          <div className="flex flex-col gap-2">
            {a.estado === 'POR_MONTAR' && (
              <button
                type="button"
                disabled={!a.listo}
                onClick={() => setModo('montar')}
                className="rounded-lg bg-[#0E7490] px-3 py-2 text-[13px] font-semibold text-white hover:bg-cyan-800 disabled:opacity-40"
              >
                {a.accion === 'publicar' ? 'Marcar publicado' : 'Marcar montado'}
              </button>
            )}
            {a.estado !== 'POR_APROBAR' && a.estado !== 'CON_EL_CLIENTE' && (
              <button
                type="button"
                onClick={() => setModo('devolver')}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-[13px] font-semibold text-[#1D1D1F] hover:bg-[#F5F5F7]"
              >
                <Undo2 className="h-3.5 w-3.5" /> Devolver con novedad
              </button>
            )}
            {(a.estado === 'MONTADO' || a.estado === 'CON_NOVEDAD') && (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => void hacer(() => implementacionApi.reabrir(a.id), 'Volvió a por montar')}
                className="inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#6E6E73] hover:text-[#1D1D1F]"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Volver a por montar
              </button>
            )}
          </div>
        )}

        {modo === 'montar' && (
          <div className="space-y-2 rounded-lg bg-white p-3 ring-1 ring-[rgba(0,0,0,0.08)]">
            <input value={plataforma} onChange={e => setPlataforma(e.target.value)} placeholder="Plataforma (Meta, Google Ads…)" className={campo} />
            <input value={idEnPlataforma} onChange={e => setIdEnPlataforma(e.target.value)} placeholder={a.accion === 'publicar' ? 'ID o enlace de la publicación' : 'ID del anuncio en la plataforma'} className={campo} />
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={campo} />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={ocupado || !plataforma.trim() || !idEnPlataforma.trim()}
                onClick={() => void hacer(() => implementacionApi.montar(a.id, { plataforma, idEnPlataforma, montadoEn: fecha }), a.accion === 'publicar' ? 'Publicación registrada' : 'Anuncio montado')}
                className="rounded-lg bg-[#0E7490] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
              >
                Guardar
              </button>
              <button type="button" onClick={() => setModo('ver')} className="text-[12px] text-[#6E6E73]">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {modo === 'devolver' && (
          <div className="space-y-2 rounded-lg bg-white p-3 ring-1 ring-[rgba(0,0,0,0.08)]">
            <select value={motivo} onChange={e => setMotivo(e.target.value)} className={campo}>
              {MOTIVOS.map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </select>
            <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={3} placeholder="¿Qué pasó? Le llega al responsable de la campaña." className={campo} />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={ocupado || !texto.trim()}
                onClick={() => void hacer(() => implementacionApi.devolver(a.id, { motivo, texto }), 'Devuelto con novedad')}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
              >
                Devolver
              </button>
              <button type="button" onClick={() => setModo('ver')} className="text-[12px] text-[#6E6E73]">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * La aprobación final de una campaña (2026-11-24), en su tarjeta: si la aprueba el equipo, «Autorizar
 * implementación» para quien la aprueba; si la aprueba el cliente, «Crear enlace para el cliente» con todo lo listo
 * (arte, copy, caption, destino y fechas). Lo que no está listo (sin destino o fecha) espera.
 */
function AprobacionFinal({
  anuncios,
  enlace,
  onEnlace,
  onHecho,
  onAviso,
}: {
  anuncios: AnuncioParaMontar[];
  enlace?: string;
  onEnlace: (url: string) => void;
  onHecho: () => void;
  onAviso: (mensaje: string, tipo: 'success' | 'error' | 'info' | 'warning') => void;
}) {
  const [ocupado, setOcupado] = React.useState(false);
  const campana = anuncios[0]?.campana;
  const listos = anuncios.filter(a => a.listo);
  if (!campana || !anuncios.length) return null;
  const boton = 'rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-40';

  if (campana.modoAprobacion === 'CLIENTE') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {enlace ? (
          <>
            <span className="max-w-[280px] truncate font-mono text-[11.5px] text-violet-900">{enlace}</span>
            <Copiar texto={enlace} />
          </>
        ) : campana.puedoEnlace ? (
          <button
            type="button"
            disabled={ocupado || !listos.length}
            onClick={async () => {
              setOcupado(true);
              try {
                const r = await implementacionApi.enlace(campana.id);
                onEnlace(r.url);
                await navigator.clipboard?.writeText(r.url).catch(() => undefined);
                onAviso(`Enlace copiado: ${r.cuantos} para que el cliente apruebe`, 'success');
                onHecho();
              } catch (err) {
                onAviso(err instanceof Error ? err.message : 'No se pudo crear el enlace', 'error');
              } finally {
                setOcupado(false);
              }
            }}
            className={`${boton} bg-violet-600 hover:bg-violet-700`}
          >
            Crear enlace para el cliente ({listos.length})
          </button>
        ) : (
          <span className="text-[12px] text-[#86868B]">El cliente lo aprueba por enlace</span>
        )}
      </div>
    );
  }
  return campana.puedoAutorizar ? (
    <button
      type="button"
      disabled={ocupado || !listos.length}
      onClick={async () => {
        setOcupado(true);
        try {
          const r = await implementacionApi.autorizar(listos.map(a => a.id));
          onAviso(`${r.autorizados} autorizados: pasan a «Por montar»`, 'success');
          onHecho();
        } catch (err) {
          onAviso(err instanceof Error ? err.message : 'No se pudo autorizar', 'error');
        } finally {
          setOcupado(false);
        }
      }}
      className={`${boton} bg-[#047857] hover:bg-emerald-800`}
    >
      Autorizar implementación ({listos.length})
    </button>
  ) : (
    <span className="text-[12px] text-[#86868B]">Lo autoriza quien aprueba la campaña</span>
  );
}
