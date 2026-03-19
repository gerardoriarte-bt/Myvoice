
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { generateCopyWithOpenAI, streamGenerateCopyWithOpenAI } from '../services/openaiService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // Role check: If CLIENT, must match their clientId
    if (user?.role === 'CLIENT' && user.clientId !== dnaProfile.clientId) {
      return res.status(403).json({ error: 'No tienes permiso para usar este perfil' });
    }

    // 2. Generate copy using our service
    // Global DNA (Client) > Profile DNA (Brief)
    const client = dnaProfile.client;
    
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
      keywords: dnaProfile.keywords,
      feedbackExamples: (dnaProfile as any).feedbackExamples as any[] 
    };

    const result = await generateCopyWithOpenAI(generationParams);

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

    if (user?.role === 'CLIENT' && user.clientId !== dnaProfile.clientId) {
      return res.status(403).json({ error: 'No tienes permiso para usar este perfil' });
    }

    const client = dnaProfile.client;

    // 1. Quota Check
    if (client.quotaUsed >= client.quotaLimit) {
      return res.status(403).json({ error: 'CUOTA_AGOTADA: Esta marca ha alcanzado su límite de generaciones mensuales. Por favor contacta a soporte para ampliar el plan.' });
    }

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
      keywords: dnaProfile.keywords,
      feedbackExamples: (dnaProfile as any).feedbackExamples as any[] 
    };

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await streamGenerateCopyWithOpenAI(generationParams, (chunk) => {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    });

    res.write(`data: [DONE]\n\n`);
    res.end();

    // 2. Record Generation Log
    await prisma.generationLog.create({
      data: {
        clientId: client.id,
        userId: user?.userId || 'system',
        dnaProfileId: dnaProfile.id,
        platforms: params.platforms
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
