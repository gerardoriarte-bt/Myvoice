
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { generateCopyWithOpenAI, streamGenerateCopyWithOpenAI, generateForChannel, buildBrief } from '../services/openaiService.js';
import { serverAIConfig, WorkspaceAIConfig, createAIClient, resolveModel } from '../services/aiClient.js';
import { UsageEntry, aggregateUsage } from '../services/pricing.js';
import { prisma } from '../lib/prisma.js';
import { getChannelSpec } from '../channels/registry.js';

const resolveWorkspaceAIConfig = async (workspaceId?: string): Promise<WorkspaceAIConfig> => {
  if (workspaceId) {
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (ws?.aiApiKey && ws?.aiProvider) {
      return { provider: ws.aiProvider as any, apiKey: ws.aiApiKey, model: ws.aiModel || undefined };
    }
  }
  return serverAIConfig();
};

async function buildGenerationContext(dnaProfileId: string, user: any): Promise<{
  dnaProfile: any;
  client: any;
  generationParams: any;
}> {
  const dnaProfile = await prisma.contentDNAProfile.findUnique({
    where: { id: dnaProfileId },
    include: { client: true }
  });

  if (!dnaProfile) throw Object.assign(new Error('Perfil de ADN no encontrado'), { statusCode: 404 });

  if (dnaProfile.client.workspaceId && dnaProfile.client.workspaceId !== user?.workspaceId) {
    throw Object.assign(new Error('No tienes permiso para generar contenido de este workspace'), { statusCode: 403 });
  }

  if (user?.role === 'CLIENT' && user.clientId !== dnaProfile.clientId) {
    throw Object.assign(new Error('No tienes permiso para usar este perfil'), { statusCode: 403 });
  }

  const client = dnaProfile.client;

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

  return { dnaProfile, client, generationParams };
}

export const listGenerationHistory = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { clientId } = req.query;
  try {
    const logs = await prisma.generationLog.findMany({
      where: {
        ...(clientId ? { clientId: String(clientId) } : {}),
        client: {
          workspaceId: user?.workspaceId,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        clientId: true,
        dnaProfileId: true,
        platforms: true,
        funnelStage: true,
        spineJson: true,
        outputJson: true,
        createdAt: true,
      },
    });
    res.json(logs);
  } catch (error) {
    console.error('listGenerationHistory error:', error);
    res.status(500).json({ error: 'Error al cargar el historial' });
  }
};

export const generateCopy = async (req: AuthRequest, res: Response) => {
  const { dnaProfileId, params } = req.body;
  const user = req.user;

  try {
    const { dnaProfile, client, generationParams } = await buildGenerationContext(dnaProfileId, user);

    // Quota check
    if (client.quotaUsed >= client.quotaLimit) {
      return res.status(403).json({ error: 'CUOTA_AGOTADA: Esta marca ha alcanzado su límite de generaciones mensuales.' });
    }

    const mergedParams = { ...generationParams, ...params };
    const aiConfig = await resolveWorkspaceAIConfig(user?.workspaceId);
    const result = await generateCopyWithOpenAI(mergedParams, aiConfig);

    await prisma.client.update({
      where: { id: client.id },
      data: { quotaUsed: { increment: 1 } }
    });

    res.json(result);
  } catch (error: any) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("Generation Error:", error);
    res.status(500).json({ error: 'Error en la generación de contenido' });
  }
};

export const generateCopyStream = async (req: AuthRequest, res: Response) => {
  const { dnaProfileId, params } = req.body;
  const user = req.user;

  try {
    const { dnaProfile, client, generationParams } = await buildGenerationContext(dnaProfileId, user);

    // Quota Check
    if (client.quotaUsed >= client.quotaLimit) {
      return res.status(403).json({ error: 'CUOTA_AGOTADA: Esta marca ha alcanzado su límite de generaciones mensuales. Por favor contacta a soporte para ampliar el plan.' });
    }

    const mergedParams = { ...generationParams, ...params };

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Tap into the event stream to also collect for the audit log
    let capturedSpine: any = undefined;
    let capturedCoherence: any = undefined;
    let capturedUsage: any = undefined;
    const capturedVariations: any[] = [];

    const aiConfig = await resolveWorkspaceAIConfig(user?.workspaceId);

    await streamGenerateCopyWithOpenAI(mergedParams, aiConfig, (event) => {
      if (event.type === 'spine') capturedSpine = event.payload;
      else if (event.type === 'channel') capturedVariations.push(...event.payload.variations);
      else if (event.type === 'coherence') capturedCoherence = event.payload;
      else if (event.type === 'usage') capturedUsage = event.payload;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    res.write(`data: [DONE]\n\n`);
    res.end();

    // Record Generation Log with full output + coherence + usage
    await prisma.generationLog.create({
      data: {
        clientId: client.id,
        userId: user?.userId || 'system',
        dnaProfileId: dnaProfile.id,
        platforms: params.platforms,
        funnelStage: params.funnelStage || null,
        spineJson: capturedSpine || null,
        outputJson: { variations: capturedVariations, coherence: capturedCoherence, usage: capturedUsage } as any,
        promptTokens: capturedUsage?.promptTokens ?? null,
        completionTokens: capturedUsage?.completionTokens ?? null,
      }
    });

    // Increment Quota Used
    await prisma.client.update({
      where: { id: client.id },
      data: { quotaUsed: { increment: 1 } }
    });

  } catch (error: any) {
    if (error?.statusCode && !res.headersSent) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("Streaming Generation Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error en la generación de contenido' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Error en la generación' })}\n\n`);
      res.end();
    }
  }
};

export const regenerateChannel = async (req: AuthRequest, res: Response) => {
  const { dnaProfileId, platform, existingSpine, params } = req.body;
  const user = req.user;
  try {
    const ctx = await buildGenerationContext(dnaProfileId, user);
    const { client, generationParams } = ctx;

    if (client.quotaUsed >= client.quotaLimit) {
      return res.status(403).json({ error: 'CUOTA_AGOTADA' });
    }

    if (!existingSpine?.concept || !Array.isArray(existingSpine?.angles)) {
      return res.status(400).json({ error: 'existingSpine inválida: debe tener concept y angles' });
    }

    const spec = getChannelSpec(platform);
    if (!spec) return res.status(400).json({ error: 'Canal no soportado: ' + platform });

    const spine = existingSpine;
    const aiConfig = await resolveWorkspaceAIConfig(user?.workspaceId);
    const aiClientInstance = createAIClient(aiConfig);
    const writerModel = resolveModel(aiConfig, false);
    const miniModel = resolveModel(aiConfig, true);

    const brief = buildBrief({ ...generationParams, ...params }, spine);
    const usage: UsageEntry[] = [];
    const variations = await generateForChannel(spec, brief, aiClientInstance, writerModel, miniModel, usage);
    const usageTotal = aggregateUsage(usage);

    await prisma.client.update({
      where: { id: client.id },
      data: { quotaUsed: { increment: 1 } }
    });

    // Regeneration is a real spend — log it like a generation so cost reporting
    // isn't blind to it.
    await prisma.generationLog.create({
      data: {
        clientId: client.id,
        userId: user?.userId || 'system',
        dnaProfileId: ctx.dnaProfile.id,
        platforms: [platform],
        funnelStage: params?.funnelStage || null,
        spineJson: spine,
        outputJson: { variations, usage: usageTotal, regeneratedChannel: platform } as any,
        promptTokens: usageTotal.promptTokens,
        completionTokens: usageTotal.completionTokens,
      }
    });

    res.json({ platform, variations, usage: usageTotal });
  } catch (error: any) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('regenerateChannel error:', error);
    res.status(500).json({ error: error.message || 'Error regenerando canal' });
  }
};
