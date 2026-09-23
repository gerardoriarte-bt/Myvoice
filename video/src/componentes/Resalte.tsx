import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORES } from '../guion';

/** El recuadro que señala una zona, con su etiqueta. Crece desde el centro. */
export const Resalte: React.FC<{
  x: number; y: number; ancho: number; alto: number; etiqueta?: string; desdeFrame: number;
}> = ({ x, y, ancho, alto, etiqueta, desdeFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({ frame: frame - desdeFrame, fps, config: { damping: 200 } });

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${ancho * 100}%`,
        height: `${alto * 100}%`,
        border: `4px solid ${COLORES.azul}`,
        borderRadius: 16,
        transform: `scale(${interpolate(entrada, [0, 1], [0.9, 1])})`,
        opacity: entrada,
        boxShadow: '0 0 0 9999px rgba(29,29,31,0.28)',
      }}
    >
      {etiqueta && (
        <div
          style={{
            position: 'absolute',
            top: -54,
            left: 0,
            background: COLORES.azul,
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 10,
            fontSize: 26,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {etiqueta}
        </div>
      )}
    </div>
  );
};
