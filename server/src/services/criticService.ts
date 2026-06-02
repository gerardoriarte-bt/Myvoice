import type OpenAI from "openai";
import { CopyVariation } from "../types.js";
import { ChannelBrief, ChannelSpec } from "../channels/types.js";
import { UsageEntry, extractUsage } from "./pricing.js";

interface CriticEvaluation {
  id: string;
  score: number;
  scoreRationale: string;
  editorFlags: string[];
}

const buildCriticPrompt = (
  brief: ChannelBrief,
  spec: ChannelSpec,
  variations: CopyVariation[]
): string => {
  const items = variations
    .map(v => `- id: ${v.id}\n  slot: ${v.slot || "(default)"} #${v.variationIndex ?? "?"} | tipo: ${v.type}\n  content: "${v.content.replace(/"/g, '\\"')}"\n  writer-score: ${v.score ?? "?"}\n  budget: ${v.charCount} ${v.budgetUnit === "word" ? "pal" : "car"} (límite: ${v.budget ?? "—"})${v.prohibitionsHit && v.prohibitionsHit.length ? `\n  prohibitions hit: ${v.prohibitionsHit.join(", ")}` : ""}`)
    .join("\n\n");

  return `
Eres editor senior de marca. Tu trabajo es re-evaluar el copy que escribió el copywriter.
El score que él se puso es típicamente generoso. Tu trabajo es ser severo pero justo.

## MARCA
- Nombre: ${brief.brand.name}
- Voz: ${brief.brand.voice || "—"}
- Propuesta de valor: ${brief.brand.valueProposition || "—"}
- Guías: ${brief.brand.brandVoiceGuidelines || "—"}

## ANCLAJE
- Concepto de campaña: "${brief.spine.concept}"
- Tono: ${brief.spine.tone}
- Mensaje clave: ${brief.spine.keyMessage}
- Prohibiciones: ${brief.campaign.prohibitions || "—"}

## CANAL
${spec.id} — ${spec.description}

## VARIACIONES A EVALUAR
${items}

## TU TAREA
Para cada variación devolvé:
- "id": el id literal recibido.
- "score": 1-10. Rúbrica:
   • 5 pts máximo: ¿inconfundiblemente "${brief.brand.name}"? Si podría ser otra marca del rubro, restá puntos. Si suena a "agencia escribiendo para cliente", máx 2 pts en este renglón.
   • 3 pts máximo: ¿cumple budget del slot Y respeta prohibiciones (incluyendo paráfrasis cercanas)? Si rompe budget o usa prohibición, máx 1 pt.
   • 2 pts máximo: ¿aporta una idea distinta a las otras variaciones del mismo slot, o es redundante?
- "scoreRationale": 1 línea CONCRETA. Cita un detalle específico (palabra, frase, recurso). NO digas "buen tono" o "claro y conciso".
- "editorFlags": array de strings con problemas detectados. Tags válidas:
   "generic"          → podría ser de otra marca
   "concept-drift"    → no se siente hijo del concepto de campaña
   "tone-mismatch"    → tono no coincide con la voz/guías
   "prohibition-paraphrase" → usa una paráfrasis cercana de una prohibición
   "budget-violation" → excede el límite de chars/palabras
   "redundant"        → demasiado parecido a otra variación del mismo slot
   "weak-cta"         → CTA blando o genérico
   "agency-speak"     → suena a copy de agencia / corporate
  Vacío si está limpio.

REGLA: si una variación es buena, decilo (8-10). No infles, pero tampoco castigues por castigar.

## FORMATO JSON (única salida)
{
  "evaluations": [
    { "id": "string", "score": 1-10, "scoreRationale": "string", "editorFlags": ["string", ...] }
  ]
}
`.trim();
};

export const runCritic = async (
  brief: ChannelBrief,
  spec: ChannelSpec,
  variations: CopyVariation[],
  client: OpenAI,
  model: string,
  usage?: UsageEntry[]
): Promise<CopyVariation[]> => {
  if (variations.length === 0) return variations;

  const prompt = buildCriticPrompt(brief, spec, variations);

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "Eres editor senior de marca. Severo pero justo. Respondés SOLO en JSON válido." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const u = extractUsage(response, model, `critic:${spec.id}`);
    if (u && usage) usage.push(u);

    const raw = response.choices[0].message.content;
    if (!raw) return variations;

    const parsed = JSON.parse(raw);
    const evals: CriticEvaluation[] = Array.isArray(parsed.evaluations) ? parsed.evaluations : [];
    const byId = new Map(evals.map(e => [e.id, e]));

    return variations.map(v => {
      const ev = byId.get(v.id);
      if (!ev) return v;
      return {
        ...v,
        writerScore: v.score,
        score: typeof ev.score === "number" ? ev.score : v.score,
        scoreRationale: ev.scoreRationale || v.scoreRationale,
        editorFlags: Array.isArray(ev.editorFlags) ? ev.editorFlags : [],
      };
    });
  } catch (error) {
    console.warn(`Critic falló para canal ${spec.id}, devolviendo writer scores:`, error);
    return variations;
  }
};
