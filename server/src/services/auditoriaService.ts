/**
 * La auditoría de una pieza subida (H2, fase 3).
 *
 * Son **dos llamadas y no una**, porque son dos clases de cosa distintas y
 * mezclarlas destruye la confianza en la primera:
 *
 *   1. **¿Dice lo que se aprobó?** Compara el texto de la pieza contra el que
 *      quedó congelado en sus slots. Es un HECHO: hay una verdad conocida, y el
 *      informe muestra los dos lados. Es barata, y lo que no se pudo leer se
 *      declara como tal —«no se pudo leer» NO significa «está mal», y reportar
 *      un falso «no coincide» ahí hace que el diseñador desactive mentalmente
 *      la herramienta y no vuelva.
 *   2. **¿Respeta la marca?** Ortografía, tono y prohibiciones contra el ADN.
 *      Es un JUICIO, del mismo tipo que el Critic.
 *
 * Nada de esto bloquea (D2): la pieza ya está en «Por revisar» cuando esto
 * corre, y quien aprueba decide. Si el proveedor falla, la versión queda en
 * NO_DISPONIBLE —que no es «sin hallazgos»— y se puede reintentar.
 *
 * El costo se mide como una etapa más del motor y se guarda en la versión, así
 * que «cuánto cuesta auditar» es una consulta desde el primer día.
 */

import { AuditoriaEstado, HallazgoTipo, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { storage } from '../lib/storage.js';
import {
  chatCompletionConRetry,
  createAIClient,
  jsonObjectFormat,
  resolveModel,
  samplingParams,
  stripJsonFence,
  serverAIConfig,
  TIEMPOS,
  WorkspaceAIConfig,
} from './aiClient.js';
import { aggregateUsage, extractUsage, UsageEntry } from './pricing.js';
import { decryptWorkspaceApiKey } from '../lib/workspaceSecret.js';

/** Techo de salida: el informe es una lista corta, no un ensayo. */
const MAX_TOKENS_AUDITORIA = 1500;

/**
 * La imagen viaja como data URL y no como URL firmada: así no depende de que el
 * proveedor pueda alcanzar nuestro bucket, no deja una URL del cliente en los
 * logs de un tercero, y funciona igual con los cuatro proveedores.
 */
const comoImagen = (bytes: Buffer, contentType = 'image/jpeg') => ({
  type: 'image_url' as const,
  image_url: { url: `data:${contentType};base64,${bytes.toString('base64')}` },
});

const PROMPT_TEXTO = `
Sos un verificador de piezas gráficas. Te doy una imagen y el texto que esa pieza DEBERÍA contener,
slot por slot. Tu trabajo es comparar, no opinar.

Reglas:
- Para cada slot decidí: "coincide", "difiere" o "ilegible".
- "difiere" solo si leíste el texto y NO es el esperado. Describí la diferencia exacta.
- "ilegible" si no pudiste leer ese texto en la imagen (muy chico, sobre una foto, cortado).
  No es un error de la pieza: es el límite de lo que pudiste ver.
- No evalúes diseño, ortografía ni tono. Eso lo hace otra revisión.

Respondé SOLO este JSON:
{ "slots": [ { "slot": "id", "resultado": "coincide|difiere|ilegible", "encontrado": "lo que leíste o null", "detalle": "una frase" } ] }
`.trim();

const PROMPT_MARCA = `
Sos editor senior de marca. Mirás una pieza gráfica terminada y decís si respeta el ADN de la marca.
Es un juicio, no una medición: cada observación tiene que poder defenderse en una frase.

Mirá ortografía y tildes del texto visible, tono y registro, y el uso de palabras prohibidas.
No repitas lo que ya se verifica comparando el texto contra lo aprobado: acá importa CÓMO está dicho.
Si no hay nada que observar, devolvé la lista vacía. No inventes observaciones para llenarla.

Respondé SOLO este JSON:
{ "observaciones": [ { "detalle": "una frase", "cita": "el texto de la pieza al que te referís o null" } ] }
`.trim();

interface SlotEsperado {
  slot: string;
  slotLabel: string;
  texto: string;
}

/** La clave del workspace gana sobre la del servidor, igual que en el motor. */
const resolverConfig = async (workspaceId: string): Promise<WorkspaceAIConfig> => {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, aiProvider: true, aiApiKey: true, aiModel: true },
  });
  if (ws?.aiApiKey && ws.aiProvider) {
    return {
      provider: ws.aiProvider as WorkspaceAIConfig['provider'],
      apiKey: decryptWorkspaceApiKey(ws.id, ws.aiApiKey),
      model: ws.aiModel || undefined,
    };
  }
  return serverAIConfig();
};

/**
 * Corre la auditoría de una versión y guarda sus hallazgos. No lanza: una
 * auditoría que falla deja la versión en NO_DISPONIBLE y el tablero lo muestra,
 * porque su falla no puede tumbar la entrega de una pieza que ya está subida.
 */
export const auditarVersion = async (versionId: string): Promise<void> => {
  const version = await prisma.piezaVersion.findUnique({
    where: { id: versionId },
    include: {
      pieza: {
        include: {
          slots: true,
          client: { select: { name: true, brandProhibitions: true, brandVoiceGuidelines: true, voice: true } },
        },
      },
    },
  });
  if (!version) return;

  /**
   * `updateMany` y no `update`: la auditoría corre en segundo plano y para
   * cuando termina la pieza puede haberse borrado. Eso no es un error que
   * merezca un stack trace en los logs — simplemente ya no hay a quién avisarle.
   */
  const marcarNoDisponible = (motivo: string) =>
    prisma.piezaVersion
      .updateMany({
        where: { id: versionId },
        data: { estadoAuditoria: AuditoriaEstado.NO_DISPONIBLE, motivoNoDisponible: motivo, auditadaAt: new Date() },
      })
      .catch(e => console.error('[auditoria] no se pudo marcar NO_DISPONIBLE:', e));

  if (!version.claveSnapshot) {
    await marcarNoDisponible('No se pudo generar una imagen de la pieza para auditar.');
    return;
  }

  const esperados: SlotEsperado[] = version.pieza.slots
    .filter(s => !s.esInstruccion)
    .map(s => ({ slot: s.slot, slotLabel: s.slotLabel, texto: s.textoCongelado }));

  const usage: UsageEntry[] = [];
  const hallazgos: Prisma.HallazgoCreateManyVersionInput[] = [];

  try {
    const bytes = await storage().get(version.claveSnapshot);
    const config = await resolverConfig(version.pieza.workspaceId);
    const cliente = createAIClient(config);
    const modelo = resolveModel(config, false);

    // --- 1. ¿Dice lo que se aprobó? Un hecho contra una verdad conocida.
    const respuestaTexto = await chatCompletionConRetry(
      cliente,
      {
        model: modelo,
        messages: [
          { role: 'system', content: PROMPT_TEXTO },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Texto aprobado, por slot:\n${esperados
                  .map(e => `- ${e.slot} (${e.slotLabel}): ${e.texto}`)
                  .join('\n')}`,
              },
              comoImagen(bytes),
            ],
          },
        ],
        response_format: jsonObjectFormat(cliente),
        max_tokens: MAX_TOKENS_AUDITORIA,
        ...samplingParams(modelo, 0),
      } as never,
      { etapa: 'auditoria:texto', timeoutMs: TIEMPOS.llamada.critic, intentosMax: 2 }
    );
    const uTexto = extractUsage(respuestaTexto, modelo, 'auditoria:texto');
    if (uTexto) usage.push(uTexto);

    const leido = JSON.parse(stripJsonFence(respuestaTexto.choices[0]?.message?.content ?? '{}'));
    for (const fila of Array.isArray(leido.slots) ? leido.slots : []) {
      const esperado = esperados.find(e => e.slot === fila.slot);
      if (!esperado || fila.resultado === 'coincide') continue;
      hallazgos.push({
        tipo: fila.resultado === 'ilegible' ? HallazgoTipo.ILEGIBLE : HallazgoTipo.HECHO,
        slot: esperado.slot,
        slotLabel: esperado.slotLabel,
        esperado: esperado.texto,
        encontrado: typeof fila.encontrado === 'string' ? fila.encontrado : null,
        detalle:
          typeof fila.detalle === 'string' && fila.detalle
            ? fila.detalle
            : fila.resultado === 'ilegible'
              ? 'No se pudo leer este texto en la pieza. Eso no significa que esté mal.'
              : 'El texto de la pieza no coincide con el aprobado.',
      });
    }

    // --- 2. ¿Respeta la marca? Un juicio, del mismo tipo que el Critic.
    const marca = version.pieza.client;
    const respuestaMarca = await chatCompletionConRetry(
      cliente,
      {
        model: modelo,
        messages: [
          { role: 'system', content: PROMPT_MARCA },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: [
                  `Marca: ${marca.name}`,
                  marca.voice ? `Voz: ${marca.voice}` : '',
                  marca.brandProhibitions ? `Prohibiciones: ${marca.brandProhibitions}` : '',
                  marca.brandVoiceGuidelines ? `Guía de voz: ${marca.brandVoiceGuidelines.slice(0, 2000)}` : '',
                ]
                  .filter(Boolean)
                  .join('\n'),
              },
              comoImagen(bytes),
            ],
          },
        ],
        response_format: jsonObjectFormat(cliente),
        max_tokens: MAX_TOKENS_AUDITORIA,
        ...samplingParams(modelo, 0.2),
      } as never,
      { etapa: 'auditoria:marca', timeoutMs: TIEMPOS.llamada.critic, intentosMax: 2 }
    );
    const uMarca = extractUsage(respuestaMarca, modelo, 'auditoria:marca');
    if (uMarca) usage.push(uMarca);

    const juicio = JSON.parse(stripJsonFence(respuestaMarca.choices[0]?.message?.content ?? '{}'));
    for (const obs of Array.isArray(juicio.observaciones) ? juicio.observaciones : []) {
      if (typeof obs?.detalle !== 'string' || !obs.detalle.trim()) continue;
      hallazgos.push({
        tipo: HallazgoTipo.JUICIO,
        detalle: obs.detalle.trim(),
        encontrado: typeof obs.cita === 'string' ? obs.cita : null,
      });
    }

    const total = aggregateUsage(usage);
    await prisma.$transaction([
      prisma.hallazgo.createMany({ data: hallazgos.map(h => ({ ...h, piezaVersionId: versionId })) }),
      prisma.piezaVersion.update({
        where: { id: versionId },
        data: {
          estadoAuditoria: AuditoriaEstado.COMPLETA,
          auditadaAt: new Date(),
          costoUsd: total.costUsd,
          modelo,
        },
      }),
    ]);
  } catch (e) {
    const motivo = e instanceof Error ? e.message : 'Error desconocido';
    console.error(`[auditoria] versión ${versionId}:`, motivo);
    await marcarNoDisponible(motivo.slice(0, 300));
  }
};

/**
 * Dispara la auditoría sin bloquear la respuesta de la subida: el diseñador ya
 * entregó, y esperar dos llamadas de visión para devolverle el control sería
 * hacerle pagar a él un costo que no es suyo. La tarjeta muestra «Auditando»
 * mientras tanto.
 */
export const auditarEnSegundoPlano = (versionId: string): void => {
  void auditarVersion(versionId).catch(e => console.error('[auditoria] fallo no capturado:', e));
};
