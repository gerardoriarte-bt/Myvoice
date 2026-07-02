import type OpenAI from "openai";
import { CopyVariation } from "../types.js";
import { ChannelBrief, ChannelSpec } from "../channels/types.js";
import { validateVariation } from "../channels/validators.js";
import { UsageEntry, extractUsage } from "./pricing.js";
import { jsonObjectFormat, stripJsonFence } from "./aiClient.js";

const isBroken = (v: CopyVariation): boolean => {
  if (v.budgetOk === false) return true;
  if (v.prohibitionsHit && v.prohibitionsHit.length > 0) return true;
  if (v.tuteoHits && v.tuteoHits.length > 0) return true;
  if (v.editorFlags?.includes("prohibition-paraphrase")) return true;
  if (v.editorFlags?.includes("budget-violation")) return true;
  if (v.editorFlags?.includes("tuteo-violation")) return true;
  return false;
};

const buildFixPrompt = (
  brief: ChannelBrief,
  spec: ChannelSpec,
  v: CopyVariation
): string => {
  const slot = v.slot ? spec.slots.find(s => s.id === v.slot) : undefined;
  const limitStr = slot
    ? slot.min !== undefined && slot.max !== undefined
      ? `entre ${slot.min} y ${slot.max} ${slot.unit === "word" ? "palabras" : "caracteres"}`
      : slot.max !== undefined
      ? `máximo ${slot.max} ${slot.unit === "word" ? "palabras" : "caracteres"}`
      : "sin límite estricto"
    : "sin slot definido";

  const issues: string[] = [];
  if (v.budgetOk === false) issues.push(`El contenido tiene ${v.charCount} ${v.budgetUnit === "word" ? "palabras" : "caracteres"} pero el slot exige ${limitStr}.`);
  if (v.prohibitionsHit && v.prohibitionsHit.length > 0) issues.push(`Usa palabras prohibidas: ${v.prohibitionsHit.join(", ")}.`);
  if (v.editorFlags?.includes("prohibition-paraphrase")) issues.push(`Usa una paráfrasis cercana de una prohibición (zona semántica vetada): ${brief.campaign.prohibitions}.`);
  if (v.tuteoHits && v.tuteoHits.length > 0) {
    issues.push(`TUTEO DETECTADO (violación de voseo colombiano): ${v.tuteoHits.join(" | ")}.`);
  }
  if (!v.tuteoHits?.length && v.editorFlags?.includes("tuteo-violation")) {
    issues.push(`El editor detectó tuteo implícito o paráfrasis de tuteo — reescribir en voseo colombiano.`);
  }

  const voseoConversionBlock = (v.tuteoHits?.length || v.editorFlags?.includes("tuteo-violation"))
    ? `
## TABLA DE CONVERSIÓN TUTEO → VOSEO COLOMBIANO (aplica a este fix)
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
` : "";

  return `
Eres editor de copy. Una variación rompe reglas duras y hay que reescribirla SIN cambiar su intent.
${voseoConversionBlock}
## MARCA Y CAMPAÑA
- Marca: "${brief.brand.name}"
- Voz: ${brief.brand.voice || "—"}
- Concepto de campaña: "${brief.spine.concept}"
- Tono: ${brief.spine.tone}
- Prohibiciones: ${brief.campaign.prohibitions || "—"} (también paráfrasis cercanas)

## VARIACIÓN ROTA
- Canal: ${spec.id}
- Slot: ${v.slot || "(default)"} #${v.variationIndex ?? "?"}
- Tipo/ángulo: ${v.type}
- Contenido actual: "${v.content.replace(/"/g, '\\"')}"
- Budget del slot: ${limitStr}

## PROBLEMAS DETECTADOS
${issues.map(i => `- ${i}`).join("\n")}

## TAREA
Reescribí la variación cumpliendo TODAS estas condiciones:
1. Respetá el budget del slot (${limitStr}) — contá antes de devolver.
2. NO uses las palabras prohibidas ni paráfrasis cercanas.
3. Mantené el ángulo "${v.type}" y la lógica del concepto de campaña.
4. Mantené el intent original (qué decía, qué efecto buscaba).
5. Sigue sonando inconfundiblemente como "${brief.brand.name}".

Devolvé un JSON único:
{ "content": "string ya corregido" }
`.trim();
};

const fixOne = async (
  brief: ChannelBrief,
  spec: ChannelSpec,
  v: CopyVariation,
  client: OpenAI,
  model: string,
  usage?: UsageEntry[]
): Promise<CopyVariation> => {
  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "Eres editor de copy especializado en respetar restricciones duras. Respondés SOLO en JSON válido." },
        { role: "user", content: buildFixPrompt(brief, spec, v) },
      ],
      response_format: jsonObjectFormat(client),
      temperature: 0.5,
    });
    const u = extractUsage(response, model, `fixer:${spec.id}`);
    if (u && usage) usage.push(u);
    const raw = response.choices[0].message.content;
    if (!raw) return v;
    const parsed = JSON.parse(stripJsonFence(raw));
    const newContent = typeof parsed.content === "string" ? parsed.content : "";
    if (!newContent) return v;

    const fixed: CopyVariation = {
      ...v,
      content: newContent,
      autofixed: true,
    };
    // Re-validar después del fix
    return validateVariation(fixed, spec, brief.campaign.prohibitions);
  } catch (error) {
    console.warn(`AutoFix falló para ${spec.id}/${v.slot}#${v.variationIndex}:`, error);
    return v;
  }
};

export const runAutoFix = async (
  brief: ChannelBrief,
  spec: ChannelSpec,
  variations: CopyVariation[],
  client: OpenAI,
  model: string,
  usage?: UsageEntry[]
): Promise<CopyVariation[]> => {
  const broken = variations.filter(isBroken);
  if (broken.length === 0) return variations;

  const fixedById = new Map<string, CopyVariation>();
  await Promise.all(
    broken.map(async v => {
      const fixed = await fixOne(brief, spec, v, client, model, usage);
      fixedById.set(v.id, fixed);
    })
  );

  return variations.map(v => fixedById.get(v.id) || v);
};
