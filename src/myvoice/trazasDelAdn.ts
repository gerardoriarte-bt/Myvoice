import type { ClaveAdn, CopyVariation } from '../../types';

/**
 * De dónde sale cada alerta de un texto generado (fase 2 de la decisión 35, 2026-11-25): qué sección del ADN la explica,
 * para que el equipo sepa qué mejorar. Las alertas ya llegan con cada texto (chequeos sin IA y marcas del revisor); acá
 * se les pone su sección. Las que no son del ADN (el brief, el manual de oficio, el largo) quedan sin sección.
 */

export const NOMBRE_SECCION: Partial<Record<ClaveAdn, string>> = {
  propuestaDeValor: 'Propuesta de valor',
  productos: 'Productos y servicios',
  audiencias: 'Audiencias',
  voz: 'Voz y personalidad',
  tratamiento: 'Tratamiento',
  asiSuena: 'Así suena',
  prohibiciones: 'Prohibiciones',
  frasesIntocables: 'Frases que no se cambian',
  reglasDeEstilo: 'Reglas de estilo',
  keywords: 'Keywords',
};

/** Las secciones que guían al redactor (productos solo lo usan el revisor y el corrector). */
export const SECCIONES_QUE_GUIAN: ClaveAdn[] = [
  'propuestaDeValor',
  'audiencias',
  'voz',
  'tratamiento',
  'asiSuena',
  'prohibiciones',
  'frasesIntocables',
  'reglasDeEstilo',
  'keywords',
  'productos',
];

/** Las marcas del revisor (criticService) que apuntan a una sección del ADN. */
const DEL_REVISOR: Record<string, { seccion: ClaveAdn | null; mensaje: string }> = {
  'tone-mismatch': { seccion: 'voz', mensaje: 'Tono distinto al de la marca' },
  'agency-speak': { seccion: 'voz', mensaje: 'Suena a agencia, no a la marca' },
  generic: { seccion: 'propuestaDeValor', mensaje: 'Genérico: podría ser de cualquier marca' },
  decorative: { seccion: 'propuestaDeValor', mensaje: 'Bonito pero no dice por qué elegir la marca' },
  'prohibition-paraphrase': { seccion: 'prohibiciones', mensaje: 'Roza una prohibición con otras palabras' },
  'tuteo-violation': { seccion: 'tratamiento', mensaje: 'No usa el tratamiento de la marca' },
  'asset-altered': { seccion: 'frasesIntocables', mensaje: 'Altera una frase o dato que no se cambia' },
  'concept-drift': { seccion: null, mensaje: 'Se aleja del concepto de la campaña' },
  'weak-cta': { seccion: null, mensaje: 'El llamado a la acción es débil' },
  redundant: { seccion: null, mensaje: 'Repite otro texto' },
  filler: { seccion: null, mensaje: 'Tiene relleno' },
  'lazy-question': { seccion: null, mensaje: 'Pregunta de relleno' },
  manifesto: { seccion: null, mensaje: 'Suena a manifiesto' },
  'semantic-mix': { seccion: null, mensaje: 'Mezcla metáforas' },
  'budget-violation': { seccion: null, mensaje: 'Excede el límite' },
};

export interface AlertaDelAdn {
  seccion: ClaveAdn | null;
  mensaje: string;
}

export const alertasDelAdn = (v: CopyVariation): AlertaDelAdn[] => {
  const a: AlertaDelAdn[] = [];
  for (const p of v.prohibitionsHit ?? []) a.push({ seccion: 'prohibiciones', mensaje: `Usa «${p}», que está prohibido` });
  for (const t of v.tuteoHits ?? []) a.push({ seccion: 'tratamiento', mensaje: `Tratamiento: ${t}` });
  // Las faltas de frases dicen «"x" se escribe "y"»; las demás son de las reglas de estilo (comun/adn/estilo.ts).
  for (const h of v.adnHits ?? []) a.push({ seccion: / se escribe «/.test(h) ? 'frasesIntocables' : 'reglasDeEstilo', mensaje: h });
  for (const f of v.editorFlags ?? []) {
    const m = DEL_REVISOR[f];
    if (m && !a.some(x => x.mensaje === m.mensaje)) a.push(m);
  }
  for (const o of v.oficioHits ?? []) a.push({ seccion: null, mensaje: o });
  return a;
};

/** La sección que más probablemente explica el problema de un texto, para proponerla al mejorar. */
export const seccionSugerida = (v: CopyVariation): ClaveAdn => alertasDelAdn(v).find(x => x.seccion && x.seccion !== 'audiencias')?.seccion ?? 'voz';
