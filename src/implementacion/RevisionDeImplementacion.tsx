import React from 'react';
import { Check, ChevronLeft, ChevronRight, ExternalLink, PenLine, X } from 'lucide-react';
import { reviewApi } from '../../services/api';
import type { EtapaDeFunnel, ImplementacionEnRevision, ReviewDecision, ReviewSession } from '../../types';
import Isotipo from '../../components/ui/Isotipo';
import { PlatformIcon } from '../../components/ui/platformIcons';

/**
 * La aprobación final del cliente antes de implementar (F5, 2026-11-24): lo que se va a montar, por medio y por
 * anuncio. Pensada para volumen (2026-11-24, Gerardo: «con 160 anuncios el scroll se hace eterno»): una grilla
 * compacta que usa el ancho, los medios a un costado con su avance, filtros, el detalle completo en un panel con
 * anterior/siguiente, y «Aprobar los que faltan» por medio. Pedir cambios exige decir cuáles. Hecho sin el `.pen`.
 */

type Anuncio = ImplementacionEnRevision['anuncios'][number];
type Filtro = 'todos' | 'pendientes' | 'aprobados' | 'cambios';

const ETAPA: Record<EtapaDeFunnel, string> = {
  RECONOCIMIENTO: 'Reconocimiento',
  CONSIDERACION: 'Consideración',
  CONVERSION: 'Conversión',
  RETENCION: 'Retención',
};
const ZONA: Record<string, string> = {
  pieza: 'Va en la pieza',
  copyOut: 'Acompaña la publicación',
};
const FILTROS: { id: Filtro; nombre: string }[] = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'pendientes', nombre: 'Sin revisar' },
  { id: 'aprobados', nombre: 'Aprobados' },
  { id: 'cambios', nombre: 'Con cambios' },
];
const dia = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      })
    : null;
const fechas = (a: Anuncio) => (a.desde || a.hasta ? `${dia(a.desde) ?? '…'} – ${dia(a.hasta) ?? '…'}` : null);
const dominio = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

interface Props {
  token: string;
  sesion: ReviewSession;
  onEnviada: () => void;
  onError: () => void;
}

export default function RevisionDeImplementacion({ token, sesion, onEnviada, onError }: Props) {
  const datos = sesion.implementacion!;
  const [decisiones, setDecisiones] = React.useState<Record<string, ReviewDecision>>({});
  const [notas, setNotas] = React.useState<Record<string, string>>({});
  const [quien, setQuien] = React.useState('');
  const [falta, setFalta] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);
  const medios = React.useMemo(() => [...new Set(datos.anuncios.map(a => a.medio))], [datos.anuncios]);
  const [medio, setMedio] = React.useState<string>(medios[0] ?? '');
  const [filtro, setFiltro] = React.useState<Filtro>('todos');
  const [abierto, setAbierto] = React.useState<string | null>(null);

  const total = datos.anuncios.length;
  const decididos = datos.anuncios.filter(a => decisiones[a.id]).length;
  const vence = new Date(sesion.expiresAt).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
  });
  const pasa = (a: Anuncio) =>
    filtro === 'todos' ||
    (filtro === 'pendientes' && !decisiones[a.id]) ||
    (filtro === 'aprobados' && decisiones[a.id] === 'APPROVED') ||
    (filtro === 'cambios' && decisiones[a.id] === 'REJECTED');
  const delMedio = datos.anuncios.filter(a => a.medio === medio);
  const visibles = delMedio.filter(pasa);
  const sinRevisarDelMedio = delMedio.filter(a => !decisiones[a.id]);
  const iAbierto = abierto ? visibles.findIndex(a => a.id === abierto) : -1;

  const decidir = (id: string, d: ReviewDecision) => {
    setDecisiones(p => ({ ...p, [id]: d }));
    setFalta(null);
  };

  const enviar = async () => {
    const sinDecidir = datos.anuncios.find(a => !decisiones[a.id]);
    if (sinDecidir) {
      setMedio(sinDecidir.medio);
      setFiltro('pendientes');
      return setFalta(`Faltan ${total - decididos} por revisar.`);
    }
    const sinComentario = datos.anuncios.find(a => decisiones[a.id] === 'REJECTED' && !notas[a.id]?.trim());
    if (sinComentario) {
      setMedio(sinComentario.medio);
      setAbierto(sinComentario.id);
      return setFalta('Cuando pidas cambios, escribe cuáles.');
    }
    if (!quien.trim()) return setFalta('Escribe tu nombre para firmar la aprobación.');
    setFalta(null);
    setEnviando(true);
    try {
      const r = await reviewApi.submit(token, {
        reviewerName: quien.trim(),
        feedbacks: datos.anuncios.map(a => ({
          anuncioId: a.id,
          decision: decisiones[a.id],
          feedbackCopy: notas[a.id]?.trim() || undefined,
        })),
      });
      if (r?.error) throw new Error(r.error);
      onEnviada();
    } catch {
      onError();
    } finally {
      setEnviando(false);
    }
  };

  const avanceDe = (m: string) => {
    const deEste = datos.anuncios.filter(a => a.medio === m);
    return {
      hechos: deEste.filter(a => decisiones[a.id]).length,
      total: deEste.length,
    };
  };

  return (
    // En pantalla grande, la página no se mueve: los medios y la grilla tienen cada uno su scroll.
    <div className="flex min-h-screen flex-col bg-[#F5F5F7] lg:h-screen">
      {/* Cabecera fija: quién, qué y cuánto falta */}
      <header className="sticky top-0 z-20 border-b border-[rgba(0,0,0,0.06)] bg-white/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Isotipo className="h-6 w-6 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868B]">Aprobación para publicar</p>
            <h1 className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-[#1D1D1F]">
              {datos.marca && <span className="shrink-0 rounded-md bg-[#1D1D1F] px-2 py-0.5 text-[12px] font-semibold text-white">{datos.marca}</span>}
              <span className="truncate">{datos.campana ?? sesion.title}</span>
            </h1>
          </div>
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E5E5EA] sm:w-40 sm:flex-none">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${total ? (decididos / total) * 100 : 0}%` }} />
            </div>
            <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-[#1D1D1F]">
              {decididos} de {total}
            </span>
          </div>
        </div>
      </header>
      {/* Las instrucciones no quedan fijas: en el celular, el espacio es para los anuncios. */}
      <p className="border-b border-[rgba(0,0,0,0.04)] bg-[#FAFAFB] px-4 py-2 text-[12px] text-[#6E6E73] sm:px-6">
        Revisa cada anuncio —el arte, los textos y adónde lleva— y apruébalo o pide cambios. Al final firma y envía. Tienes hasta el {vence}.
      </p>

      <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
        {/* Medios: a un costado en pantalla grande, en fila con scroll en el celular */}
        <nav className="border-b border-[rgba(0,0,0,0.06)] bg-white lg:w-60 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:pb-24">
          <p className="hidden px-5 pb-1 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#86868B] lg:block">Medios</p>
          <ul className="flex gap-1.5 overflow-x-auto px-4 py-2.5 lg:flex-col lg:gap-0.5 lg:px-3 lg:py-1">
            {medios.map(m => {
              const { hechos, total: n } = avanceDe(m);
              const activo = m === medio;
              return (
                <li key={m} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setMedio(m);
                      setAbierto(null);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] ${activo ? 'bg-[#1D1D1F] text-white' : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'}`}
                  >
                    <span className="min-w-0 flex-1 truncate font-semibold">{m}</span>
                    <span
                      className={`shrink-0 text-[11.5px] tabular-nums ${hechos === n ? (activo ? 'text-emerald-300' : 'text-emerald-600') : activo ? 'text-white/70' : 'text-[#86868B]'}`}
                    >
                      {hechos === n ? <Check className="inline h-3.5 w-3.5" /> : null} {hechos}/{n}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 px-4 pb-32 pt-4 sm:px-6 lg:overflow-y-auto lg:pb-24">
          {/* Filtros y la aprobación en bloque del medio */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="mr-2 text-[17px] font-bold text-[#1D1D1F]">{medio}</h2>
            <div className="flex flex-wrap gap-1">
              {FILTROS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltro(f.id)}
                  className={`rounded-full px-3 py-1 text-[12px] font-semibold ${filtro === f.id ? 'bg-[#1D1D1F] text-white' : 'bg-white text-[#3A3A3C] ring-1 ring-[rgba(0,0,0,0.1)] hover:bg-[#F5F5F7]'}`}
                >
                  {f.nombre}
                </button>
              ))}
            </div>
            {sinRevisarDelMedio.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setDecisiones(p => ({
                    ...p,
                    ...Object.fromEntries(sinRevisarDelMedio.map(a => [a.id, 'APPROVED' as ReviewDecision])),
                  }))
                }
                className="ml-auto flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12.5px] font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"
              >
                <Check className="h-3.5 w-3.5" />{' '}
                {sinRevisarDelMedio.length === 1 ? 'Aprobar el que falta' : `Aprobar los ${sinRevisarDelMedio.length} sin revisar`}
              </button>
            )}
          </div>

          {visibles.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[rgba(0,0,0,0.12)] bg-white px-6 py-10 text-center text-[13px] text-[#6E6E73]">
              {filtro === 'pendientes' ? 'Ya revisaste todo en este medio.' : 'Nada en este filtro.'}
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 min-[1900px]:grid-cols-5">
              {visibles.map(a => (
                <Tarjeta
                  key={a.id}
                  a={a}
                  decision={decisiones[a.id]}
                  nota={notas[a.id]}
                  onAbrir={() => setAbierto(a.id)}
                  onDecidir={d => (d === 'REJECTED' ? (decidir(a.id, d), setAbierto(a.id)) : decidir(a.id, d))}
                />
              ))}
            </ul>
          )}
        </main>
      </div>

      {/* Firma y envío */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[rgba(0,0,0,0.08)] bg-white/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <input
            value={quien}
            onChange={e => setQuien(e.target.value)}
            placeholder="Tu nombre, para firmar"
            className="min-w-0 flex-1 rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-[13px] sm:max-w-[280px]"
          />
          <p className="min-w-0 flex-1 text-[12px] text-amber-700">{falta}</p>
          <button
            type="button"
            disabled={enviando}
            onClick={() => void enviar()}
            className="w-full rounded-lg bg-[#1D1D1F] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-40 sm:w-auto"
          >
            {enviando ? 'Enviando…' : decididos === total ? 'Enviar aprobación' : `Enviar aprobación (${total - decididos} sin revisar)`}
          </button>
        </div>
      </div>

      {iAbierto >= 0 && (
        <Detalle
          a={visibles[iAbierto]}
          posicion={`${iAbierto + 1} de ${visibles.length}`}
          decision={decisiones[visibles[iAbierto].id]}
          nota={notas[visibles[iAbierto].id] ?? ''}
          onNota={t => setNotas(p => ({ ...p, [visibles[iAbierto].id]: t }))}
          onDecidir={d => decidir(visibles[iAbierto].id, d)}
          onAnterior={iAbierto > 0 ? () => setAbierto(visibles[iAbierto - 1].id) : undefined}
          onSiguiente={iAbierto < visibles.length - 1 ? () => setAbierto(visibles[iAbierto + 1].id) : undefined}
          onCerrar={() => setAbierto(null)}
        />
      )}
    </div>
  );
}

/**
 * Un anuncio sin arte (búsqueda de Google Ads, WhatsApp, push) dibujado como se ve: en Google, un resultado
 * patrocinado con los títulos unidos por «|» y la descripción; en lo demás, el mensaje.
 */
function VistaDeTexto({ a, compacta = false }: { a: Anuncio; compacta?: boolean }) {
  const es = (re: RegExp) => a.textos.filter(t => re.test(t.nombre)).map(t => t.texto);
  if (/google/i.test(a.platform)) {
    const titulos = es(/t[ií]tulo/i);
    const descripciones = es(/descrip/i);
    return (
      <div className="rounded-lg bg-white p-3 ring-1 ring-[rgba(0,0,0,0.06)]">
        <p className="text-[11px] text-[#3A3A3C]">
          <span className="font-semibold">Patrocinado</span> · {a.url ? dominio(a.url) : 'tu sitio'}
        </p>
        <p className={`mt-0.5 text-[15px] leading-snug text-[#1A0DAB] ${compacta ? 'line-clamp-2' : ''}`}>
          {(compacta ? titulos.slice(0, 3) : titulos).join(' | ')}
        </p>
        <p className={`mt-1 text-[12.5px] leading-snug text-[#4D5156] ${compacta ? 'line-clamp-2' : ''}`}>
          {(compacta ? descripciones.slice(0, 1) : descripciones).join(' ')}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-[rgba(0,0,0,0.06)]">
      {a.textos.map((t, i) => (
        <p
          key={i}
          className={`${i === 0 && a.textos.length > 1 ? 'font-semibold' : ''} text-[13px] leading-snug text-[#1D1D1F] ${compacta ? 'line-clamp-3' : 'whitespace-pre-wrap'}`}
        >
          {t.texto}
        </p>
      ))}
    </div>
  );
}

/** Un anuncio en la grilla: el arte, el texto principal y la decisión, sin abrirlo. */
function Tarjeta({
  a,
  decision,
  nota,
  onAbrir,
  onDecidir,
}: {
  a: Anuncio;
  decision?: ReviewDecision;
  nota?: string;
  onAbrir: () => void;
  onDecidir: (d: ReviewDecision) => void;
}) {
  const sinArte = !a.previaUrl && !a.enlace;
  // El texto que más dice: el de la pieza; si todo acompaña la publicación, el primero que no sea de hashtags.
  const principal = sinArte ? undefined : (a.textos.find(t => t.zona === 'pieza') ?? a.textos.find(t => !/hashtag/i.test(t.nombre)) ?? a.textos[0]);
  const resto = sinArte ? 0 : a.textos.length - (principal ? 1 : 0);
  return (
    <li
      className={`flex flex-col overflow-hidden rounded-xl border bg-white ${decision === 'APPROVED' ? 'border-emerald-300' : decision === 'REJECTED' ? 'border-amber-300' : 'border-[rgba(0,0,0,0.08)]'}`}
    >
      <button type="button" onClick={onAbrir} className="flex flex-1 flex-col text-left hover:bg-[#FAFAFB]">
        {sinArte ? (
          <div className="max-h-40 overflow-hidden bg-[#F5F5F7] p-3">
            <VistaDeTexto a={a} compacta />
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center overflow-hidden bg-[#F5F5F7]">
            {a.previaUrl ? (
              <img src={a.previaUrl} alt={a.formato} loading="lazy" className="h-full w-full object-contain" />
            ) : (
              <span className="flex items-center gap-1.5 text-[12px] text-[#86868B]">
                {a.enlace ? (
                  <>
                    <ExternalLink className="h-3.5 w-3.5" /> Pieza en enlace
                  </>
                ) : (
                  'Sin vista previa'
                )}
              </span>
            )}
          </div>
        )}
        <div className="flex flex-1 flex-col gap-1.5 px-3.5 py-3">
          <div className="flex items-center gap-2">
            <PlatformIcon platform={a.platform} size="sm" />
            <p className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-[#1D1D1F]">
              {a.formato}
              {a.etapa && <span className="font-normal text-[#86868B]"> · {ETAPA[a.etapa]}</span>}
            </p>
          </div>
          {principal && <p className="line-clamp-3 text-[13px] leading-snug text-[#1D1D1F]">{principal.texto}</p>}
          <p className="mt-auto flex flex-wrap gap-x-2 pt-1 text-[11.5px] text-[#86868B]">
            {resto > 0 && <span>+{resto} textos</span>}
            {fechas(a) && <span>{fechas(a)}</span>}
            {a.url && <span className="truncate">→ {dominio(a.url)}</span>}
          </p>
          {decision === 'REJECTED' && nota?.trim() && <p className="line-clamp-2 rounded-md bg-amber-50 px-2 py-1 text-[11.5px] text-amber-800">{nota}</p>}
        </div>
      </button>
      <div className="grid grid-cols-2 border-t border-[rgba(0,0,0,0.06)]">
        <button
          type="button"
          onClick={() => onDecidir('APPROVED')}
          className={`flex items-center justify-center gap-1.5 py-2 text-[12.5px] font-semibold ${decision === 'APPROVED' ? 'bg-emerald-600 text-white' : 'text-[#1D1D1F] hover:bg-emerald-50'}`}
        >
          <Check className="h-3.5 w-3.5" /> Aprobar
        </button>
        <button
          type="button"
          onClick={() => onDecidir('REJECTED')}
          className={`flex items-center justify-center gap-1.5 border-l border-[rgba(0,0,0,0.06)] py-2 text-[12.5px] font-semibold ${decision === 'REJECTED' ? 'bg-amber-500 text-white' : 'text-[#1D1D1F] hover:bg-amber-50'}`}
        >
          <PenLine className="h-3.5 w-3.5" /> Cambios
        </button>
      </div>
    </li>
  );
}

/** El anuncio completo, en un panel lateral (pantalla completa en el celular), con anterior y siguiente. */
function Detalle({
  a,
  posicion,
  decision,
  nota,
  onNota,
  onDecidir,
  onAnterior,
  onSiguiente,
  onCerrar,
}: {
  a: Anuncio;
  posicion: string;
  decision?: ReviewDecision;
  nota: string;
  onNota: (t: string) => void;
  onDecidir: (d: ReviewDecision) => void;
  onAnterior?: () => void;
  onSiguiente?: () => void;
  onCerrar: () => void;
}) {
  const nota$ = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === 'Escape') onCerrar();
      if (e.key === 'ArrowLeft') onAnterior?.();
      if (e.key === 'ArrowRight') onSiguiente?.();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onAnterior, onSiguiente, onCerrar]);
  React.useEffect(() => {
    if (decision === 'REJECTED' && !nota) nota$.current?.focus();
  }, [decision, a.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const zonas = [...new Set(a.textos.map(t => t.zona))];
  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/30" onClick={onCerrar}>
      <aside className="flex h-full w-full flex-col bg-white shadow-2xl md:max-w-[880px]" onClick={e => e.stopPropagation()}>
        <header className="flex items-center gap-2 border-b border-[rgba(0,0,0,0.06)] px-4 py-3 sm:px-5">
          <PlatformIcon platform={a.platform} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-[#1D1D1F]">
              {a.medio} · {a.formato}
              {a.etapa && <span className="font-normal text-[#86868B]"> · {ETAPA[a.etapa]}</span>}
            </p>
            {fechas(a) && <p className="text-[12px] text-[#6E6E73]">Sale {fechas(a)}</p>}
          </div>
          <span className="hidden text-[12px] tabular-nums text-[#86868B] sm:inline">{posicion}</span>
          <button
            type="button"
            disabled={!onAnterior}
            onClick={onAnterior}
            aria-label="Anterior"
            className="rounded-lg p-1.5 hover:bg-[#F5F5F7] disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            disabled={!onSiguiente}
            onClick={onSiguiente}
            aria-label="Siguiente"
            className="rounded-lg p-1.5 hover:bg-[#F5F5F7] disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1.5 hover:bg-[#F5F5F7]">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid flex-1 content-start gap-5 overflow-y-auto p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            {a.previaUrl ? (
              <img src={a.previaUrl} alt={a.formato} className="max-h-[70vh] w-full rounded-lg bg-[#F5F5F7] object-contain ring-1 ring-[rgba(0,0,0,0.06)]" />
            ) : a.enlace ? (
              <a
                href={a.enlace}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-[#F5F5F7] px-3 py-10 text-[13px] font-semibold text-[#0E7490] hover:underline"
              >
                <ExternalLink className="h-4 w-4" /> Ver la pieza
              </a>
            ) : (
              <div className="rounded-lg bg-[#F5F5F7] p-4">
                <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#86868B]">Así se ve</p>
                <VistaDeTexto a={a} />
              </div>
            )}
          </div>
          <div className="space-y-4">
            {zonas.map(z => (
              <div key={z}>
                {zonas.length > 1 && <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#86868B]">{ZONA[z] ?? ''}</p>}
                <div className="space-y-2.5">
                  {a.textos
                    .filter(t => t.zona === z)
                    .map((t, i) => (
                      <div key={i}>
                        <p className="text-[12px] font-semibold text-[#6E6E73]">{t.nombre}</p>
                        <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#1D1D1F]">{t.texto}</p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
            {a.url && (
              <div>
                <p className="text-[12px] font-semibold text-[#6E6E73]">Lleva a</p>
                <a href={a.url} target="_blank" rel="noreferrer" className="break-all text-[13px] text-[#0E7490] hover:underline">
                  {a.url}
                </a>
              </div>
            )}
          </div>
        </div>

        <footer className="space-y-2 border-t border-[rgba(0,0,0,0.06)] bg-[#FAFAFB] px-4 py-3 sm:px-5">
          {decision === 'REJECTED' && (
            <textarea
              ref={nota$}
              value={nota}
              onChange={e => onNota(e.target.value)}
              rows={2}
              placeholder="¿Qué cambiarías? Ej.: el enlace no es el de la promoción; el título del arte no se lee…"
              className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-[13px] focus:border-amber-400 focus:outline-none"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onDecidir('APPROVED');
                onSiguiente?.();
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold sm:flex-none ${decision === 'APPROVED' ? 'bg-emerald-600 text-white' : 'bg-white text-[#1D1D1F] ring-1 ring-[rgba(0,0,0,0.12)] hover:bg-emerald-50'}`}
            >
              <Check className="h-4 w-4" /> Aprobar
              {onSiguiente ? ' y seguir' : ''}
            </button>
            <button
              type="button"
              onClick={() => onDecidir('REJECTED')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold sm:flex-none ${decision === 'REJECTED' ? 'bg-amber-500 text-white' : 'bg-white text-[#1D1D1F] ring-1 ring-[rgba(0,0,0,0.12)] hover:bg-amber-50'}`}
            >
              <PenLine className="h-4 w-4" /> Pedir cambios
            </button>
            {decision === 'REJECTED' && onSiguiente && (
              <button
                type="button"
                disabled={!nota.trim()}
                onClick={onSiguiente}
                className="ml-auto rounded-lg px-3 py-2.5 text-[13px] font-semibold text-[#1D1D1F] hover:bg-[#F0F0F2] disabled:opacity-40"
              >
                Siguiente →
              </button>
            )}
          </div>
        </footer>
      </aside>
    </div>
  );
}
