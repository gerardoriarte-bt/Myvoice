import React from 'react';
import { Check, ExternalLink, PenLine } from 'lucide-react';
import { reviewApi } from '../../services/api';
import type { EtapaDeFunnel, ReviewDecision, ReviewSession } from '../../types';
import Isotipo from '../../components/ui/Isotipo';
import { PlatformIcon } from '../../components/ui/platformIcons';

/**
 * La aprobación final del cliente antes de implementar (F5, 2026-11-24): lo que se va a montar, por medio y por
 * anuncio, con el arte, los textos (en la pieza y los que lo acompañan), el destino y las fechas. Una decisión por
 * anuncio; pedir cambios exige decir cuáles. Mismo marco que la revisión de copy. Hecho sin el `.pen`.
 */

const ETAPA: Record<EtapaDeFunnel, string> = { RECONOCIMIENTO: 'Reconocimiento', CONSIDERACION: 'Consideración', CONVERSION: 'Conversión', RETENCION: 'Retención' };
const ZONA: Record<string, string> = { pieza: 'Va en la pieza', copyOut: 'Acompaña la publicación' };
const dia = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : null);

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
  const medios = [...new Set(datos.anuncios.map(a => a.medio))];
  const decididos = datos.anuncios.filter(a => decisiones[a.id]).length;
  const vence = new Date(sesion.expiresAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });

  const enviar = async () => {
    if (decididos < datos.anuncios.length) return setFalta(`Faltan ${datos.anuncios.length - decididos} por revisar.`);
    if (datos.anuncios.some(a => decisiones[a.id] === 'REJECTED' && !notas[a.id]?.trim())) return setFalta('Cuando pidas cambios, escribe cuáles.');
    if (!quien.trim()) return setFalta('Escribe tu nombre para firmar la aprobación.');
    setFalta(null);
    setEnviando(true);
    try {
      const r = await reviewApi.submit(token, {
        reviewerName: quien.trim(),
        feedbacks: datos.anuncios.map(a => ({ anuncioId: a.id, decision: decisiones[a.id], feedbackCopy: notas[a.id]?.trim() || undefined })),
      });
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
        <div className="mx-auto flex max-w-[900px] items-center gap-2.5 px-5 py-4">
          <Isotipo className="h-6 w-6" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868B]">Aprobación para publicar</p>
            <h1 className="flex items-center gap-2 text-[15px] font-semibold text-[#1D1D1F]">
              {datos.marca && <span className="rounded-md bg-[#1D1D1F] px-2 py-0.5 text-[12px] font-semibold text-white">{datos.marca}</span>}
              <span className="truncate">{datos.campana ?? sesion.title}</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] space-y-6 px-5 py-7">
        <section className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-5">
          <p className="text-[13px] text-[#3A3A3C]">
            Esto es lo que vamos a publicar: {datos.anuncios.length} {datos.anuncios.length === 1 ? 'anuncio' : 'anuncios'} en {medios.join(', ')}. Cada uno
            trae el arte, los textos, adónde lleva y cuándo sale.
          </p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ['Revisa cada anuncio', 'El arte, los textos y el enlace de destino, tal como van a salir.'],
              ['Aprueba o pide cambios', 'Si algo no va, cuéntanos qué cambiar. Lo aprobado se publica.'],
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

        {medios.map(medio => (
          <section key={medio} className="space-y-3">
            <h2 className="text-[17px] font-bold text-[#1D1D1F]">{medio}</h2>
            {datos.anuncios
              .filter(a => a.medio === medio)
              .map(a => {
                const d = decisiones[a.id];
                const zonas = [...new Set(a.textos.map(t => t.zona))];
                return (
                  <article
                    key={a.id}
                    className={`overflow-hidden rounded-2xl border bg-white ${d === 'APPROVED' ? 'border-emerald-300' : d === 'REJECTED' ? 'border-amber-300' : 'border-[rgba(0,0,0,0.08)]'}`}
                  >
                    <header className="flex flex-wrap items-center gap-2 border-b border-[rgba(0,0,0,0.06)] px-5 py-3">
                      <PlatformIcon platform={a.platform} size="sm" />
                      <p className="flex-1 text-[14px] font-bold text-[#1D1D1F]">
                        {a.formato}
                        {a.etapa && <span className="font-normal text-[#86868B]"> · {ETAPA[a.etapa]}</span>}
                      </p>
                      {(a.desde || a.hasta) && <span className="text-[12px] text-[#6E6E73]">Sale del {dia(a.desde)} al {dia(a.hasta)}</span>}
                    </header>
                    <div className="grid gap-4 px-5 py-4 md:grid-cols-[240px_1fr]">
                      <div>
                        {a.previaUrl ? (
                          <img src={a.previaUrl} alt={a.formato} className="w-full rounded-lg bg-[#F5F5F7] object-contain ring-1 ring-[rgba(0,0,0,0.06)]" />
                        ) : a.enlace ? (
                          <a href={a.enlace} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#0E7490] hover:underline">
                            <ExternalLink className="h-3.5 w-3.5" /> Ver la pieza
                          </a>
                        ) : (
                          <p className="rounded-lg bg-[#F5F5F7] px-3 py-6 text-center text-[12px] text-[#86868B]">
                            {a.soloTexto ? 'Anuncio de solo texto' : 'Sin vista previa'}
                          </p>
                        )}
                      </div>
                      <div className="space-y-3">
                        {zonas.map(z => (
                          <div key={z}>
                            {zonas.length > 1 && <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#86868B]">{ZONA[z] ?? ''}</p>}
                            <div className="space-y-2">
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
                    <footer className="space-y-2 border-t border-[rgba(0,0,0,0.06)] bg-[#FAFAFB] px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setDecisiones(p => ({ ...p, [a.id]: 'APPROVED' }))}
                          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold ${d === 'APPROVED' ? 'bg-emerald-600 text-white' : 'bg-white text-[#1D1D1F] ring-1 ring-[rgba(0,0,0,0.12)] hover:bg-emerald-50'}`}
                        >
                          <Check className="h-4 w-4" /> Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDecisiones(p => ({ ...p, [a.id]: 'REJECTED' }))}
                          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold ${d === 'REJECTED' ? 'bg-amber-500 text-white' : 'bg-white text-[#1D1D1F] ring-1 ring-[rgba(0,0,0,0.12)] hover:bg-amber-50'}`}
                        >
                          <PenLine className="h-4 w-4" /> Pedir cambios
                        </button>
                      </div>
                      {d === 'REJECTED' && (
                        <textarea
                          value={notas[a.id] ?? ''}
                          onChange={e => setNotas(p => ({ ...p, [a.id]: e.target.value }))}
                          rows={2}
                          placeholder="¿Qué cambiarías? Ej.: el enlace no es el de la promoción; el título del arte no se lee…"
                          className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-[13px] focus:border-amber-400 focus:outline-none"
                        />
                      )}
                    </footer>
                  </article>
                );
              })}
          </section>
        ))}

        <section className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-5">
          <label className="block">
            <span className="text-[12px] font-semibold text-[#3A3A3C]">Tu nombre</span>
            <input value={quien} onChange={e => setQuien(e.target.value)} placeholder="Ej.: María López" className="mt-1 block w-full max-w-[360px] rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-[13px]" />
          </label>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-[rgba(0,0,0,0.08)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[900px] flex-wrap items-center gap-3 px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[#1D1D1F]">
              {decididos} de {datos.anuncios.length} revisados
            </p>
            {falta && <p className="text-[12px] text-amber-700">{falta}</p>}
          </div>
          <button type="button" disabled={enviando} onClick={() => void enviar()} className="rounded-lg bg-[#1D1D1F] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-40">
            {enviando ? 'Enviando…' : 'Enviar aprobación'}
          </button>
        </div>
      </div>
    </div>
  );
}
