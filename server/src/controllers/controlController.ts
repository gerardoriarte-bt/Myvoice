import { formatosConCanal } from '../cdm/planning/planningService.js';
import { listChannels, producePieza } from '../channels/registry.js';
import { Response } from 'express';
import { ModuloPlataforma, Prisma, WorkspaceRole } from '@prisma/client';
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
    const [workspaces, generaciones, auditorias, consumos] = await Promise.all([
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
      // La entrevista y la extracción del manual (2026-11-25): IA fuera del motor, también cuenta.
      prisma.consumoIa.groupBy({ by: ['workspaceId'], where: { createdAt: { gte: desde } }, _sum: { costUsd: true } }),
    ]);
    const motor = new Map(generaciones.map(g => [g.workspaceId, aNumero(g._sum.costUsd)]));
    const auditoria = new Map(auditorias.map(a => [a.workspaceId, aNumero(a.costo)]));
    const fueraDelMotor = new Map(consumos.map(c => [c.workspaceId, aNumero(c._sum.costUsd)]));
    res.json({
      periodo: desde.toISOString(),
      workspaces: workspaces.map(w => {
        const plan = resolvePlanLimits(w.plan);
        const gastoUsd = (motor.get(w.id) ?? 0) + (auditoria.get(w.id) ?? 0) + (fueraDelMotor.get(w.id) ?? 0);
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

const MODULOS = Object.values(ModuloPlataforma) as string[];

/** Las marcas de todas las empresas, con los módulos que tienen prendidos. */
export const listarMarcas = async (_req: AuthRequest, res: Response) => {
  try {
    const marcas = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        marcaMadreId: true,
        workspace: { select: { id: true, name: true } },
        modulos: { select: { modulo: true } },
      },
      orderBy: [{ workspace: { name: 'asc' } }, { name: 'asc' }],
    });
    res.json(
      marcas.map(m => ({
        id: m.id,
        name: m.name,
        submarca: Boolean(m.marcaMadreId),
        workspaceId: m.workspace.id,
        workspaceName: m.workspace.name,
        modulos: m.modulos.map(x => x.modulo),
      }))
    );
  } catch (error) {
    handleTenantError(error, res, 'Error al listar las marcas');
  }
};

/** Prende o apaga un módulo (CDM, Implementación) en una marca. Apagarlo no borra lo que el módulo guardó. */
export const cambiarModulo = async (req: AuthRequest, res: Response) => {
  const { modulo, encendido } = req.body as { modulo?: unknown; encendido?: unknown };
  if (typeof modulo !== 'string' || !MODULOS.includes(modulo) || typeof encendido !== 'boolean') {
    return res.status(400).json({ error: 'Faltan un módulo válido y encendido (true o false)' });
  }
  const clientId = req.params.id;
  try {
    const marca = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!marca) return res.status(404).json({ error: 'Marca no encontrada' });
    if (encendido) {
      await prisma.moduloDeMarca.upsert({
        where: { clientId_modulo: { clientId, modulo: modulo as ModuloPlataforma } },
        create: { clientId, modulo: modulo as ModuloPlataforma, encendidoPorId: req.auth!.userId },
        update: {},
      });
    } else {
      await prisma.moduloDeMarca.deleteMany({ where: { clientId, modulo: modulo as ModuloPlataforma } });
    }
    const modulos = await prisma.moduloDeMarca.findMany({ where: { clientId }, select: { modulo: true } });
    res.json({ id: clientId, modulos: modulos.map(m => m.modulo) });
  } catch (error) {
    handleTenantError(error, res, 'Error al cambiar el módulo');
  }
};

/**
 * El verificador de formatos (2026-11-24): que la biblioteca de CDM y el motor no se desalineen. Un formato de
 * solo texto (TEXTO) va directo a Implementación; uno con archivo espera su pieza en Producción. Si el canal que lo
 * escribe dice lo contrario, el copy podría perderse entre los dos. Lista lo que no coincide, de todas las empresas.
 */
export const formatosDesalineados = async (_req: AuthRequest, res: Response) => {
  try {
    const formatos = await formatosConCanal();
    const conocidos = new Set(listChannels().map(c => c.id as string));
    const problemas = formatos.flatMap(f => {
      const donde = { workspace: f.medio.workspace.name, medio: f.medio.nombre, formato: f.nombre, canal: f.canal!, tipoArchivo: f.tipoArchivo };
      if (!conocidos.has(f.canal!)) return [{ ...donde, problema: `El canal «${f.canal}» no existe en el motor` }];
      const soloTexto = f.tipoArchivo === 'TEXTO';
      if (soloTexto && producePieza(f.canal!))
        return [{ ...donde, problema: 'El formato es de solo texto, pero su canal produce pieza de diseño' }];
      if (!soloTexto && !producePieza(f.canal!))
        return [{ ...donde, problema: 'El formato lleva archivo, pero su canal no produce pieza de diseño' }];
      return [];
    });
    res.json({ revisados: formatos.length, problemas });
  } catch (error) {
    handleTenantError(error, res, 'Error al verificar los formatos');
  }
};
