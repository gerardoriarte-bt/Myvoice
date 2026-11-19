import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';

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
            })),
            campos,
          };
        }),
    });
  } catch (error) {
    handleTenantError(error, res, 'Error al leer el medio');
  }
};
