import { FunnelStage } from "../types.js";
import { ChannelBrief, ChannelSpec, SlotSpec } from "./types.js";
import { renderFingerprintForPrompt } from "../services/voiceFingerprintService.js";

const FUNNEL_HINT: Record<FunnelStage, string> = {
  [FunnelStage.AWARENESS]:
    "Awareness — el público NO conoce todavía. Educa / revela. Sin CTAs duros de compra.",
  [FunnelStage.CONSIDERATION]:
    "Consideración — el público compara. Diferencia vs alternativas. CTAs intermedios (prueba / simula).",
  [FunnelStage.CONVERSION]:
    "Conversión — el público está listo. Empuja la decisión: urgencia real, garantía, manejo de objeción.",
  [FunnelStage.RETENTION]:
    "Retención — el público ya compró. Refuerza decisión, abre cross-sell, premia fidelidad."
};


const renderSlotSpec = (slot: SlotSpec): string => {
  const range =
    slot.min !== undefined && slot.max !== undefined
      ? `entre ${slot.min} y ${slot.max} ${slot.unit === "word" ? "palabras" : "caracteres"}`
      : slot.max !== undefined
      ? `máximo ${slot.max} ${slot.unit === "word" ? "palabras" : "caracteres"}`
      : "sin límite estricto";
  const angle = slot.varyByAngle ? " (rotar ángulos definidos en la espina)" : "";
  const guidance = slot.guidance ? `\n    · ${slot.guidance}` : "";
  return `- "${slot.id}" (${slot.label}) — ${slot.count} variación(es), ${range}${angle}.${guidance}`;
};

const renderJsonSchema = (spec: ChannelSpec): string => {
  const items = spec.slots
    .map(s => `    { "slot": "${s.id}", "variationIndex": 1..${s.count}, "type": "${s.varyByAngle ? "<nombre del ángulo>" : "Standard"}", "content": "string", "score": 1..10, "scoreRationale": "1 línea concreta" }`)
    .join(",\n");
  return `{
  "variations": [
${items}
    // … una entrada por cada combinación slot × variationIndex
  ]
}`;
};

const renderNegativeExamples = (brief: ChannelBrief): string => {
  if (!brief.negativeExamples || brief.negativeExamples.length === 0) return "";
  const items = brief.negativeExamples.slice(0, 6).map(e => `- "${e.content}" → PROBLEMA: ${e.reason}`);
  return `
## EJEMPLOS NEGATIVOS — PATRONES DOCUMENTADOS A EVITAR
${items.join("\n")}

Estos son fallos reales rechazados por el equipo. NO reproduzcas su tono, estructura ni gancho.
Si una variación tuya recuerda a alguno de estos, descarta y reescribe desde otra premisa.
`;
};

const renderExamples = (brief: ChannelBrief): string => {
  // For caching, examples are identical across channel calls (no per-channel filtering at prefix).
  // Channel-specific filtering happens later in the SUFFIX section.
  if (brief.examples.length === 0) return "";
  const items = brief.examples.slice(0, 6).map(e => `- [${e.platform}] "${e.content}"`);
  return `
## EJEMPLOS DE VOZ APROBADA (referencia tonal global)
${items.join("\n")}

CÓMO USARLOS:
1. Identificá los TICS lingüísticos comunes: aperturas (¿empiezan negando, preguntando, declarando?), ritmo de frase (¿cortas y secas? ¿con repetición?), persona gramatical, tipo de remate.
2. Reproducí esos tics. NO copies frases.
3. Si una variación tuya termina pareciéndose mucho a un ejemplo, reescribila con el mismo tic pero idea distinta.
`;
};

const renderChannelExamples = (brief: ChannelBrief, spec: ChannelSpec): string => {
  // Channel-specific filtered examples for the SUFFIX (variable, no caching)
  const own = brief.examples.filter(e => e.platform === spec.id);
  if (own.length === 0) return "";
  return `
## EJEMPLOS DEL MISMO CANAL (prioritarios)
${own.slice(0, 4).map(e => `- "${e.content}"`).join("\n")}
`;
};

/**
 * SYSTEM prompt: brand-level, identical across all channel calls of a generation.
 * Cacheable prefix.
 */
export const buildSystemPrompt = (brief: ChannelBrief): string => `
Eres un copywriter especialista con estilo de redacción de Colombia.
Conoces los límites técnicos y la lógica nativa de cada canal al milímetro.
Trabajas para "${brief.brand.name}" y tu lenguaje debe ser natural, cercano y utilizar el español de Colombia (evitando modismos de otros países como Argentina o España, a menos que se especifique lo contrario).

TEST OBLIGATORIO antes de devolver cada variación: ¿Esto suena a alguien de "${brief.brand.name}" hablándole a un amigo en Colombia, o a una agencia escribiendo para un cliente? Si es lo segundo, descarta y reescribe.

Si una variación rompe un límite de caracteres/palabras, cuenta de nuevo y acorta. Si usa una palabra prohibida, reescribe.

Respondes SOLO en JSON válido. Sin texto fuera del JSON.
`.trim();

/**
 * Cacheable prefix block of the user prompt — identical across all channel calls in a single generation.
 * OpenAI's auto-caching kicks in when this prefix is ≥1024 tokens and identical between calls.
 */
const buildCacheablePrefix = (brief: ChannelBrief): string => {
  const conceptLine = brief.spine.concept ? `"${brief.spine.concept}"` : "(sin concepto fijo)";
  const funnelBlock = brief.funnelStage
    ? `\n## ETAPA DEL FUNNEL: ${brief.funnelStage}\n${FUNNEL_HINT[brief.funnelStage]}\n`
    : "";

  return `
## ANCLAJE — CONCEPTO DE CAMPAÑA
${conceptLine}

Es la frase que UNIFICA toda la campaña entre canales.
${funnelBlock}
## ESPINA DE CAMPAÑA (común a todos los canales)
- Mensaje clave: ${brief.spine.keyMessage}
- Tono específico de la campaña: ${brief.spine.tone}
- Hero CTA: ${brief.spine.heroCTA}
- Ángulos definidos por el director:
${brief.spine.angles.map(a => `  • ${a.name}: ${a.premise} (registro: ${a.register})`).join("\n")}

## ADN DE MARCA
- Propuesta de valor: ${brief.brand.valueProposition || "—"}
- Voz: ${brief.brand.voice || "—"}
- Guías de voz: ${brief.brand.brandVoiceGuidelines || "—"}

${brief.brand.fingerprint ? renderFingerprintForPrompt(brief.brand.fingerprint) : ""}

## CONTEXTO DE CAMPAÑA
- Producto/Servicio: ${brief.campaign.product || "—"}
- Audiencia: ${brief.campaign.targetAudience || "—"}
- Objetivo táctico: ${brief.campaign.goal || "—"}
- Brief: ${brief.campaign.theme || "—"}
- Keywords (favorecer): ${brief.campaign.keywords || "—"}
- Prohibiciones: ${brief.campaign.prohibitions || "—"}
- CTA principal: ${brief.campaign.primaryCTA || "—"}
${renderExamples(brief)}${renderNegativeExamples(brief)}`;
};

/**
 * Channel-specific suffix — varies per call, not cached.
 */
const buildChannelSuffix = (brief: ChannelBrief, spec: ChannelSpec): string => {
  const slotBlock = spec.slots.map(renderSlotSpec).join("\n");
  const schema = renderJsonSchema(spec);
  const channelExamples = renderChannelExamples(brief, spec);

  const cortos = spec.slots.filter(s => s.unit === "char" && (s.max || 0) > 0 && (s.max || 0) <= 90);
  const cortosLabel = cortos.map(s => `"${s.id}"`).join(", ");
  const conceptLiteralRule = cortosLabel
    ? `En slots cortos (${cortosLabel}), AL MENOS 1 de cada ${Math.max(2, ...spec.slots.map(s => s.count))} variaciones debe incluir el concepto TEXTUAL. En slots largos, expandilo manteniendo su lógica.`
    : `Toda pieza debe sentirse hija del concepto, expandiendo su lógica.`;

  return `
---

## CANAL: ${spec.id}
${spec.description}
${channelExamples}
## TÁCTICA DEL CANAL
${spec.guidance}

## REGLA DE CONCEPTO LITERAL
${conceptLiteralRule}

## SLOTS A GENERAR
${slotBlock}

## REGLAS — ORDEN DE PRIORIDAD (si hay conflicto, gana la regla más arriba)
1. **Límites de caracteres/palabras** del slot. Cuenta ANTES de devolver. Si te pasas, acorta.
2. **Prohibiciones**: las palabras listadas y sus paráfrasis cercanas (zona semántica) están prohibidas.
3. **Concepto creativo**: literal en slots cortos según la regla declarada arriba; expansión coherente en slots largos.
4. **Tono y guías de voz** de la marca.
5. **Ángulo asignado** a cada variación.

## SCORING (rúbrica 1-10) por variación
- 5 pts — ¿Inconfundiblemente "${brief.brand.name}"? Si podría ser otra marca del rubro, resta puntos.
- 3 pts — ¿Cumple presupuesto de slot Y respeta prohibiciones? Si no, máx 5 puntos en esta variación.
- 2 pts — ¿Aporta una idea distinta a las otras variaciones del mismo slot?

Devolver score + scoreRationale CONCRETO (1 línea, citando un detalle específico — no "buen tono").

## FORMATO JSON (única salida válida)
${schema}
`.trim();
};

/**
 * Build the full user prompt as prefix + suffix. The prefix is cacheable.
 */
export const buildUserPrompt = (brief: ChannelBrief, spec: ChannelSpec): string => {
  return buildCacheablePrefix(brief) + buildChannelSuffix(brief, spec);
};

export const renderChannelPromptForPreview = (brief: ChannelBrief, spec: ChannelSpec): { system: string; user: string } => ({
  system: buildSystemPrompt(brief),
  user: buildUserPrompt(brief, spec),
});
