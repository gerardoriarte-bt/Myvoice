/**
 * El copy de My Voice para Producción (2026-11-23): lo único por donde Producción lee o toca el copy. Antes
 * `piezaService` consultaba y actualizaba la tabla de My Voice con `prisma`, una deuda del contrato que la regla de
 * imports no veía (docs/ecosistema/tecnico/spec-plataforma.md § 2.1). Producción puede depender de My Voice, que
 * viene antes en el proceso; al revés, nunca.
 */

import { ModoAprobacion, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { TenantContext } from '../lib/tenancy.js';
import { getChannelSpec, listChannels } from '../channels/registry.js';

/** El texto original de cada copy, para comparar con lo congelado en la pieza («el copy cambió»). */
export const copyOriginal = async (ids: string[]) => {
  const unicos = [...new Set(ids)];
  if (!unicos.length) return new Map<string, { id: string; content: string; isApproved: boolean; platform: string }>();
  const filas = await prisma.savedVariation.findMany({
    where: { id: { in: unicos } },
    select: { id: true, content: true, isApproved: true, platform: true },
  });
  return new Map(filas.map(f => [f.id, f]));
};

/** El copy elegido para proponer piezas, con su campaña, en el orden en que se guardó. Solo del workspace. */
export const copyParaProponer = (tenant: TenantContext, ids: string[]) =>
  prisma.savedVariation.findMany({
    where: { id: { in: ids }, client: { workspaceId: tenant.workspaceId } },
    include: { project: { select: { id: true, name: true, responsableId: true } } },
    orderBy: { savedAt: 'asc' },
  });

/** El copy con que se crean las piezas, con el responsable de su campaña. Solo del workspace. */
export const copyParaCrear = (tenant: TenantContext, ids: string[]) =>
  prisma.savedVariation.findMany({
    where: { id: { in: ids }, client: { workspaceId: tenant.workspaceId } },
    include: { project: { select: { responsableId: true } } },
  });

/** El texto actual de cada copy, dentro de la transacción de quien lo pide (recongelar una pieza). */
export const textoActual = async (tx: Prisma.TransactionClient, ids: string[]) =>
  new Map(
    (await tx.savedVariation.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, content: true } })).map(
      f => [f.id, f.content]
    )
  );

/**
 * El responsable corrige el copy dentro de la pieza (`corregir-copy`): el texto nuevo queda en el copy y queda
 * aprobado por él, en la transacción de Producción.
 */
export const corregirCopyAprobado = (tx: Prisma.TransactionClient, id: string, texto: string, quien: { id: string; nombre: string | null }) =>
  tx.savedVariation.update({
    where: { id },
    data: {
      content: texto,
      charCount: texto.length,
      isApproved: true,
      aprobadoPorId: quien.id,
      aprobadoPorNombre: quien.nombre,
      aprobadoEn: new Date(),
      aprobadoVia: ModoAprobacion.INTERNA,
    },
  });

/** F5: de cada copy, de qué línea de la sábana salió y quién lo aprobó y cómo (para Implementación, por contrato). */
export const copyParaImplementar = async (ids: string[]) => {
  const unicos = [...new Set(ids)];
  if (!unicos.length) return new Map<string, { lineaDePlanningId: string | null; aprobadoPor: string | null; aprobadoEn: Date | null; via: string | null }>();
  const filas = await prisma.savedVariation.findMany({
    where: { id: { in: unicos } },
    select: { id: true, lineaDePlanningId: true, aprobadoPorNombre: true, aprobadoEn: true, aprobadoVia: true },
  });
  return new Map(filas.map(f => [f.id, { lineaDePlanningId: f.lineaDePlanningId, aprobadoPor: f.aprobadoPorNombre, aprobadoEn: f.aprobadoEn, via: f.aprobadoVia }]));
};

/**
 * F5, solo texto (2026-11-24): el copy aprobado de los canales que no producen pieza de diseño (búsqueda de Google
 * Ads, WhatsApp, push). No pasa por Producción, pero se monta igual: va directo a Implementación, agrupado por
 * pieza (`conjuntoId`). Solo el copy con pieza (desde el 2026-11-05): el de antes, texto por texto, es historia y
 * llenaría «Por montar» de anuncios sueltos.
 */
export const copySinPiezaAprobado = async (tenant: TenantContext, filtro: { clientId?: string; clave?: string }) => {
  const sinPieza = listChannels().filter(c => !c.pieza).map(c => c.id as string);
  const filas = await prisma.savedVariation.findMany({
    where: {
      client: { workspaceId: tenant.workspaceId },
      ...(filtro.clientId && { clientId: filtro.clientId }),
      ...(filtro.clave ? { conjuntoId: filtro.clave } : { conjuntoId: { not: null } }),
      // Candidatos: los canales sin pieza y todo lo que vino de un pedido de CDM, cuyo formato decide (Implementación
      // descarta lo que sí espera pieza).
      OR: [{ platform: { in: sinPieza } }, { lineaDePlanningId: { not: null } }],
      isApproved: true,
    },
    select: {
      id: true,
      clientId: true,
      platform: true,
      slot: true,
      slotLabel: true,
      content: true,
      conjuntoId: true,
      piezaIndex: true,
      variationIndex: true,
      lineaDePlanningId: true,
      aprobadoPorNombre: true,
      aprobadoEn: true,
      aprobadoVia: true,
      savedAt: true,
      project: { select: { id: true, name: true, responsableId: true } },
    },
    orderBy: [{ savedAt: 'asc' }],
  });
  const grupos = new Map<string, typeof filas>();
  for (const f of filas) {
    const clave = f.conjuntoId!;
    grupos.set(clave, [...(grupos.get(clave) ?? []), f]);
  }
  return [...grupos.entries()].map(([clave, textos]) => {
    const primero = textos[0];
    // En el orden del spec del canal y, dentro de un mismo lugar, en el de las opciones.
    const orden = (slot: string | null) => getChannelSpec(primero.platform)?.slots.findIndex(s => s.id === slot) ?? 99;
    const ordenados = [...textos].sort((a, b) => orden(a.slot) - orden(b.slot) || (a.variationIndex ?? 0) - (b.variationIndex ?? 0));
    return {
      clave,
      clientId: primero.clientId,
      platform: primero.platform,
      piezaIndex: primero.piezaIndex,
      campana: primero.project ? { id: primero.project.id, nombre: primero.project.name, responsableId: primero.project.responsableId } : null,
      lineaDePlanningId: textos.find(t => t.lineaDePlanningId)?.lineaDePlanningId ?? null,
      textos: ordenados.map(t => ({ slot: t.slot ?? t.id, nombre: t.slotLabel ?? 'Texto', texto: t.content, copyId: t.id })),
      aprobaciones: [...new Map(textos.filter(t => t.aprobadoPorNombre).map(t => [`${t.aprobadoPorNombre}|${t.aprobadoVia}`, { por: t.aprobadoPorNombre!, en: t.aprobadoEn?.toISOString() ?? null, via: t.aprobadoVia }])).values()],
      lista: primero.savedAt,
    };
  });
};

/** ⑤ en el encabezado: las piezas de copy aprobado sin pieza de diseño de una campaña (ya pasó por la guarda). */
export const conjuntosSinPiezaDeCampana = async (campanaId: string) => {
  const sinPieza = listChannels().filter(c => !c.pieza).map(c => c.id as string);
  const filas = await prisma.savedVariation.findMany({
    where: { projectId: campanaId, platform: { in: sinPieza }, isApproved: true, conjuntoId: { not: null } },
    select: { conjuntoId: true },
  });
  return [...new Set(filas.map(f => f.conjuntoId!))];
};

/**
 * T5 (reporte de implementación, 2026-11-24): las aprobaciones del copy de una campaña, agrupadas por pieza
 * (`conjuntoId`) para que 40 textos de un Google Ads no sean 40 filas. La interna es la vigente (el copy guarda la
 * última); las del cliente salen de sus respuestas en el portal, una por pieza y por envío.
 */
export const aprobacionesDeCopyDeCampana = async (campanaId: string) => {
  const nombreDe = (v: { platform: string; piezaIndex: number | null }) => `${v.platform}${v.piezaIndex ? ` ${v.piezaIndex}` : ''}`;
  const copy = await prisma.savedVariation.findMany({
    where: { projectId: campanaId },
    select: { id: true, conjuntoId: true, platform: true, piezaIndex: true, isApproved: true, aprobadoVia: true, aprobadoPorNombre: true, aprobadoEn: true },
  });
  const porId = new Map(copy.map(v => [v.id, v]));
  // Desde el 2026-11-24 cada decisión interna deja un evento; el copy anterior solo tiene la vigente.
  const eventos = await prisma.eventoDeCopy.findMany({
    where: { savedVariationId: { in: [...porId.keys()] } },
    orderBy: { createdAt: 'asc' },
    select: { savedVariationId: true, tipo: true, autorNombre: true, detalle: true, createdAt: true },
  });
  const conEventos = new Set(eventos.map(e => e.savedVariationId));
  const internas = copy.filter(v => v.isApproved && v.aprobadoVia === ModoAprobacion.INTERNA && !conEventos.has(v.id));
  const feedbacks = await prisma.reviewItemFeedback.findMany({
    where: { savedVariationId: { in: [...porId.keys()] } },
    select: { decision: true, feedbackCopy: true, savedVariationId: true, reviewSubmission: { select: { id: true, reviewerName: true, submittedAt: true } } },
  });
  const delCliente = feedbacks.map(f => ({ ...f, savedVariation: f.savedVariationId ? porId.get(f.savedVariationId) ?? null : null }));
  const grupos = new Map<
    string,
    { que: string; textos: number; decision: 'APROBADO' | 'CAMBIOS' | 'REVOCADO' | 'PENDIENTE'; por: string; externo: boolean; en: string; comentario: string | null }
  >();
  for (const e of eventos) {
    const v = porId.get(e.savedVariationId)!;
    const decision = e.tipo === 'APROBADO' ? 'APROBADO' : e.tipo === 'DESAPROBADO' ? 'REVOCADO' : 'PENDIENTE';
    // Un mismo gesto sobre los textos de una pieza (aprobar los 10 títulos de un Google Ads) es una fila.
    const clave = `e:${v.conjuntoId ?? v.id}:${decision}:${e.autorNombre}:${e.createdAt.toISOString()}`;
    const g = grupos.get(clave);
    if (g) g.textos++;
    else
      grupos.set(clave, {
        que: nombreDe(v),
        textos: 1,
        decision,
        por: e.autorNombre ?? 'Alguien del equipo',
        externo: false,
        en: e.createdAt.toISOString(),
        comentario: e.detalle,
      });
  }
  for (const v of internas) {
    const clave = `i:${v.conjuntoId ?? v.id}:${v.aprobadoPorNombre}`;
    const g = grupos.get(clave);
    if (g) g.textos++;
    else
      grupos.set(clave, {
        que: nombreDe(v),
        textos: 1,
        decision: 'APROBADO',
        por: v.aprobadoPorNombre ?? 'El equipo',
        externo: false,
        en: (v.aprobadoEn ?? new Date(0)).toISOString(),
        comentario: null,
      });
  }
  for (const f of delCliente) {
    if (!f.savedVariation) continue;
    const decision = f.decision === 'APPROVED' ? 'APROBADO' : 'CAMBIOS';
    const clave = `c:${f.reviewSubmission.id}:${f.savedVariation.conjuntoId ?? f.savedVariation.id}:${decision}`;
    const g = grupos.get(clave);
    if (g) {
      g.textos++;
      if (f.feedbackCopy && !g.comentario) g.comentario = f.feedbackCopy;
    } else
      grupos.set(clave, {
        que: nombreDe(f.savedVariation),
        textos: 1,
        decision,
        por: f.reviewSubmission.reviewerName ?? 'El cliente',
        externo: true,
        en: f.reviewSubmission.submittedAt.toISOString(),
        comentario: f.feedbackCopy,
      });
  }
  return [...grupos.values()];
};

/**
 * Eficiencia (super admin, 2026-11-24): por campaña, cuándo se escribió el primer copy y cuándo quedó aprobado el
 * último, cuántas piezas de copy pidió cambiar el cliente, cuántas veces el equipo revocó o reeditó lo aprobado,
 * cuántas rondas con el cliente hubo y cuánto costó generarlo. Solo lo ve Control.
 */
export const eficienciaDeCopy = async (campanas: { id: string; dnaProfileId: string | null }[]) => {
  const ids = campanas.map(c => c.id);
  const copy = await prisma.savedVariation.findMany({
    where: { projectId: { in: ids } },
    select: { id: true, projectId: true, conjuntoId: true, savedAt: true, isApproved: true, aprobadoEn: true },
  });
  const deCampana = new Map(copy.map(v => [v.id, v.projectId!]));
  const [feedbacks, eventos, sesiones, costos] = await Promise.all([
    prisma.reviewItemFeedback.findMany({
      where: { savedVariationId: { in: [...deCampana.keys()] } },
      select: { savedVariationId: true, decision: true, reviewSubmissionId: true },
    }),
    prisma.eventoDeCopy.findMany({ where: { savedVariationId: { in: [...deCampana.keys()] } }, select: { savedVariationId: true, tipo: true, detalle: true } }),
    prisma.reviewSessionItem.findMany({
      where: { savedVariationId: { in: [...deCampana.keys()] }, reviewSession: { ronda: 'COPY' } },
      select: { savedVariationId: true, reviewSessionId: true },
    }),
    prisma.generationLog.groupBy({
      by: ['dnaProfileId'],
      where: { dnaProfileId: { in: campanas.map(c => c.dnaProfileId).filter((x): x is string => !!x) } },
      _sum: { costUsd: true },
      _count: { _all: true },
    }),
  ]);
  const conjuntoDe = new Map(copy.map(v => [v.id, v.conjuntoId ?? v.id]));
  const costoDe = new Map(costos.map(c => [c.dnaProfileId, { usd: Number(c._sum.costUsd ?? 0), generaciones: c._count._all }]));
  return new Map(
    campanas.map(c => {
      const suyos = copy.filter(v => v.projectId === c.id);
      const suyo = (id: string | null) => !!id && deCampana.get(id) === c.id;
      const aprobados = suyos.filter(v => v.isApproved && v.aprobadoEn).map(v => v.aprobadoEn!.getTime());
      const rechazos = feedbacks.filter(f => suyo(f.savedVariationId) && f.decision === 'REJECTED');
      return [
        c.id,
        {
          primero: suyos.length ? new Date(Math.min(...suyos.map(v => v.savedAt.getTime()))).toISOString() : null,
          ultimoAprobado: aprobados.length ? new Date(Math.max(...aprobados)).toISOString() : null,
          piezas: new Set(suyos.map(v => v.conjuntoId ?? v.id)).size,
          aprobadas: new Set(suyos.filter(v => v.isApproved).map(v => v.conjuntoId ?? v.id)).size,
          // Por pieza de copy: los 10 títulos de un Google Ads rechazados son un pedido de cambio, no diez.
          cambiosDelCliente: new Set(rechazos.map(f => `${f.reviewSubmissionId}:${conjuntoDe.get(f.savedVariationId!)}`)).size,
          revocadas: new Set(eventos.filter(e => suyo(e.savedVariationId) && e.tipo === 'DESAPROBADO').map(e => conjuntoDe.get(e.savedVariationId))).size,
          reeditadas: new Set(
            eventos.filter(e => suyo(e.savedVariationId) && e.tipo === 'VUELTO_A_PENDIENTE' && e.detalle !== 'Mandado al cliente').map(e => conjuntoDe.get(e.savedVariationId))
          ).size,
          rondasConCliente: new Set(sesiones.filter(s => suyo(s.savedVariationId)).map(s => s.reviewSessionId)).size,
          costoUsd: c.dnaProfileId ? costoDe.get(c.dnaProfileId)?.usd ?? 0 : 0,
          generaciones: c.dnaProfileId ? costoDe.get(c.dnaProfileId)?.generaciones ?? 0 : 0,
        },
      ];
    })
  );
};
