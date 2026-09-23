import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Foco } from '../guion';

/**
 * Una captura a sangre, con la cámara moviéndose de un foco a otro.
 *
 * El foco va en coordenadas RELATIVAS (0-1) y no en píxeles porque las capturas
 * tienen tamaños distintos: así el mismo componente sirve para las trece.
 *
 * Es el único movimiento del plano. Si además se moviera el texto, no se leería
 * ninguno de los dos.
 */
export const Captura: React.FC<{ imagen: string; desde: Foco; hasta: Foco }> = ({ imagen, desde, hasta }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const avance = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: 'clamp' });

  const entre = (a: number, b: number) => a + (b - a) * avance;
  const zoom = entre(desde.zoom, hasta.zoom);
  const x = entre(desde.x, hasta.x);
  const y = entre(desde.y, hasta.y);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Img
        src={staticFile(`pantallas/${imagen}`)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: `${x * 100}% ${y * 100}%`,
          transform: `scale(${zoom})`,
          transformOrigin: `${x * 100}% ${y * 100}%`,
        }}
      />
    </AbsoluteFill>
  );
};
