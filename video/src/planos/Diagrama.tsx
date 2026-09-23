import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORES } from '../guion';
import { APOYO, PIE, ROTULO, TITULAR } from '../tipografia';
import { Fondo } from '../componentes/Fondo';
import { TextoQueEmpuja } from '../componentes/TextoQueEmpuja';

/**
 * El mapa del proceso, antes del detalle.
 *
 * Va temprano a propósito: sin él, los diez planos de pantallas que siguen son
 * una lista de funcionalidades. Con él, cada pantalla es **un paso de algo que
 * el que mira ya entendió**, y sabe cuánto falta.
 *
 * Cuenta tres cosas que el resto del video muestra pero no dice:
 *
 *   · **Dónde empieza**: en el ADN de la marca, no en un prompt.
 *   · **Quién hace cada cosa.** Cada paso tiene su actor abajo, y son cinco
 *     distintos: por eso el producto no es "una IA que escribe".
 *   · **Dónde se multiplica.** Un brief se abre en catorce canales, y eso se
 *     repite por marca y por campaña. Es la diferencia entre una herramienta y
 *     una operación.
 */

interface Paso {
  titulo: string;
  actor: string;
  /** El color del bloque del video al que corresponde ese paso. */
  color: string;
}

const PASOS: Paso[] = [
  { titulo: 'ADN de marca', actor: 'quien prepara', color: '#0071E3' },
  { titulo: 'Brief', actor: 'quien produce', color: '#0071E3' },
  { titulo: 'Motor de IA', actor: '4 roles, 14 canales', color: '#0071E3' },
  { titulo: 'Aprobación', actor: 'el cliente', color: '#10B981' },
  { titulo: 'Pieza', actor: 'el diseñador', color: '#7C5CFF' },
  { titulo: 'Verificación', actor: 'la IA + quien aprueba', color: '#F59E0B' },
];

export const Diagrama: React.FC<{ rotulo: string; texto: string; acento: string }> = ({
  rotulo, texto, acento,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <Fondo variante="grilla" acento={acento} />

      <AbsoluteFill style={{ padding: '90px 100px', justifyContent: 'center' }}>
        <div style={{ position: 'relative' }}>
          <TextoQueEmpuja recorrido={40}>
            <div style={{ ...ROTULO, color: acento }}>{rotulo}</div>
          </TextoQueEmpuja>
          <TextoQueEmpuja desdeFrame={4} recorrido={50}>
            <div style={{ ...TITULAR, fontSize: 76, letterSpacing: -3, marginTop: 16 }}>{texto}</div>
          </TextoQueEmpuja>

          {/* Los seis pasos, que entran de a uno con su flecha. */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginTop: 56 }}>
            {PASOS.map((paso, i) => {
              const entrada = spring({ frame: frame - 18 - i * 9, fps, config: { damping: 200 } });
              const flecha = interpolate(frame, [22 + i * 9, 32 + i * 9], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              return (
                <React.Fragment key={paso.titulo}>
                  {i > 0 && (
                    <div style={{ alignSelf: 'center', width: 46, display: 'flex', alignItems: 'center' }}>
                      <div
                        style={{
                          height: 3,
                          width: `${flecha * 100}%`,
                          background: `linear-gradient(90deg, ${PASOS[i - 1].color}, ${paso.color})`,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  )}
                  <div
                    style={{
                      flex: 1,
                      opacity: entrada,
                      transform: `translateY(${interpolate(entrada, [0, 1], [26, 0])}px)`,
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${paso.color}55`,
                      borderTop: `4px solid ${paso.color}`,
                      borderRadius: 16,
                      padding: '22px 20px 20px',
                    }}
                  >
                    <div style={{ ...APOYO, fontSize: 30, fontWeight: 700, color: COLORES.blanco }}>
                      {paso.titulo}
                    </div>
                    <div style={{ ...PIE, fontSize: 21, color: paso.color, marginTop: 8 }}>{paso.actor}</div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Dónde se multiplica: lo que convierte esto en una operación. */}
          <div
            style={{
              marginTop: 40,
              display: 'flex',
              gap: 14,
              opacity: spring({ frame: frame - 92, fps, config: { damping: 200 } }),
            }}
          >
            {[
              ['1 brief', 'se abre en 14 canales'],
              ['1 workspace', 'todas las marcas que maneje'],
              ['1 campaña', 'las piezas que haga falta'],
            ].map(([grande, chico]) => (
              <div
                key={grande}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 14,
                  padding: '18px 22px',
                  borderLeft: `4px solid ${acento}`,
                }}
              >
                <div style={{ ...APOYO, fontSize: 28, fontWeight: 700, color: COLORES.blanco }}>{grande}</div>
                <div style={{ ...PIE, fontSize: 21, color: COLORES.grisTexto, marginTop: 6 }}>{chico}</div>
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
