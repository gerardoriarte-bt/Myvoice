import type OpenAI from "openai";
import { CopyVariation } from "../types.js";
import { ChannelBrief, ChannelSpec } from "../channels/types.js";
import { contextoDeValidacion, validateVariation } from "../channels/validators.js";
import { MANUAL_DE_OFICIO } from "./oficio.js";
import { tablaDeConversion } from "../comun/adn/tratamiento.js";
import { reglasDeAdnEnPalabras } from "../comun/adn/estilo.js";
import { UsageEntry, extractUsage } from "./pricing.js";
import {
  jsonObjectFormat,
  stripJsonFence,
  samplingParams,
  MAX_TOKENS,
  TIEMPOS,
  chatCompletionConRetry,
} from "./aiClient.js";

/**
 * Las marcas del revisor que piden reescribir, con lo que el fixer tiene que
 * hacer. Hasta el 2026-10-27 «generic» solo se mostraba y el texto genérico
 * llegaba igual: era la queja principal de Buentipo. Las de matiz (tono, CTA
 * débil, redundante) siguen solo como aviso.
 */
const REESCRIBIR_POR_OFICIO: Record<string, string> = {
  generic: "Es genérico: podría firmarlo otra marca del rubro. Ánclalo en algo que solo esta marca y este concepto pueden decir.",
  "agency-speak": "Suena a agencia o a comunicado corporativo. Dilo como lo diría la marca, directo.",
  "concept-drift": "Va por un lado y el concepto por otro. Haz que el texto construya el concepto.",
  filler: "Tiene relleno o una frase de stock ajena a esta promoción. Sácala y di algo del tema de la campaña.",
  "lazy-question": "Arranca con una pregunta que no es gancho. Afirma el beneficio.",
  manifesto: "Es un manifiesto filosófico. Bájalo a tierra: qué hace o gana el público ahora.",
  "semantic-mix": "Mezcla imágenes de campos distintos. Quédate en el territorio del concepto.",
  "asset-altered": "Altera el concepto, un slogan, un premio, adorna un beneficio o afirma algo que la marca no vende. Úsalos literales, como dice el brief, y no afirmes nada fuera de sus productos.",
  decorative: "Suena bonito pero no vende. Cámbialo por algo que empuje la acción o el concepto.",
};

const isBroken = (v: CopyVariation): boolean => {
  if (v.budgetOk === false) return true;
  if (v.prohibitionsHit && v.prohibitionsHit.length > 0) return true;
  if (v.tuteoHits && v.tuteoHits.length > 0) return true;
  if (v.oficioHits && v.oficioHits.length > 0) return true;
  if (v.adnHits && v.adnHits.length > 0) return true;
  if (v.editorFlags?.some(f => f in REESCRIBIR_POR_OFICIO)) return true;
  if (v.editorFlags?.includes("prohibition-paraphrase")) return true;
  if (v.editorFlags?.includes("budget-violation")) return true;
  if (v.editorFlags?.includes("tuteo-violation")) return true;
  return false;
};

const necesitaTratamiento = (v: CopyVariation): boolean =>
  Boolean(v.tuteoHits?.length) || Boolean(v.editorFlags?.includes("tuteo-violation"));


/**
 * Lo que el corrector necesita del ADN 2.0 para arreglar lo que marcaron el validador y el revisor: los
 * productos (no afirmar fuera de ellos) y lo que no se toca. Vacío si la marca no tiene esas secciones.
 */
const adnParaElCorrector = (brief: ChannelBrief): string => {
  const lineas = [
    brief.brand.productos ? `- Productos y servicios (lo único que existe; no afirmes nada fuera de esto): ${brief.brand.productos}` : "",
    reglasDeAdnEnPalabras(brief.brand.adn),
  ].filter(Boolean);
  return lineas.length ? `${lineas.join("\n")}\n` : "";
};

const slotLimitLabel = (spec: ChannelSpec, v: CopyVariation): string => {
  const slot = v.slot ? spec.slots.find(s => s.id === v.slot) : undefined;
  if (!slot) return "sin slot definido";
  const unit = slot.unit === "word" ? "palabras" : "caracteres";
  if (slot.min !== undefined && slot.max !== undefined) return `entre ${slot.min} y ${slot.max} ${unit}`;
  if (slot.max !== undefined) return `máximo ${slot.max} ${unit}`;
  return "sin límite estricto";
};

const describeIssues = (brief: ChannelBrief, spec: ChannelSpec, v: CopyVariation): string[] => {
  const issues: string[] = [];
  if (v.budgetOk === false) {
    issues.push(
      `El contenido tiene ${v.charCount} ${v.budgetUnit === "word" ? "palabras" : "caracteres"} pero el slot exige ${slotLimitLabel(spec, v)}.`
    );
  }
  if (v.prohibitionsHit && v.prohibitionsHit.length > 0) {
    issues.push(`Usa palabras prohibidas: ${v.prohibitionsHit.join(", ")}.`);
  }
  if (v.editorFlags?.includes("prohibition-paraphrase")) {
    issues.push(`Usa una paráfrasis cercana de una prohibición (zona semántica vetada): ${brief.campaign.prohibitions}.`);
  }
  if (v.tuteoHits && v.tuteoHits.length > 0) {
    issues.push(`No respeta el tratamiento de la marca: ${v.tuteoHits.join(" | ")}.`);
  }
  if (!v.tuteoHits?.length && v.editorFlags?.includes("tuteo-violation")) {
    issues.push(`El editor detectó un tratamiento distinto al de la marca — reescribir con el de la marca.`);
  }
  for (const falta of v.oficioHits ?? []) issues.push(`Manual de oficio: ${falta}.`);
  for (const falta of v.adnHits ?? []) issues.push(`ADN de la marca (no se toca): ${falta}.`);
  for (const flag of v.editorFlags ?? []) {
    if (REESCRIBIR_POR_OFICIO[flag]) issues.push(REESCRIBIR_POR_OFICIO[flag]);
  }
  return issues;
};

/**
 * One prompt for every broken variation in a channel. The brand/campaign block
 * is the bulk of the prompt and is identical per variation, so batching turns
 * N calls (each re-sending it) into a single call.
 */
const buildBatchFixPrompt = (
  brief: ChannelBrief,
  spec: ChannelSpec,
  broken: CopyVariation[]
): string => {
  const voseoBlock =
    brief.tratamiento && broken.some(necesitaTratamiento) ? tablaDeConversion(brief.tratamiento) : "";

  const items = broken
    .map(v => {
      const issues = describeIssues(brief, spec, v);
      return `### id: ${v.id}
- Slot: ${v.slot || "(default)"} #${v.variationIndex ?? "?"}
- Tipo/ángulo: ${v.type}
- Budget del slot: ${slotLimitLabel(spec, v)}
- Contenido actual: "${v.content.replace(/"/g, '\\"')}"
- Problemas detectados:
${issues.map(i => `  · ${i}`).join("\n")}`;
    })
    .join("\n\n");

  return `
Eres editor de copy. Estas variaciones rompen reglas duras o el manual de oficio y hay que reescribirlas SIN cambiar su ángulo ni el concepto.
${voseoBlock}
${MANUAL_DE_OFICIO}

## MARCA Y CAMPAÑA
- Marca: "${brief.brand.name}"
- Voz: ${brief.brand.voice || "—"}
- Concepto de campaña: "${brief.spine.concept}"
- Tono: ${brief.spine.tone}
- Brief (premios y mecánica, literales): ${brief.campaign.theme || "—"}
- Prohibiciones: ${brief.campaign.prohibitions || "—"} (también paráfrasis cercanas)
${adnParaElCorrector(brief)}- Canal: ${spec.id}

## VARIACIONES ROTAS (${broken.length})
${items}

## TAREA
Reescribe CADA variación cumpliendo TODAS estas condiciones:
1. Respeta el budget del slot indicado en cada una — cuenta antes de devolver.
2. NO uses las palabras prohibidas ni paráfrasis cercanas.
3. Mantén el ángulo/tipo de cada variación y la lógica del concepto de campaña.
4. Mantén el efecto que buscaba; si el problema es de oficio (genérico, relleno, manifiesto…), cambia la frase, no el ángulo.
5. Cumple el manual de oficio.
6. Sigue sonando inconfundiblemente como "${brief.brand.name}".

Devuelve una entrada por cada id recibido, con el id LITERAL.

## FORMATO JSON (única salida válida)
{
  "fixes": [
    { "id": "string — el id literal recibido", "content": "string ya corregido" }
  ]
}
`.trim();
};

/** Se pasa del máximo (no «le falta», que es otro arreglo): lo que la segunda pasada intenta acortar. */
const excedeElMaximo = (v: CopyVariation): boolean =>
  v.budgetOk === false && typeof v.budget === "number" && v.charCount > v.budget;

/** No agrega faltas que el texto no tenía: un recorte que mete una prohibición o rompe el tratamiento no sirve. */
const noEmpeora = (antes: CopyVariation, despues: CopyVariation): boolean =>
  (despues.prohibitionsHit?.length ?? 0) <= (antes.prohibitionsHit?.length ?? 0) &&
  (despues.tuteoHits?.length ?? 0) <= (antes.tuteoHits?.length ?? 0) &&
  (despues.adnHits?.length ?? 0) <= (antes.adnHits?.length ?? 0);

/**
 * Segunda pasada, solo para largos (2026-11-23). El corrector reescribe y el texto puede volver igual de largo,
 * porque el modelo cuenta mal: un 45/44 quedaba marcado «excede» y llegaba así. Aquí el modelo propone tres
 * versiones más cortas de cada texto excedido y **el código cuenta**: se queda con la primera que cabe y no
 * agrega faltas. Si ninguna cabe, se queda la más corta, que sigue marcada para que el equipo la vea.
 */
export const acortarLosLargos = async (
  brief: ChannelBrief,
  spec: ChannelSpec,
  variations: CopyVariation[],
  client: OpenAI,
  model: string,
  usage?: UsageEntry[],
  opciones: { signal?: AbortSignal; presupuestoMs?: number } = {}
): Promise<CopyVariation[]> => {
  const largos = variations.filter(excedeElMaximo);
  if (largos.length === 0) return variations;

  const items = largos
    .map(v => {
      const unidad = v.budgetUnit === "word" ? "palabras" : "caracteres (con espacios y signos)";
      return `### id: ${v.id}
- Slot: ${v.slot || "(default)"}
- Máximo: ${v.budget} ${unidad}. Tiene ${v.charCount}: sobran ${v.charCount - (v.budget as number)}.
- Texto: "${v.content.replace(/"/g, '\\"')}"`;
    })
    .join("\n\n");

  const prompt = `
Estos textos de "${brief.brand.name}" (canal ${spec.id}) se pasan del máximo. Para CADA uno escribe 3 versiones más
cortas, de la más fiel a la más corta. Las tres tienen que quedar en el máximo o por debajo: cuenta antes de devolver.
Conserva el sentido, el dato clave y la voz de la marca; quita palabras de relleno antes que ideas. No agregues
palabras nuevas ni cambies el tratamiento (tú, vos o usted) que ya usa el texto.

${items}

## FORMATO JSON (única salida válida)
{ "versiones": [ { "id": "el id literal", "opciones": ["versión 1", "versión 2", "versión 3"] } ] }
`.trim();

  try {
    const response = await chatCompletionConRetry(
      client,
      {
        model,
        messages: [
          { role: "system", content: "Eres editor de copy y acortas textos sin perder su sentido. Respondes SOLO en JSON válido." },
          { role: "user", content: prompt },
        ],
        response_format: jsonObjectFormat(client),
        max_tokens: Math.min(MAX_TOKENS.fixer * largos.length, 8_000),
        ...samplingParams(model, 0.4),
      },
      {
        etapa: `acortar:${spec.id}`,
        timeoutMs: TIEMPOS.llamada.fixer,
        intentosMax: 2,
        presupuestoMs: opciones.presupuestoMs,
        signal: opciones.signal,
      }
    );
    const u = extractUsage(response, model, `acortar:${spec.id}`);
    if (u && usage) usage.push(u);

    const raw = response.choices[0]?.message?.content;
    if (!raw) return variations;
    const parsed = JSON.parse(stripJsonFence(raw));
    const porId = new Map<string, string[]>(
      (Array.isArray(parsed.versiones) ? parsed.versiones : [])
        .filter((x: any) => typeof x?.id === "string" && Array.isArray(x.opciones))
        .map((x: any) => [x.id, x.opciones.filter((o: unknown): o is string => typeof o === "string" && Boolean(o.trim()))])
    );

    return variations.map(v => {
      if (!excedeElMaximo(v)) return v;
      const candidatas = (porId.get(v.id) ?? []).map(c =>
        validateVariation({ ...v, content: c.trim(), autofixed: true }, spec, brief.campaign.prohibitions, brief.tratamiento, contextoDeValidacion(brief))
      );
      const cabe = candidatas.find(c => c.budgetOk !== false && noEmpeora(v, c));
      if (cabe) return cabe;
      // Ninguna cabe: la más corta si mejora, todavía marcada «excede» para que se vea.
      const masCorta = candidatas.filter(c => noEmpeora(v, c)).sort((a, b) => a.charCount - b.charCount)[0];
      return masCorta && masCorta.charCount < v.charCount ? masCorta : v;
    });
  } catch (error) {
    console.warn(`Acortar falló para canal ${spec.id}:`, error);
    return variations;
  }
};

export const runAutoFix = async (
  brief: ChannelBrief,
  spec: ChannelSpec,
  variations: CopyVariation[],
  client: OpenAI,
  model: string,
  usage?: UsageEntry[],
  opciones: { signal?: AbortSignal; presupuestoMs?: number } = {}
): Promise<CopyVariation[]> => {
  const corregidas = await corregirUnaVez(brief, spec, variations, client, model, usage, opciones);
  // Lo que el corrector dejó todavía largo pasa por la segunda pasada, que solo acorta.
  return acortarLosLargos(brief, spec, corregidas, client, model, usage, opciones);
};

const corregirUnaVez = async (
  brief: ChannelBrief,
  spec: ChannelSpec,
  variations: CopyVariation[],
  client: OpenAI,
  model: string,
  usage?: UsageEntry[],
  opciones: { signal?: AbortSignal; presupuestoMs?: number } = {}
): Promise<CopyVariation[]> => {
  const broken = variations.filter(isBroken);
  if (broken.length === 0) return variations;

  try {
    // Igual que el crítico: 2 intentos. Si se rinde, la variación conserva su
    // contenido original con los flags puestos.
    const response = await chatCompletionConRetry(
      client,
      {
        model,
        messages: [
          {
            role: "system",
            content: "Eres editor de copy especializado en respetar restricciones duras. Respondes SOLO en JSON válido.",
          },
          { role: "user", content: buildBatchFixPrompt(brief, spec, broken) },
        ],
        response_format: jsonObjectFormat(client),
        max_tokens: Math.min(MAX_TOKENS.fixer * broken.length, 8_000),
        ...samplingParams(model, 0.5),
      },
      {
        etapa: `fixer:${spec.id}`,
        timeoutMs: TIEMPOS.llamada.fixer,
        intentosMax: 2,
        presupuestoMs: opciones.presupuestoMs,
        signal: opciones.signal,
      }
    );

    const u = extractUsage(response, model, `fixer:${spec.id}`);
    if (u && usage) usage.push(u);

    const raw = response.choices[0].message.content;
    if (!raw) return variations;

    const parsed = JSON.parse(stripJsonFence(raw));
    const fixes: { id?: string; content?: string }[] = Array.isArray(parsed.fixes) ? parsed.fixes : [];
    const contentById = new Map(
      fixes
        .filter(f => typeof f?.id === "string" && typeof f?.content === "string" && f.content.trim())
        .map(f => [f.id as string, f.content as string])
    );

    if (contentById.size === 0) return variations;

    return variations.map(v => {
      const newContent = contentById.get(v.id);
      // A variation the model skipped keeps its original (broken) content rather
      // than being dropped — the editor flags stay on it for the UI to surface.
      if (!newContent) return v;
      const fixed: CopyVariation = { ...v, content: newContent, autofixed: true };
      // Con el voseo y el contexto: sin ellos, las marcas de tuteo viejas
      // quedaban pegadas a un texto ya corregido.
      return validateVariation(fixed, spec, brief.campaign.prohibitions, brief.tratamiento, contextoDeValidacion(brief));
    });
  } catch (error) {
    console.warn(`AutoFix falló para canal ${spec.id}:`, error);
    return variations;
  }
};
