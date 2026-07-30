import { createAIClient, resolveModel, serverAIConfig, WorkspaceAIConfig, jsonObjectFormat, stripJsonFence, samplingParams, MAX_TOKENS } from "./aiClient.js";

export interface DeterministicStats {
  sampleSize: number;          // # de textos analizados
  totalChars: number;
  avgSentenceLength: number;   // palabras por oración
  sentenceLengthRange: [number, number];
  punctuationDensity: {
    exclamation: number;       // por 1000 chars
    question: number;
    dash: number;
    ellipsis: number;
  };
  emojiDensity: number;        // emojis por 100 chars
  uppercaseShouting: number;   // ratio de palabras EN MAYÚSCULAS de >=3 letras
}

export interface QualitativeFingerprint {
  archetype: string;           // 1 de 12 (Sabio, Rebelde, Cuidador, etc.)
  archetypeRationale: string;
  personaGramatical: string;   // "1ra plural / 2da informal / 3ra"
  toneSummary: string;         // 1-2 líneas concretas
  linguisticTics: string[];    // 3-5 tics observables
  favoriteWords: string[];     // 5-10 palabras o expresiones que la marca usa
  avoidWords: string[];        // 5-10 palabras que la marca explícitamente evita
}

export interface BrandFingerprint extends DeterministicStats, QualitativeFingerprint {
  generatedAt: string;
}

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/gu;

const computeStats = (texts: string[]): DeterministicStats => {
  const all = texts.join(" ");
  const sentences = all.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const wordCounts = sentences.map(s => s.split(/\s+/).filter(Boolean).length);

  const totalChars = all.length;
  const avgSentenceLength = wordCounts.length
    ? wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length
    : 0;

  const punct = (re: RegExp) => (all.match(re) || []).length;
  const per1000 = (n: number) => totalChars ? (n / totalChars) * 1000 : 0;

  const upperShoutMatches = all.match(/\b[A-ZÁÉÍÓÚÑ]{3,}\b/g) || [];
  const totalWords = all.split(/\s+/).filter(Boolean).length;

  return {
    sampleSize: texts.length,
    totalChars,
    avgSentenceLength: Number(avgSentenceLength.toFixed(1)),
    sentenceLengthRange: wordCounts.length
      ? [Math.min(...wordCounts), Math.max(...wordCounts)]
      : [0, 0],
    punctuationDensity: {
      exclamation: Number(per1000(punct(/!/g)).toFixed(2)),
      question: Number(per1000(punct(/\?/g)).toFixed(2)),
      dash: Number(per1000(punct(/—|--/g)).toFixed(2)),
      ellipsis: Number(per1000(punct(/\.{3}|…/g)).toFixed(2)),
    },
    emojiDensity: Number((totalChars ? ((all.match(EMOJI_RE) || []).length / totalChars) * 100 : 0).toFixed(2)),
    uppercaseShouting: Number((totalWords ? upperShoutMatches.length / totalWords : 0).toFixed(3)),
  };
};

const buildQualPrompt = (texts: string[], stats: DeterministicStats): string => `
Eres lingüista de marca. Analiza esta muestra de copy aprobado y devolvé el fingerprint cualitativo.

## MÉTRICAS DETERMINÍSTICAS YA CALCULADAS (usalas como contexto, no las recalcules)
- Muestra: ${stats.sampleSize} textos, ${stats.totalChars} caracteres
- Largo medio de oración: ${stats.avgSentenceLength} palabras (rango: ${stats.sentenceLengthRange.join("-")})
- Densidad de signos por 1000 chars — !: ${stats.punctuationDensity.exclamation} | ?: ${stats.punctuationDensity.question} | —: ${stats.punctuationDensity.dash} | …: ${stats.punctuationDensity.ellipsis}
- Densidad de emojis: ${stats.emojiDensity} por 100 chars
- Ratio de mayúsculas (énfasis): ${stats.uppercaseShouting}

## MUESTRA DE COPY
${texts.map((t, i) => `[${i + 1}] "${t.replace(/"/g, '\\"')}"`).join("\n")}

## DEVOLVÉ JSON con:
- "archetype": 1 de los 12 arquetipos clásicos (Sabio, Inocente, Explorador, Rebelde, Mago, Héroe, Amante, Bufón, Hombre Común, Cuidador, Gobernante, Creador). Elegí EL que mejor describe esta marca según el copy.
- "archetypeRationale": 1 línea explicando por qué — citando un ejemplo concreto del copy.
- "personaGramatical": qué persona usa la marca ("1ra plural — 'creemos', 'hicimos'", "2da informal — tú/usted según marca", "3ra omnisciente", o "mixta — describir cuál mezcla").
- "toneSummary": 1-2 líneas describiendo el tono de manera CONCRETA (no "cercano y profesional"). Ej: "ritmo entrecortado, frases de 5-7 palabras, repetición intencional, tendencia a la confesión negativa".
- "linguisticTics": array de 3-5 tics OBSERVABLES en el copy. Ej: "abre con negación ('No inventamos…')", "usa repetición rítmica ('Hoy. Hoy.')", "termina con preguntas retóricas". Citá ejemplos.
- "favoriteWords": array de 5-10 palabras/expresiones que la marca usa repetidamente (no genéricas — específicas).
- "avoidWords": array de 5-10 palabras que el copy EVITA explícitamente (deducilo por contraste con el rubro — qué dirían los competidores que esta marca no dice).

Formato:
{
  "archetype": "string",
  "archetypeRationale": "string",
  "personaGramatical": "string",
  "toneSummary": "string",
  "linguisticTics": ["string"],
  "favoriteWords": ["string"],
  "avoidWords": ["string"]
}
`.trim();

export const computeBrandFingerprint = async (
  texts: string[],
  aiConfig?: WorkspaceAIConfig
): Promise<BrandFingerprint> => {
  const cleaned = texts.map(t => (t || "").trim()).filter(Boolean);
  if (cleaned.length < 3) {
    throw new Error("Se necesitan al menos 3 ejemplos de copy aprobado para calcular el fingerprint.");
  }

  const stats = computeStats(cleaned);
  const config = aiConfig || serverAIConfig();
  const openai = createAIClient(config);
  const model = resolveModel(config, false);

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "Eres lingüista de marca. Tu output siempre es JSON válido." },
      { role: "user", content: buildQualPrompt(cleaned, stats) },
    ],
    response_format: jsonObjectFormat(openai),
    max_tokens: MAX_TOKENS.fingerprint,
    ...samplingParams(model, 0.3),
  });

  const raw = response.choices[0].message.content;
  if (!raw) throw new Error("La IA devolvió respuesta vacía.");
  const qual = JSON.parse(stripJsonFence(raw)) as QualitativeFingerprint;

  return {
    ...stats,
    archetype: qual.archetype || "—",
    archetypeRationale: qual.archetypeRationale || "",
    personaGramatical: qual.personaGramatical || "",
    toneSummary: qual.toneSummary || "",
    linguisticTics: Array.isArray(qual.linguisticTics) ? qual.linguisticTics : [],
    favoriteWords: Array.isArray(qual.favoriteWords) ? qual.favoriteWords : [],
    avoidWords: Array.isArray(qual.avoidWords) ? qual.avoidWords : [],
    generatedAt: new Date().toISOString(),
  };
};

export const renderFingerprintForPrompt = (fp: BrandFingerprint): string => {
  if (!fp) return "";
  return `## VOICE FINGERPRINT (señales medibles de la marca)
- Arquetipo: ${fp.archetype}${fp.archetypeRationale ? ` — ${fp.archetypeRationale}` : ""}
- Persona gramatical: ${fp.personaGramatical}
- Tono observado: ${fp.toneSummary}
- Largo medio de oración: ${fp.avgSentenceLength} palabras (rango ${fp.sentenceLengthRange.join("-")})
- Signos por 1000 chars — !: ${fp.punctuationDensity.exclamation} · ?: ${fp.punctuationDensity.question} · —: ${fp.punctuationDensity.dash} · …: ${fp.punctuationDensity.ellipsis}
- Densidad de emojis: ${fp.emojiDensity}/100 chars
${fp.linguisticTics.length ? `- Tics lingüísticos a reproducir:\n${fp.linguisticTics.map(t => `  · ${t}`).join("\n")}` : ""}
${fp.favoriteWords.length ? `- Palabras/expresiones favorecidas: ${fp.favoriteWords.join(", ")}` : ""}
${fp.avoidWords.length ? `- Palabras a evitar (estilo): ${fp.avoidWords.join(", ")}` : ""}

REGLA: tu output debe respetar estas señales. Si tu draft tiene oraciones de 25 palabras y la marca usa 7, recortá. Si te falta el tic "${fp.linguisticTics[0] || "(ninguno)"}" en al menos una variación, agregalo.`;
};
