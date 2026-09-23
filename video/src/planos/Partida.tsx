import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORES } from '../guion';
import { TextoQueEmpuja } from '../componentes/TextoQueEmpuja';

/**
 * El plano que justifica el video entero.
 *
 * A la izquierda el copy aprobado, a la derecha lo que la IA leyó en la pieza,
 * y la palabra que difiere marcada en los dos lados. **Esto solo entra en
 * horizontal**, y es la razón por la que el formato cambió: la comparación lado
 * a lado es el producto explicándose sin que nadie lo explique.
 *
 * Es el plano más largo —cinco segundos— porque es el único que hay que leer.
 */
export const Partida: React.FC<{
  imagen: string; aprobado: string; enLaPieza: string; diferencia: string[];
}> = ({ imagen, aprobado, enLaPieza, diferencia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const columna = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const linea = interpolate(frame, [58, 78], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const conMarca = (texto: string, palabra: string) => {
    const partes = texto.split(palabra);
    return (
      <>
        {partes[0]}
        <span style={{ background: COLORES.ambarSuave, color: COLORES.ambar, borderRadius: 8, padding: '2px 10px' }}>
          {palabra}
        </span>
        {partes.slice(1).join(palabra)}
      </>
    );
  };

  const caja = (titulo: string, texto: string, palabra: string, x: number) => (
    <div
      style={{
        flex: 1,
        background: COLORES.blanco,
        borderRadius: 24,
        padding: 44,
        transform: `translateX(${interpolate(columna, [0, 1], [x, 0])}px)`,
        opacity: columna,
        boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1.4, color: COLORES.grisTexto }}>{titulo}</div>
      <div style={{ fontSize: 52, fontWeight: 600, color: COLORES.tinta, marginTop: 20, lineHeight: 1.25 }}>
        {conMarca(texto, palabra)}
      </div>
    </div>
  );

  return (
    <AbsoluteFill style={{ background: COLORES.tinta }}>
      {/* El fondo es contexto, no contenido: si compite, no se lee la comparación. */}
      <AbsoluteFill style={{ opacity: 0.1 }}>
        <Img src={staticFile(`pantallas/${imagen}`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>

      <AbsoluteFill style={{ padding: '110px 90px', justifyContent: 'center' }}>
        <TextoQueEmpuja>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: COLORES.blanco,
              letterSpacing: -2,
              marginBottom: 40,
              textAlign: 'center',
            }}
          >
            La IA revisa la pieza terminada
          </div>
        </TextoQueEmpuja>

        <div style={{ display: 'flex', gap: 40, alignItems: 'stretch' }}>
          {caja('APROBADO', aprobado, diferencia[0], -140)}
          {caja('EN LA PIEZA', enLaPieza, diferencia[1], 140)}
        </div>

        {/* La línea que conecta las dos palabras: dice "esto contra esto". */}
        <div style={{ position: 'relative', height: 60, marginTop: 8 }}>
          <div
            style={{
              position: 'absolute',
              left: '25%',
              width: `${linea * 50}%`,
              top: 28,
              height: 4,
              background: COLORES.ambar,
              borderRadius: 2,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
