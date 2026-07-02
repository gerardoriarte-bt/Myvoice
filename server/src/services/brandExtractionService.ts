// pdf-parse v2 uses a class-based API: PDFParse({ data }) + .getText()
import { PDFParse } from "pdf-parse";
import { createAIClient, resolveModel, serverAIConfig, WorkspaceAIConfig, jsonObjectFormat, stripJsonFence } from "./aiClient.js";

export interface ExtractedBrand {
  voice: string;
  valueProposition: string;
  brandVoiceGuidelines: string;
  keywords: string;
  prohibitions: string;
  summary: string;
}

const MAX_CHARS = 18000; // ~5k tokens, suficiente para guidelines típicos

const buildExtractionPrompt = (text: string, clientName: string, industry: string) => `
Eres un analista de marca. Recibes el documento de "Brand Guidelines" / "Manual de Marca" de ${clientName} (rubro: ${industry}) y debes extraer SOLO la información que sirve para generar copy alineado.

NO inventes nada. Si un campo no está claro en el documento, devolvé string vacío. Es preferible vacío a especulativo.

## DOCUMENTO
${text.slice(0, MAX_CHARS)}
${text.length > MAX_CHARS ? "\n[...documento truncado por longitud]" : ""}

## CAMPOS A EXTRAER
Devolvé un JSON con:
- "summary": resumen ejecutivo del posicionamiento de marca según el documento (máx. 3 líneas, en español).
- "voice": el tono/voz de marca expresado en el documento. Frase corta y específica (ej. "Cercano, irreverente, naturalista"). Si el manual usa un arquetipo (Sabio, Rebelde, etc.) inclúyelo.
- "valueProposition": la propuesta de valor diferenciadora — qué resuelve la marca y por qué se elige sobre alternativas. Una o dos líneas.
- "brandVoiceGuidelines": reglas concretas de redacción extraídas del manual: persona gramatical, longitud de frase preferida, uso de emojis/signos, tics lingüísticos, registros prohibidos. Lista en bullets dentro de un string (separados por \\n).
- "keywords": palabras y frases que la marca SÍ usa frecuentemente o quiere usar (separadas por coma).
- "prohibitions": palabras, frases o conceptos que la marca explícitamente EVITA (separadas por coma). Si el manual menciona "evitar", "no usar", "prohibido", capturalo aquí.

Formato:
{
  "summary": "string",
  "voice": "string",
  "valueProposition": "string",
  "brandVoiceGuidelines": "string",
  "keywords": "string",
  "prohibitions": "string"
}
`.trim();

export const extractBrandFromPdf = async (
  buffer: Buffer,
  clientName: string,
  industry: string,
  aiConfig?: WorkspaceAIConfig
): Promise<ExtractedBrand> => {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const parsed = await parser.getText();
  const text = (parsed.text || "").trim();

  if (!text) {
    throw new Error("No se pudo extraer texto del PDF (¿es un PDF escaneado sin OCR?).");
  }

  const config = aiConfig || serverAIConfig();
  const openai = createAIClient(config);
  const model = resolveModel(config, false);

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "Eres un analista de marca. Extraes información estructurada de manuales de marca. Respondés SOLO en JSON válido." },
      { role: "user", content: buildExtractionPrompt(text, clientName, industry) },
    ],
    response_format: jsonObjectFormat(openai),
    temperature: 0.2,
  });

  const raw = response.choices[0].message.content;
  if (!raw) throw new Error("La IA devolvió respuesta vacía.");

  const parsedJson = JSON.parse(stripJsonFence(raw)) as Partial<ExtractedBrand>;
  return {
    summary: parsedJson.summary || "",
    voice: parsedJson.voice || "",
    valueProposition: parsedJson.valueProposition || "",
    brandVoiceGuidelines: parsedJson.brandVoiceGuidelines || "",
    keywords: parsedJson.keywords || "",
    prohibitions: parsedJson.prohibitions || "",
  };
};
