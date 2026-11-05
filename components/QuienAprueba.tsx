import React from 'react';
import { Mail } from 'lucide-react';

/**
 * Quién aprueba, con nombre y cara (feedback de pruebas del 2026-11-05): quien espera tiene que saber a
 * quién escribirle para que la validación avance. Lo calcula el servidor (permisosPieza.ts para las
 * piezas; el responsable de la campaña para el copy). Diseño en el .pen: «§ Lote 1 · Quién aprueba».
 */
export interface PersonaQueAprueba {
  id: string;
  name: string;
  email?: string | null;
}

interface Props {
  personas: PersonaQueAprueba[];
  /** Una línea: por qué es esa persona. */
  detalle?: string;
  /** Quien mira es quien aprueba. */
  soyYo?: boolean;
  /** Sin nadie a quien escribirle: se ve en ámbar. */
  sinNadie?: boolean;
  /** Una sola línea, para las filas de Copy. */
  compacto?: boolean;
  /** Lo que dice el rótulo; por defecto «Lo aprueba». */
  rotulo?: string;
}

const COLORES = ['#0F766E', '#7C3AED', '#2563EB', '#B45309', '#BE185D', '#4D7C0F', '#0E7490'];

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]!.toUpperCase())
    .join('') || '?';

const color = (id: string) => COLORES[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORES.length];

const Cara = ({ p, chica }: { p: PersonaQueAprueba; chica?: boolean }) => (
  <span
    title={p.email ? `${p.name} · ${p.email}` : p.name}
    className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-white ${
      chica ? 'h-[18px] w-[18px] text-[8px]' : 'h-[22px] w-[22px] text-[9px]'
    }`}
    style={{ backgroundColor: color(p.id) }}
  >
    {iniciales(p.name)}
  </span>
);

const Nombre = ({ p }: { p: PersonaQueAprueba }) =>
  p.email ? (
    <a href={`mailto:${p.email}`} className="inline-flex items-center gap-0.5 hover:underline" onClick={e => e.stopPropagation()}>
      {p.name}
      <Mail className="h-2.5 w-2.5 opacity-50" />
    </a>
  ) : (
    <span>{p.name}</span>
  );

const lista = (personas: PersonaQueAprueba[]) =>
  personas.map((p, i) => (
    <React.Fragment key={p.id}>
      {i > 0 && (i === personas.length - 1 ? ' o ' : ', ')}
      <Nombre p={p} />
    </React.Fragment>
  ));

const QuienAprueba: React.FC<Props> = ({ personas, detalle, soyYo, sinNadie, compacto, rotulo = 'Lo aprueba' }) => {
  const vacio = sinNadie || personas.length === 0;

  if (compacto) {
    return (
      <p className={`mt-0.5 flex items-center gap-1 text-[10px] ${vacio ? 'text-amber-700' : 'text-gray-500'}`}>
        <span className="font-semibold uppercase tracking-wide text-gray-400">{rotulo}</span>
        {vacio ? (
          <span>{detalle ?? 'nadie todavía'}</span>
        ) : (
          <>
            <span className="flex -space-x-1">{personas.slice(0, 3).map(p => <Cara key={p.id} p={p} chica />)}</span>
            <span className="truncate font-medium text-gray-700">{soyYo ? 'Vos' : lista(personas)}</span>
          </>
        )}
      </p>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
        vacio ? 'border-amber-200 bg-amber-50' : soyYo ? 'border-emerald-200 bg-emerald-50' : 'border-[#DCE3FB] bg-[#F3F6FF]'
      }`}
    >
      {!vacio && <span className="flex -space-x-1.5">{personas.slice(0, 4).map(p => <Cara key={p.id} p={p} />)}</span>}
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">{soyYo ? 'Te toca aprobar' : rotulo}</p>
        <p className="text-[12px] font-semibold leading-snug text-gray-900">
          {vacio ? 'Nadie todavía' : soyYo ? 'Vos' : lista(personas)}
        </p>
        {detalle && <p className="text-[10.5px] leading-snug text-gray-500">{detalle}</p>}
      </div>
    </div>
  );
};

export default QuienAprueba;
