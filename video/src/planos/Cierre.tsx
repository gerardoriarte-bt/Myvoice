import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORES } from '../guion';
import { TextoQueEmpuja } from '../componentes/TextoQueEmpuja';

/**
 * El cierre. La URL queda 60 frames en pantalla: es el tiempo mínimo para que
 * alguien la anote, y el error más común de un video de producto es no dárselo.
 */
export const Cierre: React.FC = () => (
  <AbsoluteFill style={{ background: COLORES.tinta, justifyContent: 'center', alignItems: 'center' }}>
    <TextoQueEmpuja>
      <div style={{ fontSize: 150, fontWeight: 700, color: COLORES.blanco, letterSpacing: -5 }}>My Voice</div>
    </TextoQueEmpuja>
    <TextoQueEmpuja desdeFrame={14} recorrido={50}>
      <div style={{ fontSize: 46, color: COLORES.grisTexto, marginTop: 18 }}>Del brief a la pieza verificada</div>
    </TextoQueEmpuja>
    <TextoQueEmpuja desdeFrame={34} recorrido={40}>
      <div style={{ fontSize: 38, color: COLORES.azul, marginTop: 56, fontWeight: 600 }}>myvoice.lobueno.co</div>
    </TextoQueEmpuja>
  </AbsoluteFill>
);
