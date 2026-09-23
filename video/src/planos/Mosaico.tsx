import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORES } from '../guion';
import { TITULAR } from '../tipografia';

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
          gap: 16,
          width: 1740,
          transform: `scale(${cierre})`,
        }}
      >
        {imagenes.map((img, i) => (
          <div
            key={img}
            style={{
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.12)',
              overflow: 'hidden',
              opacity: interpolate(frame, [i * 8, i * 8 + 10], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              // Altura explícita: con `aspectRatio` las celdas colapsaban y las
              // capturas salían del tamaño de una estampilla.
              height: 264,
            }}
          >
            <Img src={staticFile(`pantallas/${img}`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 64,
          ...TITULAR,
          fontSize: 62,
          letterSpacing: -2,
          opacity: interpolate(frame, [60, 80], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  );
};
