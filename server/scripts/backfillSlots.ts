/**
 * Backfill heurístico del slot de las piezas guardadas antes de B3.
 *
 *   npm run backfill:slots            → dry-run, no escribe nada
 *   npm run backfill:slots -- --apply → escribe, en una sola transacción
 *
 * Hasta B3 `saveVariation` descartaba `slot` y `variationIndex`, así que en la
 * biblioteca el hook y el cuerpo de un mismo Instagram Post solo se distinguen
 * contando caracteres contra los presupuestos del spec del canal. Esto es
 * exactamente lo que hace el script, y por eso TODA fila que toca queda marcada
 * con `slotInferred = true`: es una deducción, no un dato de origen.
 *
 * Reglas:
 *
 *   1. Solo mira filas con `slot IS NULL`. Una segunda corrida no pisa nada:
 *      el script es idempotente y nunca reescribe un slot real.
 *   2. El conteo se recalcula SIEMPRE desde `content`, nunca desde `charCount`:
 *      esa columna es ambigua. `validators.ts` la sobrescribe con el conteo de
 *      PALABRAS en los slots `unit: "word"` (Cuña de Radio) y el editor de la
 *      biblioteca la reescribe como `content.length` en cada edición manual.
 *   3. Las señales estructurales (hashtags, idea visual, marcas de escena)
 *      deciden solas cuando matchean: son mucho más confiables que comparar
 *      longitudes contra presupuestos que se solapan entre slots.
 *   4. Entre los slots cuyo presupuesto todavía entra gana el `max` más chico
 *      —el presupuesto más específico—. Empate: gana el slot cuyo `varyByAngle`
 *      coincide con la columna `type` de la fila (`type` distinto de "Standard"
 *      es un nombre de ángulo, o sea un slot `varyByAngle: true`; ver
 *      `renderJsonSchema` en `promptBuilder.ts`). Empate persistente: orden de
 *      declaración en el spec, y la fila sale reportada con confianza baja.
 *   5. `variationIndex` queda en NULL. No es deducible: el orden de `savedAt`
 *      refleja en qué orden un humano fue clickeando "guardar", no el orden de
 *      generación, así que numerar 1..N por fecha sería inventar dato.
 *
 * Corre DESPUÉS de la migración que agrega las columnas de slot.
 */

import { PrismaClient } from '@prisma/client';
import { getChannelSpec } from '../src/channels/registry.js';
import { SlotSpec } from '../src/channels/types.js';
import { Reporte } from './lib/reporte.js';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const reporte = new Reporte('backfill-slots', APPLY);

type Confianza = 'alta' | 'media' | 'baja';

type Decision = {
  id: string;
  platform: string;
  type: string;
  preview: string;
  chars: number;
  words: number;
  /** null cuando no se pudo deducir: la fila se deja intacta. */
  slot: SlotSpec | null;
  confianza: Confianza;
  motivo: string;
  candidatos: string[];
};

const preview = (content: string) => {
  const plano = content.replace(/\s+/g, ' ').trim();
  return plano.length > 60 ? `${plano.slice(0, 60)}…` : plano;
};

const contarPalabras = (content: string) => content.trim().split(/\s+/).filter(Boolean).length;

/** El writer emite "Standard" cuando el slot no rota ángulos. */
const coincideAngulo = (slot: SlotSpec, type: string) =>
  type === 'Standard' ? !slot.varyByAngle : Boolean(slot.varyByAngle);

/**
 * Señales estructurales: cuando el texto trae una marca propia de un slot de
 * producción, esa marca vale más que cualquier comparación de longitud.
 */
const porSeñalEstructural = (slots: SlotSpec[], content: string): SlotSpec | undefined => {
  const tiene = (id: string) => slots.find(s => s.id === id);
  const tokens = content.split(/\s+/).filter(Boolean);
  const hashtags = tokens.filter(t => t.startsWith('#')).length;

  if ((/^\s*#\w/.test(content) || hashtags > tokens.length / 2) && hashtags > 0) {
    const slot = tiene('hashtags');
    if (slot) return slot;
  }
  if (/\[IDEA VISUAL/i.test(content)) {
    const slot = tiene('visualBrief');
    if (slot) return slot;
  }
  if (content.includes('\n') && /^\s*(escena|seg\b|\d+\s*s\b|0-\d)/im.test(content)) {
    return tiene('structure') ?? tiene('narrative') ?? tiene('production');
  }
  return undefined;
};

/** Un slot es "acotado" cuando declara presupuesto; los demás son el último recurso. */
const esAcotado = (slot: SlotSpec) => slot.max !== undefined || slot.min !== undefined;

const entra = (slot: SlotSpec, chars: number, words: number) => {
  if (!esAcotado(slot)) return false;
  if (slot.unit === 'word') {
    return words >= (slot.min ?? 0) && words <= (slot.max ?? Number.POSITIVE_INFINITY);
  }
  return chars <= (slot.max ?? Number.POSITIVE_INFINITY);
};

function decidir(row: { id: string; platform: string; type: string; content: string }): Decision {
  const base = {
    id: row.id,
    platform: row.platform,
    type: row.type,
    preview: preview(row.content),
    chars: row.content.length,
    words: contarPalabras(row.content),
  };

  const spec = getChannelSpec(row.platform);
  if (!spec) {
    return { ...base, slot: null, confianza: 'baja', motivo: 'canal desconocido', candidatos: [] };
  }

  const estructural = porSeñalEstructural(spec.slots, row.content);
  if (estructural) {
    return {
      ...base,
      slot: estructural,
      confianza: 'alta',
      motivo: 'señal estructural en el texto',
      candidatos: [estructural.id],
    };
  }

  // Los slots sin presupuesto (hashtags, visualBrief, production, narrative,
  // interactive) solo entran en juego si ningún slot acotado admite el texto.
  let candidatos = spec.slots.filter(s => entra(s, base.chars, base.words));
  let motivoUnico = 'único slot cuyo presupuesto admite el texto';
  if (candidatos.length === 0) {
    candidatos = spec.slots.filter(s => !esAcotado(s));
    motivoUnico = 'ningún slot acotado admite el texto; único slot sin presupuesto';
  }
  const ids = candidatos.map(s => s.id);

  if (candidatos.length === 0) {
    return { ...base, slot: null, confianza: 'baja', motivo: 'sin candidato', candidatos: ids };
  }
  if (candidatos.length === 1) {
    return { ...base, slot: candidatos[0], confianza: 'alta', motivo: motivoUnico, candidatos: ids };
  }

  const menorMax = Math.min(...candidatos.map(s => s.max ?? Number.POSITIVE_INFINITY));
  const ajustados = candidatos.filter(s => (s.max ?? Number.POSITIVE_INFINITY) === menorMax);

  if (ajustados.length === 1) {
    const elegido = ajustados[0];
    const coincide = coincideAngulo(elegido, row.type);
    return {
      ...base,
      slot: elegido,
      confianza: coincide ? 'media' : 'baja',
      motivo: coincide
        ? 'presupuesto más ajustado, ángulo coincide'
        : `presupuesto más ajustado, pero el ángulo no coincide con type="${row.type}"`,
      candidatos: ids,
    };
  }

  const porAngulo = ajustados.filter(s => coincideAngulo(s, row.type));
  if (porAngulo.length === 1) {
    return {
      ...base,
      slot: porAngulo[0],
      confianza: 'media',
      motivo: `desempate por type="${row.type}"`,
      candidatos: ids,
    };
  }

  return {
    ...base,
    slot: ajustados[0],
    confianza: 'baja',
    motivo: 'desempate por orden de declaración en el spec',
    candidatos: ids,
  };
}

async function main() {
  const pendientes = await prisma.savedVariation.findMany({
    where: { slot: null },
    select: { id: true, platform: true, type: true, content: true },
    orderBy: { savedAt: 'asc' },
  });

  const decisiones = pendientes.map(decidir);
  const aEscribir = decisiones.filter(d => d.slot !== null);
  const sinDeducir = decisiones.filter(d => d.slot === null);

  console.log(`\n${APPLY ? '=== APLICANDO ===' : '=== DRY-RUN (nada se escribe) ==='}\n`);
  console.log(`Filas con slot IS NULL: ${pendientes.length}`);
  console.log(`Deducidas: ${aEscribir.length}   ·   Sin deducir (quedan en NULL): ${sinDeducir.length}\n`);

  reporte
    .leidas('SavedVariation (slot NULL)', pendientes.length)
    .planea('SavedVariation.slot inferido', aEscribir.length)
    .saltea('sin slot deducible (quedan en NULL)', sinDeducir.length);

  if (pendientes.length === 0) {
    console.log('No hay nada que backfillear.');
    reporte.cierra();
    return;
  }

  const contar = <T extends string>(items: T[]) =>
    items.reduce<Record<string, number>>((acc, k) => {
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});

  console.log('Por canal:');
  for (const [canal, total] of Object.entries(contar(aEscribir.map(d => d.platform)))) {
    const slots = contar(aEscribir.filter(d => d.platform === canal).map(d => d.slot!.id));
    const detalle = Object.entries(slots)
      .map(([id, n]) => `${id}=${n}`)
      .join(', ');
    console.log(`  · ${canal}: ${total}  (${detalle})`);
  }

  console.log('\nPor confianza:');
  for (const nivel of ['alta', 'media', 'baja'] as Confianza[]) {
    console.log(`  · ${nivel}: ${aEscribir.filter(d => d.confianza === nivel).length}`);
  }

  const ambiguas = aEscribir.filter(d => d.confianza !== 'alta');
  if (ambiguas.length > 0) {
    reporte.advierte(
      `${ambiguas.length} filas deducidas con confianza media o baja. Todas quedan con ` +
      `slotInferred = true; revisar a mano con la consulta de auditoría.`
    );
    console.log(`\nAmbiguas — revisar a mano después de aplicar (${ambiguas.length}):`);
    for (const d of ambiguas) {
      console.log(`  · [${d.confianza}] ${d.platform} → ${d.slot!.id}  (${d.chars} car / ${d.words} pal)`);
      console.log(`      "${d.preview}"`);
      console.log(`      candidatos: ${d.candidatos.join(', ')} — ${d.motivo}`);
      console.log(`      id: ${d.id}`);
    }
  }

  if (sinDeducir.length > 0) {
    console.log(`\n⚠  Filas que quedan en NULL (${sinDeducir.length}):`);
    for (const d of sinDeducir) console.log(`  · ${d.platform} [${d.id}] — ${d.motivo}`);
  }

  if (!APPLY) {
    console.log('\nNada se escribió. Volvé a correr con --apply para aplicarlo.');
    reporte.cierra();
    return;
  }

  await prisma.$transaction(
    async tx => {
      for (const d of aEscribir) {
        await tx.savedVariation.update({
          where: { id: d.id },
          data: {
            slot: d.slot!.id,
            // El label real del spec, sin sufijos: la bandera es la que marca el
            // origen del dato, no el texto que ve el usuario.
            slotLabel: d.slot!.label,
            slotInferred: true,
          },
        });
      }
    },
    { timeout: 120_000 }
  );

  reporte.escribio('SavedVariation.slot inferido', aEscribir.length);

  console.log(`\n✓ Backfill aplicado sobre ${aEscribir.length} filas (variationIndex sigue en NULL).`);
  console.log('  Auditoría: SELECT platform, slot, count(*) FROM "SavedVariation" WHERE "slotInferred" GROUP BY 1,2;');
  reporte.cierra();
}

main()
  .catch(err => {
    console.error('\nBackfill abortado — no se escribió nada:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
