import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { assertClientInWorkspace } from '../lib/tenancy.js';
import { serverAIConfig, createAIClient, resolveModel, jsonObjectFormat, stripJsonFence, TIEMPOS, chatCompletionConRetry } from '../services/aiClient.js';
import { prisma } from '../lib/prisma.js';
import { decryptWorkspaceApiKey } from '../lib/workspaceSecret.js';

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
    // Sin esta guarda, cualquiera podía refinar contra el clientId de otro
    // tenant y gastar con la API key de ese workspace.
    const client = await assertClientInWorkspace(req.tenant!, clientId);

    let aiConfig = serverAIConfig();

    const workspace = await prisma.workspace.findUnique({ where: { id: client.workspaceId } });
    if (workspace?.aiApiKey && workspace?.aiProvider) {
      aiConfig = {
        provider: workspace.aiProvider as any,
        apiKey: decryptWorkspaceApiKey(workspace.id, workspace.aiApiKey),
        model: workspace.aiModel || undefined,
      };
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

    // Sin reintento, un 503 pasajero le hace perder al creativo el trabajo de
    // toda la tanda de refinamiento.
    const response = await chatCompletionConRetry(
      aiClient,
      {
        model: writerModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: jsonObjectFormat(aiClient),
        temperature: 0.7,
      },
      { etapa: 'refine', timeoutMs: TIEMPOS.llamada.refine }
    );

    const parsed = JSON.parse(stripJsonFence(response.choices[0].message.content || ''));
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
    handleTenantError(error, res, 'AI refinement failed');
  }
}
