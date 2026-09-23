import React from 'react';
import { Composition } from 'remotion';
import { ALTO, ANCHO, DURACION_TOTAL, FPS } from './guion';
import { Reel } from './Reel';

export const RemotionRoot: React.FC = () => (
  <Composition id="Reel" component={Reel} durationInFrames={DURACION_TOTAL} fps={FPS} width={ANCHO} height={ALTO} />
);
