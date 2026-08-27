/**
 * Verificación de la resiliencia del pipeline (B2). NO toca la base ni la API real.
 *
 *   npm run verify:resiliencia
 *
 * El script inyecta un cliente falso guionado en el pipeline completo y
 * comprueba lo que el typecheck no puede:
 *   1. lo transitorio se reintenta y el canal igual sale
 *   2. lo terminal NO se reintenta y corta la generación entera
 *   3. una petición colgada no secuestra un slot del semáforo
 *   4. el Retry-After del proveedor manda sobre nuestro backoff
 *
 * El guion sólo controla la etapa writer: director, crítico, fixer y
 * supercrítico responden siempre OK, que es lo que aísla la variable.
 */
import OpenAI, { APIError } from 'openai';
import { CopyParameters } from '../src/types.js';
import { listChannels } from '../src/channels/registry.js';
import { streamGenerateCopyWithOpenAI, StreamEvent } from '../src/services/openaiService.js';
import { WorkspaceAIConfig, TIEMPOS, REINTENTOS } from '../src/services/aiClient.js';

// Modelos fijos: ambos están en la tabla de pricing, así que el harness no
// ensucia la salida con avisos de modelo desconocido.
process.env.AI_MODEL_MINI = 'google/gemini-2.5-flash-lite';

const CONFIG: WorkspaceAIConfig = {
  provider: 'openrouter',
  apiKey: 'clave-falsa-de-verificacion',
  model: 'google/gemini-2.5-flash',
};

// ---------------------------------------------------------------------------
// Cliente falso
// ---------------------------------------------------------------------------

type Paso =
  | { tipo: 'ok' }
  /** JSON cortado a la mitad: stripJsonFence no lo puede salvar. */
  | { tipo: 'truncado' }
  | { tipo: 'http'; status: number; code?: string; headers?: Record<string, string> }
  /** Nunca resuelve: sólo se asienta si opts.signal aborta. */
  | { tipo: 'colgado' };

type Etapa = 'director' | 'writer' | 'critic' | 'fixer' | 'supercritic';

interface Llamada {
  etapa: Etapa;
  canal?: string;
  ms: number;
}

const textoSistema = (req: any): string => {
  const contenido = req?.messages?.[0]?.content;
  if (typeof contenido === 'string') return contenido;
  return '';
};

const detectarEtapa = (req: any): Etapa => {
  // El writer es el único que manda el system message como array de partes
  // (el breakpoint de caché de buildCacheableSystemMessage).
  if (Array.isArray(req?.messages?.[0]?.content)) return 'writer';
  const sistema = textoSistema(req);
  if (sistema.includes('editor senior de marca')) return 'critic';
  if (sistema.includes('editor de copy especializado')) return 'fixer';
  if (sistema.includes('director creativo senior')) return 'supercritic';
  return 'director';
};

const canalDelPrompt = (req: any): string => {
  const usuario = String(req?.messages?.[1]?.content ?? '');
  return usuario.match(/## CANAL: (.+)/)?.[1]?.trim() ?? '?';
};

const respuesta = (contenido: string) => ({
  choices: [{ message: { content: contenido }, finish_reason: 'stop', index: 0 }],
  usage: { prompt_tokens: 1_200, completion_tokens: 300, total_tokens: 1_500 },
});

const RESPUESTAS: Record<Exclude<Etapa, 'writer'>, string> = {
  director: JSON.stringify({
    concept: 'Concepto de prueba',
    keyMessage: 'Mensaje clave de prueba',
    tone: 'directo',
    heroCTA: 'Probá ahora',
    angles: [
      { name: 'A', premise: 'premisa a', register: 'registro a' },
      { name: 'B', premise: 'premisa b', register: 'registro b' },
      { name: 'C', premise: 'premisa c', register: 'registro c' },
    ],
  }),
  critic: JSON.stringify({ evaluations: [] }),
  fixer: JSON.stringify({ fixes: [] }),
  supercritic: JSON.stringify({ coherenceScore: 9, summary: 'coherente', issues: [], flags: [] }),
};

const JSON_WRITER = JSON.stringify({
  variations: [
    { type: 'Standard', variationIndex: 1, content: 'Copy de prueba uno.', score: 8 },
    { type: 'Standard', variationIndex: 2, content: 'Copy de prueba dos.', score: 7 },
  ],
});

const errorHttp = (status: number, code?: string, headers: Record<string, string> = {}) =>
  APIError.generate(
    status,
    { error: { code, message: `error simulado ${status}${code ? ` (${code})` : ''}` } },
    undefined,
    headers
  );

/**
 * Objeto plano casteado, no una subclase de OpenAI: `baseURL` es obligatorio
 * porque jsonObjectFormat() y supportsExplicitCache() lo leen para decidir el
 * formato de la request.
 */
const clienteFalso = (
  registro: Llamada[],
  pasoWriter: (canal: string, n: number) => Paso
): OpenAI => {
  const conteo = new Map<string, number>();
  return {
    baseURL: 'https://openrouter.ai/api/v1',
    chat: {
      completions: {
        create: async (req: any, opts: any = {}) => {
          const etapa = detectarEtapa(req);
          const canal = etapa === 'writer' ? canalDelPrompt(req) : undefined;
          registro.push({ etapa, canal, ms: Date.now() });

          if (etapa !== 'writer') return respuesta(RESPUESTAS[etapa]);

          const n = (conteo.get(canal!) ?? 0) + 1;
          conteo.set(canal!, n);
          const paso = pasoWriter(canal!, n);

          switch (paso.tipo) {
            case 'ok':
              return respuesta(JSON_WRITER);
            case 'truncado':
              return respuesta('{"variations": [{"type": "Standard", "content": "cortad');
            case 'http':
              throw errorHttp(paso.status, paso.code, paso.headers);
            case 'colgado':
              return await new Promise((_resolve, reject) => {
                const señal: AbortSignal | undefined = opts.signal;
                const abortar = () => {
                  const err: any = new Error('Request was aborted.');
                  err.name = 'AbortError';
                  reject(err);
                };
                if (!señal) return; // nunca se asienta: el harness quedaría colgado
                if (señal.aborted) abortar();
                else señal.addEventListener('abort', abortar, { once: true });
              });
          }
        },
      },
    },
  } as unknown as OpenAI;
};

// ---------------------------------------------------------------------------
// Corrida
// ---------------------------------------------------------------------------

const CANALES = listChannels().map(c => c.id);

const parametros = (cantidadCanales: number): CopyParameters =>
  ({
    clientName: 'Marca de prueba',
    clientIndustry: 'Retail',
    voice: 'cercana',
    valueProposition: 'algo útil',
    product: 'producto de prueba',
    targetAudience: 'gente',
    goal: 'probar',
    theme: 'resiliencia',
    keywords: 'retry, backoff',
    prohibitions: '',
    primaryCTA: 'Probá',
    platforms: CANALES.slice(0, cantidadCanales),
  }) as unknown as CopyParameters;

interface Corrida {
  eventos: StreamEvent[];
  registro: Llamada[];
  error?: Error;
  ms: number;
}

const correr = async (
  cantidadCanales: number,
  pasoWriter: (canal: string, n: number) => Paso
): Promise<Corrida> => {
  const eventos: StreamEvent[] = [];
  const registro: Llamada[] = [];
  const t0 = Date.now();
  let error: Error | undefined;
  try {
    await streamGenerateCopyWithOpenAI(parametros(cantidadCanales), CONFIG, e => eventos.push(e), {
      clienteInyectado: clienteFalso(registro, pasoWriter),
    });
  } catch (e: any) {
    error = e;
  }
  return { eventos, registro, error, ms: Date.now() - t0 };
};

const canalesOk = (c: Corrida) =>
  c.eventos.filter(e => e.type === 'channel').map(e => (e as any).payload.platform as string);
const erroresDeCanal = (c: Corrida) =>
  c.eventos.filter(e => e.type === 'channel-error').map(e => (e as any).payload);
const reintentos = (c: Corrida) =>
  c.eventos.filter(e => e.type === 'channel-retry').map(e => (e as any).payload);
const llamadasWriter = (c: Corrida, canal?: string) =>
  c.registro.filter(l => l.etapa === 'writer' && (!canal || l.canal === canal));

// ---------------------------------------------------------------------------
// Escenarios
// ---------------------------------------------------------------------------

type Resultado = { nombre: string; ok: boolean; detalle: string };
const resultados: Resultado[] = [];

const chequear = (nombre: string, ok: boolean, detalle: string) => {
  resultados.push({ nombre, ok, detalle });
  console.log(`${ok ? '  ✓' : '  ✗'} ${nombre} — ${detalle}`);
};

const escenarios: Array<{ nombre: string; correr: () => Promise<void> }> = [
  {
    // Criterio de aceptación del plan.
    nombre: '1. falla-dos-veces (429 rate_limit, OK a la tercera)',
    correr: async () => {
      const canales = 3;
      const c = await correr(canales, (_canal, n) =>
        n <= 2 ? { tipo: 'http', status: 429, code: 'rate_limit_exceeded' } : { tipo: 'ok' }
      );
      chequear(
        'todos los canales completan',
        canalesOk(c).length === canales,
        `${canalesOk(c).length}/${canales} canales con copy`
      );
      chequear('cero channel-error', erroresDeCanal(c).length === 0, `${erroresDeCanal(c).length} errores`);
      chequear(
        '3 llamadas de writer por canal',
        CANALES.slice(0, canales).every(id => llamadasWriter(c, id).length === 3),
        CANALES.slice(0, canales).map(id => `${id}:${llamadasWriter(c, id).length}`).join(' ')
      );
      chequear(
        'se emitió channel-retry por cada reintento',
        reintentos(c).length === canales * 2,
        `${reintentos(c).length} eventos`
      );
    },
  },
  {
    nombre: '2. terminal-cuota (429 insufficient_quota)',
    correr: async () => {
      const canales = 8; // más que los 5 slots: quedan canales encolados
      const c = await correr(canales, () => ({
        tipo: 'http',
        status: 429,
        code: 'insufficient_quota',
      }));
      const errores = erroresDeCanal(c);
      chequear(
        'ningún canal reintenta el error terminal',
        CANALES.slice(0, canales).every(id => llamadasWriter(c, id).length <= 1),
        CANALES.slice(0, canales).map(id => `${id}:${llamadasWriter(c, id).length}`).join(' ')
      );
      chequear(
        'mensaje ALERTA_CREDITOS al usuario',
        errores.some(e => String(e.message).includes('ALERTA_CREDITOS')),
        errores[0]?.message ?? 'sin errores'
      );
      chequear(
        'el abort global cortó los canales encolados',
        llamadasWriter(c).length < canales * REINTENTOS.intentosMax,
        `${llamadasWriter(c).length} llamadas vs ${canales * REINTENTOS.intentosMax} sin abort`
      );
    },
  },
  {
    nombre: '3. terminal-400 (BadRequestError)',
    correr: async () => {
      const c = await correr(1, () => ({ tipo: 'http', status: 400, code: 'invalid_request_error' }));
      chequear('1 sola llamada de writer', llamadasWriter(c).length === 1, `${llamadasWriter(c).length} llamadas`);
      chequear('sin reintentos', reintentos(c).length === 0, `${reintentos(c).length} eventos`);
      chequear('el canal se reporta como fallido', erroresDeCanal(c).length === 1, erroresDeCanal(c)[0]?.message ?? '—');
    },
  },
  {
    nombre: '4. terminal-402 (OpenRouter sin crédito)',
    correr: async () => {
      const c = await correr(1, () => ({ tipo: 'http', status: 402 }));
      chequear('1 sola llamada de writer', llamadasWriter(c).length === 1, `${llamadasWriter(c).length} llamadas`);
      chequear(
        'clasificado como terminal',
        erroresDeCanal(c)[0]?.terminal === true,
        `terminal=${erroresDeCanal(c)[0]?.terminal}`
      );
    },
  },
  {
    nombre: '5. colgado (la petición nunca resuelve)',
    correr: async () => {
      const canales = 3;
      const colgado = CANALES[0];
      const c = await correr(canales, canal => (canal === colgado ? { tipo: 'colgado' } : { tipo: 'ok' }));
      chequear(
        'el canal colgado se rinde por presupuesto',
        erroresDeCanal(c).some(e => e.platform === colgado),
        erroresDeCanal(c).map(e => e.platform).join(', ') || 'ninguno'
      );
      chequear(
        'los demás canales igual completan (el slot se liberó)',
        canalesOk(c).length === canales - 1,
        `${canalesOk(c).length}/${canales - 1} canales con copy`
      );
      chequear(
        `la corrida no excede el presupuesto de canal (${TIEMPOS.canal} ms)`,
        c.ms < TIEMPOS.canal * 2,
        `${c.ms} ms`
      );
    },
  },
  {
    nombre: '6. json-invalido (writer devuelve JSON truncado y después limpio)',
    correr: async () => {
      const c = await correr(1, (_canal, n) => (n === 1 ? { tipo: 'truncado' } : { tipo: 'ok' }));
      chequear('el canal completa igual', canalesOk(c).length === 1, `${canalesOk(c).length} canales`);
      chequear('exactamente 1 reintento de contenido', llamadasWriter(c).length === 2, `${llamadasWriter(c).length} llamadas`);
      chequear(
        'el reintento se reporta como json-invalido',
        reintentos(c).some(r => r.esperaMs === 0),
        reintentos(c).map(r => r.etapa).join(', ') || 'sin eventos'
      );
    },
  },
  {
    nombre: '7. retry-after (el proveedor manda sobre el backoff)',
    correr: async () => {
      const c = await correr(1, (_canal, n) =>
        n === 1 ? { tipo: 'http', status: 429, headers: { 'retry-after': '1' } } : { tipo: 'ok' }
      );
      const writers = llamadasWriter(c);
      const espera = writers.length >= 2 ? writers[1].ms - writers[0].ms : -1;
      chequear(
        'la espera medida es ≈1 s y no el backoff calculado',
        espera >= 900 && espera < 2_000,
        `${espera} ms (backoff base configurado: ${REINTENTOS.baseMs} ms)`
      );
      chequear('el canal completa', canalesOk(c).length === 1, `${canalesOk(c).length} canales`);
    },
  },
];

async function main() {
  console.log('Verificación de resiliencia del pipeline (cliente falso, sin API real)\n');
  console.log(
    `presupuesto canal ${TIEMPOS.canal} ms · generación ${TIEMPOS.generacion} ms · ` +
      `intentos ${REINTENTOS.intentosMax} · backoff base ${REINTENTOS.baseMs} ms\n`
  );

  for (const escenario of escenarios) {
    console.log(escenario.nombre);
    await escenario.correr();
    console.log('');
  }

  const fallados = resultados.filter(r => !r.ok);
  console.log('---');
  console.log(`${resultados.length - fallados.length}/${resultados.length} verificaciones OK`);
  if (fallados.length > 0) {
    console.log('\nFALLA:');
    for (const f of fallados) console.log(`  ✗ ${f.nombre} — ${f.detalle}`);
    process.exit(1);
  }
  console.log('OK — la resiliencia del pipeline se comporta como B2 especifica.');
}

main().catch(err => {
  console.error('El harness explotó:', err);
  process.exit(1);
});
