import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORES } from '../guion';

/**
 * El número que sube y frena justo debajo del límite.
 *
 * Es la promesa del producto en un solo gesto: el copy sale con el largo que el
 * canal permite. Frena a dos tercios del plano para que se vea que frenó.
 */
export const Contador: React.FC<{ hasta: number; limite: number; sufijo: string }> = ({ hasta, limite, sufijo }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const valor = Math.round(
    interpolate(frame, [10, durationInFrames * 0.66], [0, hasta], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  return (
    <div
      style={{
        position: 'absolute',
        right: 72,
        top: 72,
        background: COLORES.blanco,
        borderRadius: 20,
        padding: '20px 30px',
        boxShadow: '0 18px 50px rgba(0,0,0,0.22)',
        textAlign: 'right',
      }}
    >
      <div style={{ fontSize: 76, fontWeight: 700, color: COLORES.tinta, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {valor}
        <span style={{ fontSize: 40, color: COLORES.grisTexto }}> / {limite}</span>
      </div>
      <div style={{ fontSize: 26, color: COLORES.grisTexto, marginTop: 6 }}>{sufijo}</div>
    </div>
  );
};
