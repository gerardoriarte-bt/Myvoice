import React from 'react';
import { Check, PenLine } from 'lucide-react';
import { ReviewDecision, ReviewFeedback, ReviewSession, ReviewSessionItem } from '../types';
import { reviewApi } from '../services/api';
import { nombreDePieza, nombreDePiezas } from '../piezas';
import { PlatformIcon } from './ui/platformIcons';
import Isotipo from './ui/Isotipo';

/**
 * La ronda de copy del portal, para el cliente (Gerardo, 2026-11-23). Antes cada texto era una tarjeta con su
 * «Aprobar», y un anuncio de Google Ads (15 títulos y 4 descripciones que Google combina) parecía 19 anuncios.
 * Ahora el cliente ve la campaña y su objetivo, unas instrucciones cortas, los medios en orden y, en cada medio,
 * piezas: un anuncio, un post, un correo, con sus textos agrupados por lugar. Decide por pieza.
 *
 * Lo que es indicación interna (para diseño) no se le muestra; la decisión de la pieza la incluye igual.
 */

type Texto = NonNullable<ReviewSessionItem['savedVariation']>;

interface Pieza {
  clave: string;
  platform: string;
  textos: Texto[];
}

/** Una línea por medio: qué es lo que está viendo el cliente. */
const QUE_ES: Record<string, string> = {
  'Google Ads': 'Un anuncio de búsqueda. Google combina estos títulos y descripciones según lo que busque cada persona: nunca salen todos juntos.',
  'Google Display': 'Un anuncio gráfico. Google arma las combinaciones con estos textos.',
  'Instagram Carrusel': 'Un carrusel: el texto de cada slide, en orden, y el texto que lo acompaña al publicarlo.',
  'Instagram Post': 'Un post: lo que va en la imagen y el texto que lo acompaña al publicarlo.',
  'Instagram Reel': 'Un reel: lo que se dice o se ve en el video y el texto que lo acompaña.',
  'Instagram Historia': 'Una historia: el texto que va en la pantalla.',
  TikTok: 'Un video: lo que se dice o se ve y el texto que lo acompaña.',
  YouTube: 'Un video: título y descripción.',
  Email: 'Un correo: asunto, texto de vista previa, cuerpo y botón.',
  WhatsApp: 'Un mensaje de WhatsApp.',
  'Push Notification': 'Una notificación en el celular.',
  'Pop up': 'Una ventana emergente en la web.',
};

const ZONA: Record<string, string> = { pieza: 'Va en la pieza', copyOut: 'Acompaña la publicación' };

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** «Título Corto 3» → «Título Corto»: los textos repetidos de un mismo lugar se muestran juntos. */
const lugar = (t: Texto) => (t.slotLabel ?? t.type ?? 'Texto').replace(/\s*\d+$/, '');

/** Agrupa los textos en piezas (por conjunto) y las piezas por medio, en el orden en que llegaron. */
const agrupar = (items: ReviewSessionItem[]) => {
  const porMedio = new Map<string, Map<string, Pieza>>();
  for (const i of items) {
    const t = i.savedVariation;
    if (!t) continue;
    const medio = porMedio.get(t.platform) ?? new Map<string, Pieza>();
    // El copy de antes no tiene conjunto: lo de un mismo medio se revisa junto.
    const clave = t.conjuntoId ?? `suelto-${t.platform}`;
    const pieza = medio.get(clave) ?? { clave, platform: t.platform, textos: [] };
    pieza.textos.push(t);
    medio.set(clave, pieza);
    porMedio.set(t.platform, medio);
  }
  return [...porMedio.entries()].map(([platform, piezas]) => ({
    platform,
    piezas: [...piezas.values()].map(p => ({
      ...p,
      textos: [...p.textos].sort((a, b) => (a.ordenSlot ?? 99) - (b.ordenSlot ?? 99) || (a.variationIndex ?? 0) - (b.variationIndex ?? 0)),
    })),
  }));
};

interface Props {
  token: string;
  sesion: ReviewSession;
  onEnviada: () => void;
  onError: () => void;
}

export default function RevisionDeCopy({ token, sesion, onEnviada, onError }: Props) {
  const medios = React.useMemo(() => agrupar(sesion.items ?? []), [sesion.items]);
  const piezas = medios.flatMap(m => m.piezas);
  const [decisiones, setDecisiones] = React.useState<Record<string, ReviewDecision>>({});
  const [notas, setNotas] = React.useState<Record<string, string>>({});
  const [quien, setQuien] = React.useState('');
  const [falta, setFalta] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);

  const decididas = piezas.filter(p => decisiones[p.clave]).length;
  const sinMotivo = piezas.filter(p => decisiones[p.clave] === 'REJECTED' && !notas[p.clave]?.trim()).length;
  const vence = new Date(sesion.expiresAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });

  const enviar = async () => {
    if (decididas < piezas.length) return setFalta(`Faltan ${piezas.length - decididas} por revisar.`);
    if (sinMotivo) return setFalta('Cuando pidas cambios, escribe cuáles: así el equipo sabe qué ajustar.');
    if (!quien.trim()) return setFalta('Escribe tu nombre para firmar la revisión.');
    setFalta(null);
    setEnviando(true);
    try {
      // La decisión es de la pieza: se aplica a cada uno de sus textos.
      const feedbacks: ReviewFeedback[] = piezas.flatMap(p =>
        p.textos.map(t => ({ savedVariationId: t.id, decision: decisiones[p.clave], comment: notas[p.clave]?.trim() || undefined }))
      );
      const r = await reviewApi.submit(token, { reviewerName: quien.trim(), feedbacks });
      if (r?.error) throw new Error(r.error);
      onEnviada();
    } catch {
      onError();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-28">
      <header className="border-b border-[rgba(0,0,0,0.06)] bg-white">
        <div className="mx-auto flex max-w-[860px] items-center gap-2.5 px-5 py-4">
          <Isotipo className="h-6 w-6" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868B]">Revisión de copy</p>
            <h1 className="flex items-center gap-2 text-[15px] font-semibold text-[#1D1D1F]">
              {sesion.marca && <span className="rounded-md bg-[#1D1D1F] px-2 py-0.5 text-[12px] font-semibold text-white">{sesion.marca}</span>}
              <span className="truncate">{sesion.title}</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[860px] space-y-6 px-5 py-7">
        {/* Contexto e instrucciones: qué es esto y qué se espera, antes de leer un solo texto. */}
        <section className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-5">
          {(sesion.campanas ?? []).map(c => (
            <div key={c.nombre} className="mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868B]">Campaña</p>
              <p className="text-[18px] font-bold text-[#1D1D1F]">{c.nombre}</p>
              {c.objetivo && <p className="mt-0.5 text-[13px] text-[#3A3A3C]">{c.objetivo}</p>}
            </div>
          ))}
          <p className="text-[13px] text-[#3A3A3C]">
            Te compartimos {nombreDePiezas(null, piezas.length)} en{' '}
            {medios.length === 1 ? 'un medio' : `${medios.length} medios`}: {medios.map(m => m.platform).join(', ')}.
          </p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ['Lee cada pieza', 'Están agrupadas por medio. Cada tarjeta es una sola pieza con todos sus textos.'],
              ['Aprueba o pide cambios', 'Si algo no va, cuéntanos qué cambiar: con eso lo ajustamos.'],
              ['Firma y envía', `Al final escribe tu nombre. Tienes hasta el ${vence}.`],
            ].map(([t, d], i) => (
              <li key={t} className="rounded-xl bg-[#F5F5F7] p-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1D1D1F] text-[12px] font-bold text-white">{i + 1}</span>
                <p className="mt-2 text-[13px] font-semibold text-[#1D1D1F]">{t}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-[#6E6E73]">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {medios.length > 1 && (
          <nav className="flex flex-wrap gap-2">
            {medios.map(m => {
              const listas = m.piezas.filter(p => decisiones[p.clave]).length;
              return (
                <a
                  key={m.platform}
                  href={`#medio-${m.platform.replace(/\s+/g, '-')}`}
                  className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-medium text-[#1D1D1F] ring-1 ring-[rgba(0,0,0,0.08)] hover:bg-[#FAFAFB]"
                >
                  <PlatformIcon platform={m.platform} size="sm" />
                  {m.platform}
                  <span className={listas === m.piezas.length ? 'text-[#047857]' : 'text-[#86868B]'}>
                    {listas}/{m.piezas.length}
                  </span>
                </a>
              );
            })}
          </nav>
        )}

        {medios.map(m => (
          <section key={m.platform} id={`medio-${m.platform.replace(/\s+/g, '-')}`} className="scroll-mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <PlatformIcon platform={m.platform} size="md" />
              <div>
                <h2 className="text-[17px] font-bold text-[#1D1D1F]">{m.platform}</h2>
                <p className="text-[12.5px] text-[#6E6E73]">
                  {nombreDePiezas(m.platform, m.piezas.length)}
                  {QUE_ES[m.platform] ? ` · ${QUE_ES[m.platform]}` : ''}
                </p>
              </div>
            </div>

            {m.piezas.map((p, n) => {
              const d = decisiones[p.clave];
              const visibles = p.textos.filter(t => t.zona !== 'indicacion');
              // Los textos de un mismo lugar (los 10 títulos cortos) van juntos, numerados.
              const lugares: { nombre: string; zona: string | undefined; textos: Texto[] }[] = [];
              for (const t of visibles) {
                const ultimo = lugares[lugares.length - 1];
                if (ultimo && ultimo.nombre === lugar(t)) ultimo.textos.push(t);
                else lugares.push({ nombre: lugar(t), zona: t.zona, textos: [t] });
              }
              const zonas = [...new Set(lugares.map(l => l.zona ?? 'pieza'))];
              return (
                <article
                  key={p.clave}
                  className={`overflow-hidden rounded-2xl border bg-white ${
                    d === 'APPROVED' ? 'border-emerald-300' : d === 'REJECTED' ? 'border-amber-300' : 'border-[rgba(0,0,0,0.08)]'
                  }`}
                >
                  <header className="flex items-center justify-between gap-3 border-b border-[rgba(0,0,0,0.06)] px-5 py-3">
                    <p className="text-[14px] font-bold text-[#1D1D1F]">
                      {mayuscula(nombreDePieza(m.platform))} {m.piezas.length > 1 ? n + 1 : ''}
                      {p.textos[0]?.campana && (sesion.campanas?.length ?? 0) > 1 && (
                        <span className="font-normal text-[#86868B]"> · {p.textos[0].campana}</span>
                      )}
                    </p>
                    {d && (
                      <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${d === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                        {d === 'APPROVED' ? 'Aprobada' : 'Con cambios'}
                      </span>
                    )}
                  </header>

                  <div className="space-y-4 px-5 py-4">
                    {zonas.map(z => (
                      <div key={z}>
                        {zonas.length > 1 && <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#86868B]">{ZONA[z] ?? ''}</p>}
                        <div className="space-y-3">
                          {lugares
                            .filter(l => (l.zona ?? 'pieza') === z)
                            .map(l => (
                              <div key={l.nombre}>
                                <p className="text-[12px] font-semibold text-[#6E6E73]">
                                  {l.nombre}
                                  {l.textos.length > 1 && <span className="font-normal text-[#86868B]"> · {l.textos.length} opciones</span>}
                                </p>
                                {l.textos.length === 1 ? (
                                  <p className="mt-0.5 whitespace-pre-wrap text-[14px] leading-relaxed text-[#1D1D1F]">{l.textos[0].content}</p>
                                ) : (
                                  <ol className="mt-1 space-y-1">
                                    {l.textos.map((t, i) => (
                                      <li key={t.id} className="flex gap-2 text-[14px] leading-snug text-[#1D1D1F]">
                                        <span className="w-5 shrink-0 text-right text-[12px] tabular-nums text-[#86868B]">{i + 1}.</span>
                                        <span className="whitespace-pre-wrap">{t.content}</span>
                                      </li>
                                    ))}
                                  </ol>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <footer className="space-y-2 border-t border-[rgba(0,0,0,0.06)] bg-[#FAFAFB] px-5 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDecisiones(prev => ({ ...prev, [p.clave]: 'APPROVED' }))}
                        className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold ${
                          d === 'APPROVED' ? 'bg-emerald-600 text-white' : 'bg-white text-[#1D1D1F] ring-1 ring-[rgba(0,0,0,0.12)] hover:bg-emerald-50'
                        }`}
                      >
                        <Check className="h-4 w-4" /> Aprobar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecisiones(prev => ({ ...prev, [p.clave]: 'REJECTED' }))}
                        className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold ${
                          d === 'REJECTED' ? 'bg-amber-500 text-white' : 'bg-white text-[#1D1D1F] ring-1 ring-[rgba(0,0,0,0.12)] hover:bg-amber-50'
                        }`}
                      >
                        <PenLine className="h-4 w-4" /> Pedir cambios
                      </button>
                    </div>
                    {d === 'REJECTED' && (
                      <textarea
                        value={notas[p.clave] ?? ''}
                        onChange={e => setNotas(prev => ({ ...prev, [p.clave]: e.target.value }))}
                        rows={2}
                        placeholder="¿Qué cambiarías? Ej.: el segundo título promete demasiado; el tono es muy formal…"
                        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-[13px] focus:border-amber-400 focus:outline-none"
                      />
                    )}
                  </footer>
                </article>
              );
            })}
          </section>
        ))}

        <section className="space-y-3 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-5">
          <label className="block">
            <span className="text-[12px] font-semibold text-[#3A3A3C]">Tu nombre</span>
            <input
              value={quien}
              onChange={e => setQuien(e.target.value)}
              placeholder="Ej.: María López"
              className="mt-1 block w-full max-w-[360px] rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-[13px]"
            />
          </label>
          <p className="text-[12px] text-[#86868B]">Con tu nombre queda registrado quién revisó. Puedes enviar cuando todas las piezas tengan una decisión.</p>
        </section>
      </main>

      {/* La barra de abajo: cuánto falta y enviar, siempre a mano. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-[rgba(0,0,0,0.08)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[860px] flex-wrap items-center gap-3 px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[#1D1D1F]">
              {decididas} de {piezas.length} revisadas
            </p>
            {falta && <p className="text-[12px] text-amber-700">{falta}</p>}
          </div>
          <button
            type="button"
            disabled={enviando}
            onClick={() => void enviar()}
            className="rounded-lg bg-[#1D1D1F] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-40"
          >
            {enviando ? 'Enviando…' : 'Enviar revisión'}
          </button>
        </div>
      </div>
    </div>
  );
}
