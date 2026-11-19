/**
 * Carga la planilla de un medio en la biblioteca de CDM de un workspace (F2).
 *
 *   npm run cdm:importar -- <slug> <planilla.json>            → dry-run: qué es nuevo, qué cambia, qué falla
 *   npm run cdm:importar -- <slug> <planilla.json> --apply    → lo escribe, en una transacción
 *   --clase=REDES_SOCIALES                                     → la clase de un medio nuevo (decisión 29; por defecto PAGOS)
 *
 * La planilla va en JSON (`node scripts/planilla-a-json.cjs` desde la raíz convierte el .xlsx): el servidor
 * no abre planillas. Primer caso: docs/ecosistema/cdm/biblioteca/meta-especificaciones-2026-11-09.json.
 */

import { readFileSync } from 'node:fs';
import { ClaseDeMedio, PrismaClient } from '@prisma/client';
import { aplicarCarga, planificarCarga, PlanillaDeMedio, PlanDeCarga } from '../src/cdm/biblioteca/cargarPlanilla.js';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const [slug, archivo] = args.filter(a => !a.startsWith('--'));

const mostrar = (plan: PlanDeCarga) => {
  console.log(`Medio «${plan.medio.nombre}» · ${plan.medio.clase}${plan.medio.nuevo ? ' (nuevo, en borrador)' : ''}`);
  for (const f of plan.formatos) {
    const que = f.accion === 'nuevo' ? 'nuevo, versión 1' : f.accion === 'version' ? `cambia → versión ${f.version}` : `igual (versión ${f.version})`;
    console.log(`  ${f.nombre.padEnd(14)} ${String(f.ubicaciones).padStart(2)} ubicaciones · ${que}`);
  }
  if (plan.errores.length) {
    console.log(`  ${plan.errores.length} filas con errores (no se cargan):`);
    for (const e of plan.errores) console.log(`    ${e}`);
  }
};

async function main() {
  if (!slug || !archivo) throw new Error('Uso: npm run cdm:importar -- <slug> <planilla.json> [--apply]');
  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!ws) throw new Error(`No hay un workspace con el slug «${slug}»`);
  const planilla = JSON.parse(readFileSync(archivo, 'utf8')) as PlanillaDeMedio;
  const clase = args.find(a => a.startsWith('--clase='))?.slice('--clase='.length);
  if (clase) {
    if (!(Object.values(ClaseDeMedio) as string[]).includes(clase)) throw new Error(`Clase desconocida: ${clase}`);
    planilla.clase = clase as ClaseDeMedio;
  }
  if (!APPLY) {
    mostrar(await planificarCarga(ws.id, planilla));
    console.log('\nDry-run: no se escribió nada. Agrega --apply para cargarlo.');
    return;
  }
  mostrar(await aplicarCarga(ws.id, planilla, null));
  console.log(`\nCargado en «${ws.name}».`);
}

main()
  .catch(err => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
