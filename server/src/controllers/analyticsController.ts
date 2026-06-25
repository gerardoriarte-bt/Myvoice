import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const getAnalytics = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const clientIdFilter = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;

  try {
    const clients = await prisma.client.findMany({
      where: clientIdFilter
        ? { workspaceId: user?.workspaceId, id: clientIdFilter }
        : { workspaceId: user?.workspaceId },
      select: { id: true, name: true },
    });
    const clientIds = clients.map(c => c.id);
    const clientMap = new Map(clients.map(c => [c.id, c.name]));

    if (clientIds.length === 0) {
      return res.json({
        summary: { totalSaved: 0, totalApproved: 0, totalRejected: 0, approvalRate: 0 },
        byClient: [],
        byPlatform: [],
        recentRejections: [],
      });
    }

    const scopedClientIds = clientIdFilter ? [clientIdFilter].filter(id => clientIds.includes(id)) : clientIds;

    const [savedAll, approvedAll, rejectedAll, savedByPlatform, approvedByPlatform, rejectedByPlatform, recentRejections] =
      await Promise.all([
        prisma.savedVariation.groupBy({
          by: ['clientId'],
          where: { clientId: { in: scopedClientIds } },
          _count: { id: true },
        }),
        prisma.savedVariation.groupBy({
          by: ['clientId'],
          where: { clientId: { in: scopedClientIds }, isApproved: true },
          _count: { id: true },
        }),
        prisma.negativeFeedback.groupBy({
          by: ['clientId'],
          where: { clientId: { in: scopedClientIds } },
          _count: { id: true },
        }),
        prisma.savedVariation.groupBy({
          by: ['platform'],
          where: { clientId: { in: scopedClientIds } },
          _count: { id: true },
        }),
        prisma.savedVariation.groupBy({
          by: ['platform'],
          where: { clientId: { in: scopedClientIds }, isApproved: true },
          _count: { id: true },
        }),
        prisma.negativeFeedback.groupBy({
          by: ['platform'],
          where: { clientId: { in: scopedClientIds } },
          _count: { id: true },
          orderBy: { _count: { platform: 'desc' } },
        }),
        prisma.negativeFeedback.findMany({
          where: { clientId: { in: scopedClientIds } },
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: { platform: true, reason: true, clientId: true, createdAt: true },
        }),
      ]);

    const savedMap = new Map(savedAll.map(r => [r.clientId, r._count.id]));
    const approvedMap = new Map(approvedAll.map(r => [r.clientId, r._count.id]));
    const rejectedMap = new Map(rejectedAll.map(r => [r.clientId, r._count.id]));

    const byClient = clients.map(c => {
      const saved = savedMap.get(c.id) ?? 0;
      const approved = approvedMap.get(c.id) ?? 0;
      const rejected = rejectedMap.get(c.id) ?? 0;
      const approvalRate = saved > 0 ? Math.round((approved / saved) * 100) : 0;
      return { clientId: c.id, clientName: c.name, saved, approved, rejected, approvalRate };
    }).filter(r => r.saved > 0 || r.rejected > 0);

    const totalSaved = savedAll.reduce((s, r) => s + r._count.id, 0);
    const totalApproved = approvedAll.reduce((s, r) => s + r._count.id, 0);
    const totalRejected = rejectedAll.reduce((s, r) => s + r._count.id, 0);
    const approvalRate = totalSaved > 0 ? Math.round((totalApproved / totalSaved) * 100) : 0;

    const savedByPlatformMap = new Map(savedByPlatform.map(r => [r.platform, r._count.id]));
    const approvedByPlatformMap = new Map(approvedByPlatform.map(r => [r.platform, r._count.id]));
    const rejectedByPlatformMap = new Map(rejectedByPlatform.map(r => [r.platform, r._count.id]));

    const allPlatforms = new Set([
      ...savedByPlatformMap.keys(),
      ...rejectedByPlatformMap.keys(),
    ]);

    const byPlatform = Array.from(allPlatforms).map(platform => ({
      platform,
      saved: savedByPlatformMap.get(platform) ?? 0,
      approved: approvedByPlatformMap.get(platform) ?? 0,
      rejected: rejectedByPlatformMap.get(platform) ?? 0,
    })).sort((a, b) => b.rejected - a.rejected);

    const formattedRejections = recentRejections.map(r => ({
      platform: r.platform,
      reason: r.reason,
      clientName: clientMap.get(r.clientId) ?? r.clientId,
      createdAt: r.createdAt.toISOString(),
    }));

    res.json({ summary: { totalSaved, totalApproved, totalRejected, approvalRate }, byClient, byPlatform, recentRejections: formattedRejections });
  } catch (error) {
    console.error('getAnalytics error:', error);
    res.status(500).json({ error: 'Error al calcular analytics' });
  }
};
