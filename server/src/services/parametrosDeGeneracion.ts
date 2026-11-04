import { prisma } from '../lib/prisma.js';
import { resolverAdn } from '../comun/adn/resolverAdn.js';

/**
 * Lo que recibe el motor para una generación: el ADN de la marca, el brief y
 * los ejemplos aprobados y rechazados. Un solo lugar, porque lo arman la
 * generación (generateController) y `npm run calidad:caso`, que exporta un caso
 * real para medir: si los dos lo armaran por su lado, se mediría otra cosa.
 *
 * El ADN de la marca llega resuelto con el de su madre (`resolverAdn`, decisión 16): una submarca
 * suma las prohibiciones y keywords de la madre y hereda lo que no tiene propio. Con la versión que
 * fijó la campaña; sin ella (todas las de v1), la vigente. Devuelve también la versión, para que la
 * generación quede registrada con el ADN que usó.
 */
export const parametrosDeGeneracion = async (
  dnaProfile: any,
  client: any
): Promise<{ params: any; adnVersion: number | null }> => {
  const campana = await prisma.project.findUnique({
    where: { dnaProfileId: dnaProfile.id },
    select: { adnVersion: true },
  });
  const adn = await resolverAdn(client.id, { version: campana?.adnVersion ?? null });
  const { voz, propuestaDeValor, guias, keywords, prohibiciones } = adn.secciones;

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
    // El ADN de la marca manda; el del brief solo entra si la marca no tiene (decisión 14).
    valueProposition: propuestaDeValor.texto || dnaProfile.valueProposition,
    brandVoiceGuidelines: guias.texto || dnaProfile.brandVoiceGuidelines,
    voice: voz.texto || dnaProfile.voice,
    // Brief Specifics
    product: dnaProfile.product,
    targetAudience: dnaProfile.targetAudience,
    goal: dnaProfile.goal,
    primaryCTA: dnaProfile.primaryCTA,
    theme: dnaProfile.theme,
    // Las de la marca (con las de la madre) más las del brief.
    keywords: [keywords.texto, dnaProfile.keywords].filter(Boolean).join(', '),
    prohibitions: [prohibiciones.texto, dnaProfile.prohibitions].filter(Boolean).join(', '),
    campaignConcept: dnaProfile.campaignConcept || '',
    brandFingerprint: client.brandFingerprint || null,
    feedbackExamples: combinedExamples,
    negativeExamples
  };

  return { params: generationParams, adnVersion: adn.version };
};
