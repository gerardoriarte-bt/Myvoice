
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { generateCopyWithOpenAI, streamGenerateCopyWithOpenAI } from '../services/openaiService.js';
import { serverAIConfig, WorkspaceAIConfig } from '../services/aiClient.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const resolveWorkspaceAIConfig = async (workspaceId?: string): Promise<WorkspaceAIConfig> => {
  if (workspaceId) {
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (ws?.aiApiKey && ws?.aiProvider) {
      return { provider: ws.aiProvider as any, apiKey: ws.aiApiKey, model: ws.aiModel || undefined };
    }
  }
  return serverAIConfig();
};

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
    // 1. Validate if user has access to this DNA Profile/Client
    const dnaProfile = await prisma.contentDNAProfile.findUnique({
      where: { id: dnaProfileId },
      include: { client: true }
    });

    if (!dnaProfile) return res.status(404).json({ error: 'Perfil de ADN no encontrado' });

    // Multi-tenant check: User's workspace must match Client's workspace
    if (dnaProfile.client.workspaceId && dnaProfile.client.workspaceId !== user?.workspaceId) {
      return res.status(403).json({ error: 'No tienes permiso para generar contenido de este workspace' });
    }

    // Role check: If CLIENT, must match their clientId
    if (user?.role === 'CLIENT' && user.clientId !== dnaProfile.clientId) {
      return res.status(403).json({ error: 'No tienes permiso para usar este perfil' });
    }

    // 2. Generate copy using our service
    // Global DNA (Client) > Profile DNA (Brief)
    const client = dnaProfile.client;
    
    // Fetch approved variations for few-shot learning (Bucle de Feedback)
    const approvedVariations = await prisma.savedVariation.findMany({
      where: {
        clientId: client.id,
        isApproved: true
      },
      take: 5,
      orderBy: { savedAt: 'desc' }
    });

    const globalExamples = approvedVariations.map(v => ({ content: v.content }));
    const briefExamples = (dnaProfile.feedbackExamples as any[]) || [];
    const combinedExamples = [...globalExamples, ...briefExamples];

    const negatives = await prisma.negativeFeedback.findMany({
      where: { clientId: client.id },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
    const negativeExamples = negatives.map(n => ({ content: n.content, reason: n.reason }));

    const generationParams = {
      ...params,
      clientName: client.name,
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

    const aiConfig = await resolveWorkspaceAIConfig(user?.workspaceId);
    const result = await generateCopyWithOpenAI(generationParams, aiConfig);

    res.json(result);
  } catch (error) {
    console.error("Generation Error:", error);
    res.status(500).json({ error: 'Error en la generación de contenido' });
  }
};

export const generateCopyStream = async (req: AuthRequest, res: Response) => {
  const { dnaProfileId, params } = req.body;
  const user = req.user;

  try {
    const dnaProfile = await prisma.contentDNAProfile.findUnique({
      where: { id: dnaProfileId },
      include: { client: true }
    });

    if (!dnaProfile) return res.status(404).json({ error: 'Perfil de ADN no encontrado' });

    if (dnaProfile.client.workspaceId && dnaProfile.client.workspaceId !== user?.workspaceId) {
      return res.status(403).json({ error: 'No tienes permiso para generar contenido de este workspace' });
    }

    if (user?.role === 'CLIENT' && user.clientId !== dnaProfile.clientId) {
      return res.status(403).json({ error: 'No tienes permiso para usar este perfil' });
    }

    const client = dnaProfile.client;

    // 1. Quota Check
    if (client.quotaUsed >= client.quotaLimit) {
      return res.status(403).json({ error: 'CUOTA_AGOTADA: Esta marca ha alcanzado su límite de generaciones mensuales. Por favor contacta a soporte para ampliar el plan.' });
    }

    // Fetch approved variations for few-shot learning (Bucle de Feedback)
    const approvedVariations = await prisma.savedVariation.findMany({
      where: {
        clientId: client.id,
        isApproved: true
      },
      take: 5,
      orderBy: { savedAt: 'desc' }
    });

    const globalExamples = approvedVariations.map(v => ({ content: v.content }));
    const briefExamples = (dnaProfile.feedbackExamples as any[]) || [];
    const combinedExamples = [...globalExamples, ...briefExamples];

    const negatives = await prisma.negativeFeedback.findMany({
      where: { clientId: client.id },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
    const negativeExamples = negatives.map(n => ({ content: n.content, reason: n.reason }));

    const generationParams = {
      ...params,
      clientName: client.name,
      valueProposition: client.valueProposition || dnaProfile.valueProposition,
      brandVoiceGuidelines: client.brandVoiceGuidelines || dnaProfile.brandVoiceGuidelines,
      voice: client.voice || dnaProfile.voice,
      product: dnaProfile.product,
      targetAudience: dnaProfile.targetAudience,
      goal: dnaProfile.goal,
      primaryCTA: dnaProfile.primaryCTA,
      theme: dnaProfile.theme,
      keywords: [client.brandKeywords, dnaProfile.keywords].filter(Boolean).join(', '),
      prohibitions: [client.brandProhibitions, dnaProfile.prohibitions].filter(Boolean).join(', '),
      campaignConcept: dnaProfile.campaignConcept || '',
      brandFingerprint: client.brandFingerprint || null,
      feedbackExamples: combinedExamples,
      negativeExamples
    };

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

    await streamGenerateCopyWithOpenAI(generationParams, aiConfig, (event) => {
      if (event.type === 'spine') capturedSpine = event.payload;
      else if (event.type === 'channel') capturedVariations.push(...event.payload.variations);
      else if (event.type === 'coherence') capturedCoherence = event.payload;
      else if (event.type === 'usage') capturedUsage = event.payload;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    res.write(`data: [DONE]\n\n`);
    res.end();

    // 2. Record Generation Log with full output + coherence + usage
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

    // 3. Increment Quota Used
    await prisma.client.update({
      where: { id: client.id },
      data: { quotaUsed: { increment: 1 } }
    });

  } catch (error) {
    console.error("Streaming Generation Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error en la generación de contenido' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Error en la generación' })}\n\n`);
      res.end();
    }
  }
};
