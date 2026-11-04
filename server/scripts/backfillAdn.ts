/**
 * Pasa el ADN de las columnas de cada marca a sus secciones (decisión 16, spec-plataforma § 5b).
 *
 *   npm run backfill:adn            → dry-run: muestra qué cambia, no escribe nada
 *   npm run backfill:adn -- --apply → escribe, en una sola transacción
 *
 * Corre DESPUÉS de la migración `20261104000000_adn_por_capas`. Hasta que corra, el motor lee las
 * columnas como antes y ninguna submarca hereda: la herencia empieza con este script.
 *
 * - Cada marca sin secciones recibe las suyas desde sus columnas y su versión 1 (`inicial`). Una
 *   marca que ya tiene secciones no se toca: el script es idempotente.
 * - Primero las madres, para que la versión de cada submarca registre la versión de su madre.
 * - En una submarca, prohibiciones y keywords suman las de la madre, y voz, propuesta de valor y
 *   guías vacías pasan a heredar las de la madre. **Eso cambia lo que recibe el motor**: el reporte
 *   lista, por submarca, cada sección que cambia, para revisarlo antes del --apply.
 *
 * El dry-run corre exactamente lo mismo que el apply, dentro de una transacción que se descarta al
 * final: lo que lista es lo que va a pasar.
 */

import { PrismaClient } from '@prisma/client';
import { guardarAdnDesdeColumnas } from '../src/comun/adn/guardarAdn.js';
import { resolverAdn } from '../src/comun/adn/resolverAdn.js';
import { SECCIONES_ADN, seccionesDesdeColumnas } from '../src/comun/adn/secciones.js';
import { Reporte } from './lib/reporte.js';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const reporte = new Reporte('backfill-adn', APPLY);

class Descartar extends Error {}

const corto = (t: string) => {
  const plano = t.replace(/\s+/g, ' ').trim();
  return plano ? (plano.length > 70 ? `${plano.slice(0, 70)}…` : plano) : '(vacía)';
};

async function main() {
  const marcas = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      marcaMadreId: true,
      voice: true,
      valueProposition: true,
      brandVoiceGuidelines: true,
      brandKeywords: true,
      brandProhibitions: true,
      _count: { select: { seccionesAdn: true } },
    },
  });
  reporte.leidas('Client', marcas.length);
  const nombre = new Map(marcas.map(m => [m.id, m.name]));
  const pendientes = marcas
    .filter(m => m._count.seccionesAdn === 0)
    .sort((a, b) => Number(Boolean(a.marcaMadreId)) - Number(Boolean(b.marcaMadreId)));
  const yaTenian = marcas.length - pendientes.length;
  if (yaTenian) reporte.saltea('ya tiene secciones', yaTenian);

  const submarcas = pendientes.filter(m => m.marcaMadreId);
  reporte.planea('SeccionAdn', pendientes.length * SECCIONES_ADN.length);
  reporte.planea('AdnVersion inicial', pendientes.length);

  console.log(
    `\n${pendientes.length} marcas sin secciones (${pendientes.length - submarcas.length} madres o sueltas, ` +
      `${submarcas.length} submarcas). ${yaTenian} ya tenían.`
  );

  const cambios: string[] = [];
  try {
    await prisma.$transaction(
      async tx => {
        for (const m of pendientes) await guardarAdnDesdeColumnas(m.id, { motivo: 'inicial', tx });

        // Lo que recibía el motor (las columnas, sin herencia) contra lo que va a recibir.
        for (const m of submarcas) {
          const antes = seccionesDesdeColumnas(m, false);
          const despues = await resolverAdn(m.id, { db: tx });
          const lineas = SECCIONES_ADN.filter(
            d => (antes[d.clave]?.contenido.texto ?? '') !== despues.secciones[d.clave].texto
          ).map(
            d =>
              `    ${d.nombre} (${despues.secciones[d.clave].modo}): ${corto(antes[d.clave]?.contenido.texto ?? '')}` +
              `\n      → ${corto(despues.secciones[d.clave].texto)}`
          );
          if (lineas.length)
            cambios.push(`  ${m.name} · de ${nombre.get(m.marcaMadreId!) ?? '?'}\n${lineas.join('\n')}`);
        }

        if (!APPLY) throw new Descartar();
        reporte.escribio('SeccionAdn', await tx.seccionAdn.count({ where: { clientId: { in: pendientes.map(p => p.id) } } }));
        reporte.escribio('AdnVersion inicial', await tx.adnVersion.count({ where: { motivo: 'inicial', clientId: { in: pendientes.map(p => p.id) } } }));
      },
      { timeout: 120_000 }
    );
  } catch (e) {
    if (!(e instanceof Descartar)) throw e;
  }

  console.log(
    cambios.length
      ? `\nLo que cambia para el motor en ${cambios.length} submarca(s):\n${cambios.join('\n')}`
      : '\nNinguna submarca cambia lo que recibe el motor.'
  );
  if (cambios.length) reporte.advierte(`${cambios.length} submarca(s) cambian lo que recibe el motor`);

  console.log(APPLY ? '\n✓ Backfill aplicado.' : '\nNada se escribió. Volvé a correr con --apply para aplicarlo.');
  reporte.cierra();
}

main()
  .catch(err => {
    console.error('\nBackfill abortado — no se escribió nada:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
