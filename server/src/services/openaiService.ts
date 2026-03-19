import OpenAI from "openai";
import { CopyParameters, GenerationResponse, CopyVariation } from "../types.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateCopyWithOpenAI = async (
  params: CopyParameters,
): Promise<GenerationResponse> => {
  const feedbackBlock =
    params.feedbackExamples && params.feedbackExamples.length > 0
      ? `
    HISTÓRICO DE ÉXITO (USA ESTOS EJEMPLOS COMO GUÍA DE ESTILO Y EFECTIVIDAD):
    ${params.feedbackExamples.map((ex) => `- [${ex.platform}]: "${ex.content}"`).join("\n")}
    `
      : "";

  const prompt = `
    Actúa como "My Voice", el motor de copy estratégico de Grupo LoBueno. 
    Tu misión es generar contenido para "${params.clientName}" basándote EXCLUSIVAMENTE en su ADN Estratégico. 

    ADN ESTRATÉGICO (PARÁMETROS OBLIGATORIOS):
    - Propuesta de Valor: ${params.valueProposition}
    - Guías de Voz: ${params.brandVoiceGuidelines}
    - Tono: ${params.voice}
    - Producto: ${params.product}
    - Público: ${params.targetAudience}
    - Objetivo: ${params.goal}
    - CTA Principal: ${params.primaryCTA}
    - Mensaje Central: ${params.theme}
    - Keywords: ${params.keywords}

    ${feedbackBlock}

    REGLAS DE FORMATO:
    1. Email: Estructura [ASUNTO] | [HEADER] | [BODY] | [CTA].
    2. Push: [Título] | [Cuerpo] (Max 45/120 carac.).
    3. WhatsApp: Negritas para énfasis, max 2 emojis.
    4. Instagram: Hook inicial, 3-5 hashtags, [IDEA VISUAL: descripción].
    5. Google Ads: [Título] | [Descripción] (Max 30/90 carac.).
    6. Pop up: [TÍTULO] | [CUERPO] | [CTA].

    Genera exactamente 3 variaciones por cada una de estas plataformas: ${params.platforms.join(", ")}.
    V1: Beneficio Directo.
    V2: Curiosidad/Storytelling.
    V3: Urgencia/Conversión.

    Responde estrictamente en formato JSON con la siguiente estructura:
    {
      "variations": [
        {
          "id": "string",
          "platform": "string",
          "type": "Beneficio" | "Curiosidad" | "Urgencia",
          "content": "string",
          "charCount": number
        }
      ]
    }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Eres un redactor creativo experto en estrategia de marca y marketing digital.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    const parsed = JSON.parse(content);
    return parsed as GenerationResponse;
  } catch (error: any) {
    console.error("OpenAI Error:", error);

    // Detección específica de errores de facturación/créditos de OpenAI
    if (error?.status === 429 || error?.code === 'insufficient_quota' || error?.message?.includes('insufficient_quota')) {
      throw new Error("ALERTA_CREDITOS: Tu cuenta de OpenAI se ha quedado sin créditos o límite de cuota. Por favor recarga tu saldo de OpenAI para seguir generando copy.");
    }
    
    throw new Error("Fallo en la generación de IA: " + (error?.message || 'Error desconocido'));
  }
};

export const streamGenerateCopyWithOpenAI = async (
  params: CopyParameters,
  onChunk: (chunk: string) => void
): Promise<void> => {
  const feedbackBlock =
    params.feedbackExamples && params.feedbackExamples.length > 0
      ? `
    HISTÓRICO DE ÉXITO (USA ESTOS EJEMPLOS COMO GUÍA DE ESTILO Y EFECTIVIDAD):
    ${params.feedbackExamples.map((ex) => `- [${ex.platform}]: "${ex.content}"`).join("\n")}
    `
      : "";

  const prompt = `
    Actúa como "My Voice", el motor de copy estratégico de Grupo LoBueno. 
    Tu misión es generar contenido para "${params.clientName}" basándote EXCLUSIVAMENTE en su ADN Estratégico. 
    
    ESTRUCTURA DE RESPUESTA:
    Debes responder con un objeto JSON válido que contenga un array "variations". 
    Cada variación DEBE incluir un "score" (1-10) que indique qué tan alineada está con el ADN estratégico.

    ADN ESTRATÉGICO (PARÁMETROS OBLIGATORIOS):
    - Propuesta de Valor: ${params.valueProposition}
    - Guías de Voz: ${params.brandVoiceGuidelines}
    - Tono: ${params.voice}
    - Producto: ${params.product}
    - Público: ${params.targetAudience}
    - Objetivo: ${params.goal}
    - CTA Principal: ${params.primaryCTA}
    - Mensaje Central: ${params.theme}
    - Keywords: ${params.keywords}

    ${feedbackBlock}

    REGLAS DE FORMATO:
    1. Email: Estructura [ASUNTO] | [HEADER] | [BODY] | [CTA].
    2. Push: [Título] | [Cuerpo] (Max 45/120 carac.).
    3. WhatsApp: Negritas para énfasis, max 2 emojis.
    4. Instagram: Hook inicial, 3-5 hashtags, [IDEA VISUAL: descripción].
    5. Google Ads: [Título] | [Descripción] (Max 30/90 carac.).
    6. Pop up: [TÍTULO] | [CUERPO] | [CTA].

    Genera exactamente 3 variaciones por cada una de estas plataformas: ${params.platforms.join(", ")}.
    V1: Beneficio Directo.
    V2: Curiosidad/Storytelling.
    V3: Urgencia/Conversión.

    Responde estrictamente en formato JSON con la siguiente estructura:
    {
      "variations": [
        {
          "id": "string",
          "platform": "string",
          "type": "Beneficio" | "Curiosidad" | "Urgencia",
          "content": "string",
          "charCount": number,
          "score": number
        }
      ]
    }
  `;

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Eres un redactor creativo experto en estrategia de marca y marketing digital. Responde siempre en JSON.",
        },
        { role: "user", content: prompt },
      ],
      stream: true,
      response_format: { type: "json_object" },
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        onChunk(content);
      }
    }
  } catch (error: any) {
    console.error("OpenAI Stream Error:", error);
    throw error;
  }
};
