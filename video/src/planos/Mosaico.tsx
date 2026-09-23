import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORES } from '../guion';

/**
 * Las doce pantallas pasando en grilla, encogiéndose hacia el centro.
 *
 * Después de un minuto mostrando una campaña avanzando, el mosaico dice lo que
 * el recorrido no dijo: que todo eso era una sola herramienta.
 */
export const Mosaico: React.FC<{ imagenes: string[]; texto: string }> = ({ imagenes, texto }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const cierre = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0.82], { extrapolateLeft: 'clamp' });

  return (
    <AbsoluteFill style={{ background: COLORES.tinta, justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 18,
          width: '82%',
          transform: `scale(${cierre})`,
        }}
      >
        {imagenes.map((img, i) => (
          <div
            key={img}
            style={{
              borderRadius: 12,
              overflow: 'hidden',
              opacity: interpolate(frame, [i * 8, i * 8 + 10], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              aspectRatio: '16 / 10',
            }}
          >
            <Img src={staticFile(`pantallas/${img}`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 90,
          fontSize: 58,
          fontWeight: 700,
          color: COLORES.blanco,
          letterSpacing: -1.5,
          opacity: interpolate(frame, [60, 80], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  );
};
