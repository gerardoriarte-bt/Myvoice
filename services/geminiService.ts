
import { GoogleGenAI, Type } from "@google/genai";
import { CopyParameters, Platform, GenerationResponse } from "../types";

export const generateCopyVariations = async (params: CopyParameters): Promise<GenerationResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const feedbackBlock = params.feedbackExamples && params.feedbackExamples.length > 0
    ? `
    HISTÓRICO DE ÉXITO (USA ESTOS EJEMPLOS COMO GUÍA DE ESTILO Y EFECTIVIDAD):
    ${params.feedbackExamples.map(ex => `- [${ex.platform}]: "${ex.content}"`).join('\n')}
    `
    : '';

  const prompt = `
    Actúa como "My Voice", el motor de copy de Grupo LoBueno. 
    Tu misión es generar contenido para "${params.clientName}" basándote EXCLUSIVAMENTE en su ADN Estratégico. 

    ADN ESTRATÉGICO (PROHIBIDO SALIRSE DE ESTOS PARÁMETROS):
    - Propuesta de Valor: ${params.valueProposition}
    - Guías de Voz Específicas: ${params.brandVoiceGuidelines}
    - Tono General: ${params.voice}
    - Producto: ${params.product}
    - Público: ${params.targetAudience}
    - Objetivo: ${params.goal}
    - CTA Principal: ${params.primaryCTA}
    - Mensaje Central: ${params.theme}
    - Keywords: ${params.keywords}

    ${feedbackBlock}

    REGLAS DE FORMATO (STRICT):
    1. Email: Estructura de 4 bloques separados por guiones: [ASUNTO] - [HEADER] - [BODY] - [CTA]. 
    2. Push: [Título] | [Cuerpo] (Max 45/120 carac.).
    3. WhatsApp: Negritas para énfasis, max 2 emojis, CTA basado en "${params.primaryCTA}".
    4. Instagram: Hook en línea 1, 3-5 hashtags, Idea visual en [IDEA VISUAL: descripción].
    5. Google Ads: [Título] | [Descripción] (Max 30/90 carac.).
    6. Pop up: [TÍTULO] | [CUERPO] | [CTA].

    Genera 3 variaciones por plataforma (${params.platforms.join(', ')}):
    V1: Enfoque en Beneficio Directo (Propuesta de Valor).
    V2: Enfoque en Curiosidad/Storytelling.
    V3: Enfoque en Urgencia/Conversión.

    Busca tendencias actuales en Colombia con Google Search para que el copy sea relevante hoy, pero mantén la fidelidad total al ADN.
    Responde solo en JSON.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          variations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                platform: { type: Type.STRING },
                type: { type: Type.STRING },
                content: { type: Type.STRING },
                charCount: { type: Type.NUMBER }
              },
              required: ["id", "platform", "type", "content", "charCount"]
            }
          }
        },
        required: ["variations"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{"variations": []}');
  } catch (error) {
    console.error("Error parsing Gemini response", error);
    throw new Error("Error en el motor estratégico.");
  }
};
