import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { esHabil } from './horasHabiles.js';

/**
 * Control › Uso (super admin, 2026-11-26): la adopción de la herramienta, para compararla con la línea base de
 * Gerardo. Lee `UsoDiario` (comun/usoDiario.ts): quién entró, qué días, en qué áreas y cuánto hizo. «Activo» es haber
 * hecho al menos un pedido ese día (sin contar el sondeo de cada minuto); «acciones», los que cambian algo.
 *
 * Fuera quedan los workspaces que no cuentan en las métricas (salvo que se elija uno) y los super admin: su uso es
 * administrar y probar, no el trabajo del equipo.
 */

const AREAS = ['marca', 'cdm', 'copy', 'aprobacion', 'produccion', 'implementacion', 'reporte', 'general'] as const;
const DIA_MS = 86_400_000;

export const uso = async (req: AuthRequest, res: Response) => {
  try {
    const dias = Math.min(365, Math.max(7, Number(req.query.dias) || 30));
    const workspaceId = typeof req.query.workspaceId === 'string' && req.query.workspaceId ? req.query.workspaceId : undefined;
    // El día de Bogotá de hoy, a medianoche UTC, como lo guarda `UsoDiario`.
    const hoy = Math.floor((Date.now() - 5 * 3_600_000) / DIA_MS) * DIA_MS;
    const desde = new Date(hoy - (dias - 1) * DIA_MS);
    const enWorkspaces = workspaceId ? { workspaceId } : { workspace: { cuentaEnMetricas: true } };

    const [membresias, filas] = await Promise.all([
      prisma.membership.findMany({
        where: { ...enWorkspaces, user: { superAdmin: false } },
        select: { userId: true, workspaceId: true, role: true, user: { select: { name: true, email: true } }, workspace: { select: { name: true } } },
      }),
      prisma.usoDiario.findMany({ where: { dia: { gte: desde }, ...(workspaceId ? { workspaceId } : {}) } }),
    ]);
    const conAcceso = new Map(membresias.map(m => [`${m.workspaceId}|${m.userId}`, m]));
    const suyas = filas.filter(f => conAcceso.has(`${f.workspaceId}|${f.userId}`));
    const personas = [...new Set(membresias.map(m => m.userId))];
    const clave = (d: Date) => d.toISOString().slice(0, 10);

    // Día por día, para la curva de adopción; los días sin nadie también salen, en cero.
    const porDia = Array.from({ length: dias }, (_, i) => {
      const dia = new Date(desde.getTime() + i * DIA_MS);
      const delDia = suyas.filter(f => f.dia.getTime() === dia.getTime());
      return {
        dia: clave(dia),
        habil: esHabil(dia.getTime()),
        personas: new Set(delDia.map(f => f.userId)).size,
        acciones: delDia.reduce((t, f) => t + f.acciones, 0),
      };
    });
    const activosEn = (n: number) => new Set(suyas.filter(f => f.dia.getTime() > hoy - n * DIA_MS).map(f => f.userId)).size;
    const habiles = porDia.filter(d => d.habil);

    const porArea = AREAS.map(area => {
      const de = suyas.filter(f => f.area === area);
      return {
        area,
        personas: new Set(de.map(f => f.userId)).size,
        acciones: de.reduce((t, f) => t + f.acciones, 0),
        lecturas: de.reduce((t, f) => t + f.lecturas, 0),
      };
    });

    const porPersona = personas
      .map(id => {
        const m = membresias.filter(x => x.userId === id);
        const de = suyas.filter(f => f.userId === id);
        const diasActivos = new Set(de.map(f => clave(f.dia)));
        return {
          id,
          nombre: m[0].user.name,
          email: m[0].user.email,
          workspaces: m.map(x => x.workspace.name),
          diasActivos: diasActivos.size,
          acciones: de.reduce((t, f) => t + f.acciones, 0),
          lecturas: de.reduce((t, f) => t + f.lecturas, 0),
          ultimoDia: [...diasActivos].sort().pop() ?? null,
          porArea: Object.fromEntries(AREAS.map(a => [a, de.filter(f => f.area === a).reduce((t, f) => t + f.acciones, 0)])) as Record<(typeof AREAS)[number], number>,
        };
      })
      .sort((a, b) => b.diasActivos - a.diasActivos || b.acciones - a.acciones);

    const porWorkspace = [...new Set(membresias.map(m => m.workspaceId))].map(id => {
      const de = suyas.filter(f => f.workspaceId === id);
      return {
        id,
        nombre: membresias.find(m => m.workspaceId === id)!.workspace.name,
        conAcceso: membresias.filter(m => m.workspaceId === id).length,
        activos: new Set(de.map(f => f.userId)).size,
        acciones: de.reduce((t, f) => t + f.acciones, 0),
      };
    });

    const activosPeriodo = new Set(suyas.map(f => f.userId)).size;
    res.json({
      dias,
      desde: clave(desde),
      /** El registro empezó el día del deploy (2026-11-26): antes no hay datos, no es que nadie entrara. */
      primerDato: filas.length ? clave(new Date(Math.min(...filas.map(f => f.dia.getTime())))) : null,
      resumen: {
        conAcceso: personas.length,
        activosPeriodo,
        adopcion: personas.length ? activosPeriodo / personas.length : null,
        activos7: activosEn(7),
        activos30: activosEn(30),
        promedioDiarioHabil: habiles.length ? habiles.reduce((t, d) => t + d.personas, 0) / habiles.length : null,
        acciones: suyas.reduce((t, f) => t + f.acciones, 0),
      },
      porDia,
      porArea,
      porPersona,
      porWorkspace,
    });
  } catch (error) {
    handleTenantError(error, res, 'Error al medir el uso');
  }
};
