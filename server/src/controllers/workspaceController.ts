import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';
import { createAIClient, WorkspaceAIConfig } from '../services/aiClient.js';

const prisma = new PrismaClient();

export const getWorkspaceAIConfig = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user?.workspaceId) return res.status(400).json({ error: 'Sin workspace' });

  try {
    const ws = await prisma.workspace.findUnique({
      where: { id: user.workspaceId },
      select: { aiProvider: true, aiModel: true, aiApiKey: true },
    });
    if (!ws) return res.status(404).json({ error: 'Workspace no encontrado' });

    res.json({
      aiProvider: ws.aiProvider || null,
      aiModel: ws.aiModel || null,
      // Never return the raw key — just signal if it's set
      hasApiKey: Boolean(ws.aiApiKey),
    });
  } catch (error) {
    console.error('getWorkspaceAIConfig error:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

export const updateWorkspaceAIConfig = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user?.workspaceId) return res.status(400).json({ error: 'Sin workspace' });

  const { aiProvider, aiApiKey, aiModel } = req.body as {
    aiProvider?: string;
    aiApiKey?: string;
    aiModel?: string;
  };

  if (aiProvider && !['openai', 'anthropic', 'gemini'].includes(aiProvider)) {
    return res.status(400).json({ error: 'Provider inválido. Usá: openai, anthropic, gemini' });
  }

  // Validate the key works before saving (quick smoke test)
  if (aiApiKey && aiProvider) {
    try {
      const testConfig: WorkspaceAIConfig = { provider: aiProvider as any, apiKey: aiApiKey };
      const testClient = createAIClient(testConfig);
      await testClient.models.list();
    } catch (err: any) {
      return res.status(400).json({
        error: `API key inválida o sin acceso: ${err?.message || 'error desconocido'}`,
      });
    }
  }

  try {
    const data: Record<string, any> = {};
    if (aiProvider !== undefined) data.aiProvider = aiProvider || null;
    if (aiApiKey !== undefined) data.aiApiKey = aiApiKey || null;
    if (aiModel !== undefined) data.aiModel = aiModel || null;

    await prisma.workspace.update({ where: { id: user.workspaceId }, data });
    res.json({ ok: true });
  } catch (error) {
    console.error('updateWorkspaceAIConfig error:', error);
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
};
