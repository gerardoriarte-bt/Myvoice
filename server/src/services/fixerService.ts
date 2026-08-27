import type OpenAI from "openai";
import { CopyVariation } from "../types.js";
import { ChannelBrief, ChannelSpec } from "../channels/types.js";
import { validateVariation } from "../channels/validators.js";
import { UsageEntry, extractUsage } from "./pricing.js";
import {
  jsonObjectFormat,
  stripJsonFence,
  samplingParams,
  MAX_TOKENS,
  TIEMPOS,
  chatCompletionConRetry,
} from "./aiClient.js";

const isBroken = (v: CopyVariation): boolean => {
  if (v.budgetOk === false) return true;
  if (v.prohibitionsHit && v.prohibitionsHit.length > 0) return true;
  if (v.tuteoHits && v.tuteoHits.length > 0) return true;
  if (v.editorFlags?.includes("prohibition-paraphrase")) return true;
  if (v.editorFlags?.includes("budget-violation")) return true;
  if (v.editorFlags?.includes("tuteo-violation")) return true;
  return false;
};

const needsVoseoConversion = (v: CopyVariation): boolean =>
  Boolean(v.tuteoHits?.length) || Boolean(v.editorFlags?.includes("tuteo-violation"));

const VOSEO_CONVERSION_TABLE = `
## TABLA DE CONVERSIÓN TUTEO → VOSEO COLOMBIANO
| Tuteo (INCORRECTO) | Voseo colombiano (CORRECTO) |
|--------------------|----------------------------|
| tú                 | vos                         |
| eres               | sos                         |
| tienes             | tenés                       |
| puedes             | podés                       |
| quieres            | querés                      |
| sabes              | sabés                       |
| haces              | hacés                       |
| vienes             | venís                       |
| habla (imperativo) | hablá                       |
| come (imperativo)  | comé                        |
| vive (imperativo)  | viví                        |
| ven (imperativo)   | vení                        |
| pon (imperativo)   | poné                        |
REGLA: reemplazá TODAS las formas tuteo por su equivalente voseo. No uses "tú" en ningún caso.
`;

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
    issues.push(`TUTEO DETECTADO (violación de voseo colombiano): ${v.tuteoHits.join(" | ")}.`);
  }
  if (!v.tuteoHits?.length && v.editorFlags?.includes("tuteo-violation")) {
    issues.push(`El editor detectó tuteo implícito o paráfrasis de tuteo — reescribir en voseo colombiano.`);
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
  const voseoBlock = broken.some(needsVoseoConversion) ? VOSEO_CONVERSION_TABLE : "";

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
Eres editor de copy. Estas variaciones rompen reglas duras y hay que reescribirlas SIN cambiar su intent.
${voseoBlock}
## MARCA Y CAMPAÑA
- Marca: "${brief.brand.name}"
- Voz: ${brief.brand.voice || "—"}
- Concepto de campaña: "${brief.spine.concept}"
- Tono: ${brief.spine.tone}
- Prohibiciones: ${brief.campaign.prohibitions || "—"} (también paráfrasis cercanas)
- Canal: ${spec.id}

## VARIACIONES ROTAS (${broken.length})
${items}

## TAREA
Reescribí CADA variación cumpliendo TODAS estas condiciones:
1. Respetá el budget del slot indicado en cada una — contá antes de devolver.
2. NO uses las palabras prohibidas ni paráfrasis cercanas.
3. Mantené el ángulo/tipo de cada variación y la lógica del concepto de campaña.
4. Mantené el intent original (qué decía, qué efecto buscaba).
5. Sigue sonando inconfundiblemente como "${brief.brand.name}".

Devolvé una entrada por cada id recibido, con el id LITERAL.

## FORMATO JSON (única salida válida)
{
  "fixes": [
    { "id": "string — el id literal recibido", "content": "string ya corregido" }
  ]
}
`.trim();
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
            content: "Eres editor de copy especializado en respetar restricciones duras. Respondés SOLO en JSON válido.",
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
      return validateVariation(fixed, spec, brief.campaign.prohibitions);
    });
  } catch (error) {
    console.warn(`AutoFix falló para canal ${spec.id}:`, error);
    return variations;
  }
};
