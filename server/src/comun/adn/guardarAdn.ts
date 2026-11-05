import { ModoSeccionAdn, OrigenSeccion, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { TenantError } from '../../lib/tenancy.js';
import { fotoDeSecciones } from './resolverAdn.js';
import {
  ContenidoSeccion,
  contenidoValido,
  SECCIONES_ADN,
  SECCIONES_CON_COLUMNA,
  SeccionesGuardadas,
  seccion,
  modoDesdeTexto,
} from './secciones.js';

type Tx = Prisma.TransactionClient;

/** Qué creó la versión (`AdnVersion.motivo`). */
export type MotivoVersion = 'adn' | 'madre' | 'familia' | 'inicial';

export interface ResultadoGuardado {
  /** La versión nueva, o NULL si nada cambió. */
  version: number | null;
  /** Cuántas submarcas recibieron una versión nueva porque cambió esta marca. */
  submarcasAfectadas: number;
}

const firma = (s: SeccionesGuardadas[keyof SeccionesGuardadas]) => JSON.stringify(s ? [s.modo, s.contenido] : null);

const iguales = (a: SeccionesGuardadas, b: SeccionesGuardadas): boolean =>
  SECCIONES_ADN.every(d => firma(a[d.clave]) === firma(b[d.clave]));

const crearVersion = async (
  tx: Tx,
  clientId: string,
  secciones: SeccionesGuardadas,
  madreId: string | null,
  motivo: MotivoVersion,
  autorId: string | null
): Promise<number> => {
  const ultima = await tx.adnVersion.findFirst({ where: { clientId }, orderBy: { version: 'desc' } });
  const deMadre = madreId
    ? await tx.adnVersion.findFirst({ where: { clientId: madreId }, orderBy: { version: 'desc' } })
    : null;
  const version = (ultima?.version ?? 0) + 1;
  await tx.adnVersion.create({
    data: {
      clientId,
      version,
      madreId,
      versionMadre: deMadre?.version ?? null,
      secciones: secciones as unknown as Prisma.InputJsonValue,
      motivo,
      autorId,
    },
  });
  return version;
};

/**
 * Guarda la versión de una marca con sus secciones de ahora y, si cambiaron y su ADN está confirmado,
 * una versión nueva para cada submarca (decisión 16: el cambio llega a todas, y se dice a cuántas). Sin
 * confirmar, las submarcas no heredan (docs/plan-revision-adn.md) y no hay a quién avisarle.
 *
 * Es el final de toda escritura del ADN: columnas de v1, una sección, una audiencia.
 */
export const registrarVersion = async (
  tx: Tx,
  clientId: string,
  opciones: { cambio: boolean; motivo: MotivoVersion; autorId: string | null }
): Promise<ResultadoGuardado> => {
  const client = await tx.client.findUnique({
    where: { id: clientId },
    select: { marcaMadreId: true, adnConfirmadoEn: true, marcaMadre: { select: { adnConfirmadoEn: true } } },
  });
  if (!client) return { version: null, submarcasAfectadas: 0 };
  const secciones = await fotoDeSecciones(tx, clientId, Boolean(client.marcaMadreId));
  // La versión registra la madre solo si su ADN está confirmado: es de la que hereda.
  const madreQueHereda = client.marcaMadre?.adnConfirmadoEn ? client.marcaMadreId : null;
  const version = await crearVersion(tx, clientId, secciones, madreQueHereda, opciones.motivo, opciones.autorId);

  let submarcasAfectadas = 0;
  if (opciones.cambio && client.adnConfirmadoEn) {
    const submarcas = await tx.client.findMany({ where: { marcaMadreId: clientId }, select: { id: true } });
    for (const sub of submarcas) {
      // Una submarca sin secciones todavía resuelve desde sus columnas, sin herencia: no se le
      // inventan secciones acá. Las recibe con `backfill:adn` o cuando se edite su ADN.
      if ((await tx.seccionAdn.count({ where: { clientId: sub.id } })) === 0) continue;
      await crearVersion(tx, sub.id, await fotoDeSecciones(tx, sub.id, true), clientId, 'madre', opciones.autorId);
      submarcasAfectadas++;
    }
  }
  return { version, submarcasAfectadas };
};

/**
 * Pasa el ADN de las columnas de una marca a sus secciones y guarda una versión si cambió. Es el
 * puente con la pantalla de v1, que edita las columnas: se llama después de cada escritura del ADN
 * (crear o editar la marca, leer el manual, cambiarla de familia) y antes de borrarla.
 *
 * Solo toca las secciones que tienen columna; lo demás de la sección (las reglas medibles de reglas de
 * estilo) se conserva. Una sección cuyo texto cambia vuelve a quedar sin revisar: lo revisado era el
 * texto anterior.
 *
 * `motivo` distinto de `adn` guarda versión aunque las secciones no cambien: cambió la madre o la
 * familia, y eso cambia lo que se resuelve.
 */
export const guardarAdnDesdeColumnas = async (
  clientId: string,
  opciones: { motivo?: MotivoVersion; autorId?: string | null; tx?: Tx } = {}
): Promise<ResultadoGuardado> => {
  const motivo = opciones.motivo ?? 'adn';
  const autorId = opciones.autorId ?? null;
  const trabajo = async (tx: Tx): Promise<ResultadoGuardado> => {
    const client = await tx.client.findUnique({ where: { id: clientId }, select: { marcaMadreId: true } });
    if (!client) return { version: null, submarcasAfectadas: 0 };
    const tieneMadre = Boolean(client.marcaMadreId);
    const sinFilas = (await tx.seccionAdn.count({ where: { clientId } })) === 0;
    // Con filas, la foto ya trae lo de las columnas para lo que no tiene fila; sin filas, todo es nuevo.
    const antes = sinFilas ? {} : await fotoDeSecciones(tx, clientId, tieneMadre);
    const columnas = await tx.client.findUniqueOrThrow({
      where: { id: clientId },
      select: Object.fromEntries(SECCIONES_CON_COLUMNA.map(d => [d.columna, true])) as Record<string, true>,
    });

    let cambio = sinFilas;
    for (const def of SECCIONES_CON_COLUMNA) {
      const texto = String((columnas as Record<string, unknown>)[def.columna!] ?? '').trim();
      const previa = antes[def.clave];
      const nueva = { modo: modoDesdeTexto(def, texto, tieneMadre), contenido: { ...previa?.contenido, texto } };
      if (!sinFilas && firma(previa) === firma(nueva)) continue;
      cambio = true;
      const otroTexto = (previa?.contenido.texto ?? '') !== texto;
      await tx.seccionAdn.upsert({
        where: { clientId_clave: { clientId, clave: def.clave } },
        create: { clientId, clave: def.clave, modo: nueva.modo, contenido: nueva.contenido as unknown as Prisma.InputJsonValue, autorId },
        update: {
          modo: nueva.modo,
          contenido: nueva.contenido as unknown as Prisma.InputJsonValue,
          autorId,
          ...(otroTexto ? { revisadaEn: null, revisadaPorId: null } : {}),
        },
      });
    }
    if (!cambio && motivo === 'adn') return { version: null, submarcasAfectadas: 0 };
    return registrarVersion(tx, clientId, { cambio, motivo, autorId });
  };
  return opciones.tx ? trabajo(opciones.tx) : prisma.$transaction(trabajo);
};

/**
 * Guarda una sección del ADN 2.0 (`PUT /clients/:id/adn/:clave`): su contenido, su modo frente a la
 * madre, o los dos. Valida la forma en `secciones.ts`, escribe la columna espejo cuando la hay (la
 * pantalla de v1 sigue leyendo de ahí) y guarda una versión si algo cambió.
 *
 * Las audiencias solo cambian de modo acá: la lista se edita una por una (`audiencias.ts`).
 */
export const guardarSeccion = async (
  clientId: string,
  clave: string,
  cambios: { contenido?: unknown; modo?: unknown },
  opciones: { autorId: string | null; origen?: OrigenSeccion; tx?: Tx }
): Promise<ResultadoGuardado> => {
  const def = seccion(clave);
  if (!def) throw new TenantError(`No existe la sección «${clave}»`, 400);
  if (cambios.modo !== undefined && !def.modos.includes(cambios.modo as ModoSeccionAdn))
    throw new TenantError(`${def.nombre} admite ${def.modos.join(' o ')}`, 400);
  let contenido: ContenidoSeccion | undefined;
  if (cambios.contenido !== undefined) {
    try {
      contenido = contenidoValido(def, cambios.contenido);
    } catch (e) {
      throw new TenantError((e as Error).message, 400);
    }
  }
  const trabajo = async (tx: Tx): Promise<ResultadoGuardado> => {
    const client = await tx.client.findUniqueOrThrow({ where: { id: clientId }, select: { marcaMadreId: true } });
    const tieneMadre = Boolean(client.marcaMadreId);
    // Una marca anterior al backfill se pasa primero a secciones: si no, esta sería su única fila y
    // las demás dejarían de leerse de las columnas.
    if ((await tx.seccionAdn.count({ where: { clientId } })) === 0)
      await guardarAdnDesdeColumnas(clientId, { motivo: 'inicial', autorId: opciones.autorId, tx });
    const antes = await fotoDeSecciones(tx, clientId, tieneMadre);
    const previa = antes[def.clave];
    const modo = (cambios.modo as ModoSeccionAdn | undefined) ?? previa?.modo ?? def.modos[0];
    const nuevo: ContenidoSeccion =
      def.clave === 'audiencias' ? { texto: '' } : contenido ?? previa?.contenido ?? { texto: '' };
    const otroTexto = def.clave !== 'audiencias' && contenido !== undefined && firma({ modo, contenido: nuevo }) !== firma({ modo, contenido: previa?.contenido ?? { texto: '' } });
    const datos = {
      modo,
      contenido: nuevo as unknown as Prisma.InputJsonValue,
      autorId: opciones.autorId,
      ...(otroTexto ? { origen: opciones.origen ?? 'PERSONA', revisadaEn: null, revisadaPorId: null } : {}),
    };
    await tx.seccionAdn.upsert({
      where: { clientId_clave: { clientId, clave: def.clave } },
      create: { clientId, clave: def.clave, ...datos },
      update: datos,
    });
    if (def.columna && contenido !== undefined) {
      const valor = def.clave === 'tratamiento' ? nuevo.texto || null : nuevo.texto;
      await tx.client.update({ where: { id: clientId }, data: { [def.columna]: valor } });
    }
    const despues = await fotoDeSecciones(tx, clientId, tieneMadre);
    if (iguales(antes, despues)) return { version: null, submarcasAfectadas: 0 };
    return registrarVersion(tx, clientId, { cambio: true, motivo: 'adn', autorId: opciones.autorId });
  };
  return opciones.tx ? trabajo(opciones.tx) : prisma.$transaction(trabajo);
};

/**
 * «Está bien» sobre lo que propuso la IA: la propuesta pasa a ser el contenido de la sección, con
 * origen IA_CONFIRMADA y quien la confirmó como autor. Hasta acá no llegaba al motor ni contaba para
 * el mínimo (ADN-7). Sin propuesta, 409.
 */
export const confirmarPropuesta = async (clientId: string, clave: string, autorId: string): Promise<ResultadoGuardado> =>
  prisma.$transaction(async tx => {
    const fila = await tx.seccionAdn.findUnique({ where: { clientId_clave: { clientId, clave } } });
    if (!fila?.propuesta) throw new TenantError('Esta sección no tiene nada propuesto por la IA', 409);
    const r = await guardarSeccion(clientId, clave, { contenido: fila.propuesta }, { autorId, origen: 'IA_CONFIRMADA', tx });
    await tx.seccionAdn.update({
      where: { clientId_clave: { clientId, clave } },
      data: { propuesta: Prisma.DbNull, propuestaFuente: null, propuestaEn: null, revisadaEn: new Date(), revisadaPorId: autorId },
    });
    return r;
  });

/** «Descartar» lo que propuso la IA. No cambia el ADN, así que no hay versión. */
export const descartarPropuesta = async (clientId: string, clave: string): Promise<void> => {
  await prisma.seccionAdn.updateMany({
    where: { clientId, clave },
    data: { propuesta: Prisma.DbNull, propuestaFuente: null, propuestaEn: null },
  });
};
