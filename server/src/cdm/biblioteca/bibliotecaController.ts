import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { exigirPlanning } from '../../comun/permisos.js';
import { aplicarCarga, planificarCarga, PlanillaDeMedio } from './cargarPlanilla.js';

/**
 * La biblioteca de medios para leer (F2b; en el `.pen`, B1 el catálogo y B2 un medio por pieza). Es de la
 * agencia y la ve cualquier miembro del workspace: ver no se restringe (decisión 22). Editarla es de
 * Planning y llega en la entrega siguiente.
 */

const ultimaVersion = {
  versiones: {
    orderBy: { numero: 'desc' as const },
    take: 1,
    include: {
      ubicaciones: { orderBy: { orden: 'asc' as const }, include: { campos: true } },
    },
  },
};

/** B1: un medio por tarjeta, con lo que cada tarjeta dice. */
export const listarMedios = async (req: AuthRequest, res: Response) => {
  try {
    const medios = await prisma.medio.findMany({
      where: { workspaceId: req.tenant!.workspaceId },
      include: { formatos: { include: ultimaVersion } },
      orderBy: { nombre: 'asc' },
    });
    res.json(
      medios.map(m => {
        const versiones = m.formatos.map(f => f.versiones[0]).filter(Boolean);
        const ubicaciones = versiones.flatMap(v => v.ubicaciones);
        const masNueva = versiones.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
        return {
          id: m.id,
          nombre: m.nombre,
          estado: m.estado,
          formatos: m.formatos.length,
          ubicaciones: ubicaciones.length,
          plataformas: [...new Set(ubicaciones.map(u => u.plataforma))],
          proporciones: [...new Set(m.formatos.map(f => f.proporcion).filter((p): p is string => Boolean(p)))],
          porConfirmar: ubicaciones.filter(u => u.porConfirmar).length,
          sinCampos: versiones.some(v => !v.ubicaciones.some(u => u.campos.length)),
          actualizado: masNueva ? { fuente: masNueva.fuente, fecha: (masNueva.fuenteFecha ?? masNueva.createdAt).toISOString() } : null,
        };
      })
    );
  } catch (error) {
    handleTenantError(error, res, 'Error al leer la biblioteca');
  }
};

/**
 * B2: un medio con cada pieza en su última versión. Los campos de texto se resumen como en el diseño: el
 * rango de largos entre sus ubicaciones y cuál lo acota («40 a 125 · más corto en Reels de FB»).
 */
export const detalleDeMedio = async (req: AuthRequest, res: Response) => {
  try {
    const medio = await prisma.medio.findUnique({ where: { id: req.params.id }, include: { formatos: { include: ultimaVersion } } });
    // De otra agencia responde 404, como todo lo ajeno.
    if (!medio || medio.workspaceId !== req.tenant!.workspaceId) return res.status(404).json({ error: 'Medio no encontrado' });
    res.json({
      id: medio.id,
      nombre: medio.nombre,
      estado: medio.estado,
      formatos: medio.formatos
        .filter(f => f.versiones[0])
        .map(f => {
          const v = f.versiones[0];
          const claves = new Map<string, { nombre: string; largos: { maximo: number | null; minimo: number | null; ubicacion: string }[] }>();
          for (const u of v.ubicaciones) {
            for (const c of u.campos) {
              const e = claves.get(c.clave) ?? { nombre: c.nombre, largos: [] };
              e.largos.push({ maximo: c.maximo, minimo: c.minimo, ubicacion: u.nombre });
              claves.set(c.clave, e);
            }
          }
          const campos = [...claves.entries()].map(([clave, { nombre, largos }]) => {
            const maximos = largos.map(l => l.maximo).filter((x): x is number => x != null);
            const corto = maximos.length ? largos.find(l => l.maximo === Math.min(...maximos)) : undefined;
            return {
              clave,
              nombre,
              desde: maximos.length ? Math.min(...maximos) : null,
              hasta: maximos.length ? Math.max(...maximos) : null,
              // Solo se dice quién lo acota cuando hay rango y la acota una sola ubicación del grupo.
              masCortoEn: corto && Math.min(...maximos) !== Math.max(...maximos) ? corto.ubicacion : null,
              enUbicaciones: largos.length,
            };
          });
          return {
            id: f.id,
            nombre: f.nombre,
            tipoArchivo: f.tipoArchivo,
            proporcion: f.proporcion,
            version: v.numero,
            anchoPx: v.anchoPx,
            altoPx: v.altoPx,
            archivos: v.archivos,
            pesoMaximo: v.pesoMaximo,
            guia: v.guia,
            fuente: v.fuente,
            fuenteFecha: v.fuenteFecha?.toISOString() ?? null,
            ubicaciones: v.ubicaciones.map(u => ({
              id: u.id,
              plataforma: u.plataforma,
              nombre: u.nombre,
              proporcion: u.proporcion,
              porConfirmar: u.porConfirmar,
              alertaTexto: u.alertaTexto,
              detalles: u.detalles,
              zonaSegura: u.zonaSegura,
            })),
            campos,
          };
        }),
    });
  } catch (error) {
    handleTenantError(error, res, 'Error al leer el medio');
  }
};

/** Lo mínimo que tiene que traer una planilla para leerla; el resto lo valida `leerPlanilla` fila por fila. */
const planillaValida = (b: unknown): b is PlanillaDeMedio => {
  const p = b as Partial<PlanillaDeMedio> | null;
  return Boolean(
    p &&
      typeof p.medio === 'string' &&
      p.medio.trim().length > 0 &&
      p.medio.length <= 80 &&
      typeof p.fuente === 'string' &&
      p.fuente.length <= 200 &&
      typeof p.fecha === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(p.fecha) &&
      Array.isArray(p.especificaciones) &&
      p.especificaciones.length <= 2000 &&
      (p.zonasSeguras === undefined || Array.isArray(p.zonasSeguras)) &&
      (p.alertas === undefined || Array.isArray(p.alertas))
  );
};

/**
 * B5: cargar la planilla de un medio. Sin `aplicar`, en seco: devuelve qué haría. Con `aplicar`, lo escribe en
 * una transacción. La planilla llega ya leída por el navegador: el servidor no abre .xlsx.
 */
export const cargarPlanilla = async (req: AuthRequest, res: Response) => {
  const { planilla, aplicar } = (req.body ?? {}) as { planilla?: unknown; aplicar?: unknown };
  if (!planillaValida(planilla)) return res.status(400).json({ error: 'La planilla no se pudo leer: falta el medio, la fecha o las filas' });
  try {
    await exigirPlanning(req.tenant!);
    const p = { ...planilla, medio: planilla.medio.trim() };
    res.json(aplicar === true ? await aplicarCarga(req.tenant!.workspaceId, p, req.tenant!.userId) : await planificarCarga(req.tenant!.workspaceId, p));
  } catch (error) {
    handleTenantError(error, res, 'Error al cargar la planilla');
  }
};

const ESTADOS = ['BORRADOR', 'ACTIVO', 'OCULTO'] as const;

/**
 * Activar, ocultar o volver a borrador un medio. Solo se activa con campos de texto en cada pieza: en
 * borrador no se elige en un planning (spec-cdm § 2).
 */
export const cambiarEstadoDeMedio = async (req: AuthRequest, res: Response) => {
  const { estado } = (req.body ?? {}) as { estado?: unknown };
  if (!ESTADOS.includes(estado as (typeof ESTADOS)[number])) return res.status(400).json({ error: 'Estado inválido' });
  try {
    const medio = await prisma.medio.findUnique({
      where: { id: req.params.id },
      include: { formatos: { include: { versiones: { orderBy: { numero: 'desc' }, take: 1, include: { campos: { select: { id: true }, take: 1 } } } } } },
    });
    if (!medio || medio.workspaceId !== req.tenant!.workspaceId) return res.status(404).json({ error: 'Medio no encontrado' });
    await exigirPlanning(req.tenant!);
    if (estado === 'ACTIVO' && (medio.formatos.length === 0 || medio.formatos.some(f => !f.versiones[0]?.campos.length))) {
      return res.status(409).json({ error: 'Para activarlo, cada pieza necesita al menos un campo de texto' });
    }
    const actualizado = await prisma.medio.update({
      where: { id: medio.id },
      data: { estado: estado as (typeof ESTADOS)[number] },
      select: { id: true, estado: true },
    });
    res.json(actualizado);
  } catch (error) {
    handleTenantError(error, res, 'Error al cambiar el estado del medio');
  }
};
