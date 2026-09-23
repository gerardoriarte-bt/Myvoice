import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

/** Cae, rebota y se queda: la decisión del cliente, sin texto que la explique. */
export const Sello: React.FC<{ texto: string; color: string; x: number; y: number; desdeFrame: number }> = ({
  texto, color, x, y, desdeFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const caida = spring({ frame: frame - desdeFrame, fps, config: { damping: 12, mass: 0.8 } });

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: `scale(${interpolate(caida, [0, 1], [1.8, 1])}) rotate(-8deg)`,
        opacity: interpolate(caida, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }),
        border: `5px solid ${color}`,
        color,
        borderRadius: 14,
        padding: '10px 22px',
        fontSize: 40,
        fontWeight: 800,
        letterSpacing: 1,
        background: 'rgba(255,255,255,0.92)',
      }}
    >
      {texto}
    </div>
  );
};
