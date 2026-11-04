import { prisma } from '../lib/prisma.js';

/**
 * Lo que recibe el motor para una generación: el ADN de la marca, el brief y
 * los ejemplos aprobados y rechazados. Un solo lugar, porque lo arman la
 * generación (generateController) y `npm run calidad:caso`, que exporta un caso
 * real para medir: si los dos lo armaran por su lado, se mediría otra cosa.
 */
export const parametrosDeGeneracion = async (dnaProfile: any, client: any) => {
  // Fetch approved variations for few-shot learning (Bucle de Feedback)
  const approvedVariations = await prisma.savedVariation.findMany({
    where: { clientId: client.id, isApproved: true },
    take: 5,
    orderBy: { savedAt: 'desc' }
  });

  const globalExamples = approvedVariations.map((v: any) => ({ content: v.content }));
  const briefExamples = (dnaProfile.feedbackExamples as any[]) || [];
  const combinedExamples = [...globalExamples, ...briefExamples];

  const negatives = await prisma.negativeFeedback.findMany({
    where: { clientId: client.id },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  const negativeExamples = negatives.map((n: any) => ({ content: n.content, reason: n.reason }));

  const generationParams = {
    clientName: client.name,
    clientIndustry: client.industry,
    // Priority: Client Global DNA > Brief DNA (Fallback)
    valueProposition: client.valueProposition || dnaProfile.valueProposition,
    brandVoiceGuidelines: client.brandVoiceGuidelines || dnaProfile.brandVoiceGuidelines,
    voice: client.voice || dnaProfile.voice,
    // Brief Specifics
    product: dnaProfile.product,
    targetAudience: dnaProfile.targetAudience,
    goal: dnaProfile.goal,
    primaryCTA: dnaProfile.primaryCTA,
    theme: dnaProfile.theme,
    // Merge brand-level (from PDF extraction) with campaign-level
    keywords: [client.brandKeywords, dnaProfile.keywords].filter(Boolean).join(', '),
    prohibitions: [client.brandProhibitions, dnaProfile.prohibitions].filter(Boolean).join(', '),
    campaignConcept: dnaProfile.campaignConcept || '',
    brandFingerprint: client.brandFingerprint || null,
    feedbackExamples: combinedExamples,
    negativeExamples
  };

  return generationParams;
};
