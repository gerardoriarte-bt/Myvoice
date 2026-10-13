import { ModoAprobacion, ReviewDecision } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import {
  assertDnaProfileInWorkspace,
  assertProjectInWorkspace,
  TenantContext,
  TenantError,
} from '../lib/tenancy.js';

/**
 * La aprobación del copy, por campaña (docs/plan-aprobacion-por-campana.md).
 *
 * La regla en una línea: **nada va a producción sin una aprobación, y toda
 * aprobación tiene un responsable con nombre.** La campaña dice cómo se aprueba
 * —interna, por su responsable; o del cliente, desde el enlace de revisión— y
 * este archivo es el único lugar de la app que escribe `isApproved` por una
 * decisión interna. La otra puerta es la respuesta del cliente
 * (`reviewController.submitReview`), que usa `aprobadoPorCliente` y
 * `SIN_APROBACION` de acá para no escribir los campos de otra forma.
 */

/**
 * El paso del recorrido en que está un copy. Se calcula al leer y no se guarda:
 * depende de las revisiones abiertas, de las respuestas del cliente y de las
 * piezas, y un estado guardado tendría que mantenerse en sincronía desde cada
 * uno de esos lugares — el día que uno se olvide, la pantalla mentiría.
 */
export type Etapa = 'SIN_CAMPANA' | 'POR_APROBAR' | 'CON_EL_CLIENTE' | 'DEVUELTO' | 'APROBADO' | 'EN_PRODUCCION';

/** Los campos de una aprobación, vacíos. Desaprobar es escribir esto entero. */
export const SIN_APROBACION = {
  isApproved: false,
  aprobadoPorId: null,
  aprobadoPorNombre: null,
  aprobadoEn: null,
  aprobadoVia: null,
} as const;

export const aprobadoPorCliente = (nombre: string | null | undefined) => ({
  isApproved: true,
  aprobadoPorId: null,
  aprobadoPorNombre: nombre?.trim() || 'El cliente',
  aprobadoEn: new Date(),
  aprobadoVia: ModoAprobacion.CLIENTE,
});

export const etapasDe = async (
  variaciones: { id: string; projectId: string | null; isApproved: boolean }[]
): Promise<Map<string, Etapa>> => {
  const ids = variaciones.map(v => v.id);
  if (!ids.length) return new Map();

  const [enPieza, enRevision, respuestas] = await Promise.all([
    prisma.piezaSlot.findMany({
      where: { savedVariationId: { in: ids } },
      select: { savedVariationId: true },
    }),
    prisma.reviewSessionItem.findMany({
      where: {
        savedVariationId: { in: ids },
        reviewSession: { ronda: 'COPY', status: { not: 'COMPLETED' }, expiresAt: { gt: new Date() } },
      },
      select: { savedVariationId: true },
    }),
    prisma.reviewItemFeedback.findMany({
      where: { savedVariationId: { in: ids } },
      orderBy: { reviewSubmission: { submittedAt: 'desc' } },
      select: { savedVariationId: true, decision: true },
    }),
  ]);

  const producidos = new Set(enPieza.map(s => s.savedVariationId));
  const conElCliente = new Set(enRevision.map(i => i.savedVariationId));
  // La respuesta que cuenta es la última: la lista viene ordenada de la más
  // nueva a la más vieja, así que la primera que aparece por copy es esa.
  const ultima = new Map<string, ReviewDecision>();
  for (const r of respuestas) {
    if (r.savedVariationId && !ultima.has(r.savedVariationId)) ultima.set(r.savedVariationId, r.decision);
  }

  return new Map(
    variaciones.map(v => {
      let etapa: Etapa;
      if (producidos.has(v.id)) etapa = 'EN_PRODUCCION';
      else if (!v.projectId) etapa = 'SIN_CAMPANA';
      else if (v.isApproved) etapa = 'APROBADO';
      else if (conElCliente.has(v.id)) etapa = 'CON_EL_CLIENTE';
      else if (ultima.get(v.id) === 'REJECTED') etapa = 'DEVUELTO';
      else etapa = 'POR_APROBAR';
      return [v.id, etapa];
    })
  );
};

export interface Rechazo {
  id: string;
  motivo: string;
}

/**
 * Aprobar o desaprobar copy por una decisión interna.
 *
 * Solo el responsable de la campaña decide, en las dos direcciones. No hay un
 * «administrador puede todo»: si el responsable no está, quien administra
 * nombra a otro en la campaña, y la aprobación sigue teniendo un nombre.
 *
 * Lo que no se puede no corta la operación: vuelve en `rechazados` con su
 * motivo, para que la pantalla diga qué pasó con cada uno.
 */
export const decidirAprobacion = async (tenant: TenantContext, ids: string[], aprobar: boolean) => {
  if (!Array.isArray(ids) || ids.length === 0) throw new TenantError('No hay copy seleccionado', 400);

  const variaciones = await prisma.savedVariation.findMany({
    where: { id: { in: ids }, client: { workspaceId: tenant.workspaceId } },
    select: {
      id: true,
      isApproved: true,
      project: {
        select: {
          name: true,
          modoAprobacion: true,
          responsableId: true,
          responsable: { select: { name: true } },
        },
      },
    },
  });
  const yo = await prisma.user.findUnique({ where: { id: tenant.userId }, select: { name: true } });

  const aplicar: string[] = [];
  const rechazados: Rechazo[] = [];
  for (const v of variaciones) {
    const c = v.project;
    if (!c) {
      rechazados.push({ id: v.id, motivo: 'No tiene campaña: asignale una antes de aprobarlo.' });
    } else if (!c.responsableId) {
      rechazados.push({ id: v.id, motivo: `La campaña «${c.name}» no tiene responsable de aprobación.` });
    } else if (c.responsableId !== tenant.userId) {
      rechazados.push({ id: v.id, motivo: `Lo aprueba ${c.responsable?.name ?? 'otra persona'}, responsable de «${c.name}».` });
    } else if (aprobar && c.modoAprobacion === ModoAprobacion.CLIENTE) {
      rechazados.push({ id: v.id, motivo: `«${c.name}» la aprueba el cliente: enviala a revisión.` });
    } else if (v.isApproved !== aprobar) {
      aplicar.push(v.id);
    }
  }

  if (aplicar.length) {
    await prisma.savedVariation.updateMany({
      where: { id: { in: aplicar } },
      data: aprobar
        ? {
            isApproved: true,
            aprobadoPorId: tenant.userId,
            aprobadoPorNombre: yo?.name ?? null,
            aprobadoEn: new Date(),
            aprobadoVia: ModoAprobacion.INTERNA,
          }
        : SIN_APROBACION,
    });
  }
  return { aplicados: aplicar, rechazados };
};

/**
 * Qué copy no puede ir en una revisión del cliente, y por qué. Vacío = todo va.
 *
 * Solo entra copy de campañas que se aprueban con el cliente: mandar al cliente
 * copy de una campaña interna daría dos aprobaciones distintas para lo mismo,
 * y la del cliente pasaría por encima del responsable sin que él lo decida.
 */
export const motivosParaNoRevisar = async (ids: string[]): Promise<string[]> => {
  const [variaciones, abiertas] = await Promise.all([
    prisma.savedVariation.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        platform: true,
        isApproved: true,
        project: { select: { name: true, modoAprobacion: true, responsableId: true } },
      },
    }),
    prisma.reviewSessionItem.findMany({
      where: {
        savedVariationId: { in: ids },
        reviewSession: { ronda: 'COPY', status: { not: 'COMPLETED' }, expiresAt: { gt: new Date() } },
      },
      select: { savedVariationId: true },
    }),
  ]);
  const yaEnRevision = new Set(abiertas.map(a => a.savedVariationId));

  const motivos = new Set<string>();
  for (const v of variaciones) {
    const c = v.project;
    if (!c) motivos.add('Hay copy sin campaña.');
    else if (c.modoAprobacion !== ModoAprobacion.CLIENTE)
      motivos.add(`«${c.name}» se aprueba internamente, no con el cliente.`);
    else if (!c.responsableId) motivos.add(`«${c.name}» no tiene responsable de aprobación.`);
    else if (v.isApproved) motivos.add('Hay copy que ya está aprobado.');
    else if (yaEnRevision.has(v.id)) motivos.add('Hay copy que ya está en otra revisión abierta.');
  }
  return [...motivos];
};

/**
 * La campaña de un brief, creándola la primera vez que hace falta.
 *
 * Es la unión de las dos «campañas» que tenía el producto: la que se elige en
 * Generar (el brief) y la que recibía el copy al guardar. Se crea perezosa, al
 * primer uso, para no tener que crearle una a cada brief viejo en la migración.
 */
export const campanaDeBrief = async (tenant: TenantContext, dnaProfileId: string) => {
  const brief = await assertDnaProfileInWorkspace(tenant, dnaProfileId);
  return prisma.project.upsert({
    where: { dnaProfileId: brief.id },
    update: {},
    create: {
      name: brief.name,
      workspaceId: tenant.workspaceId,
      clientId: brief.clientId,
      dnaProfileId: brief.id,
    },
    include: { responsable: { select: { id: true, name: true } } },
  });
};

/**
 * La campaña tiene que ser de la marca del copy. Una campaña vieja sin marca
 * (las que mezclaban) se acepta: es el estado que la migración no pudo decidir.
 */
export const assertCampanaDeLaMarca = async (tenant: TenantContext, projectId: string, clientId: string) => {
  const campana = await assertProjectInWorkspace(tenant, projectId);
  if (campana.clientId && campana.clientId !== clientId)
    throw new TenantError('La campaña es de otra marca', 400);
  return campana;
};
