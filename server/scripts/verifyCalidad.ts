/**
 * Mide la calidad del copy contra el manual de oficio (services/oficio.ts).
 *
 *   npm run verify:calidad                          # todos los casos, canales por defecto
 *   npm run verify:calidad -- --plan                # dice qué correría y cuántas llamadas, sin gastar
 *   npm run verify:calidad -- --caso terpel-1 --canales "Instagram Post,Google Ads"
 *   npm run verify:calidad -- --ablacion            # además, el mismo caso con el ADN recortado
 *
 * GASTA CRÉDITO DE IA: genera de verdad y después juzga. No corre en CI.
 * Se corre antes y después de cada cambio al motor, y la comparación se anota
 * en docs/plan-textos-raiz.md. Ver docs/v2/spec-proceso-de-campana.md, 5.2.
 *
 * Los casos son JSON en `server/.calidad/casos/` (gitignoreado: tienen el ADN y
 * el copy aprobado de clientes reales) y se exportan con `npm run calidad:caso`.
 * Si no hay ninguno, corre con LoBueno, la marca de prueba de shared/.
 *
 * El juez NO es el revisor del pipeline: es otro prompt, con el modelo principal
 * (el revisor usa el chico), y pregunta regla por regla. Un modelo que se
 * califica con la misma vara con que escribió no mide nada.
 *
 * Los resultados quedan en `server/.calidad/resultados/`, con el commit en el
 * nombre, para comparar dos corridas.
 */
import 'dotenv/config';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateCopyWithOpenAI } from '../src/services/openaiService.js';
import {
  serverAIConfig,
  createAIClient,
  resolveModel,
  jsonObjectFormat,
  stripJsonFence,
  samplingParams,
  chatCompletionConRetry,
  TIEMPOS,
} from '../src/services/aiClient.js';
import { REGLAS_DE_OFICIO, detectarOficio } from '../src/services/oficio.js';
import { CopyParameters, CopyVariation } from '../src/types.js';
import {
  LOBUENO_BRAND,
  LOBUENO_DNA_PROFILES,
  LOBUENO_APPROVED_EXAMPLES,
  LOBUENO_NEGATIVE_EXAMPLES,
} from '../../shared/lobuenoBrand.js';

const DIR = join(process.cwd(), '.calidad');
const CANALES_POR_DEFECTO = ['Instagram Post', 'Google Ads', 'Push Notification'];

interface Caso {
  nombre: string;
  params: Omit<CopyParameters, 'platforms' | 'clientId'>;
}

const argumento = (nombre: string): string | undefined => {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const bandera = (nombre: string) => process.argv.includes(`--${nombre}`);

const casoDeLoBueno = (): Caso => {
  const brief = LOBUENO_DNA_PROFILES[0];
  return {
    nombre: 'lobueno',
    params: {
      clientName: LOBUENO_BRAND.name,
      clientIndustry: LOBUENO_BRAND.industry,
      voice: LOBUENO_BRAND.voice,
      valueProposition: LOBUENO_BRAND.valueProposition,
      brandVoiceGuidelines: LOBUENO_BRAND.brandVoiceGuidelines,
      brandFingerprint: LOBUENO_BRAND.brandFingerprint,
      product: brief.product,
      targetAudience: brief.targetAudience,
      goal: brief.goal,
      theme: brief.theme,
      keywords: brief.keywords,
      prohibitions: brief.prohibitions,
      primaryCTA: brief.primaryCTA,
      campaignConcept: brief.campaignConcept,
      feedbackExamples: LOBUENO_APPROVED_EXAMPLES.map(e => ({ platform: e.platform, content: e.content })),
      negativeExamples: LOBUENO_NEGATIVE_EXAMPLES.map(e => ({ content: e.content, reason: e.reason })),
    } as Caso['params'],
  };
};

const cargarCasos = (): Caso[] => {
  const dir = join(DIR, 'casos');
  const archivos = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.json')) : [];
  const casos = archivos.length
    ? archivos.map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Caso)
    : [casoDeLoBueno()];
  const solo = argumento('caso');
  return solo ? casos.filter(c => c.nombre === solo) : casos;
};

/**
 * El ADN recortado a propósito: cuánto empeora el copy sin cada sección dice
 * cuánto pesa (y dónde está el mínimo para generar). Ver el plan, decisión 6.
 */
const RECORTES: { nombre: string; recortar: (p: Caso['params']) => Caso['params'] }[] = [
  { nombre: 'completo', recortar: p => p },
  { nombre: 'sin-propuesta', recortar: p => ({ ...p, valueProposition: '' }) },
  { nombre: 'sin-voz', recortar: p => ({ ...p, voice: '', brandVoiceGuidelines: '', brandFingerprint: undefined }) },
  { nombre: 'sin-audiencia', recortar: p => ({ ...p, targetAudience: '' }) },
  { nombre: 'sin-ejemplos', recortar: p => ({ ...p, feedbackExamples: [], negativeExamples: [] }) },
  {
    nombre: 'solo-nombre',
    recortar: p => ({
      ...p,
      valueProposition: '',
      voice: '',
      brandVoiceGuidelines: '',
      brandFingerprint: undefined,
      targetAudience: '',
      keywords: '',
      feedbackExamples: [],
      negativeExamples: [],
    }),
  },
];

interface Veredicto {
  id: string;
  faltas: string[];
  nota?: string;
}

const juzgar = async (
  variaciones: CopyVariation[],
  concepto: string,
  marca: string,
  config: ReturnType<typeof serverAIConfig>
): Promise<Veredicto[]> => {
  const cliente = createAIClient(config);
  const modelo = resolveModel(config, false);
  const reglas = REGLAS_DE_OFICIO.map(r => `- "${r.id}": ${r.pregunta}`).join('\n');
  const items = variaciones
    .map(v => `- id: ${v.id}\n  canal: ${v.platform} · ${v.slotLabel || v.slot || ''}\n  texto: "${v.content.replace(/"/g, '\\"')}"`)
    .join('\n');
  const respuesta = await chatCompletionConRetry(
    cliente,
    {
      model: modelo,
      messages: [
        {
          role: 'system',
          content:
            'Sos jurado de copy publicitario. No escribiste estos textos ni los vas a corregir: solo decís qué reglas rompen. Sos estricto y no inventás faltas. Respondés SOLO en JSON válido.',
        },
        {
          role: 'user',
          content: `Marca: "${marca}". Concepto de campaña: "${concepto}".

## REGLAS (respondé por cada texto qué ids rompe; ninguno si está limpio)
${reglas}

## TEXTOS
${items}

## FORMATO
{ "veredictos": [ { "id": "el id literal", "faltas": ["id de regla", ...], "nota": "1 línea, solo si hay faltas" } ] }`,
        },
      ],
      response_format: jsonObjectFormat(cliente),
      max_tokens: 6_000,
      ...samplingParams(modelo, 0),
    },
    { etapa: 'juez-calidad', timeoutMs: TIEMPOS.llamada.critic * 2, intentosMax: 2 }
  );
  const crudo = respuesta.choices[0].message.content;
  if (!crudo) return [];
  const validas = new Set(REGLAS_DE_OFICIO.map(r => r.id));
  const parsed = JSON.parse(stripJsonFence(crudo));
  return (Array.isArray(parsed.veredictos) ? parsed.veredictos : []).map((v: Veredicto) => ({
    id: v.id,
    faltas: (v.faltas || []).filter(f => validas.has(f)),
    nota: v.nota,
  }));
};

interface Corrida {
  caso: string;
  recorte: string;
  textos: number;
  costoUsd: number;
  concepto: string;
  /** Faltas por regla, contadas por el juez. */
  porRegla: Record<string, number>;
  /** Faltas que encuentra el detector sin IA (no depende del juez). */
  detector: number;
  ejemplos: { texto: string; faltas: string[]; nota?: string }[];
}

const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'sin-git';
  }
})();

async function main() {
  const config = serverAIConfig();
  const canales = (argumento('canales') || CANALES_POR_DEFECTO.join(',')).split(',').map(s => s.trim());
  const casos = cargarCasos();
  const recortes = bandera('ablacion') ? RECORTES : RECORTES.slice(0, 1);
  const corridas = casos.length * recortes.length;

  console.log(`commit    : ${commit}`);
  console.log(`proveedor : ${config.provider} · redactor ${resolveModel(config, false)} · juez ${resolveModel(config, false)}`);
  console.log(`casos     : ${casos.map(c => c.nombre).join(', ') || '(ninguno)'}`);
  console.log(`canales   : ${canales.join(', ')}`);
  console.log(`recortes  : ${recortes.map(r => r.nombre).join(', ')}`);
  console.log(`corridas  : ${corridas} generaciones + ${corridas} juicios por canal`);
  if (bandera('plan')) return;
  if (!config.apiKey) throw new Error('Sin API key: revise AI_PROVIDER y la key correspondiente en server/.env');

  const resultados: Corrida[] = [];
  for (const caso of casos) {
    for (const recorte of recortes) {
      const params = { ...recorte.recortar(caso.params), platforms: canales, clientId: 'calidad' } as unknown as CopyParameters;
      process.stdout.write(`\n${caso.nombre} · ${recorte.nombre} … `);
      const r = await generateCopyWithOpenAI(params, config);
      const variaciones = (r.variations || []).filter(v => v.content);
      const concepto = r.spine?.concept || '';
      const marca = params.clientName || '';

      const veredictos: Veredicto[] = [];
      for (const canal of canales) {
        const delCanal = variaciones.filter(v => v.platform === canal);
        if (delCanal.length) veredictos.push(...(await juzgar(delCanal, concepto, marca, config)));
      }
      const porId = new Map(veredictos.map(v => [v.id, v]));
      const porRegla: Record<string, number> = Object.fromEntries(REGLAS_DE_OFICIO.map(r => [r.id, 0]));
      for (const v of veredictos) for (const f of v.faltas) porRegla[f]++;
      const detector = variaciones.filter(v => detectarOficio(v.content).length > 0).length;

      resultados.push({
        caso: caso.nombre,
        recorte: recorte.nombre,
        textos: variaciones.length,
        costoUsd: r.usage?.costUsd ?? 0,
        concepto,
        porRegla,
        detector,
        ejemplos: variaciones
          .map(v => ({ texto: v.content, faltas: porId.get(v.id)?.faltas ?? [], nota: porId.get(v.id)?.nota }))
          .filter(e => e.faltas.length > 0),
      });
      process.stdout.write(`${variaciones.length} textos`);
    }
  }

  // Por cada 100 textos, para que corridas de distinto tamaño se puedan comparar.
  console.log('\n\n--- faltas cada 100 textos ---');
  const cabecera = ['regla'.padEnd(22), ...resultados.map(r => `${r.caso}/${r.recorte}`.slice(0, 18).padStart(18))];
  console.log(cabecera.join(' '));
  for (const regla of REGLAS_DE_OFICIO) {
    const fila = resultados.map(r => (r.textos ? ((100 * r.porRegla[regla.id]) / r.textos).toFixed(0) : '—').padStart(18));
    console.log([regla.nombre.padEnd(22), ...fila].join(' '));
  }
  const total = resultados.map(r =>
    (r.textos ? (100 * Object.values(r.porRegla).reduce((a, b) => a + b, 0)) / r.textos : 0).toFixed(0).padStart(18)
  );
  console.log(['TOTAL'.padEnd(22), ...total].join(' '));
  const det = resultados.map(r => (r.textos ? ((100 * r.detector) / r.textos).toFixed(0) : '—').padStart(18));
  console.log(['detector sin IA'.padEnd(22), ...det].join(' '));
  const costo = resultados.reduce((a, r) => a + r.costoUsd, 0);
  console.log(`\ncosto de generación: USD ${costo.toFixed(4)} (el juez no está incluido)`);

  mkdirSync(join(DIR, 'resultados'), { recursive: true });
  const fecha = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const archivo = join(DIR, 'resultados', `${fecha}-${commit}.json`);
  writeFileSync(archivo, JSON.stringify({ commit, canales, resultados }, null, 2));
  console.log(`resultado: ${archivo}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
