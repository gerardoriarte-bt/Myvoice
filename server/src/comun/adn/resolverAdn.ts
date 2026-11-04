import type { ModoSeccionAdn, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import {
  ClaveAdn,
  COLUMNAS_ADN,
  SECCIONES_ADN,
  SeccionesGuardadas,
  seccionesDesdeColumnas,
  sumar,
} from './secciones.js';

type Db = Prisma.TransactionClient | typeof prisma;

/** De dónde sale el valor que recibe el motor. */
export type OrigenAdn = 'PROPIA' | 'MADRE' | 'SUMA' | 'VACIA';

export interface SeccionResuelta {
  texto: string;
  origen: OrigenAdn;
  modo: ModoSeccionAdn;
  propio: string;
  deMadre: string;
}

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

/** Las secciones propias de una marca: las vigentes, o las de una versión guardada. */
const propiasDe = async (db: Db, clientId: string, version?: number | null): Promise<Propias | null> => {
  if (version != null) {
    const v = await db.adnVersion.findUnique({ where: { clientId_version: { clientId, version } } });
    if (!v) return null;
    return {
      secciones: v.secciones as SeccionesGuardadas,
      version: v.version,
      madreId: v.madreId,
      versionMadre: v.versionMadre,
      fuente: 'secciones',
    };
  }
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { marcaMadreId: true, ...SELECT_COLUMNAS },
  });
  if (!client) return null;
  const filas = await db.seccionAdn.findMany({ where: { clientId } });
  if (filas.length === 0) {
    return {
      secciones: seccionesDesdeColumnas(client, false),
      version: null,
      madreId: null,
      versionMadre: null,
      fuente: 'columnas',
    };
  }
  const ultima = await db.adnVersion.findFirst({ where: { clientId }, orderBy: { version: 'desc' } });
  const secciones: SeccionesGuardadas = {};
  for (const f of filas) {
    secciones[f.clave as ClaveAdn] = { modo: f.modo, contenido: f.contenido as { texto: string } };
  }
  return {
    secciones,
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
    select: { id: true, marcaMadreId: true, marcaMadre: { select: { id: true, name: true } } },
  });
  if (!client) throw new Error(`resolverAdn: no existe la marca ${clientId}`);

  // Una versión que no existe (borrada con su marca, o de antes del backfill) no rompe la
  // generación: se resuelve lo vigente.
  const propias =
    (opciones.version != null ? await propiasDe(db, clientId, opciones.version) : null) ??
    (await propiasDe(db, clientId));
  if (!propias) throw new Error(`resolverAdn: no existe la marca ${clientId}`);

  const enVivo = propias.version == null || opciones.version == null;
  const madreId = propias.fuente === 'columnas' ? null : enVivo ? client.marcaMadreId : propias.madreId;
  const deMadre = madreId
    ? await propiasDe(db, madreId, enVivo ? null : propias.versionMadre)
    : null;
  const marcaMadre =
    madreId && deMadre
      ? client.marcaMadre?.id === madreId
        ? client.marcaMadre
        : await db.client.findUnique({ where: { id: madreId }, select: { id: true, name: true } })
      : null;

  const secciones = {} as Record<ClaveAdn, SeccionResuelta>;
  for (const def of SECCIONES_ADN) {
    const propia = propias.secciones[def.clave];
    const modo = propia?.modo ?? def.modos[0];
    const propio = (propia?.contenido?.texto ?? '').trim();
    // La madre es de un solo nivel: lo suyo es siempre propio, sea cual sea el modo guardado.
    const madre = marcaMadre ? (deMadre?.secciones[def.clave]?.contenido?.texto ?? '').trim() : '';

    let texto = propio;
    let origen: OrigenAdn = propio ? 'PROPIA' : 'VACIA';
    if (marcaMadre && modo === 'SUMA' && madre) {
      texto = sumar(madre, propio);
      origen = propio ? 'SUMA' : 'MADRE';
    } else if (marcaMadre && modo === 'HEREDA') {
      texto = madre;
      origen = madre ? 'MADRE' : 'VACIA';
    }
    secciones[def.clave] = { texto, origen, modo, propio, deMadre: madre };
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
