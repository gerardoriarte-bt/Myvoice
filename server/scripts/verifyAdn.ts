/**
 * El ADN por capas, de punta a punta, contra una base de prueba (decisión 16, spec-plataforma § 5b).
 *
 *   DATABASE_URL=<base desechable> npm run verify:adn
 *
 * Crea su propio workspace con una madre y una submarca, recorre el ciclo y lo borra al final:
 * antes del backfill la submarca no hereda; después suma prohibiciones y keywords y hereda lo vacío;
 * un cambio en la madre le crea una versión nueva; una versión fijada resuelve la foto vieja; borrar
 * la madre la deja suelta. No gasta crédito de IA. Corre en CI junto a verify:isolation.
 */

import { PrismaClient } from '@prisma/client';
import { guardarAdnDesdeColumnas } from '../src/comun/adn/guardarAdn.js';
import { resolverAdn } from '../src/comun/adn/resolverAdn.js';

const prisma = new PrismaClient();
let fallas = 0;
const comprobar = (nombre: string, ok: boolean, detalle = '') => {
  console.log(`${ok ? '✓' : '✗'} ${nombre}${ok || !detalle ? '' : ` — ${detalle}`}`);
  if (!ok) fallas++;
};

async function main() {
  const sello = Date.now();
  const workspace = await prisma.workspace.create({ data: { name: `verify-adn ${sello}`, slug: `verify-adn-${sello}` } });
  try {
    const madre = await prisma.client.create({
      data: {
        workspaceId: workspace.id,
        name: 'Madre',
        industry: 'Energía',
        voice: 'Cercana',
        valueProposition: 'La energía que mueve al país',
        brandProhibitions: 'gratis',
        brandKeywords: 'energía',
      },
    });
    const sub = await prisma.client.create({
      data: {
        workspaceId: workspace.id,
        name: 'Submarca',
        industry: 'Energía',
        marcaMadreId: madre.id,
        valueProposition: 'Puntos en cada tanqueo',
        brandProhibitions: 'regalo',
      },
    });

    // 1. Sin secciones: se lee el ADN de hoy, sin herencia.
    let adn = await resolverAdn(sub.id);
    comprobar('sin backfill se leen las columnas', adn.fuente === 'columnas' && adn.version === null);
    comprobar('sin backfill la submarca no hereda', adn.secciones.prohibiciones.texto === 'regalo' && adn.secciones.voz.texto === '');

    // 2. El backfill: madre primero, después la submarca.
    await guardarAdnDesdeColumnas(madre.id, { motivo: 'inicial' });
    await guardarAdnDesdeColumnas(sub.id, { motivo: 'inicial' });
    adn = await resolverAdn(sub.id);
    comprobar('las prohibiciones suman las de la madre', adn.secciones.prohibiciones.texto === 'gratis, regalo', adn.secciones.prohibiciones.texto);
    comprobar('las keywords de la madre llegan', adn.secciones.keywords.texto === 'energía' && adn.secciones.keywords.origen === 'MADRE');
    comprobar('la voz vacía hereda la de la madre', adn.secciones.voz.texto === 'Cercana' && adn.secciones.voz.modo === 'HEREDA');
    comprobar('la propuesta propia manda', adn.secciones.propuestaDeValor.texto === 'Puntos en cada tanqueo' && adn.secciones.propuestaDeValor.origen === 'PROPIA');
    comprobar('versión 1 con la versión 1 de la madre', adn.version === 1 && adn.versionMadre === 1);

    // 3. Guardar sin cambios no crea versión.
    const igual = await guardarAdnDesdeColumnas(sub.id);
    comprobar('guardar sin cambios no crea versión', igual.version === null);

    // 4. Un cambio en la madre llega a la submarca, con una versión nueva.
    await prisma.client.update({ where: { id: madre.id }, data: { brandProhibitions: 'gratis, sorteo' } });
    const cambio = await guardarAdnDesdeColumnas(madre.id);
    comprobar('el cambio en la madre afecta a 1 submarca', cambio.submarcasAfectadas === 1, String(cambio.submarcasAfectadas));
    adn = await resolverAdn(sub.id);
    comprobar('la submarca resuelve en vivo con lo nuevo de la madre', adn.secciones.prohibiciones.texto === 'gratis, sorteo, regalo', adn.secciones.prohibiciones.texto);
    comprobar('la submarca está en la versión 2 (madre 2)', adn.version === 2 && adn.versionMadre === 2);

    // 5. Una campaña fijada en la versión 1 sigue con la foto vieja.
    const fijada = await resolverAdn(sub.id, { version: 1 });
    comprobar('la versión 1 resuelve con la madre de entonces', fijada.secciones.prohibiciones.texto === 'gratis, regalo', fijada.secciones.prohibiciones.texto);
    const inexistente = await resolverAdn(sub.id, { version: 99 });
    comprobar('una versión que no existe resuelve la vigente', inexistente.version === 2);

    // 6. Con texto propio la sección pasa a propia.
    await prisma.client.update({ where: { id: sub.id }, data: { voice: 'Juguetona' } });
    await guardarAdnDesdeColumnas(sub.id);
    adn = await resolverAdn(sub.id);
    comprobar('con voz propia deja de heredar', adn.secciones.voz.texto === 'Juguetona' && adn.secciones.voz.modo === 'PROPIA');

    // 7. Sin madre, la submarca queda suelta y no hereda nada.
    await prisma.$transaction(async tx => {
      await tx.client.update({ where: { id: sub.id }, data: { marcaMadreId: null } });
      await guardarAdnDesdeColumnas(sub.id, { motivo: 'familia', tx });
    });
    adn = await resolverAdn(sub.id);
    comprobar('suelta, solo lo propio', adn.marcaMadre === null && adn.secciones.prohibiciones.texto === 'regalo' && adn.secciones.keywords.texto === '');
    const ultima = await prisma.adnVersion.findFirst({ where: { clientId: sub.id }, orderBy: { version: 'desc' } });
    comprobar('salir de la familia es una versión', ultima?.motivo === 'familia' && ultima.madreId === null);
  } finally {
    await prisma.client.deleteMany({ where: { workspaceId: workspace.id } });
    await prisma.workspace.delete({ where: { id: workspace.id } });
  }
  console.log(fallas ? `\n${fallas} comprobación(es) fallaron.` : '\nADN por capas: todo en orden.');
  if (fallas) process.exit(1);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
