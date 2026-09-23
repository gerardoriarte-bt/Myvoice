import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { COLORES } from '../guion';
import { APOYO, FRASE, ROTULO } from '../tipografia';
import { TextoQueEmpuja } from './TextoQueEmpuja';

/**
 * El texto sobre una captura.
 *
 * La primera versión lo ponía en una barra con degradado al pie, y el ojo se
 * iba: el texto flotaba sobre una pantalla llena de información, sin un borde
 * que dijera dónde empezaba. Tres cambios lo arreglan:
 *
 *   1. **Un velo sobre toda la captura** (`Velo`), no un degradado al pie. Baja el
 *      contraste de la pantalla entera para que el texto gane siempre, sin
 *      depender de qué haya detrás en ese plano.
 *   2. **Un panel sólido anclado abajo a la izquierda**, con una barra de color
 *      al costado. El texto deja de flotar: tiene un lugar, y es el mismo en
 *      los quince planos. El ojo aprende dónde mirar y deja de buscar.
 *   3. **Un rótulo en versalitas arriba del titular** —«el adn», «el motor»—
 *      que funciona como entrada de lectura y, de paso, dice en qué parte del
 *      recorrido estamos.
 */
/**
 * El velo va aparte del bloque, y se dibuja JUSTO sobre la captura: si fuera
 * parte del bloque quedaría encima del resalte y del contador, y los apagaría
 * a ellos también. Baja la captura, no lo que la señala.
 */
export const Velo: React.FC<{ oscuro: boolean }> = ({ oscuro }) => {
  const frame = useCurrentFrame();
  const opacidad = interpolate(frame, [0, 12], [0, oscuro ? 0.42 : 0.3], { extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ background: oscuro ? '#000' : '#1D1D1F', opacity: opacidad }} />;
};

export const BloqueDeTexto: React.FC<{
  rotulo: string;
  frase: string;
  apoyo?: string;
  /** Sobre capturas oscuras el panel es claro, y al revés. */
  oscuro: boolean;
  acento?: string;
}> = ({ rotulo, frase, apoyo, oscuro, acento = COLORES.azul }) => {
  return (
    <>
      <div style={{ position: 'absolute', left: 84, bottom: 84, maxWidth: 1180 }}>
        <TextoQueEmpuja desdeFrame={3} recorrido={50}>
          <div
            style={{
              display: 'flex',
              background: oscuro ? 'rgba(255,255,255,0.97)' : COLORES.tinta,
              borderRadius: 22,
              overflow: 'hidden',
              boxShadow: '0 30px 70px rgba(0,0,0,0.38)',
            }}
          >
            <div style={{ width: 10, background: acento, flexShrink: 0 }} />
            <div style={{ padding: '34px 44px 36px' }}>
              <div style={{ ...ROTULO, color: acento }}>{rotulo}</div>
              <div
                style={{
                  ...FRASE,
                  color: oscuro ? COLORES.tinta : COLORES.blanco,
                  marginTop: 14,
                }}
              >
                {frase}
              </div>
              {apoyo && (
                <div style={{ ...APOYO, color: COLORES.grisTexto, marginTop: 14 }}>{apoyo}</div>
              )}
            </div>
          </div>
        </TextoQueEmpuja>
      </div>
    </>
  );
};
