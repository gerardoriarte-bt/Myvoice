import { prisma } from '../lib/prisma.js';
import { completitudAdn, MINIMO_ADN } from './adn/completitudAdn.js';
import { resolverAdn } from './adn/resolverAdn.js';

/**
 * El estado de cada paso del encabezado (F0, docs/plan-plataforma-por-procesos.md): cómo va UNA campaña
 * en el proceso. Se calcula al leer y no se guarda, igual que la etapa de un copy: depende del ADN, del
 * copy y de las piezas, y un estado guardado tendría que mantenerse desde cada uno de esos lugares.
 *
 * Sin campaña («Todas las campañas») los pasos solo navegan: no hay avance que contar (decisión 24).
 * CDM (②) e Implementación (⑤) no aparecen hasta que existan: un paso que no se puede abrir no se muestra.
 *
 * Lee las tablas con `prisma` y no los servicios de My Voice: la parte común no importa un módulo
 * (`npm run fronteras`). Son conteos; las reglas de quién aprueba siguen en `aprobacion.ts`.
 */

export type PasoId = 'marca' | 'myvoice' | 'produccion';

/**
 * hecho = ✓ · activo = en curso · pendiente = no empezó · bloqueado = espera algo de otro paso ·
 * neutro = sin campaña elegida, solo navega.
 */
export type EstadoPaso = 'hecho' | 'activo' | 'pendiente' | 'bloqueado' | 'neutro';

export interface Paso {
  paso: PasoId;
  estado: EstadoPaso;
  /** La línea chica bajo el nombre del paso: «6 de 17 piezas». */
  texto?: string;
  /** Qué falta, cuando está bloqueado o pendiente. */
  falta?: string;
  /** A quién le toca destrabarlo. */
  quien?: { id: string; nombre: string };
  avance?: { hechas: number; total: number };
}

const NEUTROS: Paso[] = [
  { paso: 'marca', estado: 'neutro' },
  { paso: 'myvoice', estado: 'neutro' },
  { paso: 'produccion', estado: 'neutro' },
];

/** `clientId` y `campanaId` ya pasaron por la guarda de tenancy: acá no se vuelve a mirar el workspace. */
export const procesoDeCampana = async (clientId: string, campanaId: string | null): Promise<Paso[]> => {
  if (!campanaId) return NEUTROS;

  const [adn, campana, copy, piezas] = await Promise.all([
    resolverAdn(clientId).then(a => completitudAdn(a)),
    prisma.project.findUniqueOrThrow({
      where: { id: campanaId },
      select: { responsable: { select: { id: true, name: true } } },
    }),
    prisma.savedVariation.findMany({ where: { projectId: campanaId }, select: { id: true, isApproved: true } }),
    prisma.pieza.findMany({
      where: { projectId: campanaId, canceladaEn: null },
      select: { estado: true, slots: { select: { savedVariationId: true } } },
    }),
  ]);
  const quien = campana.responsable ? { id: campana.responsable.id, nombre: campana.responsable.name } : undefined;

  // ① Marca: el ADN de la marca, con el mismo mínimo que Marcas y Generar.
  const marca: Paso = adn.apta
    ? { paso: 'marca', estado: 'hecho', texto: `ADN al ${adn.porcentaje} %` }
    : {
        paso: 'marca',
        estado: adn.porcentaje > 0 ? 'activo' : 'pendiente',
        texto: `ADN al ${adn.porcentaje} %`,
        falta: `Completar el ADN hasta el ${MINIMO_ADN} % y sus secciones ★`,
      };

  // ③ My Voice: el copy de la campaña y cuánto está aprobado.
  const aprobados = copy.filter(c => c.isApproved);
  const myvoice: Paso =
    copy.length === 0
      ? { paso: 'myvoice', estado: 'pendiente', texto: 'Sin copy todavía', falta: 'Generar el copy de la campaña' }
      : aprobados.length === copy.length
        ? { paso: 'myvoice', estado: 'hecho', texto: `${copy.length} aprobados`, avance: { hechas: copy.length, total: copy.length } }
        : {
            paso: 'myvoice',
            estado: 'activo',
            texto: `${aprobados.length} de ${copy.length} aprobados`,
            falta: 'Aprobar el copy',
            quien,
            avance: { hechas: aprobados.length, total: copy.length },
          };

  // ④ Producción: las piezas de la campaña. Nunca ✓ mientras quede copy aprobado sin pieza.
  const enPieza = new Set(piezas.flatMap(p => p.slots.map(s => s.savedVariationId)));
  const aprobadosSinPieza = aprobados.filter(c => !enPieza.has(c.id)).length;
  const listas = piezas.filter(p => p.estado === 'LISTA').length;
  const produccion: Paso =
    piezas.length === 0
      ? aprobados.length === 0
        ? { paso: 'produccion', estado: 'bloqueado', falta: 'Espera copy aprobado', quien }
        : { paso: 'produccion', estado: 'pendiente', texto: 'Sin piezas todavía', falta: 'Crear las piezas del copy aprobado' }
      : listas === piezas.length && aprobadosSinPieza === 0 && myvoice.estado === 'hecho'
        ? { paso: 'produccion', estado: 'hecho', texto: `${listas} piezas listas`, avance: { hechas: listas, total: listas } }
        : {
            paso: 'produccion',
            estado: 'activo',
            texto: `${listas} de ${piezas.length} piezas`,
            avance: { hechas: listas, total: piezas.length },
            ...(aprobadosSinPieza > 0 && { falta: `${aprobadosSinPieza} aprobados sin pieza` }),
          };

  return [marca, myvoice, produccion];
};

/**
 * «En qué va» la campaña: el primer paso del trabajo (My Voice, Producción) que no está hecho. El ADN no
 * frena a una marca sin CDM —en v1 avisa y no bloquea—, así que cuenta solo cuando lo demás está hecho: si
 * no, todas las campañas de una marca con el ADN a medias dirían «en Marca» aunque estén produciendo piezas.
 * `null` = terminó los pasos que existen.
 */
export const pasoEnCurso = (pasos: Paso[]): Paso | null =>
  pasos.find(p => p.paso !== 'marca' && p.estado !== 'hecho') ?? pasos.find(p => p.estado !== 'hecho') ?? null;

export interface CampanaEnProceso {
  id: string;
  nombre: string;
  marca: { id: string; nombre: string };
  pasos: Paso[];
  /** El paso en que va y, si espera algo, qué y a quién. */
  enCurso: Paso | null;
}

/**
 * Las campañas de una marca —o de todo el workspace, para el Panorama— con su proceso. Una consulta por
 * campaña: alcanza para decenas; cuando sean cientos, el Panorama tiene que paginar.
 */
export const campanasEnProceso = async (workspaceId: string, clientId?: string): Promise<CampanaEnProceso[]> => {
  const campanas = await prisma.project.findMany({
    where: { workspaceId, clientId: clientId ?? { not: null } },
    select: { id: true, name: true, client: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return Promise.all(
    campanas
      .filter(c => c.client)
      .map(async c => {
        const pasos = await procesoDeCampana(c.client!.id, c.id);
        return { id: c.id, nombre: c.name, marca: { id: c.client!.id, nombre: c.client!.name }, pasos, enCurso: pasoEnCurso(pasos) };
      })
  );
};
