/**
 * El super admin (decisión 27): quién está por encima de los workspaces y ve los costos de IA.
 *
 *   npm run superadmin                                → lista quién lo es
 *   npm run superadmin -- <email>                     → dry-run: dice qué cambiaría
 *   npm run superadmin -- <email> --apply             → lo nombra
 *   npm run superadmin -- <email> --quitar --apply    → se lo quita
 *
 * Es un script y no una pantalla a propósito: nadie se nombra super admin desde la app, ni siquiera otro
 * super admin. Corre desde el host, como los backfills.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const quitar = args.includes('--quitar');
const email = args.find(a => !a.startsWith('--'))?.toLowerCase().trim();

async function main() {
  if (!email) {
    const supers = await prisma.user.findMany({ where: { superAdmin: true }, select: { email: true, name: true } });
    if (!supers.length) console.log('Nadie es super admin todavía.');
    for (const u of supers) console.log(`● ${u.email}  (${u.name})`);
    return;
  }
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, superAdmin: true } });
  if (!user) throw new Error(`No hay una cuenta con el email «${email}»: tiene que entrar una vez antes`);
  const queda = !quitar;
  if (user.superAdmin === queda) {
    console.log(`${user.name} ${queda ? 'ya es' : 'no es'} super admin: nada que hacer.`);
    return;
  }
  if (!APPLY) {
    console.log(`Dry-run: ${user.name} ${queda ? 'pasaría a ser' : 'dejaría de ser'} super admin. Agrega --apply para hacerlo.`);
    return;
  }
  await prisma.user.update({ where: { id: user.id }, data: { superAdmin: queda } });
  console.log(`${user.name} ${queda ? 'es super admin' : 'dejó de ser super admin'}. Lo ve en su próxima carga.`);
}

main()
  .catch(err => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
