import { prisma } from '../lib/prisma.js';
import { completitudAdn, MINIMO_ADN } from '../comun/adn/completitudAdn.js';
import { resolverAdn } from '../comun/adn/resolverAdn.js';
import type { Paso } from '../contrato/proceso.js';
import { pasoCdm } from '../cdm/planning/planningService.js';
import { copyDeCampana } from '../myvoice/pedidosDeCopy.js';
import { piezasDeCampana } from '../services/piezaService.js';
import { pasoImplementacion } from '../implementacion/anuncios.js';

/**
 * El estado de cada paso del encabezado (F0, docs/plan-plataforma-por-procesos.md): cómo va UNA campaña
 * en el proceso. Se calcula al leer y no se guarda, igual que la etapa de un copy: depende del ADN, del
 * copy y de las piezas, y un estado guardado tendría que mantenerse desde cada uno de esos lugares.
 *
 * Sin campaña («Todas las campañas») los pasos solo navegan: no hay avance que contar (decisión 24).
 * CDM (②) aparece solo en las marcas que lo tienen prendido (`ModuloDeMarca`); Implementación (⑤), cuando
 * exista. Un paso que no se puede abrir no se muestra.
 *
 * Es de la plataforma (2026-11-23; antes vivía en la parte común y leía las tablas de cada módulo con
 * `prisma`): cada módulo dice cómo va lo suyo —CDM su sábana, My Voice su copy, Producción sus piezas— y aquí
 * solo se juntan. Solo lee directo lo que es de la parte común: la marca, su ADN y la campaña.
 */

export type { PasoId, EstadoPaso, Paso } from '../contrato/proceso.js';

const NEUTROS: Paso[] = [
  { paso: 'marca', estado: 'neutro' },
  { paso: 'myvoice', estado: 'neutro' },
  { paso: 'produccion', estado: 'neutro' },
];

const conModulo = (clientId: string, modulo: 'CDM' | 'IMPLEMENTACION') =>
  prisma.moduloDeMarca.findUnique({ where: { clientId_modulo: { clientId, modulo } }, select: { id: true } }).then(Boolean);

/** `clientId` y `campanaId` ya pasaron por la guarda de tenancy: acá no se vuelve a mirar el workspace. */
export const procesoDeCampana = async (clientId: string, campanaId: string | null): Promise<Paso[]> => {
  const [cdm, implementacion] = await Promise.all([conModulo(clientId, 'CDM'), conModulo(clientId, 'IMPLEMENTACION')]);
  const pasos = await pasosDeCampana(clientId, campanaId, implementacion);
  if (!cdm) return pasos;
  return [pasos[0], campanaId ? await pasoCdm(campanaId) : { paso: 'cdm', estado: 'neutro' }, ...pasos.slice(1)];
};

const pasosDeCampana = async (clientId: string, campanaId: string | null, conImplementacion = false): Promise<Paso[]> => {
  if (!campanaId) return conImplementacion ? [...NEUTROS, { paso: 'implementacion', estado: 'neutro' }] : NEUTROS;

  const [adn, campana, copy, piezas] = await Promise.all([
    resolverAdn(clientId).then(a => completitudAdn(a)),
    prisma.project.findUniqueOrThrow({
      where: { id: campanaId },
      select: { responsable: { select: { id: true, name: true } } },
    }),
    copyDeCampana(campanaId),
    piezasDeCampana(campanaId),
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
  const enPieza = new Set(piezas.flatMap(p => p.copyIds));
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

  if (!conImplementacion) return [marca, myvoice, produccion];

  // ⑤ Implementación (F5): las piezas listas que ya están montadas. Hecho solo con todo montado y Producción hecha.
  const imp = await pasoImplementacion(piezas);
  const implementacion: Paso =
    imp.listas === 0
      ? { paso: 'implementacion', estado: 'bloqueado', falta: 'Espera piezas listas' }
      : imp.montados === imp.listas && produccion.estado === 'hecho'
        ? { paso: 'implementacion', estado: 'hecho', texto: `${imp.montados} montados`, avance: { hechas: imp.montados, total: imp.listas } }
        : {
            paso: 'implementacion',
            estado: 'activo',
            texto: `${imp.montados} de ${imp.listas} montados`,
            avance: { hechas: imp.montados, total: imp.listas },
            ...(imp.conNovedad > 0 && { falta: `${imp.conNovedad} con novedad` }),
          };
  return [marca, myvoice, produccion, implementacion];
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
