/**
 * Migra las guías de marca del disco del contenedor al almacenamiento externo.
 *
 *   npm run migrar:archivos            → dry-run, no escribe nada
 *   npm run migrar:archivos -- --apply → sube y reescribe la base
 *
 * Correr DESPUÉS de desplegar el código con `S3_BUCKET` configurado. Sin esa
 * variable el script se niega a correr: sin bucket no hay adónde migrar.
 *
 * Lo que hace, por fila:
 *   1. Lee el archivo del disco (`uploads/<archivo>`).
 *   2. Lo sube al bucket con la clave nueva.
 *   3. Reescribe `Client.brandGuidelinePdfUrl` con la clave.
 *
 * Lo que NO hace, a propósito:
 *   · No borra los archivos del disco. El disco es la única copia hasta que
 *     alguien confirme que los nuevos se leen; borrar en la misma corrida
 *     convierte un error en una pérdida.
 *   · No toca las filas que ya guardan una clave. Es idempotente: una segunda
 *     corrida no vuelve a subir nada.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { claveGuiaDeMarca, initStorage, storage } from '../src/lib/storage.js';
import { Reporte } from './lib/reporte.js';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const reporte = new Reporte('migrar-archivos', APPLY);

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

async function main() {
  const driver = initStorage();
  if (driver.nombre !== 's3') {
    console.error(
      '\n[migrar:archivos] S3_BUCKET no está configurado, así que el driver activo es "local".\n' +
      'Sin bucket no hay adónde migrar. Configurá S3_BUCKET y volvé a correr.\n'
    );
    process.exit(1);
  }

  const clientes = await prisma.client.findMany({
    where: { brandGuidelinePdfUrl: { not: null } },
    select: { id: true, name: true, brandGuidelinePdfUrl: true },
    orderBy: { createdAt: 'asc' },
  });

  const aMigrar: { id: string; name: string; archivo: string; claveNueva: string }[] = [];
  const yaMigradas: string[] = [];
  const sinArchivo: { name: string; ruta: string }[] = [];

  for (const c of clientes) {
    const guardado = c.brandGuidelinePdfUrl!;
    if (!guardado.startsWith('/uploads/')) {
      yaMigradas.push(c.name);
      continue;
    }
    const archivo = guardado.replace('/uploads/', '');
    const ruta = path.join(UPLOAD_DIR, archivo);
    try {
      await fs.access(ruta);
      aMigrar.push({ id: c.id, name: c.name, archivo, claveNueva: claveGuiaDeMarca(c.id) });
    } catch {
      // La fila apunta a un archivo que no está en el disco. Puede ser un
      // contenedor recreado: exactamente el problema que E1 viene a resolver.
      sinArchivo.push({ name: c.name, ruta: guardado });
    }
  }

  console.log(`\n${APPLY ? '=== APLICANDO ===' : '=== DRY-RUN (nada se escribe) ==='}\n`);
  console.log(`Marcas con guía de marca cargada: ${clientes.length}`);
  console.log(`  · a migrar:            ${aMigrar.length}`);
  console.log(`  · ya en el bucket:     ${yaMigradas.length}`);
  console.log(`  · archivo no está:     ${sinArchivo.length}`);

  for (const m of aMigrar) console.log(`  → ${m.name}: ${m.archivo} → ${m.claveNueva}`);

  if (sinArchivo.length > 0) {
    console.log('\n⚠  Filas que apuntan a un archivo que no está en el disco:');
    for (const s of sinArchivo) console.log(`  · ${s.name} → ${s.ruta}`);
    reporte.advierte(
      `${sinArchivo.length} marcas apuntan a un archivo inexistente: ` +
      sinArchivo.map(s => s.name).join(', ') +
      '. Hay que volver a subir esa guía desde la app.'
    );
  }

  reporte
    .leidas('Client con guía', clientes.length)
    .planea('archivos subidos', aMigrar.length)
    .planea('Client.brandGuidelinePdfUrl reescrito', aMigrar.length)
    .saltea('ya migradas', yaMigradas.length)
    .saltea('archivo ausente en el disco', sinArchivo.length);

  if (!APPLY) {
    console.log('\nNada se escribió. Volvé a correr con --apply para aplicarlo.');
    reporte.cierra();
    return;
  }

  let subidos = 0;
  let reescritos = 0;

  // La subida va FUERA de la transacción a propósito: es una llamada de red y
  // no se puede revertir. Primero sube todo; solo si eso salió bien se toca la
  // base, y en una transacción. Un archivo de más en el bucket es basura; una
  // fila apuntando a un objeto que no se subió es una guía que no abre.
  for (const m of aMigrar) {
    const contenido = await fs.readFile(path.join(UPLOAD_DIR, m.archivo));
    await storage().put(m.claveNueva, contenido, 'application/pdf');
    subidos++;
    console.log(`  ✓ subido ${m.name}`);
  }

  await prisma.$transaction(async tx => {
    for (const m of aMigrar) {
      await tx.client.update({ where: { id: m.id }, data: { brandGuidelinePdfUrl: m.claveNueva } });
      reescritos++;
    }
  }, { timeout: 120_000 });

  reporte
    .escribio('archivos subidos', subidos)
    .escribio('Client.brandGuidelinePdfUrl reescrito', reescritos);

  console.log(`\n✓ ${subidos} archivos en el bucket, ${reescritos} filas reescritas.`);
  console.log('  Los archivos del disco NO se borraron: confirmá que las guías abren desde la app');
  console.log('  y recién entonces retirá el volumen del compose.');
  reporte.cierra();
}

main()
  .catch(err => {
    console.error('\nMigración abortada:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
