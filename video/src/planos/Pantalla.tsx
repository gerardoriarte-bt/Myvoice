import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORES, Plano } from '../guion';
import { Captura } from '../componentes/Captura';
import { Contador } from '../componentes/Contador';
import { Resalte } from '../componentes/Resalte';
import { Sello } from '../componentes/Sello';
import { BloqueDeTexto, Velo } from '../componentes/BloqueDeTexto';

type Props = Extract<Plano, { tipo: 'pantalla' }>;

/**
 * Una captura a sangre, con su bloque de texto anclado abajo a la izquierda.
 *
 * El whip pan de entrada dura 6 frames y solo se usa dentro de un bloque: dice
 * "es la misma idea que sigue". Entre bloques va corte seco, y ahí cambia el
 * fondo, que es la otra señal de que el video cambió de tema.
 */
export const Pantalla: React.FC<Props> = ({
  imagen, rotulo, texto, subtexto, fondo, desde, hasta, resalte, etiquetas, contador, sellos, transicion,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const whip = transicion === 'whip' ? interpolate(frame, [0, 6], [1, 0], { extrapolateRight: 'clamp' }) : 0;
  const oscuro = fondo === COLORES.tinta;

  // Los cuatro roles del motor: entra uno, sale, entra el siguiente.
  const etiquetaActiva = etiquetas ? Math.min(Math.floor(frame / 25), etiquetas.length - 1) : -1;

  return (
    <AbsoluteFill style={{ background: fondo }}>
      <AbsoluteFill style={{ transform: `translateX(${whip * 100}%)` }}>
        <Captura imagen={imagen} desde={desde} hasta={hasta} />
        <Velo oscuro={oscuro} />

        {resalte && <Resalte {...resalte} />}
        {contador && <Contador {...contador} />}
        {sellos?.map(s => (
          <Sello key={s.texto} {...s} />
        ))}

        {etiquetas && etiquetaActiva >= 0 && (
          <div
            style={{
              position: 'absolute',
              right: 72,
              top: 72,
              display: 'flex',
              gap: 14,
              padding: 14,
              borderRadius: 18,
              // Las etiquetas viven sobre la captura, que tiene su propio menú:
              // sin este fondo, «Director» se lee encima de «Marcas».
              background: 'rgba(29,29,31,0.55)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {etiquetas.map((e, i) => (
              <div
                key={e}
                style={{
                  background: i === etiquetaActiva ? COLORES.azul : 'rgba(255,255,255,0.12)',
                  color: i === etiquetaActiva ? '#fff' : '#D6D6DA',
                  padding: '12px 22px',
                  borderRadius: 12,
                  fontSize: 30,
                  fontWeight: 700,
                  transform: `scale(${i === etiquetaActiva ? 1 : 0.92})`,
                  boxShadow: i === etiquetaActiva ? '0 14px 34px rgba(0,113,227,0.35)' : 'none',
                }}
              >
                {e}
              </div>
            ))}
          </div>
        )}

        <BloqueDeTexto rotulo={rotulo} frase={texto} apoyo={subtexto} oscuro={oscuro} />
      </AbsoluteFill>

      {/* La salida del plano, para que el corte no se sienta abrupto de más. */}
      <AbsoluteFill
        style={{
          background: fondo,
          opacity: interpolate(frame, [durationInFrames - 3, durationInFrames], [0, 0.35], { extrapolateLeft: 'clamp' }),
        }}
      />
    </AbsoluteFill>
  );
};
