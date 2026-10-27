/**
 * Exporta un caso real para `npm run verify:calidad`.
 *
 *   npm run calidad:caso -- <dnaProfileId> [nombre]
 *
 * Lee el brief y su marca de la base de DATABASE_URL y escribe
 * `server/.calidad/casos/<nombre>.json` con los mismos parámetros que recibe el
 * motor en la app (services/parametrosDeGeneracion.ts). Solo lee.
 *
 * El caso tiene el ADN y el copy aprobado de un cliente real: por eso
 * `.calidad/` está gitignoreado. No se sube al repo ni se comparte.
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { prisma } from '../src/lib/prisma.js';
import { parametrosDeGeneracion } from '../src/services/parametrosDeGeneracion.js';

async function main() {
  const [id, nombreArg] = process.argv.slice(2).filter(a => !a.startsWith('--'));
  if (!id) throw new Error('Uso: npm run calidad:caso -- <dnaProfileId> [nombre]');
  const dnaProfile = await prisma.contentDNAProfile.findUnique({ where: { id }, include: { client: true } });
  if (!dnaProfile) throw new Error(`No existe el brief ${id}`);
  const params = await parametrosDeGeneracion(dnaProfile, dnaProfile.client);
  const nombre = nombreArg || `${dnaProfile.client.name}-${dnaProfile.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const dir = join(process.cwd(), '.calidad', 'casos');
  mkdirSync(dir, { recursive: true });
  const archivo = join(dir, `${nombre}.json`);
  writeFileSync(archivo, JSON.stringify({ nombre, params }, null, 2));
  console.log(`caso «${nombre}»: ${archivo}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
