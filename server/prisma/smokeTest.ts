/**
 * Smoke test del pipeline contra la API real. NO toca la base de datos.
 *
 *   npm run smoke
 *
 * Verifica lo que el typecheck no puede:
 *   1. cache_control en formato OpenRouter no devuelve 400
 *   2. el proveedor reporta usage.cost
 *   3. el prefijo compartido efectivamente se cachea entre canales
 *   4. max_tokens no trunca el JSON del writer
 */
import 'dotenv/config';
import { generateCopyWithOpenAI } from '../src/services/openaiService.js';
import { serverAIConfig, resolveModel } from '../src/services/aiClient.js';
import {
  LOBUENO_BRAND,
  LOBUENO_DNA_PROFILES,
  LOBUENO_APPROVED_EXAMPLES,
  LOBUENO_NEGATIVE_EXAMPLES,
} from '../../shared/lobuenoBrand.js';

const brief = LOBUENO_DNA_PROFILES[0];

// Dos canales chicos: suficiente para probar el caché (el prefijo se escribe en
// la primera llamada y debe leerse en la segunda) sin gastar de más.
const PLATFORMS = ['Push Notification', 'Instagram Historia'];

async function main() {
  const config = serverAIConfig();
  console.log(`proveedor : ${config.provider}`);
  console.log(`writer    : ${resolveModel(config, false)}`);
  console.log(`mini      : ${resolveModel(config, true)}`);
  console.log(`canales   : ${PLATFORMS.join(', ')}`);
  if (!config.apiKey) throw new Error('Sin API key: revise AI_PROVIDER y la key correspondiente en server/.env');
  console.log('\ngenerando...\n');

  const t0 = Date.now();
  const result = await generateCopyWithOpenAI(
    {
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
      platforms: PLATFORMS,
    } as any,
    config
  );
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  const u = result.usage;
  const checks: [string, boolean, string][] = [
    ['espina generada', Boolean(result.spine?.concept), result.spine?.concept || 'sin concepto'],
    ['variaciones', (result.variations?.length || 0) > 0, `${result.variations?.length || 0} piezas`],
    ['usage reportado', Boolean(u), u ? `${u.promptTokens} in / ${u.completionTokens} out` : 'ausente'],
    ['costo del proveedor', Boolean(u && !u.costEstimated), u?.costEstimated ? 'ESTIMADO (tabla local)' : `USD ${u?.costUsd}`],
    ['caché de prompt activo', Boolean(u && u.cachedTokens > 0), u ? `${u.cachedTokens} tok (${Math.round((u.cacheHitRate || 0) * 100)}%)` : '—'],
    ['sin truncado', !result.variations?.some(v => !v.content), 'JSON completo en todas'],
  ];

  console.log(`--- resultado (${secs}s) ---`);
  for (const [label, ok, detail] of checks) {
    console.log(`${ok ? '✅' : '⚠️ '} ${label.padEnd(24)} ${detail}`);
  }

  console.log('\n--- por etapa ---');
  const stages: [string, { tokens: number; costUsd: number }][] = Object.entries(u?.byStage || {});
  for (const [stage, info] of stages) {
    console.log(`  ${stage.padEnd(28)} ${String(info.tokens).padStart(6)} tok   USD ${info.costUsd.toFixed(6)}`);
  }

  console.log('\n--- muestra ---');
  for (const v of (result.variations || []).slice(0, 4)) {
    console.log(`  [${v.platform}/${v.slot}#${v.variationIndex}] "${v.content}"  (${v.charCount}/${v.budget ?? '—'}${v.budgetOk === false ? ' ❌ EXCEDE' : ''})`);
  }

  const hardFail = checks.filter(c => !c[1] && c[0] !== 'caché de prompt activo');
  if (hardFail.length) {
    console.log(`\n❌ ${hardFail.length} verificación(es) crítica(s) fallaron.`);
    process.exit(1);
  }
  if (!u || u.cachedTokens === 0) {
    console.log('\n⚠️  El caché no se activó. No bloquea el deploy (solo se pierde el ahorro),');
    console.log('    pero conviene revisar si el prefijo llegó al mínimo del proveedor.');
  }
  console.log('\n✅ Pipeline sano.');
}

main().catch(e => {
  console.error('\n❌ FALLÓ:', e?.message || e);
  process.exit(1);
});
