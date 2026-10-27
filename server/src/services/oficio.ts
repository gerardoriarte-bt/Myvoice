/**
 * El manual de oficio: cómo se escribe un buen copy, para todas las marcas.
 *
 * Sale del feedback de Buentipo del 2026-10-26 («Prompt My Voice – Ejemplo
 * Terpel»), que es universal: usa «[MARCA]» como comodín y no dice nada que
 * sea solo de Terpel. Ver docs/plan-textos-raiz.md.
 *
 * Tres usos, un solo lugar:
 *   - `MANUAL_DE_OFICIO` entra al prompt del redactor (prefijo cacheable: es
 *     idéntico para todas las marcas y todos los canales).
 *   - `detectarOficio` son las reglas que no necesitan IA: una muletilla se
 *     encuentra con una expresión regular, y un modelo la olvida.
 *   - `REGLAS_DE_OFICIO` es la rúbrica con que `verify:calidad` juzga el copy.
 */

export interface ReglaDeOficio {
  id: string;
  nombre: string;
  /** Lo que el juez pregunta. Una sola cosa por regla, para que la respuesta sea sí o no. */
  pregunta: string;
}

export const REGLAS_DE_OFICIO: ReglaDeOficio[] = [
  { id: "generico", nombre: "Genérico", pregunta: "¿Podría firmarlo otra marca del mismo rubro cambiando solo el nombre?" },
  { id: "acartonado", nombre: "Acartonado", pregunta: "¿Usa lenguaje burocrático, legalista o corporativo («de inmediato», «queremos que», «te invitamos a»)?" },
  { id: "dubitativo", nombre: "Dubitativo", pregunta: "¿Duda o rodea en vez de afirmar («¿Sabías que…?», «tal vez», «quizás»)?" },
  { id: "grasa", nombre: "Grasa", pregunta: "¿Sobran palabras que no cambian el sentido (se puede decir lo mismo con menos)?" },
  { id: "relleno", nombre: "Relleno", pregunta: "¿Mete una frase de stock o un tema que no tiene que ver con esta promoción («haz que cada kilómetro cuente» fuera de una campaña de viajes)?" },
  { id: "manifiesto", nombre: "Manifiesto", pregunta: "¿Es una frase filosófica o aspiracional lejos de la acción que el usuario tiene que tomar ahora?" },
  { id: "pregunta-floja", nombre: "Pregunta floja", pregunta: "¿Usa una pregunta como recurso para arrancar, sin que funcione como gancho real («¿Cómo participar?»)?" },
  { id: "desconectado", nombre: "Desconectado del concepto", pregunta: "¿El texto va por un lado y el concepto de campaña por otro, o no lo hace sentir más fuerte?" },
  { id: "campo-mezclado", nombre: "Metáforas mezcladas", pregunta: "¿Mezcla imágenes de campos distintos (velocidad en una campaña de resistencia)?" },
  { id: "asset-alterado", nombre: "Altera un asset", pregunta: "¿Cambia, mezcla o diluye el nombre de la campaña, un slogan o el nombre de un premio, o adorna un beneficio?" },
  { id: "decorativo", nombre: "Bonito pero no vende", pregunta: "¿Suena bien pero no empuja la venta ni el concepto?" },
  { id: "sin-ritmo", nombre: "Sin ritmo", pregunta: "¿Leído en voz alta suena forzado, le falta aire o le sobran adjetivos?" },
];

/**
 * El manual, como reglas para el redactor. Va antes de la marca porque vale
 * para todas: lo propio de cada marca (su voz, sus prohibiciones) se suma
 * encima, no lo reemplaza.
 */
export const MANUAL_DE_OFICIO = `
## MANUAL DE OFICIO (vale para toda marca; lo de la marca se suma encima)
Los ejemplos entre comillas muestran la idea, no el tratamiento: usá el de la marca (tú, usted o vos).
Identidad
- Optimismo: construí desde lo que suma. Nunca uses el miedo o lo negativo como motor.
- Cero acartonamiento: nada burocrático ni legalista. No «de inmediato» (suena a contrato): «al instante», «de una».
- Asertividad: afirmá. Prohibido «¿Sabías que…?», «tal vez», «quizás». «[MARCA] te premia», no «[MARCA] podría premiarte».
Contundencia
- Inteligente y corto: sacá la grasa. No «Queremos que vivas la experiencia como un profesional»: «Vive la experiencia como un profesional».
- Si la pieza es gráfica o video, el logo ya está: no repitas el nombre de la marca en el titular.
- Ganchos breves en vez de oraciones largas: no «Cada vez que nos eliges estás más cerca de ganar»: «Tu elección es tu victoria».
Gancho
- Insight del tema: nada de frases de stock. Si la campaña es de fútbol, «Juguemos en equipo». El texto respira el tema de la campaña.
- El titular tiene un solo trabajo: que se lea la línea siguiente. Si no detiene el scroll, el resto sobra.
- Nunca abras con «¿Cómo participar?»: abrí con el beneficio que genera curiosidad.
- Buscá la vuelta: un juego de palabras bien hecho se recuerda, no solo se lee.
Assets de campaña
- El nombre de la campaña, los slogans y los nombres de premios van LITERALES: no los cambies, no los mezcles, no los diluyas. La creatividad va en lo que los acompaña.
- No adornes un beneficio ni cambies el nombre de un premio: ceñite a lo que dice el brief (promesas falsas = riesgo legal).
Foco
- Cero relleno: nada que no tenga que ver con esta promoción.
- Bajada a tierra: nada de manifiestos («La energía que te lleva a cumplir tus metas»). Decí qué hacer ahora.
- Preguntas solo si son un gancho real, nunca para empezar a escribir.
Entrega
- Mata a tus favoritos: si suena bonito pero no empuja la venta o el concepto, va afuera.
- Ritmo en voz alta: si suena forzado, simplificá. Menos adjetivos, más verbos de acción.
Concepto
- Cada titular es un ladrillo del concepto: si el concepto es «TAN GRANDE COMO TÚ», hablá de «zapatos gigantes», «talento XXL», «no caber en el molde», no de algo genérico.
- El texto explica y expande el concepto: después del titular, el concepto se entiende sin explicarlo aparte.
- Un solo campo semántico: si el concepto es grandeza, escala, altura, peso, impacto. No mezcles velocidad en una campaña de resistencia.
- Test final: ¿este titular hace más fuerte el concepto o solo ocupa espacio? Si no construye hacia la idea central, descartalo.
`.trim();

/** Lo que una expresión regular encuentra sin dudar. Cada patrón dice por qué está mal. */
const PATRONES: { patron: RegExp; motivo: string }[] = [
  { patron: /¿\s*sab[ií]as\s+que/i, motivo: "«¿Sabías que…?»: duda en vez de afirmar" },
  { patron: /¿\s*c[oó]mo\s+participar/i, motivo: "«¿Cómo participar?» como entrada: abrí con el beneficio" },
  { patron: /\btal\s+vez\b/i, motivo: "«tal vez»: afirmá" },
  { patron: /\bquiz[aá]s?\b/i, motivo: "«quizás»: afirmá" },
  { patron: /\bde\s+inmediato\b/i, motivo: "«de inmediato» suena a contrato: «al instante», «de una»" },
  { patron: /\bqueremos\s+que\b/i, motivo: "«queremos que…»: grasa, decilo directo" },
  { patron: /\bte\s+invitamos\s+a\b/i, motivo: "«te invitamos a…»: acartonado, decí la acción" },
];

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface ContextoDeOficio {
  /** Nombre de la marca: en un titular de una pieza con logo, sobra. */
  marca?: string;
  /** Concepto de campaña: si ya incluye la marca, nombrarla es respetar el asset. */
  concepto?: string;
  /** El slot es el titular de una pieza gráfica o de video (el logo está a la vista). */
  titularConLogo?: boolean;
}

/** Las reglas del manual que se verifican sin IA. Devuelve un motivo por cada falta. */
export const detectarOficio = (texto: string, ctx: ContextoDeOficio = {}): string[] => {
  const faltas = PATRONES.filter(p => p.patron.test(texto)).map(p => p.motivo);
  const marca = ctx.marca?.trim();
  if (ctx.titularConLogo && marca) {
    const enConcepto = ctx.concepto ? normalizar(ctx.concepto).includes(normalizar(marca)) : false;
    const nombra = new RegExp(`(^|[^\\p{L}])${escapar(normalizar(marca))}($|[^\\p{L}])`, "u").test(normalizar(texto));
    if (nombra && !enConcepto) faltas.push(`Repite «${marca}» en el titular: el logo ya está en la pieza`);
  }
  return faltas;
};
