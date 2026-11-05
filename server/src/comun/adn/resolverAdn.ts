import type { ModoSeccionAdn, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import {
  AudienciaGuardada,
  ClaveAdn,
  COLUMNAS_ADN,
  conClavesDeHoy,
  ContenidoSeccion,
  DescriptoresAudiencia,
  SECCIONES_ADN,
  SECCIONES_CON_COLUMNA,
  SeccionesGuardadas,
  seccionesDesdeColumnas,
  sumar,
} from './secciones.js';

type Db = Prisma.TransactionClient | typeof prisma;

/** De dónde sale el valor que recibe el motor. */
export type OrigenAdn = 'PROPIA' | 'MADRE' | 'SUMA' | 'VACIA';

export interface SeccionResuelta {
  texto: string;
  /** Lo que recibe el motor, completo: en así suena los ejemplos, en audiencias la lista. */
  contenido: ContenidoSeccion;
  origen: OrigenAdn;
  modo: ModoSeccionAdn;
  propio: string;
  deMadre: string;
}

/** Una sección sin nada: ni texto, ni ejemplos, ni audiencias, ni reglas. */
export const estaVacio = (c: ContenidoSeccion | undefined): boolean =>
  !c ||
  (!c.texto?.trim() && !c.ejemplos?.length && !c.audiencias?.length && !Object.keys(c.reglas ?? {}).length);

export interface AdnResuelto {
  clientId: string;
  marcaMadre: { id: string; name: string } | null;
  /** La versión resuelta. NULL = la marca todavía no tiene secciones (no se corrió `backfill:adn`). */
  version: number | null;
  versionMadre: number | null;
  /** `columnas` mientras la marca no tenga secciones: se lee el ADN de hoy, sin herencia. */
  fuente: 'secciones' | 'columnas';
  secciones: Record<ClaveAdn, SeccionResuelta>;
}

interface Propias {
  secciones: SeccionesGuardadas;
  version: number | null;
  madreId: string | null;
  versionMadre: number | null;
  fuente: 'secciones' | 'columnas';
}

const SELECT_COLUMNAS = Object.fromEntries(COLUMNAS_ADN.map(c => [c, true])) as Record<(typeof COLUMNAS_ADN)[number], true>;

/**
 * Las audiencias vigentes de una marca: las confirmadas y sin archivar. Una propuesta de la IA sin
 * confirmar no llega al motor (ADN-7).
 */
export const audienciasVigentes = async (db: Db, clientId: string): Promise<AudienciaGuardada[]> => {
  const filas = await db.audienciaDeMarca.findMany({
    where: { clientId, archivada: false, origen: { not: 'IA_PROPUESTA' } },
    orderBy: [{ orden: 'asc' }, { creadaEn: 'asc' }],
  });
  return filas.map(a => ({ id: a.id, nombre: a.nombre, descriptores: a.descriptores as unknown as DescriptoresAudiencia }));
};

/**
 * Las secciones propias vigentes de una marca, tal como se guardan en una versión: las filas de
 * `SeccionAdn`, lo de las columnas que todavía no tiene fila (el tratamiento de una marca anterior al
 * ADN 2.0) y la lista de audiencias.
 */
export const fotoDeSecciones = async (db: Db, clientId: string, tieneMadre: boolean): Promise<SeccionesGuardadas> => {
  const client = await db.client.findUnique({ where: { id: clientId }, select: SELECT_COLUMNAS });
  const filas = await db.seccionAdn.findMany({ where: { clientId } });
  const desdeColumnas = client ? seccionesDesdeColumnas(client, tieneMadre) : {};
  const secciones: SeccionesGuardadas = {};
  for (const def of SECCIONES_CON_COLUMNA) secciones[def.clave] = desdeColumnas[def.clave];
  for (const f of filas) {
    if (!SECCIONES_ADN.some(d => d.clave === f.clave)) continue;
    secciones[f.clave as ClaveAdn] = { modo: f.modo, contenido: f.contenido as unknown as ContenidoSeccion };
  }
  const audiencias = await audienciasVigentes(db, clientId);
  const modo = secciones.audiencias?.modo ?? (tieneMadre && audiencias.length === 0 ? 'HEREDA' : 'PROPIA');
  secciones.audiencias = { modo, contenido: { texto: audiencias.map(a => a.nombre).join(' · '), audiencias } };
  return secciones;
};

/** Las secciones propias de una marca: las vigentes, o las de una versión guardada. */
const propiasDe = async (db: Db, clientId: string, version?: number | null): Promise<Propias | null> => {
  if (version != null) {
    const v = await db.adnVersion.findUnique({ where: { clientId_version: { clientId, version } } });
    if (!v) return null;
    return {
      secciones: conClavesDeHoy(v.secciones as Record<string, never>),
      version: v.version,
      madreId: v.madreId,
      versionMadre: v.versionMadre,
      fuente: 'secciones',
    };
  }
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { marcaMadreId: true, _count: { select: { seccionesAdn: true } }, ...SELECT_COLUMNAS },
  });
  if (!client) return null;
  if (client._count.seccionesAdn === 0) {
    return {
      secciones: seccionesDesdeColumnas(client, false),
      version: null,
      madreId: null,
      versionMadre: null,
      fuente: 'columnas',
    };
  }
  const ultima = await db.adnVersion.findFirst({ where: { clientId }, orderBy: { version: 'desc' } });
  return {
    secciones: await fotoDeSecciones(db, clientId, Boolean(client.marcaMadreId)),
    version: ultima?.version ?? null,
    madreId: client.marcaMadreId,
    versionMadre: null,
    fuente: 'secciones',
  };
};

/**
 * El ADN de una marca resuelto con el de su madre (decisión 16): la única función que lo arma. La
 * usan el motor (`parametrosDeGeneracion`) y `GET /clients/:id/adn`.
 *
 * Una submarca hereda solo si el ADN de su madre está confirmado (`Client.adnConfirmadoEn`,
 * docs/plan-revision-adn.md): sin eso resuelve solo lo propio, aunque ya tenga secciones.
 *
 * Sin `version` resuelve lo vigente: las secciones de la marca y las de su madre, en vivo. Con
 * `version` resuelve la foto guardada: las secciones de esa versión y las de la versión de la madre
 * que quedó registrada con ella.
 *
 * Quien llama ya verificó que la marca es del workspace (`assertClientInWorkspace`); la madre siempre
 * es del mismo workspace (`validarMadre` en clientController).
 */
export const resolverAdn = async (
  clientId: string,
  opciones: { version?: number | null; db?: Db } = {}
): Promise<AdnResuelto> => {
  const db = opciones.db ?? prisma;
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      marcaMadreId: true,
      marcaMadre: { select: { id: true, name: true, adnConfirmadoEn: true } },
    },
  });
  if (!client) throw new Error(`resolverAdn: no existe la marca ${clientId}`);

  // Una versión que no existe (borrada con su marca, o de antes del backfill) no rompe la
  // generación: se resuelve lo vigente.
  const propias =
    (opciones.version != null ? await propiasDe(db, clientId, opciones.version) : null) ??
    (await propiasDe(db, clientId));
  if (!propias) throw new Error(`resolverAdn: no existe la marca ${clientId}`);

  const enVivo = propias.version == null || opciones.version == null;
  // Una versión guardada registra la madre solo si estaba confirmada (`guardarAdnDesdeColumnas`).
  const madreConfirmada = client.marcaMadre?.adnConfirmadoEn ? client.marcaMadreId : null;
  const madreId = propias.fuente === 'columnas' ? null : enVivo ? madreConfirmada : propias.madreId;
  const deMadre = madreId
    ? await propiasDe(db, madreId, enVivo ? null : propias.versionMadre)
    : null;
  const marcaMadre =
    madreId && deMadre
      ? client.marcaMadre?.id === madreId
        ? { id: client.marcaMadre.id, name: client.marcaMadre.name }
        : await db.client.findUnique({ where: { id: madreId }, select: { id: true, name: true } })
      : null;

  const secciones = {} as Record<ClaveAdn, SeccionResuelta>;
  for (const def of SECCIONES_ADN) {
    const propia = propias.secciones[def.clave];
    const modo = propia?.modo ?? def.modos[0];
    const contenidoPropio: ContenidoSeccion = propia?.contenido ?? { texto: '' };
    const propio = (contenidoPropio.texto ?? '').trim();
    // La madre es de un solo nivel: lo suyo es siempre propio, sea cual sea el modo guardado.
    const contenidoMadre: ContenidoSeccion | undefined = marcaMadre ? deMadre?.secciones[def.clave]?.contenido : undefined;
    const madre = (contenidoMadre?.texto ?? '').trim();

    let contenido = contenidoPropio;
    let origen: OrigenAdn = estaVacio(contenidoPropio) ? 'VACIA' : 'PROPIA';
    if (marcaMadre && modo === 'SUMA' && madre) {
      contenido = { texto: sumar(madre, propio, def.separador) };
      origen = propio ? 'SUMA' : 'MADRE';
    } else if (marcaMadre && modo === 'HEREDA') {
      contenido = contenidoMadre ?? { texto: '' };
      origen = estaVacio(contenidoMadre) ? 'VACIA' : 'MADRE';
    }
    secciones[def.clave] = { texto: (contenido.texto ?? '').trim(), contenido, origen, modo, propio, deMadre: madre };
  }

  return {
    clientId,
    marcaMadre: marcaMadre ?? null,
    version: propias.version,
    versionMadre: marcaMadre ? (enVivo ? deMadre?.version ?? null : propias.versionMadre) : null,
    fuente: propias.fuente,
    secciones,
  };
};
