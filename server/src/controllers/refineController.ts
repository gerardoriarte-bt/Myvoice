import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { assertClientInWorkspace } from '../lib/tenancy.js';
import { serverAIConfig, createAIClient, resolveModel, jsonObjectFormat, stripJsonFence, TIEMPOS, chatCompletionConRetry, unirSignals } from '../services/aiClient.js';
import { createSemaphore } from '../services/openaiService.js';
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

/**
 * Antes se mandaba la generación entera en UNA llamada sin streaming y se le
 * pedía al modelo que devolviera todo el JSON reescrito. Con una generación
 * grande la respuesta tardaba más de 90 s: los tres intentos morían por
 * timeout y el nginx del host ya había devuelto 504 a los 60 s (16-sep-2026).
 * Ahora se refina por canal, en lotes chicos y en paralelo.
 */
const LOTE_MAX = 10;
const CONCURRENCIA = 5;
// Techo de toda la petición, por debajo de los 300 s de proxy_read_timeout de
// las dos capas de nginx: si algo se pasa, el creativo recibe un parcial en
// vez de un 504 sin cuerpo.
const PRESUPUESTO_TOTAL_MS = Number(process.env.AI_TIMEOUT_REFINE_TOTAL_MS) || 240_000;
// Un lote de ≤10 variaciones que no responde en 90 s no va a responder en el
// tercer intento: dos intentos y un techo por lote.
const INTENTOS_LOTE = 2;
const PRESUPUESTO_LOTE_MS = 150_000;

const SYSTEM =
  'Eres un editor experto de copy publicitario. Recibes variaciones de copy y una instrucción del creativo. ' +
  'Aplica la instrucción fielmente a TODAS las variaciones, respetando el canal y el slot de cada una. ' +
  'Responde SOLO con JSON en formato: {"variations": [{"i": <el mismo i que recibiste>, "content": "<texto refinado>"}]}, ' +
  'con exactamente un elemento por cada variación recibida.';

const armarLotes = (variations: CopyVariation[]): Array<{ platform: string; indices: number[] }> => {
  const porCanal = new Map<string, number[]>();
  variations.forEach((v, i) => {
    const clave = v.platform || 'Sin canal';
    porCanal.set(clave, [...(porCanal.get(clave) ?? []), i]);
  });
  const lotes: Array<{ platform: string; indices: number[] }> = [];
  for (const [platform, indices] of porCanal) {
    for (let k = 0; k < indices.length; k += LOTE_MAX) {
      lotes.push({ platform, indices: indices.slice(k, k + LOTE_MAX) });
    }
  }
  return lotes;
};

export async function refineVariations(req: AuthRequest, res: Response): Promise<void> {
  const { variations, instruction, clientId } = req.body as {
    variations: CopyVariation[];
    instruction: string;
    clientId: string;
  };

  if (!Array.isArray(variations) || variations.length === 0 || !instruction || !clientId) {
    res.status(400).json({ error: 'Missing required parameters: variations, instruction, clientId' });
    return;
  }

  // Si el creativo cierra la pestaña, los lotes encolados no llegan a llamar
  // al proveedor. 'close' también se emite al responder; `writableEnded` los
  // distingue.
  const abortoCliente = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) abortoCliente.abort();
  });
  const abortoPresupuesto = new AbortController();
  const temporizador = setTimeout(
    () => abortoPresupuesto.abort(new Error(`refine: presupuesto de ${PRESUPUESTO_TOTAL_MS} ms agotado`)),
    PRESUPUESTO_TOTAL_MS
  );
  const { señal, limpiar } = unirSignals(abortoCliente.signal, abortoPresupuesto.signal);

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
    const sem = createSemaphore(CONCURRENCIA);
    const t0 = Date.now();

    const contenidos = variations.map(v => v.content);
    const canalesFallidos = new Set<string>();
    let aplicadasTotal = 0;

    await Promise.all(armarLotes(variations).map(async lote => {
      await sem.acquire();
      try {
        const restante = PRESUPUESTO_TOTAL_MS - (Date.now() - t0);
        if (señal.aborted || restante <= 0) {
          canalesFallidos.add(lote.platform);
          return;
        }

        const payload = lote.indices.map(i => ({
          i,
          slot: variations[i].slot,
          type: variations[i].type,
          content: variations[i].content,
        }));
        const user =
          'Instrucción de refinamiento: ' + instruction +
          '\n\nCanal: ' + lote.platform +
          '\n\nVariaciones actuales:\n' + JSON.stringify(payload, null, 2);

        const response = await chatCompletionConRetry(
          aiClient,
          {
            model: writerModel,
            messages: [
              { role: 'system', content: SYSTEM },
              { role: 'user', content: user },
            ],
            response_format: jsonObjectFormat(aiClient),
            temperature: 0.7,
          },
          {
            etapa: `refine:${lote.platform}`,
            timeoutMs: TIEMPOS.llamada.refine,
            intentosMax: INTENTOS_LOTE,
            presupuestoMs: Math.min(PRESUPUESTO_LOTE_MS, restante),
            signal: señal,
          }
        );

        const parsed = JSON.parse(stripJsonFence(response.choices[0].message.content || ''));
        const devueltas: Array<{ i?: unknown; content?: unknown }> = Array.isArray(parsed?.variations) ? parsed.variations : [];
        const esperados = new Set(lote.indices);
        const aplicadas = new Set<number>();
        for (const d of devueltas) {
          // Se casa por `i`, no por posición: un elemento omitido o reordenado
          // ya no le pega el texto de una variación a otra.
          if (typeof d?.i === 'number' && esperados.has(d.i) && typeof d.content === 'string' && d.content.trim()) {
            contenidos[d.i] = d.content;
            aplicadas.add(d.i);
          }
        }
        aplicadasTotal += aplicadas.size;
        if (aplicadas.size < lote.indices.length) canalesFallidos.add(lote.platform);
      } catch (error) {
        console.error(`AI refinement failed (${lote.platform}):`, error);
        canalesFallidos.add(lote.platform);
      } finally {
        sem.release();
      }
    }));

    if (abortoCliente.signal.aborted) return;

    const refined = variations.map((original, i) => ({
      ...original,
      content: contenidos[i],
      charCount: contenidos[i].length,
    }));
    if (aplicadasTotal === 0) {
      res.status(502).json({
        error: 'No se pudo refinar el copy: el proveedor de IA no devolvió ninguna variación válida. Intenta de nuevo en unos minutos o con menos canales.',
      });
      return;
    }

    // `failedPlatforms` lista los canales que quedaron total o parcialmente
    // sin refinar; sus variaciones vuelven con el texto original.
    res.json({ variations: refined, failedPlatforms: [...canalesFallidos] });
  } catch (error) {
    handleTenantError(error, res, 'AI refinement failed');
  } finally {
    clearTimeout(temporizador);
    limpiar();
  }
}
