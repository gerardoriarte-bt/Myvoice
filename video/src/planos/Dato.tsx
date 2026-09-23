import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORES } from '../guion';
import { APOYO, PIE, ROTULO, TITULAR } from '../tipografia';
import { TextoQueEmpuja } from '../componentes/TextoQueEmpuja';

/**
 * El número grande.
 *
 * Sube desde cero y frena: un número que ya está puesto se lee; uno que llega
 * se mira. Y lleva su letra chica al pie, porque es **una estimación del
 * equipo y no una medición** — decirlo cuesta una línea y es lo que separa un
 * dato de una promesa.
 */
export const Dato: React.FC<{
  rotulo: string;
  numero: number;
  sufijo: string;
  frase: string;
  pie: string;
}> = ({ rotulo, numero, sufijo, frase, pie }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const valor = Math.round(
    interpolate(frame, [6, durationInFrames * 0.55], [0, numero], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  return (
    <AbsoluteFill
      style={{ background: COLORES.tinta, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}
    >
      <TextoQueEmpuja recorrido={40}>
        <div style={{ ...ROTULO, color: COLORES.azul, marginBottom: 24 }}>{rotulo}</div>
      </TextoQueEmpuja>

      <div style={{ ...TITULAR, fontSize: 300, letterSpacing: -14, fontVariantNumeric: 'tabular-nums' }}>
        {valor}
        <span style={{ fontSize: 150, color: COLORES.azul }}>{sufijo}</span>
      </div>

      <TextoQueEmpuja desdeFrame={26} recorrido={50}>
        <div style={{ ...TITULAR, fontSize: 68, letterSpacing: -2, marginTop: 10 }}>{frase}</div>
      </TextoQueEmpuja>

      <TextoQueEmpuja desdeFrame={40} recorrido={30}>
        <div style={{ ...PIE, color: COLORES.grisTexto, marginTop: 40 }}>{pie}</div>
      </TextoQueEmpuja>
    </AbsoluteFill>
  );
};
