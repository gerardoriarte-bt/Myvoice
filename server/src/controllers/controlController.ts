import { Response } from 'express';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { resolvePlanLimits } from '../lib/planLimits.js';
import { TenantError } from '../lib/tenancy.js';
import { currentPeriodStart } from '../services/usageService.js';

/**
 * Control, la pantalla del super admin (decisión 27; en el `.pen`, «§ Marco · Control»). Está por encima de
 * los workspaces: todas las rutas pasan por `requireSuperAdmin` y ninguna por `requireWorkspace`, así que acá
 * no hay guardas de tenancy. Es el único lugar de la app que muestra costos de IA.
 */

const aNumero = (valor: Prisma.Decimal | number | null | undefined): number =>
  valor === null || valor === undefined ? 0 : Number(valor.toString());

const ROLES = Object.values(WorkspaceRole) as string[];

/** Los workspaces con su interruptor, su gente y lo que gastaron en IA este mes contra su plan. */
export const listarWorkspaces = async (_req: AuthRequest, res: Response) => {
  try {
    const desde = currentPeriodStart();
    const [workspaces, generaciones, auditorias] = await Promise.all([
      prisma.workspace.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          plataformaPorProcesos: true,
          _count: { select: { memberships: true, clients: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.generationLog.groupBy({
        by: ['workspaceId'],
        where: { createdAt: { gte: desde } },
        _sum: { costUsd: true },
      }),
      // La auditoría de piezas se cobra aparte del motor: sin sumarla, el gasto del mes queda corto.
      prisma.$queryRaw<{ workspaceId: string; costo: Prisma.Decimal | null }[]>`
        SELECT p."workspaceId", sum(v."costoUsd") AS costo
          FROM "PiezaVersion" v JOIN "Pieza" p ON p.id = v."piezaId"
         WHERE v."auditadaAt" >= ${desde}
         GROUP BY p."workspaceId"`,
    ]);
    const motor = new Map(generaciones.map(g => [g.workspaceId, aNumero(g._sum.costUsd)]));
    const auditoria = new Map(auditorias.map(a => [a.workspaceId, aNumero(a.costo)]));
    res.json({
      periodo: desde.toISOString(),
      workspaces: workspaces.map(w => {
        const plan = resolvePlanLimits(w.plan);
        const gastoUsd = (motor.get(w.id) ?? 0) + (auditoria.get(w.id) ?? 0);
        return {
          id: w.id,
          name: w.name,
          slug: w.slug,
          plan: plan.label,
          plataformaPorProcesos: w.plataformaPorProcesos,
          personas: w._count.memberships,
          marcas: w._count.clients,
          gastoUsd: Number(gastoUsd.toFixed(4)),
          cuotaUsd: plan.costUsdPerPeriod,
        };
      }),
    });
  } catch (error) {
    handleTenantError(error, res, 'Error al listar los workspaces');
  }
};

/** Prende o apaga el marco por procesos de un workspace. Cada persona lo ve en su próxima carga. */
export const cambiarPlataforma = async (req: AuthRequest, res: Response) => {
  const { encendida } = req.body as { encendida?: unknown };
  if (typeof encendida !== 'boolean') return res.status(400).json({ error: 'encendida tiene que ser true o false' });
  try {
    const ws = await prisma.workspace.update({
      where: { id: req.params.id },
      data: { plataformaPorProcesos: encendida },
      select: { id: true, plataformaPorProcesos: true },
    });
    res.json(ws);
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2025') return res.status(404).json({ error: 'Workspace no encontrado' });
    handleTenantError(error, res, 'Error al cambiar el interruptor');
  }
};

/** Todas las personas, con su rol en cada workspace. */
export const listarUsuarios = async (_req: AuthRequest, res: Response) => {
  try {
    const usuarios = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        superAdmin: true,
        createdAt: true,
        memberships: { select: { role: true, workspace: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(
      usuarios.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        superAdmin: u.superAdmin,
        createdAt: u.createdAt,
        membresias: u.memberships.map(m => ({ workspaceId: m.workspace.id, workspaceName: m.workspace.name, role: m.role })),
      }))
    );
  } catch (error) {
    handleTenantError(error, res, 'Error al listar los usuarios');
  }
};

/** Un workspace nunca se queda sin OWNER: ni por cambiar el rol del último, ni por sacarlo. */
const asegurarOtroOwner = async (tx: Prisma.TransactionClient, userId: string, workspaceId: string) => {
  const actual = await tx.membership.findUnique({ where: { userId_workspaceId: { userId, workspaceId } } });
  if (actual?.role !== WorkspaceRole.OWNER) return;
  const owners = await tx.membership.count({ where: { workspaceId, role: WorkspaceRole.OWNER } });
  if (owners <= 1) throw new TenantError('El workspace necesita al menos un OWNER', 409);
};

/** Agrega a alguien a un workspace o le cambia el rol. */
export const guardarMembresia = async (req: AuthRequest, res: Response) => {
  const { userId, workspaceId, role } = req.body as { userId?: unknown; workspaceId?: unknown; role?: unknown };
  if (typeof userId !== 'string' || typeof workspaceId !== 'string' || typeof role !== 'string' || !ROLES.includes(role)) {
    return res.status(400).json({ error: 'Faltan userId, workspaceId o un rol válido' });
  }
  try {
    const membresia = await prisma.$transaction(async tx => {
      const [usuario, workspace] = await Promise.all([
        tx.user.findUnique({ where: { id: userId }, select: { id: true } }),
        tx.workspace.findUnique({ where: { id: workspaceId }, select: { id: true } }),
      ]);
      if (!usuario || !workspace) throw new TenantError('Usuario o workspace no encontrado', 404);
      if (role !== WorkspaceRole.OWNER) await asegurarOtroOwner(tx, userId, workspaceId);
      return tx.membership.upsert({
        where: { userId_workspaceId: { userId, workspaceId } },
        create: { userId, workspaceId, role: role as WorkspaceRole },
        update: { role: role as WorkspaceRole },
        select: { userId: true, workspaceId: true, role: true },
      });
    });
    res.json(membresia);
  } catch (error) {
    handleTenantError(error, res, 'Error al guardar la membresía');
  }
};

/** Saca a alguien de un workspace. Su cuenta y lo que hizo se quedan. */
export const quitarMembresia = async (req: AuthRequest, res: Response) => {
  const { userId, workspaceId } = req.params;
  try {
    await prisma.$transaction(async tx => {
      await asegurarOtroOwner(tx, userId, workspaceId);
      const { count } = await tx.membership.deleteMany({ where: { userId, workspaceId } });
      if (!count) throw new TenantError('Membresía no encontrada', 404);
    });
    res.status(204).end();
  } catch (error) {
    handleTenantError(error, res, 'Error al quitar la membresía');
  }
};
