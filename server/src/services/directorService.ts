import type OpenAI from "openai";
import { CampaignSpine, CopyParameters, FunnelStage } from "../types.js";
import { UsageEntry, extractUsage } from "./pricing.js";
import { buildLocaleRulesBlock, resolveMarketLocale } from "./localeRules.js";
import {
  jsonObjectFormat,
  stripJsonFence,
  samplingParams,
  MAX_TOKENS,
  TIEMPOS,
  chatCompletionConRetry,
} from "./aiClient.js";

const FUNNEL_GUIDANCE: Record<FunnelStage, string> = {
  [FunnelStage.AWARENESS]:
    "Awareness (TOFU) — el público todavía NO conoce la marca o el problema. Los ángulos deben EDUCAR o REVELAR. Evitar CTAs de compra directa; preferir 'descubre', 'mira esto', '¿sabías que…?'. Tono curioso, casi periodístico.",
  [FunnelStage.CONSIDERATION]:
    "Consideración (MOFU) — el público conoce el problema y compara opciones. Los ángulos deben DIFERENCIAR vs. competidores y reforzar prueba (testimonios, datos). CTAs intermedios: 'compara', 'simula', 'pruébalo gratis'.",
  [FunnelStage.CONVERSION]:
    "Conversión (BOFU) — el público está listo para decidir. Los ángulos deben EMPUJAR la decisión: urgencia real, manejo de objeción final, garantía. CTAs de cierre: 'compra ahora', 'aprovecha', 'reserva'.",
  [FunnelStage.RETENTION]:
    "Retención (post-compra) — el cliente ya compró. Los ángulos deben REFORZAR la decisión, premiar fidelidad, abrir cross-sell. CTAs blandos: 'descubre lo nuevo', 'gracias por confiar'."
};

const buildDirectorSystemPrompt = (params: CopyParameters) => `
Eres director de campaña — estratega senior con 15 años en agencia, no copywriter.
Tu trabajo NO es escribir copy: es decidir el anclaje creativo que mantendrá una campaña coherente entre canales.
${buildLocaleRulesBlock(resolveMarketLocale(params))}

TEST OBLIGATORIO antes de responder: ¿esta espina aplicaría a cualquier marca del mismo rubro, o se siente inconfundiblemente de ESTA marca? Si es lo primero, reformula hasta que sea lo segundo.

Respondes SOLO en JSON válido. Sin texto fuera del JSON. Sin comentarios.
`.trim();

const buildDirectorPrompt = (params: CopyParameters): string => {
  const concept = (params.campaignConcept || "").trim();
  const conceptBlock = concept
    ? `## CONCEPTO DE CAMPAÑA — ANCLAJE INAMOVIBLE
"${concept}"

Este concepto ya fue decidido por el equipo creativo. Lo vas a usar TEXTUALMENTE como valor del campo "concept" en tu respuesta — sin reformular, sin reemplazar, sin "mejorarlo".
Tu trabajo es derivar keyMessage / tone / heroCTA / angles que SOSTENGAN este concepto en todos los canales.
`
    : `## CONCEPTO DE CAMPAÑA
No fue provisto. Deriva un concepto memorable, específico, que pueda funcionar como tagline raíz de toda la campaña.
`;

  const stage = params.funnelStage;
  const stageBlock = stage
    ? `## ETAPA DEL FUNNEL: ${stage}
${FUNNEL_GUIDANCE[stage]}
`
    : "";

  return `
${conceptBlock}
${stageBlock}
## ADN DE MARCA
- Propuesta de valor: ${params.valueProposition || "—"}
- Voz: ${params.voice || "—"}
- Guías de voz: ${params.brandVoiceGuidelines || "—"}

## CONTEXTO DE CAMPAÑA
- Marca: ${params.clientName || "—"}
- Producto/Servicio: ${params.product || "—"}
- Audiencia: ${params.targetAudience || "—"}
- Objetivo táctico: ${params.goal || "—"}
- Brief: ${params.theme || "—"}
- Keywords (favorecer): ${params.keywords || "—"}
- Prohibiciones: ${params.prohibitions || "—"}
- CTA solicitado: ${params.primaryCTA || "—"}

---

## TAREA
Devuelve un JSON con la espina de la campaña.

REGLAS DE LOS 3 ÁNGULOS:
1. Los 3 ángulos deben ser SUSTANTIVAMENTE distintos — un lector debería pensar que vienen de 3 estrategias diferentes, no 3 redacciones del mismo brief.
2. Cada uno declara su propia PREMISA NARRATIVA (no el mismo gancho disfrazado).
3. Los nombres pueden alejarse de Beneficio/Curiosidad/Urgencia si otra etiqueta describe mejor (ej: "Confesión", "Comparación honesta", "Antes/después").
4. El "register" debe ser CONCRETO: ritmo, persona gramatical, tipo de frase. NO "tono cercano y profesional".

REGLAS DE FILTRO antes de devolver:
- Si concept / keyMessage / tone podrían aplicar a otra marca del mismo rubro → reformular hasta que sea inconfundiblemente de "${params.clientName || "esta marca"}".
- Si el equipo proveyó concept, va TEXTUAL en la respuesta.
- Si keyMessage repite el concept, reescribilo: el keyMessage es lo que el público se LLEVA, no lo que la marca dice.

## FORMATO JSON (única salida válida)
{
  "concept": "string — frase tagline (máx ~12 palabras), inconfundible de la marca",
  "keyMessage": "string — qué se lleva el público, 1 línea",
  "tone": "string — registro específico para ESTA campaña (no la voz global)",
  "heroCTA": "string — CTA principal en la voz nativa de la marca",
  "angles": [
    { "name": "string", "premise": "string — hipótesis narrativa concreta", "register": "string — ritmo/persona/tipo de frase específicos" },
    { "name": "string", "premise": "string", "register": "string" },
    { "name": "string", "premise": "string", "register": "string" }
  ]
}
`.trim();
};

export const buildCampaignSpine = async (
  params: CopyParameters,
  client: OpenAI,
  model: string,
  usage?: UsageEntry[],
  signal?: AbortSignal
): Promise<CampaignSpine> => {
  const prompt = buildDirectorPrompt(params);
  // Es la etapa más crítica del pipeline: sin espina no hay un solo canal, así
  // que se reintenta con el presupuesto completo de la generación.
  const response = await chatCompletionConRetry(
    client,
    {
      model,
      messages: [
        { role: "system", content: buildDirectorSystemPrompt(params) },
        { role: "user", content: prompt },
      ],
      response_format: jsonObjectFormat(client),
      max_tokens: MAX_TOKENS.director,
      ...samplingParams(model, 0.7),
    },
    { etapa: "director", timeoutMs: TIEMPOS.llamada.director, presupuestoMs: TIEMPOS.generacion, signal }
  );

  const u = extractUsage(response, model, "director");
  if (u && usage) usage.push(u);

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Director: respuesta vacía de OpenAI");

  const parsed = JSON.parse(stripJsonFence(content));
  if (!parsed.angles || !Array.isArray(parsed.angles) || parsed.angles.length < 3) {
    throw new Error("Director: respuesta inválida (faltan ángulos)");
  }

  // Hard override: if user provided campaignConcept, use it verbatim.
  const lockedConcept = (params.campaignConcept || "").trim();
  if (lockedConcept) parsed.concept = lockedConcept;

  return parsed as CampaignSpine;
};

export const renderDirectorPromptForPreview = (params: CopyParameters): { system: string; user: string } => ({
  system: buildDirectorSystemPrompt(params),
  user: buildDirectorPrompt(params),
});
