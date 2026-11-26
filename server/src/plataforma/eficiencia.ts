import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { eficienciaDeSabanas } from '../cdm/planning/planningService.js';
import { eficienciaDeCopy } from '../myvoice/copyParaProduccion.js';
import { eficienciaDePiezas } from '../services/piezaService.js';
import { eficienciaDeAnuncios } from '../implementacion/anuncios.js';
import { horasHabiles } from './horasHabiles.js';

/**
 * La eficiencia del flujo, para el super admin (Gerardo, 2026-11-24: «no solo el consumo de IA, sino el tiempo que
 * lleva todo el flujo, las revisiones y ajustes solicitados por el cliente»). Por campaña:
 *
 * - **Tiempo de cada fase**, de cuándo empezó a cuándo terminó, en horas corridas y en horas hábiles (L–V 8–18 de
 *   Bogotá, sin festivos): planeación (la sábana, de creada a aprobada), copy (de la sábana aprobada —o del primer
 *   copy— hasta que está aprobado todo lo pedido), producción (de la primera pieza hasta que están listas todas),
 *   aprobación final (de que el primer anuncio quedó listo para aprobar hasta que están aprobados todos) y montaje (de
 *   la primera aprobación hasta que están montados todos). Mientras no termine, cuenta hasta hoy y se marca «en curso».
 * - **Revisiones y ajustes**: devoluciones de la sábana, cambios de copy que pidió el cliente, copy revocado o
 *   reeditado, piezas devueltas, versiones de arte, cambios pedidos en la aprobación final y novedades al montar.
 * - **Costo de IA**: la generación de copy de la campaña, la auditoría de sus piezas, «Refinar» y lo que gastaron las
 *   generaciones que fallaron.
 *
 * La línea base de Gerardo (2026-11-26) corrigió cómo se mide, y como todo se calcula al leer, la corrección vale
 * también para el pasado (las definiciones, en docs/ecosistema/datos/medicion.md):
 * - «Terminado» es **todo** lo esperado: lo pedido en la sábana aprobada y, sin ella, lo que existe. Antes producción y
 *   aprobación final terminaban con la primera pieza aceptada o el primer anuncio aprobado, y los anuncios que nadie
 *   había tocado no contaban.
 * - Una campaña termina donde termina su flujo: en el montaje si la marca tiene Implementación; si no, en la
 *   producción (o en el copy, si no hay piezas).
 * - Entran solo campañas con actividad (sábana, copy, piezas o generaciones) de workspaces que cuentan en las
 *   métricas, y se elige el periodo por actividad, no por creación: una campaña vieja que sigue viva también entra.
 * - Las medianas son de lo terminado; al lado va cuántas siguen abiertas y su edad, para no esconder las lentas.
 *
 * Es de la plataforma porque cruza los cuatro módulos (cada uno responde lo suyo) y está por encima de los workspaces:
 * solo la ve `requireSuperAdmin` (decisión 27). Se calcula al leer, sin tablas nuevas.
 */

const horas = (desde: string | null, hasta: string | null) => (desde && hasta ? Math.max(0, (Date.parse(hasta) - Date.parse(desde)) / 3_600_000) : null);
const percentil = (xs: number[], p: number) => {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  const i = (o.length - 1) * p;
  const piso = Math.floor(i);
  return o[piso] + (o[Math.ceil(i)] - o[piso]) * (i - piso);
};
const FASES = ['planeacion', 'copy', 'produccion', 'aprobacionFinal', 'montaje'] as const;
type Fase = (typeof FASES)[number];
type Medida = { horas: number | null; horasHabiles: number | null; enCurso: boolean; avance: { listas: number; esperadas: number } | null };

const medir = (desde: string | null, hasta: string | null, terminada: boolean, ahora: string, avance: Medida['avance'] = null): Medida => {
  const fin = terminada ? hasta : ahora;
  return { horas: horas(desde, fin), horasHabiles: horasHabiles(desde, fin), enCurso: !terminada, avance };
};

export const eficiencia = async (req: AuthRequest, res: Response) => {
  try {
    const dias = Math.min(365, Math.max(7, Number(req.query.dias) || 90));
    const workspaceId = typeof req.query.workspaceId === 'string' && req.query.workspaceId ? req.query.workspaceId : undefined;
    const desde = new Date(Date.now() - dias * 86_400_000).toISOString();
    const ahora = new Date().toISOString();
    // Elegido un workspace, se muestra aunque esté fuera de las métricas; en «Todos», solo los que cuentan.
    const campanas = await prisma.project.findMany({
      where: { clientId: { not: null }, ...(workspaceId ? { workspaceId } : { workspace: { cuentaEnMetricas: true } }) },
      select: {
        id: true,
        name: true,
        createdAt: true,
        modoAprobacion: true,
        dnaProfileId: true,
        workspaceId: true,
        client: { select: { name: true, modulos: { select: { modulo: true } } } },
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const ids = campanas.map(c => c.id);
    const sabanas = await eficienciaDeSabanas(ids);
    const [copy, piezas, anuncios, consumos] = await Promise.all([
      eficienciaDeCopy(campanas.map(c => ({ id: c.id, dnaProfileId: c.dnaProfileId, lineas: sabanas.get(c.id)?.lineas ?? [] }))),
      eficienciaDePiezas(ids),
      eficienciaDeAnuncios(campanas.map(c => ({ id: c.id, workspaceId: c.workspaceId }))),
      prisma.consumoIa.groupBy({ by: ['projectId', 'etapa'], where: { projectId: { in: ids } }, _sum: { costUsd: true }, _count: { _all: true } }),
    ]);

    const todas = campanas.map(c => {
      const s = sabanas.get(c.id) ?? null;
      const k = copy.get(c.id)!;
      const p = piezas.get(c.id)!;
      const a = anuncios.get(c.id)!;
      const conImplementacion = c.client?.modulos.some(m => m.modulo === 'IMPLEMENTACION') ?? false;
      const lineas = s?.lineas ?? [];
      const planeados = lineas.reduce((t, l) => t + l.piezas, 0);
      const planeadasConDiseno = lineas.filter(l => !l.soloTexto).reduce((t, l) => t + l.piezas, 0);

      // Lo esperado: lo pedido en la sábana o, sin ella, lo que existe.
      const piezasEsperadas = lineas.length ? Math.max(planeadasConDiseno, p.piezas) : p.piezas;
      const produccionTermino = lineas.length
        ? p.listas >= piezasEsperadas && p.listas === p.piezas
        : p.piezas > 0 && p.listas === p.piezas && k.termino;
      const anunciosEsperados = Math.max(planeados, a.anuncios);
      const aprobacionTermino = anunciosEsperados > 0 && a.aprobados >= anunciosEsperados;
      const montajeTermino = anunciosEsperados > 0 && a.montados >= anunciosEsperados;

      const fases: Record<Fase, Medida | null> = {
        planeacion: s ? medir(s.creada, s.aprobada, !!s.aprobada, ahora) : null,
        copy: k.primero || (s?.aprobada && k.esperadas > 0)
          ? medir(s?.aprobada ?? k.primero, k.ultimoAprobado, k.termino, ahora, { listas: k.listas, esperadas: k.esperadas })
          : null,
        produccion: p.primera ? medir(p.primera, p.ultimaAceptada, produccionTermino, ahora, { listas: p.listas, esperadas: piezasEsperadas }) : null,
        aprobacionFinal:
          conImplementacion && a.primerListo
            ? medir(a.primerListo, a.ultimaAprobacion, aprobacionTermino, ahora, { listas: a.aprobados, esperadas: anunciosEsperados })
            : null,
        montaje:
          conImplementacion && a.primeraAprobacion
            ? medir(a.primeraAprobacion, a.ultimoMontado, montajeTermino, ahora, { listas: a.montados, esperadas: anunciosEsperados })
            : null,
      };

      // Dónde termina el flujo de esta marca: montado, si tiene Implementación; si no, las piezas listas o el copy.
      const terminaEn: 'montaje' | 'produccion' | 'copy' = conImplementacion ? 'montaje' : p.piezas > 0 || planeadasConDiseno > 0 ? 'produccion' : 'copy';
      const final = terminaEn === 'montaje' ? (montajeTermino ? a.ultimoMontado : null) : terminaEn === 'produccion' ? (produccionTermino ? p.ultimaAceptada : null) : k.termino ? k.ultimoAprobado : null;
      // El flujo empieza cuando nace la campaña (con su brief), o antes si algo de ella es anterior.
      const inicio = [c.createdAt.toISOString(), s?.creada, s?.aprobada, k.primero, p.primera].filter((x): x is string => !!x).sort()[0];

      const otros = consumos.filter(x => x.projectId === c.id);
      const costoDe = (etapa: string) => Number(otros.find(x => x.etapa === etapa)?._sum.costUsd ?? 0);
      const costo = { copy: k.costoUsd, auditoria: p.costoAuditoriaUsd, refinar: costoDe('refinar'), fallidas: costoDe('generacion-fallida') };
      const ultimaActividad = [s?.ultimaActividad, k.ultimaActividad, p.ultimaActividad, a.ultimaActividad].filter((x): x is string => !!x).sort().pop() ?? null;
      const conActividad = !!s || !!k.primero || !!p.primera || k.generaciones > 0;

      return {
        id: c.id,
        campana: c.name,
        marca: c.client?.name ?? null,
        workspace: c.workspace.name,
        modoAprobacion: c.modoAprobacion,
        creada: c.createdAt.toISOString(),
        conSabana: lineas.length > 0,
        conImplementacion,
        terminaEn,
        ultimaActividad,
        conActividad,
        total: medir(inicio, final, !!final, ahora),
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
        volumen: {
          lineasDeSabana: lineas.length,
          piezasPlaneadas: planeados,
          piezasDeCopy: k.piezas,
          piezas: p.piezas,
          anuncios: anunciosEsperados,
          montados: a.montados,
          generaciones: k.generaciones,
          generacionesFallidas: otros.find(x => x.etapa === 'generacion-fallida')?._count._all ?? 0,
        },
        costoUsd: { ...costo, total: costo.copy + costo.auditoria + costo.refinar + costo.fallidas },
      };
    });

    // Quién entra: con actividad, y que esa actividad (o su creación) caiga en el periodo.
    const filas = todas.filter(x => x.conActividad && ((x.ultimaActividad ?? x.creada) >= desde || x.creada >= desde));
    const sinActividad = todas.filter(x => !x.conActividad && x.creada >= desde).length;

    const resumenDe = (medidas: (Medida | null)[]) => {
      const hechas = medidas.filter((x): x is Medida => !!x && !x.enCurso && x.horas !== null);
      const abiertas = medidas.filter((x): x is Medida => !!x && x.enCurso);
      return {
        terminadas: hechas.length,
        abiertas: abiertas.length,
        mediana: percentil(hechas.map(x => x.horas!), 0.5),
        p75: percentil(hechas.map(x => x.horas!), 0.75),
        medianaHabiles: percentil(hechas.map(x => x.horasHabiles!), 0.5),
        p75Habiles: percentil(hechas.map(x => x.horasHabiles!), 0.75),
        /** Cuánto llevan las que siguen abiertas: si es mayor que la mediana, las lentas se están quedando fuera. */
        edadAbiertasHabiles: percentil(abiertas.map(x => x.horasHabiles ?? 0), 0.5),
      };
    };
    const suma = (f: (x: (typeof filas)[number]) => number) => filas.reduce((t, x) => t + f(x), 0);
    const cambiosDelCliente = (x: (typeof filas)[number]) =>
      x.revisiones.sabanaDevueltaPorCliente + x.revisiones.copyCambiosDelCliente + x.revisiones.piezasDevueltasPorCliente + x.revisiones.implementacionCambiosDelCliente;
    const ajustesInternos = (x: (typeof filas)[number]) =>
      x.revisiones.sabanaDevueltaPorEquipo + x.revisiones.copyRevocado + x.revisiones.copyReeditado + x.revisiones.piezasDevueltasPorEquipo + x.revisiones.novedadesAlMontar;
    const montados = suma(x => x.volumen.montados);
    const costo = suma(x => x.costoUsd.total);
    res.json({
      dias,
      desde,
      resumen: {
        campanas: filas.length,
        sinActividad,
        terminadas: filas.filter(x => !x.total.enCurso).length,
        total: resumenDe(filas.map(x => x.total)),
        porFase: Object.fromEntries(FASES.map(f => [f, resumenDe(filas.map(x => x.fases[f]))])) as Record<Fase, ReturnType<typeof resumenDe>>,
        cambiosDelCliente: suma(cambiosDelCliente),
        campanasConCambiosDelCliente: filas.filter(x => cambiosDelCliente(x) > 0).length,
        ajustesInternos: suma(ajustesInternos),
        piezasDeCopy: suma(x => x.volumen.piezasDeCopy),
        piezas: suma(x => x.volumen.piezas),
        montados,
        generaciones: suma(x => x.volumen.generaciones),
        generacionesFallidas: suma(x => x.volumen.generacionesFallidas),
        costoUsd: costo,
        costoPorMontadoUsd: montados ? costo / montados : null,
      },
      campanas: filas.map(x => {
        const { conActividad: _c, ...resto } = x;
        return { ...resto, cambiosDelCliente: cambiosDelCliente(x), ajustesInternos: ajustesInternos(x) };
      }),
    });
  } catch (error) {
    handleTenantError(error, res, 'Error al medir la eficiencia');
  }
};
