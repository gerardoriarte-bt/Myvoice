import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { TenantError } from '../../lib/tenancy.js';
import { chatCompletionConRetry, createAIClient, jsonObjectFormat, resolveModel, serverAIConfig, stripJsonFence, TIEMPOS } from '../../services/aiClient.js';
import { guardarAdnDesdeColumnas } from './guardarAdn.js';
import { registrarConsumo } from '../consumoIa.js';
import { extractUsage } from '../../services/pricing.js';
import { crearAudiencia } from './audiencias.js';
import { completitudAdn } from './completitudAdn.js';
import { resolverAdn } from './resolverAdn.js';
import { esTratamiento } from './tratamiento.js';
import { seccion, type ClaveAdn, type DescriptoresAudiencia } from './secciones.js';

/**
 * La IA propone, el equipo aprueba (Gerardo, 2026-11-25; plan-adn-2 F5, ADN-6). Las marcas casi nunca traen el ADN
 * completo, así que la IA redacta una propuesta por sección —desde el manual en PDF o desde una entrevista corta— y
 * queda en `SeccionAdn.propuesta` (las audiencias, como `AudienciaDeMarca` IA_PROPUESTA). Nada llega al motor ni cuenta
 * para el mínimo hasta que alguien la aprueba en Marca › ADN, con la revisión que ya existe («Está bien», «Corregir»,
 * «Descartar»).
 */

export type FuenteDePropuesta = 'pdf' | 'entrevista';
export type Propuestas = Partial<Record<Exclude<ClaveAdn, 'audiencias' | 'asiSuena'>, string>>;
export interface AudienciaPropuesta {
  nombre: string;
  descriptores: DescriptoresAudiencia;
}

/** Deja las propuestas de la IA esperando revisión. Lo que repite el contenido actual no se propone. */
export const proponer = async (
  clientId: string,
  propuestas: Propuestas,
  audiencias: AudienciaPropuesta[],
  fuente: FuenteDePropuesta,
  autorId: string
): Promise<{ secciones: string[]; audiencias: number }> => {
  // Una marca de antes del ADN 2.0 no tiene filas de secciones: se crean desde sus columnas.
  if ((await prisma.seccionAdn.count({ where: { clientId } })) === 0) await guardarAdnDesdeColumnas(clientId, { motivo: 'inicial', autorId });
  const actuales = new Map((await prisma.seccionAdn.findMany({ where: { clientId }, select: { clave: true, contenido: true, modo: true } })).map(s => [s.clave, s]));
  const hechas: string[] = [];
  for (const [clave, valor] of Object.entries(propuestas)) {
    const def = seccion(clave);
    let texto = (valor ?? '').trim();
    if (!def || !texto) continue;
    if (clave === 'tratamiento') {
      texto = texto.toUpperCase();
      if (!esTratamiento(texto)) continue;
    }
    const actual = actuales.get(clave);
    if ((actual?.contenido as { texto?: string } | null)?.texto?.trim() === texto) continue;
    const propuesta = { propuesta: { texto } as Prisma.InputJsonValue, propuestaFuente: fuente, propuestaEn: new Date() };
    await prisma.seccionAdn.upsert({
      where: { clientId_clave: { clientId, clave } },
      create: { clientId, clave, modo: def.modos[0], contenido: { texto: '' } as Prisma.InputJsonValue, autorId, ...propuesta },
      update: propuesta,
    });
    hechas.push(clave);
  }
  // Las audiencias que ya existen con el mismo nombre no se repiten.
  const existentes = new Set((await prisma.audienciaDeMarca.findMany({ where: { clientId, archivada: false }, select: { nombre: true } })).map(a => a.nombre.trim().toLowerCase()));
  let nuevas = 0;
  for (const a of audiencias) {
    if (!a.nombre?.trim() || existentes.has(a.nombre.trim().toLowerCase())) continue;
    await crearAudiencia(clientId, { nombre: a.nombre, descriptores: a.descriptores }, { autorId, origen: 'IA_PROPUESTA', fuente });
    existentes.add(a.nombre.trim().toLowerCase());
    nuevas++;
  }
  return { secciones: hechas, audiencias: nuevas };
};

// ---------------------------------------------------------------- la entrevista

interface Pregunta {
  clave: ClaveAdn;
  seccion: string;
  pregunta: string;
  ayuda: string;
  /** El tratamiento no se redacta: se elige. */
  opciones?: { valor: string; nombre: string }[];
}

const PREGUNTAS: Partial<Record<ClaveAdn, Omit<Pregunta, 'clave' | 'seccion'>>> = {
  propuestaDeValor: {
    pregunta: '¿Qué hace la marca por sus clientes que otras no hacen? ¿Por qué la eligen?',
    ayuda: 'Ejemplo: «Llevamos el mercado a la casa en 30 minutos, con precios de plaza».',
  },
  audiencias: {
    pregunta: '¿A quién le hablan? Describe uno o dos tipos de cliente: quiénes son, qué les importa, qué los frena y cómo hablan.',
    ayuda: 'Ejemplo: «Mamás que trabajan, 30 a 45 años; les importa el tiempo; las frena no confiar en la calidad; hablan directo».',
  },
  voz: {
    pregunta: 'Si la marca fuera una persona, ¿cómo hablaría? ¿Qué tono usa y cuál nunca usaría?',
    ayuda: 'Ejemplo: «Cercana y práctica, con humor suave; nunca solemne ni técnica».',
  },
  tratamiento: {
    pregunta: '¿Cómo le habla la marca a su cliente?',
    ayuda: 'Se usa en todo el copy.',
    opciones: [
      { valor: 'TU', nombre: 'De tú' },
      { valor: 'USTED', nombre: 'De usted' },
      { valor: 'VOS', nombre: 'De vos (voseo paisa)' },
    ],
  },
  prohibiciones: {
    pregunta: '¿Qué palabras, temas o promesas nunca diría la marca?',
    ayuda: 'Ejemplo: «barato, gratis, el mejor del mundo; nunca hablar de la competencia».',
  },
  productos: {
    pregunta: '¿Qué productos o servicios vende? Con lo que los distingue, si lo hay.',
    ayuda: 'Opcional, pero ayuda a que el copy no se invente características.',
  },
  reglasDeEstilo: {
    pregunta: '¿Hay reglas de escritura? Emojis, signos, mayúsculas, cómo se escriben los precios…',
    ayuda: 'Opcional. Ejemplo: «sin emojis; precios como $12.900; nunca todo en mayúsculas».',
  },
};

/**
 * Las preguntas para la marca: primero las secciones ★ que faltan o están débiles, y después dos opcionales que
 * ayudan (productos y reglas de estilo) si están vacías.
 */
export const preguntasDeEntrevista = async (clientId: string): Promise<Pregunta[]> => {
  const c = completitudAdn(await resolverAdn(clientId));
  const pendientes = c.secciones.filter(s => s.estado !== 'COMPLETA' && (s.critica || (['productos', 'reglasDeEstilo'] as ClaveAdn[]).includes(s.clave)));
  return pendientes
    .sort((a, b) => Number(b.critica) - Number(a.critica))
    .filter(s => PREGUNTAS[s.clave])
    .map(s => ({ clave: s.clave, seccion: s.nombre, ...PREGUNTAS[s.clave]! }));
};

/**
 * Con las respuestas del equipo, la IA redacta una propuesta por sección: ordena, completa la forma y no inventa lo que
 * no le dijeron. El tratamiento se propone tal como se eligió. Todo queda para aprobar.
 */
export const entrevistar = async (clientId: string, respuestas: unknown, autorId: string, workspaceId: string) => {
  if (!respuestas || typeof respuestas !== 'object') throw new TenantError('Faltan las respuestas', 400);
  const dichas = Object.fromEntries(
    Object.entries(respuestas as Record<string, unknown>)
      .filter(([clave, v]) => PREGUNTAS[clave as ClaveAdn] && typeof v === 'string' && v.trim())
      .map(([clave, v]) => [clave, (v as string).trim().slice(0, 2000)])
  ) as Partial<Record<ClaveAdn, string>>;
  if (!Object.keys(dichas).length) throw new TenantError('Responde al menos una pregunta', 400);

  const marca = await prisma.client.findUniqueOrThrow({ where: { id: clientId }, select: { name: true, industry: true } });
  const { tratamiento, ...paraRedactar } = dichas;
  let redactadas: Record<string, unknown> = {};
  if (Object.keys(paraRedactar).length) {
    const config = serverAIConfig();
    const openai = createAIClient(config);
    const respuesta = await chatCompletionConRetry(
      openai,
      {
        model: resolveModel(config, false),
        messages: [
          {
            role: 'system',
            content:
              'Eres estratega de marca en Colombia. Con las respuestas del equipo ordenas y redactas secciones del ADN de una marca. Usas SOLO lo que dicen las respuestas: no agregas beneficios, diferenciales, datos, reglas ni ejemplos que no estén ahí, aunque parezcan obvios. Si una respuesta es corta, la sección queda corta. Escribes en español de Colombia. Respondes SOLO en JSON válido.',
          },
          {
            role: 'user',
            content: `Marca: ${marca.name} (rubro: ${marca.industry}).

Respuestas del equipo:
${Object.entries(paraRedactar)
  .map(([clave, v]) => `- ${seccion(clave)?.nombre}: ${v}`)
  .join('\n')}

Devuelve un JSON con SOLO estas claves: ${Object.keys(paraRedactar).join(', ')}. Ninguna otra.
Qué va en cada una:
- "propuestaDeValor": qué resuelve la marca y por qué la eligen, en 1 o 2 frases.
- "voz": la personalidad y el tono, en 2 o 3 frases concretas (qué sí y qué no).
- "prohibiciones": palabras, temas o promesas a evitar, separadas por coma.
- "productos": los productos o servicios, uno por línea, con lo que los distingue.
- "reglasDeEstilo": reglas de redacción, una por línea.
- "audiencias": lista de { "nombre", "quienEs", "queLeImporta", "queLaFrena", "comoHabla" } (frases cortas).`,
          },
        ],
        response_format: jsonObjectFormat(openai),
        temperature: 0.3,
      },
      { etapa: 'asistente-adn', timeoutMs: TIEMPOS.llamada.extraccion, intentosMax: 2 }
    );
    // Lo que costó, para Control (2026-11-25): fuera del motor, antes no quedaba en ningún lado.
    await registrarConsumo({ workspaceId, clientId, etapa: 'asistente-adn', uso: extractUsage(respuesta, resolveModel(config, false), 'asistente-adn'), autorId });
    const raw = respuesta.choices[0].message.content;
    if (!raw) throw new TenantError('La IA no devolvió nada: inténtalo de nuevo', 502);
    redactadas = JSON.parse(stripJsonFence(raw)) as Record<string, unknown>;
  }
  // Solo lo que el equipo respondió (2026-11-25): en la primera prueba la IA propuso secciones que nadie contestó.
  const respondida = (k: string) => k in paraRedactar;
  // La IA a veces devuelve una lista donde se pidió texto (productos, reglas): se une con el separador de la sección.
  const texto = (k: string) => {
    if (!respondida(k)) return undefined;
    const v = redactadas[k];
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(seccion(k)?.separador ?? '\n');
    return undefined;
  };
  const audiencias = respondida('audiencias') && Array.isArray(redactadas.audiencias)
    ? (redactadas.audiencias as Record<string, unknown>[]).map(a => ({
        nombre: String(a.nombre ?? '').slice(0, 80),
        descriptores: {
          quienEs: String(a.quienEs ?? ''),
          queLeImporta: String(a.queLeImporta ?? ''),
          queLaFrena: String(a.queLaFrena ?? ''),
          comoHabla: String(a.comoHabla ?? ''),
        },
      }))
    : [];
  return proponer(
    clientId,
    {
      propuestaDeValor: texto('propuestaDeValor'),
      voz: texto('voz'),
      prohibiciones: texto('prohibiciones'),
      productos: texto('productos'),
      reglasDeEstilo: texto('reglasDeEstilo'),
      tratamiento,
    },
    audiencias,
    'entrevista',
    autorId
  );
};

/** Lo que bloquea generar (2026-11-25): las secciones ★ que no están completas, con su nombre. */
export const esencialesQueFaltan = async (clientId: string) =>
  completitudAdn(await resolverAdn(clientId))
    .secciones.filter(s => s.critica && s.estado !== 'COMPLETA')
    .map(s => ({ clave: s.clave, nombre: s.nombre, motivo: s.motivo }));
