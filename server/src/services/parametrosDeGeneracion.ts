import { prisma } from '../lib/prisma.js';
import { resolverAdn } from '../comun/adn/resolverAdn.js';
import { AudienciaGuardada, elementosDe } from '../comun/adn/secciones.js';

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
/** «Familias que viajan por carretera: quién es…; qué le importa…» — una línea por audiencia. */
const audienciasEnTexto = (lista: AudienciaGuardada[]): string =>
  lista
    .map(a => {
      const d: Partial<AudienciaGuardada['descriptores']> = a.descriptores ?? {};
      const partes = [
        d.quienEs && `quién es: ${d.quienEs}`,
        d.queLeImporta && `qué le importa: ${d.queLeImporta}`,
        d.queLaFrena && `qué la frena: ${d.queLaFrena}`,
        d.comoHabla && `cómo habla: ${d.comoHabla}`,
      ].filter(Boolean);
      return partes.length ? `${a.nombre} (${partes.join('; ')})` : a.nombre;
    })
    .join(' · ');

export const parametrosDeGeneracion = async (
  dnaProfile: any,
  client: any
): Promise<{ params: any; adnVersion: number | null }> => {
  const campana = await prisma.project.findUnique({
    where: { dnaProfileId: dnaProfile.id },
    select: { adnVersion: true },
  });
  const adn = await resolverAdn(client.id, { version: campana?.adnVersion ?? null });
  const { voz, propuestaDeValor, reglasDeEstilo, keywords, prohibiciones, productos, audiencias, asiSuena, frasesIntocables } =
    adn.secciones;
  // El tratamiento es de la marca; una submarca sin el suyo toma el de su madre confirmada.
  const conMadre = await prisma.client.findUnique({
    where: { id: client.id },
    select: { tratamiento: true, marcaMadre: { select: { tratamiento: true, adnConfirmadoEn: true } } },
  });
  const tratamiento =
    conMadre?.tratamiento ?? (conMadre?.marcaMadre?.adnConfirmadoEn ? conMadre.marcaMadre.tratamiento : null) ?? null;

  // Así suena (docs/plan-adn-2.md, F4): los ejemplos que la marca eligió. Sin ninguno, la regla de antes:
  // los 5 últimos textos aprobados, elegidos por fecha.
  const elegidos = asiSuena.contenido.ejemplos ?? [];
  const globalExamples = elegidos.length
    ? elegidos.map(e => ({ content: e.texto, platform: e.platform }))
    : (
        await prisma.savedVariation.findMany({
          where: { clientId: client.id, isApproved: true },
          take: 5,
          orderBy: { savedAt: 'desc' },
        })
      ).map((v: any) => ({ content: v.content }));
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
    // Las «guías de voz» son desde el ADN 2.0 las notas de reglas de estilo (docs/plan-adn-2.md).
    brandVoiceGuidelines: reglasDeEstilo.texto || dnaProfile.brandVoiceGuidelines,
    voice: voz.texto || dnaProfile.voice,
    // Brief Specifics
    product: dnaProfile.product,
    // La audiencia del brief manda (v1). Sin ella, las audiencias de la marca, con sus descriptores; en v2
    // la campaña las elige (F6).
    targetAudience: dnaProfile.targetAudience || audienciasEnTexto(audiencias.contenido.audiencias ?? []),
    goal: dnaProfile.goal,
    primaryCTA: dnaProfile.primaryCTA,
    theme: dnaProfile.theme,
    // Las de la marca (con las de la madre) más las del brief.
    keywords: [keywords.texto, dnaProfile.keywords].filter(Boolean).join(', '),
    prohibitions: [prohibiciones.texto, dnaProfile.prohibitions].filter(Boolean).join(', '),
    tratamiento,
    productos: productos.texto,
    frasesIntocables: elementosDe(frasesIntocables.texto, '\n'),
    reglasDeEstilo: reglasDeEstilo.contenido.reglas ?? {},
    campaignConcept: dnaProfile.campaignConcept || '',
    brandFingerprint: client.brandFingerprint || null,
    feedbackExamples: combinedExamples,
    negativeExamples
  };

  return { params: generationParams, adnVersion: adn.version };
};
