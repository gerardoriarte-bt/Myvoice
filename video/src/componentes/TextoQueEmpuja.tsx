import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * El texto no aparece: entra desde abajo y empuja al anterior.
 *
 * Un fundido de opacidad es lo que hace ver lento un video. Un empuje tiene
 * dirección, y la dirección es lo que se lee como ritmo.
 */
export const TextoQueEmpuja: React.FC<{
  children: React.ReactNode;
  desdeFrame?: number;
  estilo?: React.CSSProperties;
  /** Cuánto recorre al entrar, en píxeles. */
  recorrido?: number;
}> = ({ children, desdeFrame = 0, estilo, recorrido = 90 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({ frame: frame - desdeFrame, fps, config: { damping: 200, mass: 0.6 } });

  return (
    <div
      style={{
        transform: `translateY(${interpolate(entrada, [0, 1], [recorrido, 0])}px)`,
        opacity: interpolate(entrada, [0, 0.35], [0, 1], { extrapolateRight: 'clamp' }),
        ...estilo,
      }}
    >
      {children}
    </div>
  );
};
