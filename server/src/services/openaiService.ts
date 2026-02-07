import OpenAI from "openai";
import { CopyParameters, GenerationResponse, CopyVariation } from "../../types";

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
    1. Email: Estructura [ASUNTO] - [HEADER] - [BODY] - [CTA].
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
  } catch (error) {
    console.error("Error in OpenAI Service:", error);
    throw new Error("Error al generar contenido con el motor de OpenAI.");
  }
};
