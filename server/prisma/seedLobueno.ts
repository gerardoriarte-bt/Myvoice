/**
 * Seed del cliente mockup LoBueno.
 *
 *   npm run seed:lobueno
 *
 * Idempotente: se puede correr varias veces sin duplicar. Busca el cliente por
 * nombre dentro del workspace y reemplaza sus perfiles de ADN, variaciones
 * aprobadas y feedback negativo en cada corrida.
 *
 * La definición de marca vive en shared/lobuenoBrand.ts, compartida con la demo
 * offline del frontend (services/mockGeneration.ts) para que el copy sea el
 * mismo en ambos modos.
 */
import { PrismaClient } from '@prisma/client';
import {
  LOBUENO_BRAND,
  LOBUENO_DNA_PROFILES,
  LOBUENO_APPROVED_EXAMPLES,
  LOBUENO_NEGATIVE_EXAMPLES,
  LOBUENO_CHANNEL_COPY,
} from '../../shared/lobuenoBrand.js';

const prisma = new PrismaClient();

async function main() {
  // 1. Workspace ------------------------------------------------------------
  // Reutiliza el primero que exista; si la base está vacía, crea el de LoBueno.
  let workspace = await prisma.workspace.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: { name: 'LoBueno', slug: 'lobueno', plan: 'agency' },
    });
    console.log(`Workspace creado: ${workspace.name} (${workspace.id})`);
  } else {
    console.log(`Usando workspace existente: ${workspace.name} (${workspace.id})`);
  }

  // 2. Cliente --------------------------------------------------------------
  const brandData = {
    industry: LOBUENO_BRAND.industry,
    voice: LOBUENO_BRAND.voice,
    valueProposition: LOBUENO_BRAND.valueProposition,
    brandVoiceGuidelines: LOBUENO_BRAND.brandVoiceGuidelines,
    brandKeywords: LOBUENO_BRAND.brandKeywords,
    brandProhibitions: LOBUENO_BRAND.brandProhibitions,
    brandFingerprint: LOBUENO_BRAND.brandFingerprint as any,
    brandFingerprintAt: new Date(LOBUENO_BRAND.brandFingerprint.generatedAt),
    quotaLimit: LOBUENO_BRAND.quotaLimit,
    workspaceId: workspace.id,
  };

  const existing = await prisma.client.findFirst({
    where: { name: LOBUENO_BRAND.name, workspaceId: workspace.id },
  });

  const client = existing
    ? await prisma.client.update({ where: { id: existing.id }, data: brandData })
    : await prisma.client.create({ data: { name: LOBUENO_BRAND.name, ...brandData } });

  console.log(`${existing ? 'Actualizado' : 'Creado'} cliente: ${client.name} (${client.id})`);

  // 3. Perfiles de ADN ------------------------------------------------------
  // Los briefs no tienen clave natural, así que se reemplazan completos.
  // GenerationLog referencia dnaProfileId sin FK, por eso este borrado es seguro.
  await prisma.contentDNAProfile.deleteMany({ where: { clientId: client.id } });
  for (const p of LOBUENO_DNA_PROFILES) {
    await prisma.contentDNAProfile.create({
      data: {
        clientId: client.id,
        name: p.name,
        voice: p.voice,
        goal: p.goal,
        product: p.product,
        targetAudience: p.targetAudience,
        theme: p.theme,
        keywords: p.keywords,
        brandVoiceGuidelines: p.brandVoiceGuidelines,
        valueProposition: p.valueProposition,
        primaryCTA: p.primaryCTA,
        prohibitions: p.prohibitions,
        campaignConcept: p.campaignConcept,
        feedbackExamples: LOBUENO_APPROVED_EXAMPLES.filter(e => e.platform).map(e => ({
          platform: e.platform,
          content: e.content,
        })) as any,
      },
    });
  }
  console.log(`  ${LOBUENO_DNA_PROFILES.length} perfiles de ADN`);

  // 4. Variaciones aprobadas (few-shot del bucle de feedback) ---------------
  // buildGenerationContext lee las 5 más recientes con isApproved: true.
  await prisma.savedVariation.deleteMany({ where: { clientId: client.id } });
  for (const ex of LOBUENO_APPROVED_EXAMPLES) {
    await prisma.savedVariation.create({
      data: {
        clientId: client.id,
        platform: ex.platform,
        type: ex.type,
        content: ex.content,
        charCount: ex.content.length,
        tags: ex.tags,
        isApproved: true,
        approvalNote: ex.approvalNote,
      },
    });
  }
  console.log(`  ${LOBUENO_APPROVED_EXAMPLES.length} variaciones aprobadas`);

  // 5. Feedback negativo (anti-ejemplos) ------------------------------------
  await prisma.negativeFeedback.deleteMany({ where: { clientId: client.id } });
  for (const n of LOBUENO_NEGATIVE_EXAMPLES) {
    await prisma.negativeFeedback.create({
      data: { clientId: client.id, platform: n.platform, content: n.content, reason: n.reason },
    });
  }
  console.log(`  ${LOBUENO_NEGATIVE_EXAMPLES.length} anti-ejemplos`);

  // 6. Preset con los canales cubiertos por el fixture -----------------------
  const platforms = Object.keys(LOBUENO_CHANNEL_COPY);
  await prisma.generationPreset.deleteMany({
    where: { workspaceId: workspace.id, name: 'LoBueno — Lanzamiento My Voice' },
  });
  await prisma.generationPreset.create({
    data: {
      name: 'LoBueno — Lanzamiento My Voice',
      workspaceId: workspace.id,
      clientId: client.id,
      parameters: { platforms, funnelStage: 'CONVERSION' } as any,
    },
  });
  console.log(`  1 preset (${platforms.length} canales)`);

  console.log(`\nListo. Genere con el brief "${LOBUENO_DNA_PROFILES[0].name}".`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async e => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
