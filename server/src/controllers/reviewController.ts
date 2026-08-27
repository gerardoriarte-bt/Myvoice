import { Request, Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { filterVariationsInWorkspace, TenantError } from '../lib/tenancy.js';
import { prisma } from '../lib/prisma.js';
import { notifyReviewCompleted } from '../services/notificationService.js';

export const createReviewSession = async (req: AuthRequest, res: Response) => {
  const tenant = req.tenant!;
  const { title, variationIds, expiresInDays } = req.body;

  if (!title || !Array.isArray(variationIds) || variationIds.length === 0) {
    return res.status(400).json({ error: 'title y al menos una variación son obligatorios' });
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
      },
    });
    res.json(sessions);
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
            feedbacks: { select: { savedVariationId: true, decision: true, comment: true } },
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
              select: { id: true, platform: true, type: true, content: true, charCount: true, clientId: true },
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

    res.json(session);
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
    const session = await prisma.reviewSession.findUnique({ where: { token } });

    if (!session) return res.status(404).json({ error: 'Sesión de revisión no encontrada' });
    if (new Date() > session.expiresAt) return res.status(410).json({ error: 'Esta sesión de revisión ha expirado' });
    if (session.status === 'COMPLETED') return res.status(409).json({ error: 'Esta sesión ya fue enviada' });

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
        return v ? { clientId: v.clientId, platform: v.platform, content: v.content, reason: f.comment || 'Rechazado por el cliente' } : null;
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
                comment: f.comment || null,
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
    }).catch(() => {});

    res.status(201).json({ message: 'Revisión enviada con éxito' });
  } catch (error) {
    console.error('submitReview error:', error);
    res.status(500).json({ error: 'Error al procesar la revisión' });
  }
};
