import React from 'react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Image as ImageIcon, MessageSquareText, Palette, Pencil, Plus, RefreshCw } from 'lucide-react';
import { CampaignSpine, CopyVariation } from '../types';
import { PlatformIcon } from './ui/platformIcons';
import { etiquetaDelEditor } from '../etiquetasDelEditor';
import { libraryApi } from '../services/api';
import { esCarrusel, nombreDePieza, nombreDePiezas } from '../piezas';
import QuienAprueba, { PersonaQueAprueba } from './QuienAprueba';

/**
 * Los resultados de una generación por piezas (docs/plan-piezas-por-medio.md, diseño en el .pen: «§
 * Carrusel · Resultado» y «§ Post · Resultado»). Pensado para personas muy visuales: el contenido al
 * frente, la guía con números, colores e íconos, y las explicaciones detrás de un «i».
 *
 * Una pestaña por pieza; en el carrusel, una tarjeta por slide; en el resto, lo que va en la pieza y el
 * copy out por separado. Guardar no es aprobar: guardar lo pasa a Copy, donde lo aprueba el responsable.
 */
interface Props {
  variations: CopyVariation[];
  spine?: CampaignSpine | null;
  platform: string;
  slides?: number;
  dnaProfileId?: string;
  savedContentList: string[];
  /** Las piezas que ya están en Copy (por su conjunto): no se vuelven a guardar ni se reescriben acá. */
  savedConjuntos?: string[];
  onGuardar: (textos: CopyVariation[]) => Promise<void>;
  /** «Otra»: reescribe ese texto mirando los demás de su pieza. */
  onOtra?: (texto: CopyVariation, deLaPieza: CopyVariation[]) => Promise<void>;
  onAjustar: () => void;
  onOtroMedio: () => void;
}

/** Un «i» que muestra la explicación al pasar el mouse. */
const Info: React.FC<{ texto: string }> = ({ texto }) => (
  <span className="group relative inline-flex">
    <span className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gray-300 bg-white text-[9.5px] font-bold text-gray-500">
      i
    </span>
    <span className="pointer-events-none absolute left-6 top-1/2 z-20 w-64 -translate-y-1/2 rounded-lg bg-gray-900 px-2.5 py-2 text-[11px] leading-snug text-gray-50 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
      {texto}
    </span>
  </span>
);

const Pasos: React.FC<{ activo: number }> = ({ activo }) => (
  <div className="flex items-center gap-2">
    {['Pedir', 'Elegir', 'Guardar'].map((t, i) => (
      <React.Fragment key={t}>
        {i > 0 && <span className={`h-0.5 w-6 ${i <= activo ? 'bg-gray-900' : 'bg-gray-200'}`} />}
        <span className="flex items-center gap-1.5">
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
              i < activo ? 'bg-emerald-500 text-white' : i === activo ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'
            }`}
          >
            {i < activo ? '✓' : i + 1}
          </span>
          <span className={`text-[12px] ${i === activo ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{t}</span>
        </span>
      </React.Fragment>
    ))}
  </div>
);

const numeroDeSlide = (slot?: string) => (slot && /^slide\d+$/.test(slot) ? Number(slot.slice(5)) : 0);

const ResultadosPorPieza: React.FC<Props> = ({
  variations,
  spine,
  platform,
  slides,
  dnaProfileId,
  savedContentList,
  savedConjuntos = [],
  onGuardar,
  onOtra,
  onAjustar,
  onOtroMedio,
}) => {
  const piezas = React.useMemo(() => {
    const porIndice = new Map<number, CopyVariation[]>();
    for (const v of variations) {
      const i = v.piezaIndex ?? 1;
      porIndice.set(i, [...(porIndice.get(i) ?? []), v]);
    }
    return [...porIndice.entries()].sort((a, b) => a[0] - b[0]).map(([indice, textos]) => ({ indice, textos }));
  }, [variations]);

  const [actual, setActual] = React.useState(0);
  const [editando, setEditando] = React.useState<string | null>(null);
  const [ediciones, setEdiciones] = React.useState<Record<string, string>>({});
  const [guardando, setGuardando] = React.useState(false);
  const [aprobador, setAprobador] = React.useState<PersonaQueAprueba | null>(null);
  /** «Otro medio» con piezas sin guardar: la próxima generación reemplaza esta pantalla. */
  const [pidiendoOtro, setPidiendoOtro] = React.useState(false);
  const [reescribiendo, setReescribiendo] = React.useState<string | null>(null);

  React.useEffect(() => setActual(a => Math.min(a, Math.max(0, piezas.length - 1))), [piezas.length]);
  React.useEffect(() => {
    if (!dnaProfileId) return;
    libraryApi
      .campanaDeBrief(dnaProfileId)
      .then((c: any) => setAprobador(c?.responsable ?? null))
      .catch(() => setAprobador(null));
  }, [dnaProfileId]);

  if (piezas.length === 0) return null;
  const pieza = piezas[Math.min(actual, piezas.length - 1)];
  const carrusel = esCarrusel(platform);
  const nombre = nombreDePieza(platform);
  const Nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1);
  const angulo = pieza.textos[0]?.type;
  const premisa = spine?.angles?.find(a => a.name === angulo)?.premise;

  const conEdicion = (v: CopyVariation): CopyVariation =>
    ediciones[v.id] !== undefined ? { ...v, content: ediciones[v.id], charCount: ediciones[v.id].length } : v;
  // Guardada = ya está en Copy. Por su conjunto, no por su texto: si después se pide «Otra», sigue siendo
  // la misma pieza, y guardarla de nuevo le sumaría un segundo «Slide 2» en Copy.
  const guardada = (textos: CopyVariation[]) =>
    textos.some(v => v.conjuntoId && savedConjuntos.includes(v.conjuntoId)) ||
    textos.every(v => savedContentList.includes(conEdicion(v).content));
  const bloqueada = guardada(pieza.textos);
  const sinGuardar = piezas.filter(p => !guardada(p.textos));

  const guardar = async (textos: CopyVariation[]) => {
    setGuardando(true);
    try {
      await onGuardar(textos.map(conEdicion).filter(v => !savedContentList.includes(v.content)));
    } finally {
      setGuardando(false);
    }
  };

  const Texto: React.FC<{ v: CopyVariation; grande?: boolean }> = ({ v }) => {
    const contenido = conEdicion(v).content;
    if (editando === v.id)
      return (
        <textarea
          autoFocus
          rows={3}
          defaultValue={contenido}
          onBlur={e => {
            setEdiciones(prev => ({ ...prev, [v.id]: e.target.value }));
            setEditando(null);
          }}
          className="w-full rounded-lg border-[1.5px] border-gray-900 px-2 py-1.5 text-[13px] leading-snug text-gray-900 outline-none"
        />
      );
    return <p className="whitespace-pre-line text-[13px] leading-snug text-gray-900">{contenido}</p>;
  };

  const Pie: React.FC<{ v: CopyVariation }> = ({ v }) => {
    const largo = conEdicion(v).content.length;
    const marcas = [...(v.editorFlags ?? []).map(etiquetaDelEditor), ...(v.budgetOk === false ? ['Excede el límite'] : [])];
    return (
      <div className="mt-auto space-y-1.5 pt-2">
        {marcas.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {marcas.slice(0, 2).map(m => (
              <span key={m} className="rounded bg-amber-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-700">
                {m}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className={`text-[10px] ${v.budgetOk === false ? 'font-semibold text-red-600' : 'text-gray-400'}`}>
            {largo}
            {v.budget ? `/${v.budget}` : ''} car
          </span>
          <span className="flex items-center gap-2" title={bloqueada ? 'Ya está en Copy: se corrige allá' : undefined}>
            {onOtra && !bloqueada && (
              <button
                disabled={reescribiendo !== null}
                onClick={async () => {
                  setReescribiendo(v.id);
                  try {
                    await onOtra(v, pieza.textos.map(conEdicion));
                    setEdiciones(prev => {
                      const next = { ...prev };
                      delete next[v.id];
                      return next;
                    });
                  } finally {
                    setReescribiendo(null);
                  }
                }}
                className="flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-blue-600 hover:bg-blue-100 disabled:opacity-40"
                title="Otra versión de este texto, que encaje con los demás de la pieza"
              >
                <RefreshCw className={`h-3 w-3 ${reescribiendo === v.id ? 'animate-spin' : ''}`} /> Otra
              </button>
            )}
            {!bloqueada && (
              <button onClick={() => setEditando(v.id)} className="text-gray-400 hover:text-gray-700" aria-label="Editar">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        </div>
      </div>
    );
  };

  const deZona = (zona: string) => pieza.textos.filter(v => (v.zona ?? 'pieza') === zona);
  const slidesDeLaPieza = deZona('pieza')
    .filter(v => numeroDeSlide(v.slot) > 0)
    .sort((a, b) => numeroDeSlide(a.slot) - numeroDeSlide(b.slot));
  const ultima = slidesDeLaPieza.length;

  const Campos: React.FC<{ textos: CopyVariation[] }> = ({ textos }) => (
    <div className="divide-y divide-gray-100">
      {textos.map(v => (
        <div key={v.id} className="flex flex-col py-2.5">
          <span className="mb-1 text-[9.5px] font-bold uppercase tracking-wide text-gray-400">
            {v.slotLabel ?? v.slot}
            {(v.variationIndex ?? 1) > 1 || textos.filter(o => o.slot === v.slot).length > 1 ? ` ${v.variationIndex}` : ''}
          </span>
          <Texto v={v} />
          <Pie v={v} />
        </div>
      ))}
    </div>
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <Pasos activo={1} />
      </div>

      {/* El pedido: de dónde salió esto y cómo volver. */}
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5">
        <PlatformIcon platform={platform} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-gray-900">{platform}</p>
          <p className="text-[11px] text-gray-500">
            {nombreDePiezas(platform, piezas.length)}
            {carrusel ? ` · ${slides ?? Math.max(...piezas.map(p => p.textos.filter(v => numeroDeSlide(v.slot) > 0).length))} slides` : ''}
          </p>
        </div>
        <button
          onClick={() => {
            setPidiendoOtro(false);
            onAjustar();
          }}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11.5px] text-gray-700 hover:bg-gray-50">
          <ArrowLeft className="h-3 w-3" /> Ajustar
        </button>
        <button
          onClick={() => (sinGuardar.length > 0 ? setPidiendoOtro(true) : onOtroMedio())}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11.5px] text-gray-700 hover:bg-gray-50"
        >
          <Plus className="h-3 w-3" /> Otro medio
        </button>
      </div>

      {pidiendoOtro && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          <p className="flex-1 text-[12.5px] text-gray-900">
            <span className="font-semibold">{nombreDePiezas(platform, sinGuardar.length)} sin guardar.</span> Al generar otro medio salen de esta pantalla y quedan solo en Historial.
          </p>
          <button
            disabled={guardando}
            onClick={async () => {
              await guardar(sinGuardar.flatMap(p => p.textos));
              setPidiendoOtro(false);
              onOtroMedio();
            }}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-40"
          >
            Guardar y seguir
          </button>
          <button
            onClick={() => {
              setPidiendoOtro(false);
              onOtroMedio();
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[11.5px] text-gray-700"
          >
            Seguir sin guardar
          </button>
          <button onClick={() => setPidiendoOtro(false)} className="text-[11.5px] text-gray-500 hover:text-gray-800">
            Volver
          </button>
        </div>
      )}

      {/* Una pestaña por pieza, como miniatura. */}
      <div className="flex flex-wrap items-end gap-2.5">
        {piezas.map((p, i) => {
          const on = i === actual;
          const n = carrusel ? p.textos.filter(v => numeroDeSlide(v.slot) > 0).length : 3;
          return (
            <button
              key={p.indice}
              onClick={() => setActual(i)}
              className={`flex w-40 flex-col items-center gap-1.5 rounded-xl px-2.5 py-2 ${on ? 'border-2 border-gray-900 bg-white' : 'border border-gray-200 bg-gray-50 hover:bg-white'}`}
            >
              <span className="flex gap-0.5">
                {Array.from({ length: Math.min(n, 8) }).map((_, s) => (
                  <span
                    key={s}
                    className={`h-4 w-2.5 rounded-sm ${carrusel && s === 0 ? 'bg-[#0F766E]' : carrusel && s === n - 1 ? 'bg-[#D97706]' : on ? 'bg-gray-300' : 'bg-gray-200'}`}
                  />
                ))}
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-bold ${on ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {p.indice}
                </span>
                <span title={p.textos[0]?.type} className={`max-w-[112px] truncate text-[11.5px] ${on ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{p.textos[0]?.type}</span>
              </span>
              {guardada(p.textos) && (
                <span className="flex items-center gap-0.5 text-[9.5px] text-emerald-600">
                  <Check className="h-2.5 w-2.5" /> guardado
                </span>
              )}
            </button>
          );
        })}
        <Info texto={`${nombreDePiezas(platform, piezas.length)} distintos, cada uno con su ángulo. Se guarda cada uno; lo aprueba después el responsable de la campaña, en Copy.`} />
      </div>

      {/* Cuál estás mirando. */}
      <div className="flex items-center gap-3">
        <button disabled={actual === 0} onClick={() => setActual(actual - 1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white disabled:opacity-30" aria-label="Anterior">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[22px] font-bold text-gray-900">
          {Nombre} {pieza.indice}
        </span>
        <span className="text-[14px] text-gray-400">de {piezas.length}</span>
        {angulo && <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-emerald-700">{angulo}</span>}
        <button disabled={actual === piezas.length - 1} onClick={() => setActual(actual + 1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white disabled:opacity-30" aria-label="Siguiente">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {premisa && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-700">
            {carrusel ? `La historia del carrusel ${pieza.indice}` : 'El ángulo'}
          </p>
          <p className="text-[12.5px] font-semibold text-gray-900">{premisa}</p>
        </div>
      )}

      {carrusel ? (
        <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${Math.min(ultima, 6)}, minmax(0, 1fr))` }}>
          {slidesDeLaPieza.map(v => {
            const n = numeroDeSlide(v.slot);
            const color = n === 1 ? '#0F766E' : n === ultima ? '#D97706' : null;
            return (
              <div
                key={v.id}
                className="flex min-h-[200px] flex-col gap-2 rounded-xl bg-white p-3"
                style={{ border: color ? `1.5px solid ${color}` : '1px solid #E5E7EB' }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: color ?? '#111827' }}>
                    {n}
                  </span>
                  {(n === 1 || n === ultima) && <span className="text-[10.5px] font-semibold text-gray-500">{n === 1 ? 'Engancha' : 'Cierra'}</span>}
                </div>
                <Texto v={v} />
                <Pie v={v} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border-[1.5px] border-[#0F766E] bg-white px-4 py-3">
            <p className="flex items-center gap-1.5 text-[12px] font-bold text-gray-900">
              <ImageIcon className="h-3.5 w-3.5 text-[#0F766E]" /> Va en la pieza <Info texto="Lo que Diseño pone en la pieza. Corto: se lee en un segundo." />
            </p>
            <Campos textos={deZona('pieza')} />
          </div>
          {deZona('copyOut').length > 0 && (
            <div className="rounded-xl border-[1.5px] border-[#2563EB] bg-white px-4 py-3">
              <p className="flex items-center gap-1.5 text-[12px] font-bold text-gray-900">
                <MessageSquareText className="h-3.5 w-3.5 text-[#2563EB]" /> Copy out <Info texto="El texto que acompaña la publicación. No va en la imagen." />
              </p>
              <Campos textos={deZona('copyOut')} />
            </div>
          )}
        </div>
      )}

      {carrusel && deZona('copyOut').length > 0 && (
        <div className="rounded-xl border-[1.5px] border-[#2563EB] bg-white px-4 py-3">
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-gray-900">
            <MessageSquareText className="h-3.5 w-3.5 text-[#2563EB]" /> Copy out <Info texto="El texto que acompaña la publicación. No va en la imagen." />
          </p>
          <Campos textos={deZona('copyOut')} />
        </div>
      )}

      {deZona('indicacion').map(v => (
        <div key={v.id} className="flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5">
          <Palette className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" />
          <span className="text-[9.5px] font-bold uppercase tracking-wide text-gray-400">{v.slotLabel ?? v.slot}</span>
          <p className="flex-1 text-[12px] text-gray-700">{conEdicion(v).content}</p>
          <Info texto="Indicación para Diseño. No se publica." />
        </div>
      ))}

      {/* Guardar no es aprobar: dice a quién le llega. */}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-3">
        <Info texto="Guardar lo pasa a Copy como «Por aprobar». Lo aprueba el responsable de la campaña." />
        <div className="mr-auto">
          <QuienAprueba compacto rotulo="Va a aprobación de" personas={aprobador ? [aprobador] : []} sinNadie={!aprobador} detalle="la campaña no tiene responsable" />
        </div>
        <button
          disabled={guardando || guardada(pieza.textos)}
          onClick={() => guardar(pieza.textos)}
          className="rounded-lg bg-gray-900 px-4 py-2 text-[12.5px] font-semibold text-white disabled:opacity-40"
        >
          {guardada(pieza.textos) ? `${Nombre} ${pieza.indice} guardado` : `Guardar el ${nombre} ${pieza.indice}`}
        </button>
        {piezas.length > 1 && sinGuardar.length > 0 && (
          <button
            disabled={guardando}
            onClick={() => guardar(sinGuardar.flatMap(p => p.textos))}
            className="rounded-lg border border-gray-900 bg-white px-4 py-2 text-[12.5px] font-semibold text-gray-900 disabled:opacity-40"
          >
            {sinGuardar.length === piezas.length ? `Guardar los ${piezas.length}` : sinGuardar.length === 1 ? 'Guardar el que falta' : `Guardar los ${sinGuardar.length} que faltan`}
          </button>
        )}
      </div>
    </section>
  );
};

export default ResultadosPorPieza;
