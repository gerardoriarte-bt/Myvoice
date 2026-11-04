import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { COLUMNAS_ADN, SECCIONES_ADN, SeccionesGuardadas, seccionesDesdeColumnas } from './secciones.js';

type Tx = Prisma.TransactionClient;

/** Qué creó la versión (`AdnVersion.motivo`). */
export type MotivoVersion = 'adn' | 'madre' | 'familia' | 'inicial';

export interface ResultadoGuardado {
  /** La versión nueva, o NULL si nada cambió. */
  version: number | null;
  /** Cuántas submarcas recibieron una versión nueva porque cambió esta marca. */
  submarcasAfectadas: number;
}

const iguales = (a: SeccionesGuardadas, b: SeccionesGuardadas): boolean =>
  SECCIONES_ADN.every(
    d => a[d.clave]?.modo === b[d.clave]?.modo && (a[d.clave]?.contenido.texto ?? '') === (b[d.clave]?.contenido.texto ?? '')
  );

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
      secciones: secciones as Prisma.InputJsonValue,
      motivo,
      autorId,
    },
  });
  return version;
};

/**
 * Pasa el ADN de las columnas de una marca a sus secciones y guarda una versión si cambió. Es el
 * puente con la pantalla de v1, que edita las columnas: se llama después de cada escritura del ADN
 * (crear o editar la marca, leer el manual, cambiarla de familia) y antes de borrarla.
 *
 * Si la marca tiene submarcas, su ADN está confirmado y cambió, cada submarca recibe una versión nueva
 * con la versión nueva de la madre (decisión 16: el cambio llega a todas, y se dice a cuántas). Sin
 * confirmar, las submarcas no heredan (docs/plan-revision-adn.md) y no hay a quién avisarle.
 *
 * Una sección cuyo texto cambia vuelve a quedar sin revisar: lo revisado era el texto anterior.
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
    const client = await tx.client.findUnique({
      where: { id: clientId },
      select: {
        marcaMadreId: true,
        adnConfirmadoEn: true,
        marcaMadre: { select: { adnConfirmadoEn: true } },
        ...(Object.fromEntries(COLUMNAS_ADN.map(c => [c, true])) as Record<(typeof COLUMNAS_ADN)[number], true>),
      },
    });
    if (!client) return { version: null, submarcasAfectadas: 0 };

    const nuevas = seccionesDesdeColumnas(client, Boolean(client.marcaMadreId));
    const filas = await tx.seccionAdn.findMany({ where: { clientId } });
    const actuales: SeccionesGuardadas = {};
    for (const f of filas) {
      actuales[f.clave as keyof SeccionesGuardadas] = { modo: f.modo, contenido: f.contenido as { texto: string } };
    }
    const cambio = filas.length === 0 || !iguales(actuales, nuevas);
    if (!cambio && motivo === 'adn') return { version: null, submarcasAfectadas: 0 };

    for (const def of SECCIONES_ADN) {
      const s = nuevas[def.clave]!;
      const otroTexto = (actuales[def.clave]?.contenido.texto ?? '') !== s.contenido.texto;
      await tx.seccionAdn.upsert({
        where: { clientId_clave: { clientId, clave: def.clave } },
        create: { clientId, clave: def.clave, modo: s.modo, contenido: s.contenido, autorId },
        update: {
          modo: s.modo,
          contenido: s.contenido,
          autorId,
          ...(otroTexto ? { revisadaEn: null, revisadaPorId: null } : {}),
        },
      });
    }
    // La versión registra la madre solo si su ADN está confirmado: es de la que hereda.
    const madreQueHereda = client.marcaMadre?.adnConfirmadoEn ? client.marcaMadreId : null;
    const version = await crearVersion(tx, clientId, nuevas, madreQueHereda, motivo, autorId);

    let submarcasAfectadas = 0;
    if (cambio && client.adnConfirmadoEn) {
      const submarcas = await tx.client.findMany({ where: { marcaMadreId: clientId }, select: { id: true } });
      for (const sub of submarcas) {
        // Una submarca sin secciones todavía resuelve desde sus columnas, sin herencia: no se le
        // inventan secciones acá. Las recibe con `backfill:adn` o cuando se edite su ADN.
        if ((await tx.seccionAdn.count({ where: { clientId: sub.id } })) === 0) continue;
        const propias = await tx.seccionAdn.findMany({ where: { clientId: sub.id } });
        const secciones: SeccionesGuardadas = {};
        for (const f of propias) {
          secciones[f.clave as keyof SeccionesGuardadas] = { modo: f.modo, contenido: f.contenido as { texto: string } };
        }
        await crearVersion(tx, sub.id, secciones, clientId, 'madre', autorId);
        submarcasAfectadas++;
      }
    }
    return { version, submarcasAfectadas };
  };
  return opciones.tx ? trabajo(opciones.tx) : prisma.$transaction(trabajo);
};
