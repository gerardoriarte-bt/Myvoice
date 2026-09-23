import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORES } from '../guion';
import { TextoQueEmpuja } from '../componentes/TextoQueEmpuja';
import { TITULAR } from '../tipografia';

/**
 * Los cuatro planos de texto sobre negro: el problema.
 *
 * Cada línea nueva ocupa el centro y las anteriores quedan apiladas arriba, en
 * gris y más chicas. Se lee como una lista que crece, que es exactamente la
 * sensación del problema que el video plantea.
 */
export const Titular: React.FC<{ anteriores: string[]; linea: string; flashFinal?: boolean }> = ({
  anteriores, linea, flashFinal,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // El flash a blanco es la bisagra del video: acá termina el problema.
  const flash = flashFinal
    ? interpolate(frame, [durationInFrames - 4, durationInFrames], [0, 1], { extrapolateLeft: 'clamp' })
    : 0;

  return (
    <AbsoluteFill style={{ background: COLORES.tinta, justifyContent: 'center', alignItems: 'center', padding: 120 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        {anteriores.map(texto => (
          <div key={texto} style={{ ...TITULAR, fontSize: 52, letterSpacing: -1.4, color: COLORES.grisTexto }}>
            {texto}
          </div>
        ))}
        <TextoQueEmpuja estilo={{ marginTop: anteriores.length ? 24 : 0 }}>
          <div style={{ ...TITULAR, textAlign: 'center' }}>
            {linea}
          </div>
        </TextoQueEmpuja>
      </div>
      {flash > 0 && <AbsoluteFill style={{ background: COLORES.blanco, opacity: flash }} />}
    </AbsoluteFill>
  );
};
