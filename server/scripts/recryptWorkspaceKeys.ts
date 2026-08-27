/**
 * Recifrado de las API keys de IA que quedaron en texto plano (A0.6).
 *
 *   npm run recrypt:keys            → dry-run, no escribe nada
 *   npm run recrypt:keys -- --apply → recifra, en una sola transacción
 *
 * El deploy no necesita este script para funcionar: una fila en texto plano se
 * sigue leyendo tal cual y se recifra sola la primera vez que ese workspace
 * genera o refina. Esto cierra las que nunca generan, para que la consulta
 * `aiApiKey NOT LIKE 'v1:%'` pueda llegar a cero y quede como invariante.
 *
 * El reporte nunca imprime una clave ni un fragmento de ella: solo una huella
 * sha256 de 8 hex, que alcanza para confirmar que la clave sobrevivió intacta
 * al recifrado.
 *
 * Corre desde el host (como `backfill:tenancy`), no dentro del contenedor:
 * `server/src` no se copia a la imagen de runtime.
 */

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { decryptSecret, encryptSecret, isEncrypted, secretFingerprint } from '../src/lib/crypto.js';

// Prisma carga `.env` por su cuenta para DATABASE_URL, pero ENCRYPTION_KEY no
// llega sola: sin esta línea el script falla contra una base bien configurada.
dotenv.config();

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

type Fila = {
  id: string;
  name: string;
  slug: string;
  aiProvider: string | null;
  aiApiKey: string;
  huella: string;
};

async function main() {
  const workspaces = await prisma.workspace.findMany({
    where: { aiApiKey: { not: null } },
    select: { id: true, name: true, slug: true, aiProvider: true, aiApiKey: true },
    orderBy: { createdAt: 'asc' },
  });

  const yaCifradas: Fila[] = [];
  const enPlano: Fila[] = [];
  const ilegibles: { slug: string; aiProvider: string | null; motivo: string }[] = [];

  for (const ws of workspaces) {
    const stored = ws.aiApiKey!;
    if (isEncrypted(stored)) {
      try {
        yaCifradas.push({ ...ws, aiApiKey: stored, huella: secretFingerprint(decryptSecret(stored)) });
      } catch (err: any) {
        ilegibles.push({ slug: ws.slug, aiProvider: ws.aiProvider, motivo: err?.message || 'error desconocido' });
      }
    } else {
      enPlano.push({ ...ws, aiApiKey: stored, huella: secretFingerprint(stored) });
    }
  }

  // ---- reporte ---------------------------------------------------------
  console.log(`\n${APPLY ? '=== APLICANDO ===' : '=== DRY-RUN (nada se escribe) ==='}\n`);
  console.log(`Workspaces con API key propia: ${workspaces.length}`);
  console.log(`  · ya cifradas:  ${yaCifradas.length}`);
  console.log(`  · texto plano:  ${enPlano.length}`);
  console.log(`  · ilegibles:    ${ilegibles.length}\n`);

  if (yaCifradas.length > 0) {
    console.log('Ya cifradas (no se tocan):');
    for (const w of yaCifradas) console.log(`  ✓ ${w.slug}  [${w.aiProvider ?? 'sin provider'}]  huella ${w.huella}`);
    console.log('');
  }

  if (enPlano.length > 0) {
    console.log('A recifrar:');
    for (const w of enPlano) console.log(`  → ${w.slug}  [${w.aiProvider ?? 'sin provider'}]  huella ${w.huella}`);
    console.log('');
  }

  // Una fila con prefijo `v1:` que no abre significa que ENCRYPTION_KEY no es
  // la que cifró esa fila. Escribir encima empeoraría el problema, así que se
  // corta incluso en dry-run.
  if (ilegibles.length > 0) {
    console.error('✗ Filas cifradas que NO se pueden descifrar con la ENCRYPTION_KEY actual:');
    for (const w of ilegibles) console.error(`  · ${w.slug}  [${w.aiProvider ?? 'sin provider'}]  ${w.motivo}`);
    console.error('\nRevisá que ENCRYPTION_KEY sea la misma con la que se cifraron. No se escribió nada.\n');
    process.exit(1);
  }

  if (!APPLY) {
    console.log('Nada se escribió. Volvé a correr con --apply para aplicarlo.\n');
    return;
  }

  if (enPlano.length === 0) {
    console.log('No hay nada que recifrar.\n');
    return;
  }

  // ---- aplicar ---------------------------------------------------------
  let recifradas = 0;
  let omitidas = 0;

  await prisma.$transaction(async tx => {
    for (const w of enPlano) {
      // Mismo compare-and-set que el camino perezoso: si alguien guardó una
      // clave nueva desde Configuración mientras corría el script, esta fila
      // afecta 0 filas y se omite en vez de pisarla.
      const { count } = await tx.workspace.updateMany({
        where: { id: w.id, aiApiKey: w.aiApiKey },
        data: { aiApiKey: encryptSecret(w.aiApiKey) },
      });
      if (count === 0) {
        omitidas++;
        console.log(`  ~ ${w.slug}: cambió mientras corría el script, se omite`);
        continue;
      }
      recifradas++;
    }

    // Verificación dentro de la misma transacción: si una huella no coincide,
    // tira y se revierte todo.
    const releidas = await tx.workspace.findMany({
      where: { id: { in: enPlano.map(w => w.id) } },
      select: { id: true, slug: true, aiApiKey: true },
    });
    for (const w of releidas) {
      const original = enPlano.find(x => x.id === w.id)!;
      const huellaFinal = secretFingerprint(decryptSecret(w.aiApiKey!));
      if (huellaFinal !== original.huella) {
        throw new Error(`La huella de ${w.slug} cambió tras el recifrado (${original.huella} → ${huellaFinal})`);
      }
    }
  }, { timeout: 120_000 });

  const residuo = await prisma.workspace.count({
    where: { aiApiKey: { not: null }, NOT: { aiApiKey: { startsWith: 'v1:' } } },
  });

  console.log(`\n✓ Recifradas ${recifradas}, omitidas ${omitidas}. Quedan ${residuo} en texto plano.`);
  console.log('Verificación:');
  console.log('  SELECT count(*) FROM "Workspace" WHERE "aiApiKey" IS NOT NULL AND "aiApiKey" NOT LIKE \'v1:%\';  -- debe dar 0\n');
}

main()
  .catch(err => {
    console.error('\nRecifrado abortado — no se escribió nada:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
