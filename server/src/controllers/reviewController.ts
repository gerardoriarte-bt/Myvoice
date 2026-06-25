import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const createReviewSession = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { title, variationIds, expiresInDays } = req.body;

  if (!title || !Array.isArray(variationIds) || variationIds.length === 0) {
    return res.status(400).json({ error: 'title y al menos una variación son obligatorios' });
  }

  const days = typeof expiresInDays === 'number' && expiresInDays > 0 ? expiresInDays : 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  try {
    const session = await prisma.reviewSession.create({
      data: {
        title,
        expiresAt,
        workspaceId: user?.workspaceId ?? undefined,
        createdById: user!.userId,
        items: {
          createMany: {
            data: variationIds.map((id: string, index: number) => ({
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
    console.error('createReviewSession error:', error);
    res.status(500).json({ error: 'Error al crear la sesión de revisión' });
  }
};

export const listReviewSessions = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  try {
    const sessions = await prisma.reviewSession.findMany({
      where: { workspaceId: user?.workspaceId },
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
  const user = req.user;
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
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });
    if (session.workspaceId !== user?.workspaceId) return res.status(403).json({ error: 'Sin permiso' });
    res.json(session);
  } catch (error) {
    console.error('getReviewSessionDetail error:', error);
    res.status(500).json({ error: 'Error al cargar detalle' });
  }
};

export const deleteReviewSession = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;
  try {
    const session = await prisma.reviewSession.findUnique({ where: { id } });
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });
    if (session.workspaceId !== user?.workspaceId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta sesión' });
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

    res.status(201).json({ message: 'Revisión enviada con éxito' });
  } catch (error) {
    console.error('submitReview error:', error);
    res.status(500).json({ error: 'Error al procesar la revisión' });
  }
};
