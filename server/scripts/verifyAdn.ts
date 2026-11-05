/**
 * El ADN por capas, de punta a punta, contra una base de prueba (decisión 16, spec-plataforma § 5b).
 *
 *   DATABASE_URL=<base desechable> npm run verify:adn
 *
 * Crea su propio workspace con una madre y una submarca, recorre el ciclo y lo borra al final:
 * no hereda ni antes del backfill ni antes de confirmar el ADN de la madre (docs/plan-revision-adn.md);
 * confirmar exige revisar las cinco secciones; después suma prohibiciones y keywords y hereda lo vacío;
 * un cambio en la madre le crea una versión nueva; una versión fijada resuelve la foto vieja; borrar
 * la madre la deja suelta. Del ADN 2.0 (docs/plan-adn-2.md): las frases suman, las audiencias se heredan
 * o son propias, lo propuesto por la IA no llega hasta confirmarlo, la completitud exige las
 * imprescindibles y una versión de antes lee `guias` como reglas de estilo. No gasta crédito de IA.
 * Corre en CI junto a verify:isolation.
 */

import { PrismaClient } from '@prisma/client';
import { confirmarPropuesta, guardarAdnDesdeColumnas, guardarSeccion } from '../src/comun/adn/guardarAdn.js';
import { actualizarAudiencia, crearAudiencia } from '../src/comun/adn/audiencias.js';
import { completitudAdn } from '../src/comun/adn/completitudAdn.js';
import { resolverAdn } from '../src/comun/adn/resolverAdn.js';
import { confirmarAdn, estadoDeRevision, revisarSeccion } from '../src/comun/adn/revisionAdn.js';
import { TenantContext, TenantError } from '../src/lib/tenancy.js';

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

    // 2. El backfill: madre primero, después la submarca. Sin confirmar la madre, no hay herencia.
    await guardarAdnDesdeColumnas(madre.id, { motivo: 'inicial' });
    await guardarAdnDesdeColumnas(sub.id, { motivo: 'inicial' });
    adn = await resolverAdn(sub.id);
    comprobar('con secciones pero sin confirmar la madre, no hereda', adn.fuente === 'secciones' && adn.marcaMadre === null && adn.secciones.prohibiciones.texto === 'regalo');

    // 3. La revisión: confirmar exige las cinco; corregir escribe la columna y deja la sección revisada.
    const tenant = { userId: 'verify-adn', workspaceId: workspace.id } as unknown as TenantContext;
    const sinRevisar = await confirmarAdn(tenant, madre.id).then(() => 'confirmó', (e: TenantError) => e.statusCode);
    comprobar('confirmar sin revisar responde 409', sinRevisar === 409, String(sinRevisar));
    for (const clave of ['voz', 'propuestaDeValor', 'reglasDeEstilo', 'prohibiciones']) await revisarSeccion(tenant, madre.id, clave);
    let estado = await revisarSeccion(tenant, madre.id, 'keywords', 'energía, movilidad');
    const columna = (await prisma.client.findUnique({ where: { id: madre.id }, select: { brandKeywords: true } }))?.brandKeywords;
    comprobar('corregir escribe la columna', columna === 'energía, movilidad', String(columna));
    comprobar('las cinco quedan revisadas', estado.revisadas === 5 && estado.requiere, `${estado.revisadas}`);
    const confirmado = await confirmarAdn(tenant, madre.id);
    comprobar('confirmar enciende la herencia de 1 submarca', confirmado.submarcasAfectadas === 1 && !confirmado.estado.requiere);

    adn = await resolverAdn(sub.id);
    comprobar('las prohibiciones suman las de la madre', adn.secciones.prohibiciones.texto === 'gratis, regalo', adn.secciones.prohibiciones.texto);
    comprobar('las keywords de la madre llegan', adn.secciones.keywords.texto === 'energía, movilidad' && adn.secciones.keywords.origen === 'MADRE');
    comprobar('la voz vacía hereda la de la madre', adn.secciones.voz.texto === 'Cercana' && adn.secciones.voz.modo === 'HEREDA');
    comprobar('la propuesta propia manda', adn.secciones.propuestaDeValor.texto === 'Puntos en cada tanqueo' && adn.secciones.propuestaDeValor.origen === 'PROPIA');
    comprobar('versión 2 con la versión 2 de la madre', adn.version === 2 && adn.versionMadre === 2, `${adn.version}/${adn.versionMadre}`);

    // 4. Guardar sin cambios no crea versión.
    const igual = await guardarAdnDesdeColumnas(sub.id);
    comprobar('guardar sin cambios no crea versión', igual.version === null);

    // 5. Un cambio en la madre llega a la submarca, con una versión nueva, y deja la sección sin revisar.
    await prisma.client.update({ where: { id: madre.id }, data: { brandProhibitions: 'gratis, sorteo' } });
    const cambio = await guardarAdnDesdeColumnas(madre.id);
    comprobar('el cambio en la madre afecta a 1 submarca', cambio.submarcasAfectadas === 1, String(cambio.submarcasAfectadas));
    estado = await estadoDeRevision(madre.id);
    comprobar('la sección cambiada queda sin revisar', estado.secciones.find(x => x.clave === 'prohibiciones')?.revisada === false);
    adn = await resolverAdn(sub.id);
    comprobar('la submarca resuelve en vivo con lo nuevo de la madre', adn.secciones.prohibiciones.texto === 'gratis, sorteo, regalo', adn.secciones.prohibiciones.texto);
    comprobar('la submarca está en la versión 3 (madre 3)', adn.version === 3 && adn.versionMadre === 3, `${adn.version}/${adn.versionMadre}`);

    // 6. Una campaña fijada en una versión sigue con la foto de entonces.
    const fijada = await resolverAdn(sub.id, { version: 2 });
    comprobar('la versión 2 resuelve con la madre de entonces', fijada.secciones.prohibiciones.texto === 'gratis, regalo', fijada.secciones.prohibiciones.texto);
    const antesDeConfirmar = await resolverAdn(sub.id, { version: 1 });
    comprobar('la versión 1, de antes de confirmar, no hereda', antesDeConfirmar.marcaMadre === null && antesDeConfirmar.secciones.prohibiciones.texto === 'regalo');
    const inexistente = await resolverAdn(sub.id, { version: 99 });
    comprobar('una versión que no existe resuelve la vigente', inexistente.version === 3);

    // 7. Con texto propio la sección pasa a propia.
    await prisma.client.update({ where: { id: sub.id }, data: { voice: 'Juguetona' } });
    await guardarAdnDesdeColumnas(sub.id);
    adn = await resolverAdn(sub.id);
    comprobar('con voz propia deja de heredar', adn.secciones.voz.texto === 'Juguetona' && adn.secciones.voz.modo === 'PROPIA');

    // 8. ADN 2.0: frases que suman, audiencias heredadas o propias, propuestas de la IA.
    const yo = { autorId: 'verify-adn' };
    const fr = await guardarSeccion(madre.id, 'frasesIntocables', { contenido: { texto: 'ViveTerpel\nPuntos ViveTerpel' } }, yo);
    comprobar('una sección nueva de la madre llega a 1 submarca', fr.submarcasAfectadas === 1, String(fr.submarcasAfectadas));
    await guardarSeccion(sub.id, 'frasesIntocables', { contenido: { texto: 'Tienda Altoque' } }, yo);
    adn = await resolverAdn(sub.id);
    comprobar('las frases que no se cambian suman las de la madre', adn.secciones.frasesIntocables.texto === 'ViveTerpel\nPuntos ViveTerpel\nTienda Altoque', JSON.stringify(adn.secciones.frasesIntocables.texto));
    const modoMalo = await guardarSeccion(sub.id, 'prohibiciones', { modo: 'PROPIA' }, yo).then(() => 'guardó', (e: TenantError) => e.statusCode);
    comprobar('una sección que suma no acepta otro modo', modoMalo === 400, String(modoMalo));
    const tratamientoMalo = await guardarSeccion(sub.id, 'tratamiento', { contenido: { texto: 'ELLOS' } }, yo).then(() => 'guardó', (e: TenantError) => e.statusCode);
    comprobar('un tratamiento que no existe es 400', tratamientoMalo === 400, String(tratamientoMalo));

    const versionSinAudiencias = (await resolverAdn(sub.id)).version!;
    const desc = { quienEs: 'Padres de 30 a 50', queLeImporta: 'Llegar sin contratiempos', queLaFrena: 'Estaciones que no conoce', comoHabla: 'Práctico' };
    await crearAudiencia(madre.id, { nombre: 'Familias en carretera', descriptores: desc }, yo);
    adn = await resolverAdn(sub.id);
    comprobar('sin audiencias propias, la submarca hereda las de la madre', adn.secciones.audiencias.origen === 'MADRE' && adn.secciones.audiencias.contenido.audiencias?.length === 1);
    const propuesta = await crearAudiencia(madre.id, { nombre: 'Transportadores', descriptores: desc }, { ...yo, origen: 'IA_PROPUESTA', fuente: 'pdf' });
    adn = await resolverAdn(madre.id);
    comprobar('una audiencia propuesta por la IA no llega al motor', adn.secciones.audiencias.contenido.audiencias?.length === 1);
    await actualizarAudiencia(madre.id, propuesta.audiencia.id, { confirmar: true }, yo);
    adn = await resolverAdn(madre.id);
    comprobar('confirmada, entra a la lista', adn.secciones.audiencias.contenido.audiencias?.length === 2);
    const ajena = await actualizarAudiencia(sub.id, propuesta.audiencia.id, { nombre: 'x' }, yo).then(() => 'guardó', (e: TenantError) => e.statusCode);
    comprobar('la audiencia de otra marca responde 404', ajena === 404, String(ajena));
    await crearAudiencia(sub.id, { nombre: 'Socios ViveTerpel', descriptores: desc }, yo);
    adn = await resolverAdn(sub.id);
    comprobar('con una propia, la submarca usa solo las suyas', adn.secciones.audiencias.origen === 'PROPIA' && adn.secciones.audiencias.texto === 'Socios ViveTerpel', adn.secciones.audiencias.texto);
    await guardarSeccion(sub.id, 'audiencias', { modo: 'HEREDA' }, yo);
    adn = await resolverAdn(sub.id);
    comprobar('en «igual», vuelve a la lista de la madre', adn.secciones.audiencias.texto === 'Familias en carretera · Transportadores', adn.secciones.audiencias.texto);
    const vieja = await resolverAdn(sub.id, { version: versionSinAudiencias });
    comprobar('una versión anterior no ve las audiencias nuevas', !vieja.secciones.audiencias.contenido.audiencias?.length);
    await actualizarAudiencia(madre.id, propuesta.audiencia.id, { archivada: true }, yo);
    adn = await resolverAdn(sub.id);
    comprobar('una audiencia archivada sale de la lista', adn.secciones.audiencias.texto === 'Familias en carretera', adn.secciones.audiencias.texto);

    await guardarSeccion(madre.id, 'productos', { contenido: { texto: '' } }, yo);
    await prisma.seccionAdn.update({
      where: { clientId_clave: { clientId: madre.id, clave: 'productos' } },
      data: { propuesta: { texto: 'Combustibles, lubricantes, tiendas' }, propuestaFuente: 'url', propuestaEn: new Date() },
    });
    adn = await resolverAdn(madre.id);
    comprobar('lo propuesto por la IA no llega antes de confirmarlo', adn.secciones.productos.texto === '');
    await confirmarPropuesta(madre.id, 'productos', 'verify-adn');
    adn = await resolverAdn(madre.id);
    const filaProductos = await prisma.seccionAdn.findUnique({ where: { clientId_clave: { clientId: madre.id, clave: 'productos' } } });
    comprobar('confirmada, llega al motor como IA_CONFIRMADA', adn.secciones.productos.texto === 'Combustibles, lubricantes, tiendas' && filaProductos?.origen === 'IA_CONFIRMADA' && filaProductos.propuesta === null);

    // 9. Sin madre, la submarca queda suelta y no hereda nada.
    await prisma.$transaction(async tx => {
      await tx.client.update({ where: { id: sub.id }, data: { marcaMadreId: null } });
      await guardarAdnDesdeColumnas(sub.id, { motivo: 'familia', tx });
    });
    adn = await resolverAdn(sub.id);
    comprobar('suelta, solo lo propio', adn.marcaMadre === null && adn.secciones.prohibiciones.texto === 'regalo' && adn.secciones.keywords.texto === '');
    const ultima = await prisma.adnVersion.findFirst({ where: { clientId: sub.id }, orderBy: { version: 'desc' } });
    comprobar('salir de la familia es una versión', ultima?.motivo === 'familia' && ultima.madreId === null);

    // 10. Completitud: 75 % y las imprescindibles. Una marca suelta, desde cero.
    const sola = await prisma.client.create({ data: { workspaceId: workspace.id, name: 'Sola', industry: 'Energía' } });
    const largo = 'Una frase con lo que la hace distinta y para quién, más larga que el mínimo de sesenta.';
    let c = completitudAdn(await resolverAdn(sola.id));
    comprobar('una marca vacía está en 0 % y no es apta', c.porcentaje === 0 && !c.apta && c.faltan.length >= 5, `${c.porcentaje} ${c.faltan}`);
    await guardarSeccion(sola.id, 'propuestaDeValor', { contenido: { texto: largo } }, yo);
    await guardarSeccion(sola.id, 'voz', { contenido: { texto: largo } }, yo);
    await guardarSeccion(sola.id, 'prohibiciones', { contenido: { texto: 'gratis, regalo' } }, yo);
    await guardarSeccion(sola.id, 'tratamiento', { contenido: { texto: 'TU' } }, yo);
    await crearAudiencia(sola.id, { nombre: 'Conductores', descriptores: desc }, yo);
    const columnaTratamiento = (await prisma.client.findUnique({ where: { id: sola.id }, select: { tratamiento: true } }))?.tratamiento;
    comprobar('el tratamiento se escribe en su columna', columnaTratamiento === 'TU', String(columnaTratamiento));
    c = completitudAdn(await resolverAdn(sola.id));
    comprobar('con solo las imprescindibles no alcanza el 75 %', c.porcentaje === 67 && !c.apta && c.faltan.length === 2, `${c.porcentaje} ${c.faltan}`);
    await guardarSeccion(sola.id, 'productos', { contenido: { texto: 'Combustible' } }, yo);
    await guardarSeccion(sola.id, 'keywords', { contenido: { texto: 'energía' } }, yo);
    c = completitudAdn(await resolverAdn(sola.id));
    comprobar('con dos más llega al 80 % y es apta', c.porcentaje === 80 && c.apta && c.faltan.length === 0, `${c.porcentaje} ${c.faltan}`);
    await guardarSeccion(sola.id, 'asiSuena', { contenido: { ejemplos: [{ texto: 'a' }, { texto: 'b' }, { texto: 'c' }] } }, yo);
    await guardarSeccion(sola.id, 'frasesIntocables', { contenido: { texto: 'Sola' } }, yo);
    await guardarSeccion(sola.id, 'tratamiento', { contenido: { texto: '' } }, yo);
    c = completitudAdn(await resolverAdn(sola.id));
    comprobar('sin una imprescindible no es apta aunque pase el 75 %', c.porcentaje === 80 && !c.apta && c.faltan.join() === 'tratamiento', `${c.porcentaje} ${c.faltan}`);

    // 11. Reglas de estilo: la pantalla de v1 escribe las notas sin borrar las reglas medibles.
    await guardarSeccion(sola.id, 'reglasDeEstilo', { contenido: { texto: 'Notas', reglas: { emojis: 'no' } } }, yo);
    await prisma.client.update({ where: { id: sola.id }, data: { brandVoiceGuidelines: 'Notas nuevas' } });
    await guardarAdnDesdeColumnas(sola.id);
    adn = await resolverAdn(sola.id);
    comprobar('las notas cambian y las reglas medibles quedan', adn.secciones.reglasDeEstilo.texto === 'Notas nuevas' && adn.secciones.reglasDeEstilo.contenido.reglas?.emojis === 'no');
    await prisma.adnVersion.create({
      data: { clientId: sola.id, version: 999, secciones: { guias: { modo: 'PROPIA', contenido: { texto: 'Guías viejas' } } }, motivo: 'adn' },
    });
    const conGuias = await resolverAdn(sola.id, { version: 999 });
    comprobar('una versión de antes lee las guías como reglas de estilo', conGuias.secciones.reglasDeEstilo.texto === 'Guías viejas', conGuias.secciones.reglasDeEstilo.texto);
  } finally {
    await prisma.notificacion.deleteMany({ where: { workspaceId: workspace.id } });
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
