/**
 * El interruptor de la plataforma por procesos (F0, docs/plan-plataforma-por-procesos.md), por workspace.
 *
 *   npm run plataforma                                   → lista los workspaces y cómo está cada uno
 *   npm run plataforma -- <slug> --encender              → dry-run: dice qué cambiaría
 *   npm run plataforma -- <slug> --encender --apply      → lo prende
 *   npm run plataforma -- <slug> --apagar --apply        → vuelve al marco de siempre
 *
 * Es un script y no un botón de Configuración a propósito: en producción hay muchos ADMIN, y prender el
 * marco nuevo en el workspace real lo decide Gerardo, no quien pase por la pantalla. Cada persona ve el
 * cambio en su próxima carga, cuando su sesión lo lee del workspace.
 *
 * Corre desde el host, como los backfills: `server/scripts` no se copia a la imagen de runtime.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const slug = args.find(a => !a.startsWith('--'));
const encender = args.includes('--encender');
const apagar = args.includes('--apagar');

async function main() {
  if (!slug) {
    const todos = await prisma.workspace.findMany({
      select: { slug: true, name: true, plataformaPorProcesos: true },
      orderBy: { name: 'asc' },
    });
    for (const w of todos) console.log(`${w.plataformaPorProcesos ? '● encendida' : '○ apagada  '}  ${w.slug}  (${w.name})`);
    return;
  }
  if (encender === apagar) throw new Error('Di qué hacer: --encender o --apagar');

  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { id: true, name: true, plataformaPorProcesos: true } });
  if (!ws) throw new Error(`No hay un workspace con el slug «${slug}»`);
  if (ws.plataformaPorProcesos === encender) {
    console.log(`«${ws.name}» ya está ${encender ? 'encendida' : 'apagada'}: nada que hacer.`);
    return;
  }
  if (!APPLY) {
    console.log(`Dry-run: «${ws.name}» pasaría a ${encender ? 'encendida' : 'apagada'}. Agrega --apply para hacerlo.`);
    return;
  }
  await prisma.workspace.update({ where: { id: ws.id }, data: { plataformaPorProcesos: encender } });
  console.log(`«${ws.name}» quedó ${encender ? 'encendida' : 'apagada'}. Cada persona lo ve en su próxima carga.`);
}

main()
  .catch(err => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
