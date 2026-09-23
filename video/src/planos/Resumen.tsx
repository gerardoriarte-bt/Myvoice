import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORES } from '../guion';
import { APOYO, ROTULO, TITULAR } from '../tipografia';
import { Fondo } from '../componentes/Fondo';
import { TextoQueEmpuja } from '../componentes/TextoQueEmpuja';

/**
 * El resumen: la conclusión del video.
 *
 * Antes acá iba un mosaico de capturas, y estaba al revés: **la frase importa
 * más que las miniaturas**. «Del brief a la pieza verificada» es la promesa
 * entera, y a esa altura el que mira ya vio las pantallas — no necesita verlas
 * otra vez en chiquito.
 *
 * Así que la frase va grande, y debajo lo que hasta acá el video mostró de a
 * una: **los catorce canales que escribe** y **las seis cosas que verifica**.
 * Es el plano que alguien pausa para leer, y el único del video pensado para
 * eso: por eso es el más largo.
 */

const CANALES = [
  'Instagram Post', 'Instagram Historia', 'Instagram Carrusel', 'Instagram Reel',
  'TikTok', 'YouTube', 'Cuña de Radio', 'Google Ads',
  'Google Display', 'Rich Media', 'Pop up', 'Push Notification',
  'Email', 'WhatsApp',
];

const VERIFICA = [
  'Que diga el copy aprobado, carácter por carácter',
  'Que no use palabras vetadas por el ADN',
  'Ortografía y tildes sobre la imagen',
  'Tono y registro de la marca',
  'Que respete las medidas del canal',
  'Y dice qué no pudo leer, en vez de inventarlo',
];

export const Resumen: React.FC<{ texto: string; acento: string }> = ({ texto, acento }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <Fondo variante="grilla" acento={acento} />

      <AbsoluteFill style={{ padding: '96px 110px', justifyContent: 'center' }}>
        <div style={{ position: 'relative' }}>
          <TextoQueEmpuja recorrido={50}>
            <div style={{ ...TITULAR, fontSize: 104, letterSpacing: -4 }}>{texto}</div>
          </TextoQueEmpuja>

          <div style={{ display: 'flex', gap: 80, marginTop: 64 }}>
            {/* Los catorce canales, que hasta acá se nombraron de a uno. */}
            <div style={{ flex: 1.15 }}>
              <TextoQueEmpuja desdeFrame={16} recorrido={30}>
                <div style={{ ...ROTULO, color: acento }}>escribe para 14 canales</div>
              </TextoQueEmpuja>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
                {CANALES.map((canal, i) => {
                  const entrada = spring({ frame: frame - 24 - i * 3, fps, config: { damping: 200 } });
                  return (
                    <div
                      key={canal}
                      style={{
                        ...APOYO,
                        fontSize: 26,
                        color: COLORES.blanco,
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.16)',
                        borderRadius: 999,
                        padding: '10px 18px',
                        opacity: entrada,
                        transform: `translateY(${interpolate(entrada, [0, 1], [14, 0])}px)`,
                      }}
                    >
                      {canal}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Y lo que verifica, que es lo que ninguna otra herramienta hace. */}
            <div style={{ flex: 1 }}>
              <TextoQueEmpuja desdeFrame={16} recorrido={30}>
                <div style={{ ...ROTULO, color: acento }}>y verifica cada pieza</div>
              </TextoQueEmpuja>
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {VERIFICA.map((linea, i) => {
                  const entrada = spring({ frame: frame - 70 - i * 7, fps, config: { damping: 200 } });
                  return (
                    <div
                      key={linea}
                      style={{
                        display: 'flex',
                        gap: 14,
                        alignItems: 'flex-start',
                        opacity: entrada,
                        transform: `translateX(${interpolate(entrada, [0, 1], [-20, 0])}px)`,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 999,
                          background: acento,
                          color: '#0B0B0D',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          fontWeight: 800,
                          marginTop: 4,
                        }}
                      >
                        ✓
                      </div>
                      <div style={{ ...APOYO, fontSize: 28, color: COLORES.blanco, lineHeight: 1.25 }}>{linea}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
