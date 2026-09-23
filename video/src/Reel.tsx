import React from 'react';
import { AbsoluteFill, Series } from 'remotion';
import { PLANOS } from './guion';
import { Titular } from './planos/Titular';
import { Pantalla } from './planos/Pantalla';
import { Partida } from './planos/Partida';
import { Mosaico } from './planos/Mosaico';
import { Cierre } from './planos/Cierre';

/**
 * El montaje: recorre el guión y pone cada plano en su lugar.
 *
 * Que sea un `map` sobre `PLANOS` y no diecinueve `<Series.Sequence>` escritos a
 * mano es lo que permite ajustar el ritmo con la música cambiando números en
 * `guion.ts`, que es exactamente lo que va a pasar cuando haya pista.
 */
export const Reel: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: 'Inter, -apple-system, Helvetica, Arial, sans-serif' }}>
    <Series>
      {PLANOS.map((plano, i) => (
        <Series.Sequence key={i} durationInFrames={plano.duracion}>
          {plano.tipo === 'titular' && <Titular {...plano} />}
          {plano.tipo === 'pantalla' && <Pantalla {...plano} />}
          {plano.tipo === 'partida' && <Partida {...plano} />}
          {plano.tipo === 'mosaico' && <Mosaico {...plano} />}
          {plano.tipo === 'cierre' && <Cierre />}
        </Series.Sequence>
      ))}
    </Series>
  </AbsoluteFill>
);
