import React from 'react';

/**
 * Un «i» que muestra la explicación al pasar el mouse (docs/diseno-sistema.md: las explicaciones largas
 * van detrás de un «i»). `arriba` la abre hacia arriba: en tarjetas al borde de la pantalla, a la
 * derecha se cortaba.
 */
const Info: React.FC<{ texto: string; arriba?: boolean }> = ({ texto, arriba = false }) => (
  <span className="group relative inline-flex">
    <span className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gray-300 bg-white text-[9.5px] font-bold text-gray-500">
      i
    </span>
    <span
      className={`pointer-events-none absolute z-20 w-64 rounded-lg bg-gray-900 px-2.5 py-2 text-[11px] font-normal normal-case leading-snug tracking-normal text-gray-50 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 ${
        arriba ? 'bottom-6 left-0' : 'left-6 top-1/2 -translate-y-1/2'
      }`}
    >
      {texto}
    </span>
  </span>
);

export default Info;
