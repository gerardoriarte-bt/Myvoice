import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORES } from '../guion';
import { APOYO, ROTULO, TITULAR } from '../tipografia';
import { TextoQueEmpuja } from '../componentes/TextoQueEmpuja';

/**
 * Un plano de texto solo, sin captura detrás.
 *
 * Existe por la misma razón que el bloque de texto tiene panel: cuando lo que
 * hay que leer importa —para quién es la herramienta, cuánto tiempo ahorra—, el
 * texto no compite con una pantalla. Se corta a negro y se lee.
 *
 * Y de paso arregla el ritmo: alternar planos de captura con planos de texto le
 * da respiración al video, que es lo contrario de lo que uno espera al pedir
 * "más dinámico" y sin embargo es lo que lo hace ver más rápido.
 */
export const Declaracion: React.FC<{
  rotulo: string;
  lineas: string[];
  apoyo?: string;
  acento?: string;
}> = ({ rotulo, lineas, apoyo, acento = COLORES.azul }) => (
  <AbsoluteFill
    style={{ background: COLORES.tinta, justifyContent: 'center', alignItems: 'flex-start', padding: '0 140px' }}
  >
    <TextoQueEmpuja recorrido={40}>
      <div style={{ ...ROTULO, color: acento, marginBottom: 28 }}>{rotulo}</div>
    </TextoQueEmpuja>
    {lineas.map((linea, i) => (
      <TextoQueEmpuja key={linea} desdeFrame={6 + i * 6} recorrido={70}>
        <div style={{ ...TITULAR, fontSize: 92, letterSpacing: -3 }}>{linea}</div>
      </TextoQueEmpuja>
    ))}
    {apoyo && (
      <TextoQueEmpuja desdeFrame={6 + lineas.length * 6} recorrido={40}>
        <div style={{ ...APOYO, color: COLORES.grisTexto, marginTop: 30 }}>{apoyo}</div>
      </TextoQueEmpuja>
    )}
  </AbsoluteFill>
);
