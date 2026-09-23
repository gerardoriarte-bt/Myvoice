import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

/**
 * Los fondos, generados por código.
 *
 * El negro plano no estaba mal, estaba **mudo**: no acompañaba el mensaje ni
 * separaba una parte del video de otra. Estos fondos hacen tres cosas a la vez:
 *
 *   · **Dan color por bloque.** Cada etapa del recorrido tiene el suyo, y ese
 *     mismo color aparece en la barra del panel de texto y en el rótulo. El
 *     color deja de ser decoración y pasa a decir en qué parte estamos.
 *   · **Tienen textura**, que es lo que evita que un fondo de color se vea
 *     plano: grano fino encima de todo, como un papel.
 *   · **Se mueven despacio.** Muy despacio: un fondo que se nota deja de ser
 *     fondo. Son 20 o 30 píxeles en tres segundos.
 *
 * Nada de esto usa imágenes. Son gradientes y líneas, así que pesan cero y se
 * recolorean cambiando un parámetro.
 */

export type VarianteFondo = 'malla' | 'grilla' | 'canales' | 'destello';

interface Props {
  variante: VarianteFondo;
  /** El color del bloque. El fondo se arma alrededor de él. */
  acento: string;
  /** Sobre qué base se apoya: casi siempre la tinta del producto. */
  base?: string;
}

/**
 * Grano. Es lo que separa un fondo hecho de un fondo puesto: sin esto, un
 * gradiente grande se ve como una mancha de Photoshop de 2008.
 */
const Grano: React.FC<{ opacidad?: number }> = ({ opacidad = 0.055 }) => (
  <AbsoluteFill
    style={{
      opacity: opacidad,
      mixBlendMode: 'overlay',
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='r'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23r)'/%3E%3C/svg%3E\")",
      backgroundSize: '300px 300px',
    }}
  />
);

/** Manchas de color que respiran. Para los planos de texto solo. */
const Malla: React.FC<{ acento: string; frame: number }> = ({ acento, frame }) => {
  const deriva = (fase: number, radio: number) => ({
    x: 50 + Math.sin(frame / 90 + fase) * radio,
    y: 50 + Math.cos(frame / 110 + fase) * radio * 0.6,
  });
  const a = deriva(0, 16);
  const b = deriva(2.1, 12);
  const c = deriva(4.2, 9);

  return (
    <AbsoluteFill
      style={{
        backgroundImage: [
          `radial-gradient(60% 55% at ${a.x}% ${a.y}%, ${acento}52 0%, transparent 62%)`,
          `radial-gradient(45% 45% at ${b.x + 22}% ${b.y - 12}%, ${acento}34 0%, transparent 60%)`,
          `radial-gradient(50% 50% at ${c.x - 26}% ${c.y + 16}%, ${acento}22 0%, transparent 58%)`,
        ].join(','),
        filter: 'blur(4px)',
      }}
    />
  );
};

/** Grilla técnica: dice medidas, formatos, especificaciones. */
const Grilla: React.FC<{ acento: string; frame: number }> = ({ acento, frame }) => (
  <AbsoluteFill
    style={{
      backgroundImage: [
        `linear-gradient(${acento}1f 1px, transparent 1px)`,
        `linear-gradient(90deg, ${acento}1f 1px, transparent 1px)`,
      ].join(','),
      backgroundSize: '72px 72px, 72px 72px',
      backgroundPosition: `0 ${(frame * 0.25) % 72}px, ${(frame * 0.25) % 72}px 0`,
      maskImage: 'radial-gradient(75% 75% at 50% 50%, #000 30%, transparent 100%)',
    }}
  />
);

/** Catorce barras: los canales, insinuados. Para el bloque del motor. */
const Canales: React.FC<{ acento: string; frame: number }> = ({ acento, frame }) => (
  <AbsoluteFill style={{ padding: '90px 0', justifyContent: 'space-between' }}>
    {Array.from({ length: 14 }).map((_, i) => {
      const avance = (frame / 30 + i * 0.35) % 3;
      const ancho = interpolate(avance, [0, 1.6, 3], [22, 74, 22], { extrapolateRight: 'clamp' });
      return (
        <div
          key={i}
          style={{
            height: 10,
            width: `${ancho}%`,
            marginLeft: i % 2 ? 'auto' : 110,
            marginRight: i % 2 ? 110 : 0,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${acento}00, ${acento}44, ${acento}00)`,
          }}
        />
      );
    })}
  </AbsoluteFill>
);

/** Un haz diagonal que barre despacio. Para el cierre y el dato. */
const Destello: React.FC<{ acento: string; frame: number }> = ({ acento, frame }) => (
  <AbsoluteFill
    style={{
      backgroundImage: `linear-gradient(115deg, transparent 30%, ${acento}3a 50%, transparent 70%)`,
      backgroundSize: '260% 260%',
      backgroundPosition: `${interpolate(frame, [0, 150], [0, 100], { extrapolateRight: 'clamp' })}% 50%`,
    }}
  />
);

export const Fondo: React.FC<Props> = ({ variante, acento, base = '#15151A' }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: base }}>
      {variante === 'malla' && <Malla acento={acento} frame={frame} />}
      {variante === 'grilla' && <Grilla acento={acento} frame={frame} />}
      {variante === 'canales' && <Canales acento={acento} frame={frame} />}
      {variante === 'destello' && <Destello acento={acento} frame={frame} />}
      {/* Viñeta: empuja la mirada al centro, donde está el texto. */}
      <AbsoluteFill
        style={{ backgroundImage: 'radial-gradient(70% 70% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)' }}
      />
      <Grano />
    </AbsoluteFill>
  );
};
