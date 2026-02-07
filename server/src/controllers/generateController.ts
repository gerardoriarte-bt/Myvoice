
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { generateCopyWithOpenAI } from '../services/openaiService';
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
    const generationParams = {
      ...params,
      clientName: dnaProfile.client.name,
      valueProposition: dnaProfile.valueProposition,
      brandVoiceGuidelines: dnaProfile.brandVoiceGuidelines,
      voice: dnaProfile.voice,
      product: dnaProfile.product,
      targetAudience: dnaProfile.targetAudience,
      goal: dnaProfile.goal,
      primaryCTA: dnaProfile.primaryCTA,
      theme: dnaProfile.theme,
      keywords: dnaProfile.keywords,
      feedbackExamples: dnaProfile.feedbackExamples as any[] // Needs type cast or DB mapping
    };

    const result = await generateCopyWithOpenAI(generationParams);

    res.json(result);
  } catch (error) {
    console.error("Generation Error:", error);
    res.status(500).json({ error: 'Error en la generación de contenido' });
  }
};
