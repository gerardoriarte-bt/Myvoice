/**
 * Cómo se leen en pantalla las marcas que pone el revisor del motor
 * (server/src/services/criticService.ts). El servidor manda la clave; acá se
 * traduce. Una clave nueva sin etiqueta se muestra tal cual, para que no
 * desaparezca.
 */
export const ETIQUETAS_DEL_EDITOR: Record<string, string> = {
  generic: 'Genérico',
  'concept-drift': 'Se aleja del concepto',
  'tone-mismatch': 'Tono distinto',
  'prohibition-paraphrase': 'Roza una prohibición',
  'budget-violation': 'Excede el límite',
  redundant: 'Repite otra variación',
  'weak-cta': 'CTA débil',
  'agency-speak': 'Suena a agencia',
  'tuteo-violation': 'Tuteo',
  filler: 'Relleno',
  'lazy-question': 'Pregunta de relleno',
  manifesto: 'Manifiesto',
  'semantic-mix': 'Metáforas mezcladas',
  'asset-altered': 'Altera un asset',
  decorative: 'Bonito pero no vende',
};

export const etiquetaDelEditor = (clave: string): string => ETIQUETAS_DEL_EDITOR[clave] ?? clave;
