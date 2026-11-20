import React from 'react';
import { ArrowLeft } from 'lucide-react';
import type { MedioDetalle } from '../../types';

/**
 * B4 · La guía visual para Diseño (decisión 18; en el `.pen`, «§ CDM · Biblioteca · Meta · guía visual»).
 * Un lienzo por proporción, dibujado a escala con su zona segura, y lo que Diseño necesita para producir:
 * dónde se usa, el mínimo, el archivo y lo que hay que vigilar. La ve también Producción.
 */

type Formato = MedioDetalle['formatos'][number];

const miles = (n: number) => n.toLocaleString('es-CO');
const unicos = <T,>(xs: (T | null | undefined)[]) => [...new Set(xs.filter((x): x is T => x != null && x !== ''))];

/** Lo que Diseño revisa antes de entregar; la auditoría de Producción revisa lo mismo al subir la pieza. */
const ANTES_DE_ENTREGAR = [
  'La medida exacta del formato, no solo la proporción',
  'Nada clave dentro de la zona segura: titular, logo, precio',
  'El copy en la pieza es el aprobado, sin retipear',
  'El peso, por debajo del límite',
  'Video con subtítulos: casi todo se ve sin sonido',
  'El logo se lee en el tamaño del teléfono',
];

type Zona = { superior: number | null; inferior: number | null; lados: number | null; restriccion?: string | null } | null;

function Lienzo({ ancho, alto, zona }: { ancho: number; alto: number; zona: Zona }) {
  const h = 240;
  const w = Math.round((h * ancho) / alto);
  const sup = zona?.superior ?? 0;
  const inf = zona?.inferior ?? 0;
  const lados = zona?.lados ?? 0;
  return (
    <div className="relative shrink-0 rounded-md border border-[rgba(0,0,0,0.15)] bg-[#F5F5F7]" style={{ width: w, height: h }}>
      {sup > 0 && (
        <div className="absolute inset-x-0 top-0 flex items-end justify-center bg-amber-100/80 text-[10px] text-amber-800" style={{ height: `${sup}%` }}>
          {sup} %
        </div>
      )}
      {inf > 0 && (
        <div className="absolute inset-x-0 bottom-0 flex items-start justify-center bg-amber-100/80 text-[10px] text-amber-800" style={{ height: `${inf}%` }}>
          {inf} %
        </div>
      )}
      <div
        className="absolute flex items-center justify-center rounded border border-dashed border-emerald-600/60 text-center text-[10px] font-semibold uppercase tracking-[0.06em] text-emerald-800"
        style={{ top: `${sup}%`, bottom: `${inf}%`, left: `${lados}%`, right: `${lados}%` }}
      >
        {sup || inf ? 'Zona útil' : 'Lienzo completo'}
      </div>
    </div>
  );
}

export default function GuiaVisual({ medio, onVolver }: { medio: MedioDetalle; onVolver: () => void }) {
  // Un lienzo por proporción: imagen y video de la misma proporción se producen sobre el mismo lienzo.
  const porProporcion = new Map<string, Formato[]>();
  for (const f of medio.formatos) {
    const p = f.proporcion ?? f.nombre;
    porProporcion.set(p, [...(porProporcion.get(p) ?? []), f]);
  }

  return (
    <div className="space-y-5 pb-8">
      <button type="button" onClick={onVolver} className="inline-flex items-center gap-1 text-[12.5px] text-[#6E6E73] hover:text-[#1D1D1F]">
        <ArrowLeft className="h-3.5 w-3.5" /> {medio.nombre}
      </button>
      <div>
        <h2 className="text-[22px] font-bold text-[#1D1D1F] tracking-[-0.01em]">Guía visual para Diseño</h2>
        <p className="text-[13px] text-[#6E6E73] mt-0.5">
          {medio.nombre} · {porProporcion.size} {porProporcion.size === 1 ? 'lienzo' : 'lienzos'} · pasa a Producción con cada pieza
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {[...porProporcion.entries()].map(([proporcion, formatos]) => {
          const conLienzo = formatos.find(f => f.anchoPx && f.altoPx);
          const zona: Zona = formatos.map(f => f.guia?.zonaSegura).find(Boolean) ?? null;
          const ubicaciones = formatos.flatMap(f => f.ubicaciones);
          const restriccion = ubicaciones.map(u => u.zonaSegura?.restriccion).find(Boolean);
          const imagen = formatos.find(f => f.tipoArchivo === 'IMAGEN');
          const video = formatos.find(f => f.tipoArchivo === 'VIDEO');
          // Solo los mínimos que la guía da completos (ancho y alto en números): el resto son notas sueltas de la planilla.
          const minimos = unicos(
            ubicaciones.map(u =>
              /^\d+$/.test(u.detalles?.anchoMinimo ?? '') && /^\d+$/.test(u.detalles?.altoMinimo ?? '')
                ? `${u.detalles!.anchoMinimo} × ${u.detalles!.altoMinimo} px`
                : null
            )
          );
          const duraciones = unicos(video?.ubicaciones.map(u => u.detalles?.duracion) ?? []);
          const ojo = unicos(ubicaciones.filter(u => u.porConfirmar).map(u => `${u.nombre}: ${u.alertaTexto ?? 'por confirmar'}`));
          return (
            <section key={proporcion} className="rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white p-4">
              <h3 className="text-[15px] font-bold text-[#1D1D1F]">{proporcion}</h3>
              <p className="text-[12px] text-[#6E6E73]">
                {conLienzo ? `${miles(conLienzo.anchoPx!)} × ${miles(conLienzo.altoPx!)}` : 'sin medida'}
                {zona ? '' : ' · el medio no indica zona segura'}
              </p>
              <div className="mt-3 flex justify-center">
                {conLienzo && <Lienzo ancho={conLienzo.anchoPx!} alto={conLienzo.altoPx!} zona={zona} />}
              </div>
              {restriccion && <p className="mt-2 text-[11.5px] text-[#86868B]">Zona segura: {restriccion.toLowerCase()}.</p>}
              <dl className="mt-3 space-y-1.5 text-[12px]">
                <div>
                  <dt className="inline font-semibold text-[#1D1D1F]">Se usa en: </dt>
                  <dd className="inline text-[#3A3A3C]">{unicos(ubicaciones.map(u => u.nombre)).join(' · ')}</dd>
                </div>
                {minimos.length > 0 && (
                  <div>
                    <dt className="inline font-semibold text-[#1D1D1F]">Mínimo: </dt>
                    <dd className="inline text-[#3A3A3C]">{minimos.join(' · ')}</dd>
                  </div>
                )}
                {imagen && (
                  <div>
                    <dt className="inline font-semibold text-[#1D1D1F]">Imagen: </dt>
                    <dd className="inline text-[#3A3A3C]">{[imagen.archivos, imagen.pesoMaximo && `hasta ${imagen.pesoMaximo}`].filter(Boolean).join(' · ')}</dd>
                  </div>
                )}
                {video && (
                  <div>
                    <dt className="inline font-semibold text-[#1D1D1F]">Video: </dt>
                    <dd className="inline text-[#3A3A3C]">{[video.archivos, video.pesoMaximo && `hasta ${video.pesoMaximo}`].filter(Boolean).join(' · ')}</dd>
                  </div>
                )}
                {duraciones.length > 0 && (
                  <div>
                    <dt className="inline font-semibold text-[#1D1D1F]">Duración: </dt>
                    <dd className="inline text-[#3A3A3C]">{duraciones.join(' · ')}</dd>
                  </div>
                )}
              </dl>
              {ojo.length > 0 && (
                <ul className="mt-3 space-y-1 rounded-md bg-amber-50 px-3 py-2 text-[11.5px] text-amber-900">
                  {ojo.map(o => (
                    <li key={o}>Ojo · {o}</li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white p-4">
          <h3 className="text-[13px] font-bold text-[#1D1D1F]">Dónde va cada texto</h3>
          <ul className="mt-2 space-y-1 text-[12.5px] text-[#3A3A3C]">
            <li>
              <span className="font-semibold">Copy en la pieza</span> · lo escribe Copywriting, lo pone Diseño.
            </li>
            <li>
              <span className="font-semibold">Copy de la plataforma</span> · lo escribe Copywriting, lo carga el trafficker: no va en la imagen.
            </li>
          </ul>
        </section>
        <section className="rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white p-4">
          <h3 className="text-[13px] font-bold text-[#1D1D1F]">Antes de entregar</h3>
          <ul className="mt-2 space-y-1 text-[12.5px] text-[#3A3A3C]">
            {ANTES_DE_ENTREGAR.map(x => (
              <li key={x}>· {x}</li>
            ))}
          </ul>
          <p className="mt-2 text-[11.5px] text-[#86868B]">La auditoría de Producción revisa lo mismo cuando se sube la pieza.</p>
        </section>
      </div>
    </div>
  );
}
