import { Request, Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { filterVariationsInWorkspace, TenantError } from '../lib/tenancy.js';
import { prisma } from '../lib/prisma.js';
import { notifyReviewCompleted } from '../services/notificationService.js';
import * as piezasRevision from '../services/revisionDePiezas.js';

export const createReviewSession = async (req: AuthRequest, res: Response) => {
  const tenant = req.tenant!;
  const { title, variationIds, piezaIds, expiresInDays } = req.body;

  if (!title) return res.status(400).json({ error: 'title es obligatorio' });

  /**
   * Una sesión es homogénea: o lleva copy o lleva piezas. Mezclarlas obligaría
   * al portal a dibujar dos pantallas distintas en la misma lista, y al cliente
   * a entender que está decidiendo dos cosas que ocurren en momentos diferentes
   * del proceso.
   */
  const conPiezas = Array.isArray(piezaIds) && piezaIds.length > 0;
  const conCopy = Array.isArray(variationIds) && variationIds.length > 0;
  if (conPiezas && conCopy)
    return res.status(400).json({ error: 'Una revisión lleva copys o piezas, no las dos cosas' });
  if (conPiezas) {
    try {
      const sesion = await piezasRevision.crearSesionDePiezas(tenant, { title, piezaIds, expiresInDays });
      return res.status(201).json(sesion);
    } catch (error) {
      return handleTenantError(error, res, 'Error al crear la revisión de piezas');
    }
  }
  if (!conCopy) {
    return res.status(400).json({ error: 'Hace falta al menos una variación o una pieza' });
  }

  const days = typeof expiresInDays === 'number' && expiresInDays > 0 ? expiresInDays : 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  try {
    // Una sesión de revisión se publica detrás de un token público: si acá se
    // colaran ids de otro workspace, su copy quedaría expuesto en un enlace sin
    // autenticación. Se filtra contra el workspace y se preserva el orden pedido.
    const owned = new Set(await filterVariationsInWorkspace(tenant, variationIds));
    const items = variationIds.filter((id: string) => owned.has(id));
    if (items.length === 0) {
      throw new TenantError('Ninguna de las variaciones pertenece a este workspace', 404);
    }

    /**
     * Una sesión es de UNA marca.
     *
     * El aislamiento entre empresas ya estaba cubierto, pero esto es otra cosa:
     * dentro de un mismo workspace, una agencia tiene varios clientes. Un
     * enlace con copy de dos marcas le muestra a un cliente el contenido del
     * otro — y el enlace no pide cuenta ni contraseña, así que no hay una
     * segunda barrera que lo atrape.
     */
    const marcas = await prisma.savedVariation.findMany({
      where: { id: { in: items } },
      select: { clientId: true, client: { select: { name: true } } },
      distinct: ['clientId'],
    });
    if (marcas.length > 1) {
      throw new TenantError(
        `Una revisión es de una sola marca, y esta mezcla ${marcas.length}: ${marcas.map(m => m.client.name).join(', ')}. El enlace no pide cuenta, así que cada cliente vería el copy del otro.`,
        400
      );
    }

    const session = await prisma.reviewSession.create({
      data: {
        title,
        expiresAt,
        workspaceId: tenant.workspaceId,
        createdById: tenant.userId,
        items: {
          createMany: {
            data: items.map((id: string, index: number) => ({
              savedVariationId: id,
              sortOrder: index,
            })),
          },
        },
      },
      include: {
        items: { include: { savedVariation: { select: { id: true, platform: true, type: true, content: true, charCount: true } } } },
      },
    });

    res.status(201).json(session);
  } catch (error) {
    handleTenantError(error, res, 'Error al crear la sesión de revisión');
  }
};

export const listReviewSessions = async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await prisma.reviewSession.findMany({
      where: { workspaceId: req.tenant!.workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { items: true } },
        submission: { select: { submittedAt: true, reviewerName: true } },
        // Un item alcanza: una sesión es de una sola marca, y la lista sin
        // marca obliga a abrir cada sesión para saber de quién es.
        items: {
          take: 1,
          select: {
            savedVariation: { select: { client: { select: { name: true } } } },
            pieza: { select: { client: { select: { name: true } } } },
          },
        },
      },
    });
    // La marca sube al nivel de la sesión y el item auxiliar se descarta: la
    // pantalla no tiene por qué saber que vino de ahí.
    res.json(
      sessions.map(({ items, ...s }) => ({
        ...s,
        marca: items[0]?.savedVariation?.client.name ?? items[0]?.pieza?.client.name ?? null,
      }))
    );
  } catch (error) {
    console.error('listReviewSessions error:', error);
    res.status(500).json({ error: 'Error al listar sesiones de revisión' });
  }
};

export const getReviewSessionDetail = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const session = await prisma.reviewSession.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            savedVariation: { select: { id: true, platform: true, type: true, content: true, charCount: true } },
          },
        },
        submission: {
          include: {
            feedbacks: { select: { savedVariationId: true, decision: true, feedbackCopy: true, feedbackDiseno: true } },
          },
        },
      },
    });
    if (!session || session.workspaceId !== req.tenant!.workspaceId) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    res.json(session);
  } catch (error) {
    console.error('getReviewSessionDetail error:', error);
    res.status(500).json({ error: 'Error al cargar detalle' });
  }
};

export const deleteReviewSession = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const session = await prisma.reviewSession.findUnique({ where: { id } });
    if (!session || session.workspaceId !== req.tenant!.workspaceId) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    await prisma.reviewSession.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('deleteReviewSession error:', error);
    res.status(500).json({ error: 'Error al eliminar la sesión' });
  }
};

export const getReviewByToken = async (req: Request, res: Response) => {
  const { token } = req.params;
  try {
    const session = await prisma.reviewSession.findUnique({
      where: { token },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            savedVariation: {
              select: {
                id: true,
                platform: true,
                type: true,
                content: true,
                charCount: true,
                clientId: true,
                client: { select: { name: true } },
              },
            },
          },
        },
        submission: { select: { submittedAt: true, reviewerName: true } },
      },
    });

    if (!session) return res.status(404).json({ error: 'Sesión de revisión no encontrada' });

    if (new Date() > session.expiresAt) {
      return res.status(410).json({ error: 'Esta sesión de revisión ha expirado' });
    }

    if (session.status === 'PENDING') {
      await prisma.reviewSession.update({ where: { id: session.id }, data: { status: 'IN_REVIEW' } });
      session.status = 'IN_REVIEW';
    }

    // La ronda 2 devuelve la pieza con su previa firmada y el copy que el
    // cliente ya aprobó. Nada más: ni el enlace de entrega, ni los hallazgos,
    // ni quién la diseñó — todo esto vive detrás de un token sin autenticación.
    if (session.ronda === 'PIEZA') {
      const ids = session.items.map(i => i.piezaId).filter((id): id is string => !!id);
      const { items: _descartados, ...cabecera } = session;
      const piezas = await piezasRevision.presentarPiezas(ids);
      return res.json({ ...cabecera, marca: piezas[0]?.marca ?? null, piezas });
    }

    /**
     * La marca, al nivel de la sesión. Desde que una revisión es de una sola
     * marca se puede afirmar sin recorrer los items — y el cliente necesita
     * reconocer de entrada que lo que está mirando es lo suyo.
     */
    res.json({ ...session, marca: session.items[0]?.savedVariation?.client?.name ?? null });
  } catch (error) {
    console.error('getReviewByToken error:', error);
    res.status(500).json({ error: 'Error al cargar la sesión de revisión' });
  }
};

export const submitReview = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { reviewerName, feedbacks } = req.body;

  if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
    return res.status(400).json({ error: 'feedbacks es obligatorio y debe ser un array' });
  }

  try {
    const session = await prisma.reviewSession.findUnique({
      where: { token },
      // Quien creó la sesión es quien tiene que enterarse de que el cliente
      // respondió. Hasta H3.D esto iba a una casilla fija del entorno.
      include: {
        createdBy: { select: { email: true } },
        items: { select: { piezaId: true } },
      },
    });

    if (!session) return res.status(404).json({ error: 'Sesión de revisión no encontrada' });
    if (new Date() > session.expiresAt) return res.status(410).json({ error: 'Esta sesión de revisión ha expirado' });
    if (session.status === 'COMPLETED') return res.status(409).json({ error: 'Esta sesión ya fue enviada' });

    if (session.ronda === 'PIEZA') {
      const deLaSesion = new Set(session.items.map(i => i.piezaId).filter((id): id is string => !!id));
      const decisiones = feedbacks.filter((f: any) => typeof f?.piezaId === 'string');

      await prisma.$transaction(async tx => {
        const entrega = await tx.reviewSubmission.create({
          data: { reviewSessionId: session.id, reviewerName: reviewerName || null },
          select: { id: true },
        });
        // Todo junto o nada: una entrega a medias dejaría piezas movidas sin el
        // motivo que las movió.
        await piezasRevision.aplicarDecisiones(
          tx,
          entrega.id,
          typeof reviewerName === 'string' && reviewerName.trim() ? reviewerName.trim() : 'El cliente',
          deLaSesion,
          decisiones
        );
        await tx.reviewSession.update({ where: { id: session.id }, data: { status: 'COMPLETED' } });
      });

      notifyReviewCompleted({
        sessionTitle: session.title,
        reviewerName,
        approvedCount: decisiones.filter((f: any) => f.decision === 'APPROVED').length,
        rejectedCount: decisiones.filter((f: any) => f.decision === 'REJECTED').length,
        para: [session.createdBy.email],
      }).catch(() => {});

      return res.status(201).json({ message: 'Revisión enviada con éxito' });
    }

    // Pre-fetch all variations to avoid queries inside the transaction
    const variationIds: string[] = feedbacks.map((f: any) => f.savedVariationId);
    const variations = await prisma.savedVariation.findMany({
      where: { id: { in: variationIds } },
      select: { id: true, clientId: true, platform: true, content: true },
    });
    const varMap = new Map(variations.map(v => [v.id, v]));

    const approvedIds = feedbacks
      .filter((f: any) => f.decision === 'APPROVED')
      .map((f: any) => f.savedVariationId);

    const rejectedFeedbacks = feedbacks
      .filter((f: any) => f.decision === 'REJECTED')
      .map((f: any) => {
        const v = varMap.get(f.savedVariationId);
        return v ? { clientId: v.clientId, platform: v.platform, content: v.content, reason: f.feedbackCopy || 'Rechazado por el cliente' } : null;
      })
      .filter(Boolean) as { clientId: string; platform: string; content: string; reason: string }[];

    await prisma.$transaction([
      prisma.reviewSubmission.create({
        data: {
          reviewSessionId: session.id,
          reviewerName: reviewerName || null,
          feedbacks: {
            createMany: {
              data: feedbacks.map((f: any) => ({
                savedVariationId: f.savedVariationId,
                decision: f.decision,
                // La ronda de copy solo puede producir feedback de copy: no hay
                // arte que comentar todavía. `feedbackDiseno` queda NULL hasta
                // la ronda 2 (H2.E).
                feedbackCopy: f.comment || null,
              })),
            },
          },
        },
      }),
      ...(approvedIds.length > 0 ? [
        prisma.savedVariation.updateMany({
          where: { id: { in: approvedIds } },
          data: { isApproved: true },
        }),
      ] : []),
      ...(rejectedFeedbacks.length > 0 ? [
        prisma.negativeFeedback.createMany({ data: rejectedFeedbacks }),
      ] : []),
      prisma.reviewSession.update({
        where: { id: session.id },
        data: { status: 'COMPLETED' },
      }),
    ]);

    // Fire-and-forget — no bloquea la respuesta al cliente
    notifyReviewCompleted({
      sessionTitle: session.title,
      reviewerName,
      approvedCount: approvedIds.length,
      rejectedCount: rejectedFeedbacks.length,
      para: [session.createdBy.email],
    }).catch(() => {});

    res.status(201).json({ message: 'Revisión enviada con éxito' });
  } catch (error) {
    console.error('submitReview error:', error);
    res.status(500).json({ error: 'Error al procesar la revisión' });
  }
};
