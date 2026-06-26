import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { serverAIConfig, createAIClient, resolveModel } from '../services/aiClient.js';
import { prisma } from '../lib/prisma.js';

interface CopyVariation {
  id: string;
  platform: string;
  slot: string;
  type: string;
  content: string;
  charCount: number;
  variationIndex: number;
}

export async function refineVariations(req: AuthRequest, res: Response): Promise<void> {
  const { variations, instruction, clientId } = req.body as {
    variations: CopyVariation[];
    instruction: string;
    clientId: string;
  };

  if (!variations || !instruction || !clientId) {
    res.status(400).json({ error: 'Missing required parameters: variations, instruction, clientId' });
    return;
  }

  try {
    const client = await prisma.client.findUnique({ where: { id: clientId } });

    let aiConfig = serverAIConfig();

    if (client?.workspaceId) {
      const workspace = await prisma.workspace.findUnique({ where: { id: client.workspaceId } });
      if (workspace?.aiApiKey && workspace?.aiProvider) {
        aiConfig = {
          provider: workspace.aiProvider as any,
          apiKey: workspace.aiApiKey,
          model: workspace.aiModel || undefined,
        };
      }
    }

    const aiClient = createAIClient(aiConfig);
    const writerModel = resolveModel(aiConfig, false);

    const system =
      'Eres un editor experto de copy publicitario. Recibes variaciones de copy y una instrucción del creativo. Aplica la instrucción fielmente a TODAS las variaciones. Mantén la misma estructura JSON, plataformas y slots. Solo modifica el campo content y actualiza charCount con content.length. Responde SOLO con JSON en formato: {variations: [array con todas las variaciones modificadas]}';

    const user =
      'Instrucción de refinamiento: ' +
      instruction +
      '\n\nVariaciones actuales:\n' +
      JSON.stringify(variations, null, 2);

    const response = await (aiClient as any).chat.completions.create({
      model: writerModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    const aiVariations: CopyVariation[] = parsed.variations ?? [];

    const refined = variations.map((original, index) => {
      const updated = aiVariations[index];
      return {
        ...original,
        content: updated?.content ?? original.content,
        charCount: updated?.content != null ? updated.content.length : original.charCount,
      };
    });

    res.json({ variations: refined });
  } catch (error) {
    res.status(500).json({ error: 'AI refinement failed', details: (error as Error).message });
  }
}
