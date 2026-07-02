import type OpenAI from "openai";
import { CampaignSpine, CoherenceReport, CopyVariation } from "../types.js";
import { UsageEntry, extractUsage } from "./pricing.js";
import { jsonObjectFormat, stripJsonFence } from "./aiClient.js";

const summarizeChannel = (channel: string, items: CopyVariation[]): string => {
  const top = items
    .slice()
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3);
  return `### ${channel}\n${top.map(v => `- [${v.slot || "default"}#${v.variationIndex ?? "?"} | ${v.type}] "${v.content.replace(/"/g, '\\"')}"`).join("\n")}`;
};

const buildPrompt = (
  brandName: string,
  spine: CampaignSpine,
  variations: CopyVariation[],
  prohibitions: string
): string => {
  const byChannel = new Map<string, CopyVariation[]>();
  variations.forEach(v => {
    const key = String(v.platform);
    if (!byChannel.has(key)) byChannel.set(key, []);
    byChannel.get(key)!.push(v);
  });

  const channelBlocks = Array.from(byChannel.entries())
    .map(([ch, items]) => summarizeChannel(ch, items))
    .join("\n\n");

  return `
Eres director creativo. Tu trabajo es auditar la COHERENCIA de campaña ENTRE canales — no la calidad pieza por pieza.

La pregunta clave: ¿este deck se siente como UNA campaña, o como N marcas distintas hablando del mismo producto?

## CAMPAÑA
- Marca: "${brandName}"
- Concepto creativo (anclaje): "${spine.concept}"
- Mensaje clave: ${spine.keyMessage}
- Tono: ${spine.tone}
- Hero CTA: ${spine.heroCTA}
- Prohibiciones: ${prohibitions || "—"}

## DECK A EVALUAR (top 3 piezas por canal según score interno)
${channelBlocks}

## CRITERIOS
1. **Concepto**: ¿se reconoce el concepto creativo en todos los canales (literal o expandido)? ¿O hay canales que parecen otra campaña?
2. **Tono**: ¿el registro tonal se mantiene? ¿O hay deriva (ej: Email serio + TikTok payaso + Push corporate)?
3. **Mensaje clave**: ¿todos los canales transmiten el mismo "qué se lleva el público"? ¿O canales contradictorios?
4. **Voz de marca**: ¿se siente la misma marca en todos los canales?
5. **CTA**: ¿la jerarquía de acción es coherente, o hay canales con CTAs que no encajan con la etapa?

## TU TAREA
Devolvé JSON con:
- "coherenceScore": 1-10. Rúbrica:
   • 9-10 — el deck se lee como una campaña perfectamente unificada
   • 7-8 — coherente con desviaciones menores
   • 4-6 — desviaciones serias en 1-2 canales
   • 1-3 — incoherente, parece N campañas distintas
- "summary": 1-2 líneas con el veredicto general — concreto, accionable.
- "issues": array de problemas concretos. Cada uno con:
   - "channels": los canales involucrados (array)
   - "problem": qué está mal, en lenguaje del editor (no abstracto)
   - "severity": "low" | "medium" | "high"
- "flags": tags rápidas. Válidas: "concept-drift", "tone-drift", "message-conflict", "cta-misalignment", "voice-drift", "channel-orphan" (un canal totalmente desconectado del resto). Vacío si todo coherente.

Si todo está bien, decilo (8-10). No castigues por castigar.

## FORMATO JSON (única salida válida)
{
  "coherenceScore": 1-10,
  "summary": "string",
  "issues": [{ "channels": ["string"], "problem": "string", "severity": "low|medium|high" }],
  "flags": ["string"]
}
`.trim();
};

export const runSuperCritic = async (
  brandName: string,
  spine: CampaignSpine,
  variations: CopyVariation[],
  prohibitions: string,
  client: OpenAI,
  model: string,
  usage?: UsageEntry[]
): Promise<CoherenceReport | null> => {
  if (variations.length === 0) return null;

  // Si solo hay 1 canal, no hay coherencia cross-channel que evaluar
  const channels = new Set(variations.map(v => String(v.platform)));
  if (channels.size < 2) return null;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "Eres director creativo senior. Auditas coherencia entre canales. Severo pero justo. Respondés SOLO en JSON válido." },
        { role: "user", content: buildPrompt(brandName, spine, variations, prohibitions) },
      ],
      response_format: jsonObjectFormat(client),
      temperature: 0.3,
    });
    const u = extractUsage(response, model, "supercritic");
    if (u && usage) usage.push(u);
    const raw = response.choices[0].message.content;
    if (!raw) return null;
    const parsed = JSON.parse(stripJsonFence(raw));
    return {
      coherenceScore: typeof parsed.coherenceScore === "number" ? parsed.coherenceScore : 0,
      summary: parsed.summary || "",
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
    };
  } catch (error) {
    console.warn("SuperCritic falló:", error);
    return null;
  }
};
