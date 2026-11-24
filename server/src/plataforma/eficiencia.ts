import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { eficienciaDeSabanas } from '../cdm/planning/planningService.js';
import { eficienciaDeCopy } from '../myvoice/copyParaProduccion.js';
import { eficienciaDePiezas } from '../services/piezaService.js';
import { eficienciaDeAnuncios } from '../implementacion/anuncios.js';

/**
 * La eficiencia del flujo, para el super admin (Gerardo, 2026-11-24: «no solo el consumo de IA, sino el tiempo que
 * lleva todo el flujo, las revisiones y ajustes solicitados por el cliente»). Por campaña:
 *
 * - **Tiempo de cada fase**, de cuándo empezó a cuándo terminó: planeación (la sábana, de creada a aprobada), copy (de
 *   la sábana aprobada —o del primer copy— al último aprobado), producción (de la primera pieza a la última aceptada),
 *   aprobación final (del primer envío a la última aprobación) y montaje (de la primera aprobación al último montado).
 *   El total va de la creación de la campaña al último montado; mientras no termine, cuenta hasta hoy y se marca
 *   «en curso».
 * - **Revisiones y ajustes**: devoluciones de la sábana, cambios de copy que pidió el cliente, copy revocado o
 *   reeditado, piezas devueltas, versiones de arte, cambios pedidos en la aprobación final y novedades al montar.
 * - **Costo de IA**: la generación de copy de la campaña y la auditoría de sus piezas.
 *
 * Es de la plataforma porque cruza los cuatro módulos (cada uno responde lo suyo) y está por encima de los workspaces:
 * solo la ve `requireSuperAdmin` (decisión 27). Se calcula al leer, sin tablas nuevas.
 */

const horas = (desde: string | null, hasta: string | null) => (desde && hasta ? Math.max(0, (Date.parse(hasta) - Date.parse(desde)) / 3_600_000) : null);
const mediana = (xs: number[]) => {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};
const FASES = ['planeacion', 'copy', 'produccion', 'aprobacionFinal', 'montaje'] as const;
type Fase = (typeof FASES)[number];

export const eficiencia = async (req: AuthRequest, res: Response) => {
  try {
    const dias = Math.min(365, Math.max(7, Number(req.query.dias) || 90));
    const workspaceId = typeof req.query.workspaceId === 'string' && req.query.workspaceId ? req.query.workspaceId : undefined;
    const campanas = await prisma.project.findMany({
      where: { createdAt: { gte: new Date(Date.now() - dias * 86_400_000) }, clientId: { not: null }, ...(workspaceId && { workspaceId }) },
      select: {
        id: true,
        name: true,
        createdAt: true,
        modoAprobacion: true,
        dnaProfileId: true,
        client: { select: { name: true } },
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const ids = campanas.map(c => c.id);
    const [sabanas, copy, piezas, anuncios] = await Promise.all([
      eficienciaDeSabanas(ids),
      eficienciaDeCopy(campanas.map(c => ({ id: c.id, dnaProfileId: c.dnaProfileId }))),
      eficienciaDePiezas(ids),
      eficienciaDeAnuncios(ids),
    ]);
    const ahora = new Date().toISOString();

    const filas = campanas.map(c => {
      const s = sabanas.get(c.id) ?? null;
      const k = copy.get(c.id)!;
      const p = piezas.get(c.id)!;
      const a = anuncios.get(c.id)!;
      const copyTermino = k.piezas > 0 && k.aprobadas === k.piezas;
      const fases: Record<Fase, { horas: number | null; enCurso: boolean } | null> = {
        planeacion: s ? { horas: horas(s.creada, s.aprobada ?? ahora), enCurso: !s.aprobada } : null,
        copy: k.primero ? { horas: horas(s?.aprobada ?? k.primero, copyTermino ? k.ultimoAprobado : ahora), enCurso: !copyTermino } : null,
        produccion: p.primera ? { horas: horas(p.primera, p.ultimaAceptada ?? ahora), enCurso: !p.ultimaAceptada } : null,
        aprobacionFinal: a.primerEnvio ? { horas: horas(a.primerEnvio, a.ultimaAprobacion ?? ahora), enCurso: !a.ultimaAprobacion } : null,
        montaje: a.primeraAprobacion ? { horas: horas(a.primeraAprobacion, a.ultimoMontado ?? ahora), enCurso: a.montados < a.anuncios } : null,
      };
      // El flujo empieza cuando nace la campaña (con su brief), o antes si algo de ella es anterior.
      const inicio = [c.createdAt.toISOString(), s?.creada, k.primero].filter((x): x is string => !!x).sort()[0];
      const termino = a.anuncios > 0 && a.montados === a.anuncios ? a.ultimoMontado : null;
      return {
        id: c.id,
        campana: c.name,
        marca: c.client?.name ?? null,
        workspace: c.workspace.name,
        modoAprobacion: c.modoAprobacion,
        creada: c.createdAt.toISOString(),
        total: { horas: horas(inicio, termino ?? ahora), enCurso: !termino },
        fases,
        revisiones: {
          sabanaDevueltaPorEquipo: s?.devueltaPorEquipo ?? 0,
          sabanaDevueltaPorCliente: s?.devueltaPorCliente ?? 0,
          sabanaVersiones: s?.versiones ?? 0,
          copyCambiosDelCliente: k.cambiosDelCliente,
          copyRevocado: k.revocadas,
          copyReeditado: k.reeditadas,
          copyRondasConCliente: k.rondasConCliente,
          piezasDevueltasPorEquipo: p.devueltasPorEquipo,
          piezasDevueltasPorCliente: p.devueltasPorCliente,
          versionesDeArte: p.versiones,
          implementacionCambiosDelCliente: a.cambiosDelCliente,
          novedadesAlMontar: a.novedades,
        },
        volumen: { piezasDeCopy: k.piezas, piezas: p.piezas, anuncios: a.anuncios, montados: a.montados, generaciones: k.generaciones },
        costoUsd: { copy: k.costoUsd, auditoria: p.costoAuditoriaUsd, total: k.costoUsd + p.costoAuditoriaUsd },
      };
    });

    // Lo que resume: la mediana de cada fase entre las campañas que ya la terminaron, y los totales de ajustes.
    const terminadas = (f: Fase) => filas.map(x => x.fases[f]).filter((x): x is { horas: number; enCurso: false } => !!x && !x.enCurso && x.horas !== null).map(x => x.horas);
    const suma = (f: (x: (typeof filas)[number]) => number) => filas.reduce((t, x) => t + f(x), 0);
    const cambiosDelCliente = (x: (typeof filas)[number]) =>
      x.revisiones.sabanaDevueltaPorCliente + x.revisiones.copyCambiosDelCliente + x.revisiones.piezasDevueltasPorCliente + x.revisiones.implementacionCambiosDelCliente;
    const ajustesInternos = (x: (typeof filas)[number]) =>
      x.revisiones.sabanaDevueltaPorEquipo + x.revisiones.copyRevocado + x.revisiones.copyReeditado + x.revisiones.piezasDevueltasPorEquipo + x.revisiones.novedadesAlMontar;
    res.json({
      dias,
      resumen: {
        campanas: filas.length,
        terminadas: filas.filter(x => !x.total.enCurso).length,
        medianaTotalHoras: mediana(filas.filter(x => !x.total.enCurso && x.total.horas !== null).map(x => x.total.horas!)),
        medianaPorFase: Object.fromEntries(FASES.map(f => [f, mediana(terminadas(f))])) as Record<Fase, number | null>,
        cambiosDelCliente: suma(cambiosDelCliente),
        campanasConCambiosDelCliente: filas.filter(x => cambiosDelCliente(x) > 0).length,
        ajustesInternos: suma(ajustesInternos),
        montados: suma(x => x.volumen.montados),
        costoUsd: suma(x => x.costoUsd.total),
        costoPorMontadoUsd: suma(x => x.volumen.montados) ? suma(x => x.costoUsd.total) / suma(x => x.volumen.montados) : null,
      },
      campanas: filas.map(x => ({ ...x, cambiosDelCliente: cambiosDelCliente(x), ajustesInternos: ajustesInternos(x) })),
    });
  } catch (error) {
    handleTenantError(error, res, 'Error al medir la eficiencia');
  }
};
