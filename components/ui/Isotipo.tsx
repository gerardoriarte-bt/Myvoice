import React from 'react';

/**
 * El isotipo de My Voice: seis barras de una onda de voz sobre una plaquita.
 *
 * Es la marca del PRODUCTO, no la de un workspace. La identidad de cada
 * empresa (A2) va aparte y nunca lo reemplaza en la portada ni en el pie.
 *
 * El trazo está escrito acá y no importado de `lucide-react` a propósito: una
 * marca no puede cambiar de forma porque se actualizó una librería de iconos.
 * `public/favicon.svg` repite la misma geometría: si cambia uno, cambia el otro.
 */

/** Las seis barras, en una grilla de 24×24. */
export const ISOTIPO_TRAZO = 'M2 10v3M6 6v11M10 3v18M14 8v7M18 5v13M22 10v3';

interface IsotipoProps {
  /** Lado de la plaquita, en px. */
  size?: number;
  /** `oscuro`: plaquita ink y barras blancas. `claro`: al revés, para fondos oscuros. */
  tono?: 'oscuro' | 'claro';
  className?: string;
}

const Isotipo: React.FC<IsotipoProps> = ({ size = 28, tono = 'oscuro', className = '' }) => (
  <span
    aria-hidden="true"
    className={`inline-flex items-center justify-center shrink-0 ${
      tono === 'oscuro' ? 'bg-ink text-white' : 'bg-white text-ink'
    } ${className}`}
    // El radio y el icono escalan con la plaquita para que se lea igual en 22 y en 48 px.
    style={{ width: size, height: size, borderRadius: Math.round(size * 0.27) }}
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      style={{ width: size * 0.58, height: size * 0.58 }}
    >
      <path d={ISOTIPO_TRAZO} />
    </svg>
  </span>
);

export default Isotipo;
