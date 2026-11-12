import type { OrigenSeccion, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { TenantError } from '../../lib/tenancy.js';
import { guardarAdnDesdeColumnas, registrarVersion, ResultadoGuardado } from './guardarAdn.js';
import { DescriptoresAudiencia, descriptoresValidos } from './secciones.js';

/**
 * Las audiencias de una marca: una lista fija que todas sus campañas reutilizan (ADN-1,
 * docs/plan-adn-2.md). Se editan una por una; cada cambio en las vigentes es una versión del ADN, con
 * su cascada a las submarcas que heredan la lista. Una audiencia no se borra: se archiva, porque una
 * campaña pudo haberla usado.
 *
 * Quien llama ya verificó que la marca es del workspace (`assertClientInWorkspace`). La audiencia se
 * busca siempre junto a su marca: una de otra marca responde 404, igual que un recurso ajeno.
 */

type Tx = Prisma.TransactionClient;

export interface AudienciaEnPantalla {
  id: string;
  nombre: string;
  descriptores: DescriptoresAudiencia;
  origen: OrigenSeccion;
  fuente: string | null;
  orden: number;
  archivada: boolean;
}

const NOMBRE_MAX = 120;

const nombreValido = (v: unknown): string => {
  if (typeof v !== 'string' || !v.trim()) throw new TenantError('La audiencia necesita un nombre', 400);
  if (v.length > NOMBRE_MAX) throw new TenantError(`El nombre supera los ${NOMBRE_MAX} caracteres`, 400);
  return v.trim();
};

const descriptores = (v: unknown): DescriptoresAudiencia => {
  try {
    return descriptoresValidos(v);
  } catch (e) {
    throw new TenantError((e as Error).message, 400);
  }
};

const aPantalla = (a: {
  id: string;
  nombre: string;
  descriptores: Prisma.JsonValue;
  origen: OrigenSeccion;
  fuente: string | null;
  orden: number;
  archivada: boolean;
}): AudienciaEnPantalla => ({
  id: a.id,
  nombre: a.nombre,
  descriptores: a.descriptores as unknown as DescriptoresAudiencia,
  origen: a.origen,
  fuente: a.fuente,
  orden: a.orden,
  archivada: a.archivada,
});

/** Todas las de la marca, también las archivadas y las propuestas: es lo que muestra la pantalla. */
export const listarAudiencias = async (clientId: string): Promise<AudienciaEnPantalla[]> =>
  (
    await prisma.audienciaDeMarca.findMany({ where: { clientId }, orderBy: [{ orden: 'asc' }, { creadaEn: 'asc' }] })
  ).map(aPantalla);

const deLaMarca = async (tx: Tx, clientId: string, audienciaId: string) => {
  const a = await tx.audienciaDeMarca.findFirst({ where: { id: audienciaId, clientId } });
  if (!a) throw new TenantError('Audiencia no encontrada', 404);
  return a;
};

/** La marca tiene que estar en secciones: sin filas, el resolver lee las columnas y no ve la lista. */
const conSecciones = async (tx: Tx, clientId: string, autorId: string | null) => {
  if ((await tx.seccionAdn.count({ where: { clientId } })) === 0)
    await guardarAdnDesdeColumnas(clientId, { motivo: 'inicial', autorId, tx });
};

const cuenta = (a: { archivada: boolean; origen: OrigenSeccion }) => !a.archivada && a.origen !== 'IA_PROPUESTA';

export const crearAudiencia = async (
  clientId: string,
  datos: { nombre?: unknown; descriptores?: unknown },
  opciones: { autorId: string | null; origen?: OrigenSeccion; fuente?: string }
): Promise<{ audiencia: AudienciaEnPantalla } & ResultadoGuardado> => {
  const nombre = nombreValido(datos.nombre);
  const d = descriptores(datos.descriptores);
  return prisma.$transaction(async tx => {
    await conSecciones(tx, clientId, opciones.autorId);
    const ultima = await tx.audienciaDeMarca.findFirst({ where: { clientId }, orderBy: { orden: 'desc' } });
    const a = await tx.audienciaDeMarca.create({
      data: {
        clientId,
        nombre,
        descriptores: d as unknown as Prisma.InputJsonValue,
        origen: opciones.origen ?? 'PERSONA',
        fuente: opciones.fuente ?? null,
        orden: (ultima?.orden ?? -1) + 1,
        autorId: opciones.autorId,
      },
    });
    const r = cuenta(a)
      ? await registrarVersion(tx, clientId, { cambio: true, motivo: 'adn', autorId: opciones.autorId })
      : { version: null, submarcasAfectadas: 0 };
    return { audiencia: aPantalla(a), ...r };
  });
};

/**
 * Edita nombre, descriptores, orden o `archivada`. `confirmar: true` acepta una propuesta de la IA
 * (IA_PROPUESTA → IA_CONFIRMADA); editar a mano lo que propuso la IA también la deja confirmada, con
 * origen PERSONA.
 */
export const actualizarAudiencia = async (
  clientId: string,
  audienciaId: string,
  datos: { nombre?: unknown; descriptores?: unknown; orden?: unknown; archivada?: unknown; confirmar?: unknown },
  opciones: { autorId: string | null }
): Promise<{ audiencia: AudienciaEnPantalla } & ResultadoGuardado> => {
  const cambios: Prisma.AudienciaDeMarcaUpdateInput = { autorId: opciones.autorId };
  if (datos.nombre !== undefined) cambios.nombre = nombreValido(datos.nombre);
  if (datos.descriptores !== undefined)
    cambios.descriptores = descriptores(datos.descriptores) as unknown as Prisma.InputJsonValue;
  if (datos.orden !== undefined) {
    if (!Number.isInteger(datos.orden)) throw new TenantError('El orden tiene que ser un entero', 400);
    cambios.orden = datos.orden as number;
  }
  if (datos.archivada !== undefined) cambios.archivada = Boolean(datos.archivada);
  return prisma.$transaction(async tx => {
    const antes = await deLaMarca(tx, clientId, audienciaId);
    if (antes.origen === 'IA_PROPUESTA') {
      if (datos.confirmar === true) cambios.origen = 'IA_CONFIRMADA';
      else if (cambios.nombre !== undefined || cambios.descriptores !== undefined) cambios.origen = 'PERSONA';
    }
    await conSecciones(tx, clientId, opciones.autorId);
    const a = await tx.audienciaDeMarca.update({ where: { id: audienciaId }, data: cambios });
    const r =
      cuenta(antes) || cuenta(a)
        ? await registrarVersion(tx, clientId, { cambio: true, motivo: 'adn', autorId: opciones.autorId })
        : { version: null, submarcasAfectadas: 0 };
    return { audiencia: aPantalla(a), ...r };
  });
};
