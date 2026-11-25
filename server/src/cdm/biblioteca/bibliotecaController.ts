import { Response } from 'express';
import { ClaseDeMedio } from '@prisma/client';
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
      // Los campos del formato que no dependen de una ubicación: los de los canales de My Voice (F2c).
      campos: { where: { ubicacionId: null }, orderBy: { orden: 'asc' as const } },
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
          clase: m.clase,
          estado: m.estado,
          formatos: m.formatos.length,
          ubicaciones: ubicaciones.length,
          plataformas: [...new Set(ubicaciones.map(u => u.plataforma))],
          proporciones: [...new Set(m.formatos.map(f => f.proporcion).filter((p): p is string => Boolean(p)))],
          porConfirmar: ubicaciones.filter(u => u.porConfirmar).length,
          sinValidar: ubicaciones.filter(u => !u.revision).length,
          conObservacion: ubicaciones.filter(u => u.revision === 'CON_OBSERVACION').length,
          sinCampos: versiones.some(v => !v.campos.length && !v.ubicaciones.some(u => u.campos.length)),
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
    // Quién revisó cada ubicación, con su nombre: la revisión guarda solo el id.
    const ids = [...new Set(medio.formatos.flatMap(f => f.versiones[0]?.ubicaciones.map(u => u.revisadaPorId) ?? []).filter((x): x is string => Boolean(x)))];
    const nombres = new Map(
      (await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map(u => [u.id, u.name])
    );
    res.json({
      id: medio.id,
      nombre: medio.nombre,
      clase: medio.clase,
      estado: medio.estado,
      formatos: medio.formatos
        .filter(f => f.versiones[0])
        .map(f => {
          const v = f.versiones[0];
          const claves = new Map<
            string,
            { nombre: string; zona: string; repeticiones: number; largos: { maximo: number | null; minimo: number | null; ubicacion: string }[] }
          >();
          for (const u of v.ubicaciones) {
            for (const c of u.campos) {
              const e = claves.get(c.clave) ?? { nombre: c.nombre, zona: c.zona, repeticiones: 0, largos: [] };
              e.largos.push({ maximo: c.maximo, minimo: c.minimo, ubicacion: u.nombre });
              // Cuántos lleva la pieza: los que pide la ubicación que más pide, como el pedido de copy.
              e.repeticiones = Math.max(e.repeticiones, c.repeticiones);
              claves.set(c.clave, e);
            }
          }
          const campos = [...claves.entries()].map(([clave, { nombre, zona, repeticiones, largos }]) => {
            const maximos = largos.map(l => l.maximo).filter((x): x is number => x != null);
            const corto = maximos.length ? largos.find(l => l.maximo === Math.min(...maximos)) : undefined;
            return {
              clave,
              nombre,
              zona,
              repeticiones,
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
              resolucion: u.resolucion,
              detalles: u.detalles,
              zonaSegura: u.zonaSegura,
              urlFuente: u.urlFuente,
              campos: [...u.campos]
                .sort((a, b) => a.orden - b.orden)
                .map(c => ({ clave: c.clave, nombre: c.nombre, maximo: c.maximo, repeticiones: c.repeticiones })),
              revision: u.revision
                ? {
                    estado: u.revision,
                    nota: u.revisionNota,
                    por: u.revisadaPorId ? (nombres.get(u.revisadaPorId) ?? null) : null,
                    en: u.revisadaEn?.toISOString() ?? null,
                  }
                : null,
            })),
            campos,
            camposDelFormato: v.campos.map(c => ({
              clave: c.clave,
              nombre: c.nombre,
              zona: c.zona,
              unidad: c.unidad,
              minimo: c.minimo,
              maximo: c.maximo,
              repeticiones: c.repeticiones,
            })),
            canal: f.canal,
          };
        }),
    });
  } catch (error) {
    handleTenantError(error, res, 'Error al leer el medio');
  }
};

const CLASES = Object.values(ClaseDeMedio) as string[];

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
      (p.clase === undefined || CLASES.includes(p.clase)) &&
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

/** Cambiar la clase de un medio (decisión 29): decide quién lo publica al final y cómo se agrupa. */
export const cambiarClaseDeMedio = async (req: AuthRequest, res: Response) => {
  const { clase } = (req.body ?? {}) as { clase?: unknown };
  if (typeof clase !== 'string' || !CLASES.includes(clase)) return res.status(400).json({ error: 'Clase inválida' });
  try {
    const medio = await prisma.medio.findUnique({ where: { id: req.params.id }, select: { id: true, workspaceId: true } });
    if (!medio || medio.workspaceId !== req.tenant!.workspaceId) return res.status(404).json({ error: 'Medio no encontrado' });
    await exigirPlanning(req.tenant!);
    res.json(await prisma.medio.update({ where: { id: medio.id }, data: { clase: clase as ClaseDeMedio }, select: { id: true, clase: true } }));
  } catch (error) {
    handleTenantError(error, res, 'Error al cambiar la clase del medio');
  }
};

/**
 * Validar una ubicación en la herramienta (2026-11-25): la planilla de Google y DV360 llegó sin validar y el equipo
 * la revisa aquí, una por una. «Está bien», «Algo está mal» con una nota, o volver a sin revisar. Es de Planning.
 */
export const revisarUbicacion = async (req: AuthRequest, res: Response) => {
  const { revision, nota } = (req.body ?? {}) as { revision?: unknown; nota?: unknown };
  if (revision !== null && revision !== 'VALIDADA' && revision !== 'CON_OBSERVACION') return res.status(400).json({ error: 'Revisión inválida' });
  const texto = typeof nota === 'string' ? nota.trim().slice(0, 1000) : '';
  if (revision === 'CON_OBSERVACION' && !texto) return res.status(400).json({ error: 'Cuenta qué está mal' });
  try {
    const ubicacion = await prisma.ubicacion.findUnique({
      where: { id: req.params.id },
      select: { id: true, version: { select: { formato: { select: { medio: { select: { workspaceId: true } } } } } } },
    });
    // De otra agencia responde 404, como todo lo ajeno.
    if (!ubicacion || ubicacion.version.formato.medio.workspaceId !== req.tenant!.workspaceId) {
      return res.status(404).json({ error: 'Ubicación no encontrada' });
    }
    await exigirPlanning(req.tenant!);
    const r = await prisma.ubicacion.update({
      where: { id: ubicacion.id },
      data: revision
        ? { revision, revisionNota: revision === 'CON_OBSERVACION' ? texto : null, revisadaPorId: req.tenant!.userId, revisadaEn: new Date() }
        : { revision: null, revisionNota: null, revisadaPorId: null, revisadaEn: null },
      select: { id: true, revision: true, revisionNota: true, revisadaEn: true },
    });
    res.json(r);
  } catch (error) {
    handleTenantError(error, res, 'Error al revisar la ubicación');
  }
};
