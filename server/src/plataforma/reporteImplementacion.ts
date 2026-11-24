import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { assertProjectInWorkspace } from '../lib/tenancy.js';
import { sabanaParaReporte } from '../cdm/planning/planningService.js';
import { aprobacionesDeCopyDeCampana } from '../myvoice/copyParaProduccion.js';
import { decisionesDePiezasDeCampana } from '../services/piezaService.js';
import { anunciosParaReporte } from '../implementacion/anuncios.js';

/**
 * T5 · El reporte de implementación de una campaña (2026-11-24; plan de Implementación, PR #65, fase B).
 *
 * - **Lo planeado contra lo montado, por línea:** la sábana dice qué formatos, cuántas piezas y cuándo; Implementación
 *   dice qué se montó, dónde (plataforma e ID) y cuándo. Las diferencias se dicen: falta montar, salió tarde, con
 *   novedad, sin UTM. Sin sábana, cada canal es una línea sin plan.
 * - **El historial de aprobaciones, uno solo** (decisión 19): la sábana, el copy, las piezas y la aprobación final,
 *   del equipo y del cliente, en orden. Es una vista de lectura que une lo que hoy está en cada módulo, sin migrar.
 *
 * Es de la plataforma porque cruza los cuatro módulos; cada uno responde lo suyo. Se entrega como archivo (decisión
 * 22): Excel e imprimible, desde el front.
 */

type Paso = 'Sábana' | 'Copy' | 'Pieza' | 'Implementación';
interface Hito {
  en: string;
  paso: Paso;
  que: string;
  accion: string;
  quien: string;
  externo: boolean;
  comentario: string | null;
  tono: 'aprueba' | 'devuelve' | 'info';
}

const SABANA: Record<string, { accion: string; tono: Hito['tono']; externo?: boolean }> = {
  ENVIADO: { accion: 'Mandó a aprobar', tono: 'info' },
  APROBADO: { accion: 'Aprobó', tono: 'aprueba' },
  DEVUELTO: { accion: 'Devolvió', tono: 'devuelve' },
  REABIERTO: { accion: 'Reabrió', tono: 'info' },
  ENVIADO_AL_CLIENTE: { accion: 'Mandó al cliente', tono: 'info' },
  APROBADO_POR_CLIENTE: { accion: 'Aprobó', tono: 'aprueba', externo: true },
  DEVUELTO_POR_CLIENTE: { accion: 'Devolvió', tono: 'devuelve', externo: true },
};
const PIEZA: Record<string, { accion: string; tono: Hito['tono'] }> = {
  ACEPTADA: { accion: 'Aceptó', tono: 'aprueba' },
  DEVUELTA: { accion: 'Devolvió', tono: 'devuelve' },
  REABIERTA: { accion: 'Reabrió', tono: 'info' },
};
const ANUNCIO: Record<string, { accion: string; tono: Hito['tono']; externo?: boolean }> = {
  AUTORIZADO: { accion: 'Autorizó la implementación', tono: 'aprueba' },
  ENVIADO_AL_CLIENTE: { accion: 'Mandó al cliente para aprobar', tono: 'info' },
  APROBADO_CLIENTE: { accion: 'Aprobó para publicar', tono: 'aprueba', externo: true },
  CAMBIOS_CLIENTE: { accion: 'Pidió cambios', tono: 'devuelve', externo: true },
  MONTADO: { accion: 'Montó', tono: 'aprueba' },
  DEVUELTO: { accion: 'Devolvió con novedad', tono: 'devuelve' },
  REABIERTO: { accion: 'Volvió a por montar', tono: 'info' },
};

const dia = (iso: string | null) => (iso ? iso.slice(0, 10) : null);
const legible = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export const reporteDeImplementacion = async (req: AuthRequest, res: Response) => {
  try {
    const tenant = req.tenant!;
    const campana = await assertProjectInWorkspace(tenant, req.params.id);
    const proyecto = await prisma.project.findUnique({
      where: { id: campana.id },
      select: { id: true, name: true, clientId: true, modoAprobacion: true, responsable: { select: { name: true } }, client: { select: { name: true } } },
    });
    if (!proyecto?.clientId) return res.status(404).json({ error: 'Campaña no encontrada' });

    const [sabana, copy, piezas, { anuncios, eventos }] = await Promise.all([
      sabanaParaReporte(tenant, proyecto.id),
      aprobacionesDeCopyDeCampana(proyecto.id),
      decisionesDePiezasDeCampana(proyecto.id),
      anunciosParaReporte(tenant, proyecto.clientId, proyecto.id),
    ]);

    // Los nombres de quienes actuaron, del workspace (la tabla de personas es común).
    const ids = [...new Set([...(sabana?.eventos ?? []).map(e => e.autorId), ...piezas.map(p => p.autorId), ...eventos.map(e => e.autorId)].filter((x): x is string => !!x))];
    const nombres = new Map((await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map(u => [u.id, u.name]));
    const nombre = (id: string | null) => (id ? nombres.get(id) ?? 'Alguien del equipo' : 'Alguien del equipo');

    // ---- Lo planeado contra lo montado
    const fila = (a: (typeof anuncios)[number]) => ({
      titulo: a.titulo,
      platform: a.platform,
      estado: a.estado,
      accion: a.accion,
      plataforma: a.montado?.plataforma ?? null,
      idEnPlataforma: a.montado?.idEnPlataforma ?? null,
      montadoEn: a.montado?.en ?? null,
      url: a.url,
      sinDestino: a.sinDestino,
      utm: a.utm,
      novedad: a.novedad,
    });
    const desviacionesDe = (planeadas: number | null, desde: string | null, de: typeof anuncios) => {
      const d: string[] = [];
      const montados = de.filter(a => a.estado === 'MONTADO').length;
      if (planeadas !== null && montados < planeadas) d.push(`Faltan ${planeadas - montados} de ${planeadas} por montar`);
      if (planeadas !== null && de.length > planeadas) d.push(`${de.length} anuncios para ${planeadas} planeados`);
      for (const a of de) {
        if (a.montado?.en && desde && dia(a.montado.en)! > dia(desde)!) d.push(`«${a.titulo}» salió el ${legible(a.montado.en)}, planeado el ${legible(desde)}`);
        if (a.estado === 'CON_NOVEDAD') d.push(`«${a.titulo}» con novedad: ${a.novedad ?? 'sin detalle'}`);
      }
      // La UTM solo avisa: una línea por fila, no una por anuncio.
      const sinUtm = de.filter(a => a.destino && !a.utm).length;
      if (sinUtm) d.push(sinUtm === 1 && de.length === 1 ? 'Sin UTM' : `${sinUtm} de ${de.length} sin UTM`);
      return d;
    };
    const conLinea = new Set<string>();
    const lineas = (sabana?.lineas ?? []).map(l => {
      const de = anuncios.filter(a => a.linea?.id === l.id);
      de.forEach(a => conLinea.add(a.id));
      return {
        id: l.id,
        medio: l.medio,
        formato: l.formato,
        etapa: l.etapa,
        planeadas: l.piezas as number | null,
        desde: l.desde,
        hasta: l.hasta,
        destino: l.destino,
        sinDestino: l.sinDestino,
        utm: l.utm,
        montados: de.filter(a => a.estado === 'MONTADO').length,
        anuncios: de.map(fila),
        desviaciones: desviacionesDe(l.piezas, l.desde, de),
      };
    });
    // Sin sábana (o lo que no vino de ella): una línea por canal, sin plan.
    const sueltos = anuncios.filter(a => !conLinea.has(a.id));
    for (const canal of [...new Set(sueltos.map(a => a.platform))]) {
      const de = sueltos.filter(a => a.platform === canal);
      lineas.push({
        id: `canal:${canal}`,
        medio: canal,
        formato: [...new Set(de.map(a => a.formato))].join(' · '),
        etapa: null as never,
        planeadas: null,
        desde: null,
        hasta: null,
        destino: null,
        sinDestino: false,
        utm: null,
        montados: de.filter(a => a.estado === 'MONTADO').length,
        anuncios: de.map(fila),
        desviaciones: desviacionesDe(null, null, de),
      });
    }

    // ---- El historial de aprobaciones, uno solo
    const historial: Hito[] = [];
    for (const e of sabana?.eventos ?? []) {
      const m = SABANA[e.tipo];
      if (!m) continue;
      historial.push({
        en: e.en,
        paso: 'Sábana',
        que: `Versión ${e.version}`,
        accion: m.accion,
        // En la ronda del cliente, su nombre va en el comentario y el autor es quien mandó el enlace.
        quien: m.externo ? (e.comentario?.split(':')[0]?.trim() || 'El cliente') : nombre(e.autorId),
        externo: !!m.externo,
        comentario: m.externo ? (e.comentario?.split(':').slice(1).join(':').trim() || null) : e.comentario,
        tono: m.tono,
      });
    }
    for (const c of copy)
      historial.push({
        en: c.en,
        paso: 'Copy',
        que: `${c.que}${c.textos > 1 ? ` (${c.textos} textos)` : ''}`,
        accion: { APROBADO: 'Aprobó', CAMBIOS: 'Pidió cambios', REVOCADO: 'Quitó la aprobación', PENDIENTE: 'Volvió a pendiente' }[c.decision],
        quien: c.por,
        externo: c.externo,
        comentario: c.comentario,
        tono: c.decision === 'APROBADO' ? 'aprueba' : c.decision === 'PENDIENTE' ? 'info' : 'devuelve',
      });
    for (const p of piezas) {
      const m = PIEZA[p.tipo];
      if (!m) continue;
      historial.push({ en: p.en, paso: 'Pieza', que: p.pieza, accion: m.accion, quien: p.autorExterno ?? nombre(p.autorId), externo: !p.autorId, comentario: p.nota, tono: m.tono });
    }
    for (const e of eventos) {
      const m = ANUNCIO[e.tipo];
      if (!m) continue;
      // El cliente no tiene cuenta: su nombre va en el detalle («Ana: comentario»).
      const [quienExterno, ...resto] = (e.detalle ?? '').split(':');
      historial.push({
        en: e.en,
        paso: 'Implementación',
        que: e.anuncio,
        accion: m.accion,
        quien: m.externo ? quienExterno.trim() || 'El cliente' : nombre(e.autorId),
        externo: !!m.externo,
        comentario: m.externo ? resto.join(':').trim() || null : e.tipo === 'MONTADO' || e.tipo === 'DEVUELTO' ? e.detalle : null,
        tono: m.tono,
      });
    }
    historial.sort((a, b) => a.en.localeCompare(b.en));

    // Una misma decisión de la misma persona en el mismo momento (un envío del cliente, una autorización en bloque)
    // es una fila: «Aprobó para publicar 58 anuncios», con cuáles. Lo que trae comentario queda aparte.
    const agrupado: (Hito & { cuantos: number; cuales: string[] })[] = [];
    for (const h of historial) {
      const prev = agrupado[agrupado.length - 1];
      const mismo =
        prev &&
        !h.comentario &&
        !prev.comentario &&
        prev.paso === h.paso &&
        prev.accion === h.accion &&
        prev.quien === h.quien &&
        Math.abs(Date.parse(h.en) - Date.parse(prev.en)) < 5 * 60_000;
      if (mismo) {
        prev.cuantos++;
        prev.cuales.push(h.que);
      } else agrupado.push({ ...h, cuantos: 1, cuales: [h.que] });
    }
    const unidad: Record<Paso, [string, string]> = {
      Sábana: ['versión', 'versiones'],
      Copy: ['pieza de copy', 'piezas de copy'],
      Pieza: ['pieza', 'piezas'],
      Implementación: ['anuncio', 'anuncios'],
    };
    const historialAgrupado = agrupado.map(({ cuantos, cuales, ...h }) => ({
      ...h,
      que: cuantos === 1 ? h.que : `${cuantos} ${unidad[h.paso][1]}`,
      cuales: cuantos === 1 ? [] : cuales,
    }));

    const estados = anuncios.map(a => a.estado);
    res.json({
      campana: {
        id: proyecto.id,
        nombre: proyecto.name,
        marca: proyecto.client?.name ?? null,
        modoAprobacion: proyecto.modoAprobacion,
        responsable: proyecto.responsable?.name ?? null,
      },
      generadoEn: new Date().toISOString(),
      sabana: sabana ? { version: sabana.version, estado: sabana.estado } : null,
      resumen: {
        planeadas: sabana ? sabana.lineas.reduce((t, l) => t + l.piezas, 0) : null,
        anuncios: anuncios.length,
        porAprobar: estados.filter(e => e === 'POR_APROBAR' || e === 'CON_EL_CLIENTE').length,
        porMontar: estados.filter(e => e === 'POR_MONTAR').length,
        montados: estados.filter(e => e === 'MONTADO').length,
        conNovedad: estados.filter(e => e === 'CON_NOVEDAD').length,
        desviaciones: lineas.reduce((t, l) => t + l.desviaciones.length, 0),
      },
      lineas,
      historial: historialAgrupado,
    });
  } catch (error) {
    handleTenantError(error, res, 'Error al armar el reporte de implementación');
  }
};
