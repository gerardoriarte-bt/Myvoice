/**
 * F5 · Implementación (⑤): el trafficker y el community manager montan lo aprobado y dejan constancia. Es lo único
 * que decide qué anuncio está listo y qué le falta (plan de Implementación, PR #65, nivel 1 «Reglas»).
 *
 * - Un anuncio es una pieza en «Lista» o, en los canales sin pieza de diseño (búsqueda de Google Ads, WhatsApp,
 *   push), el copy aprobado de una pieza. Lee por contrato: la pieza a Producción, el copy a My Voice y la línea de
 *   la sábana a CDM; guarda solo lo suyo (`Anuncio`, `AnuncioEvento`).
 * - **Listo para montar:** copy y pieza aprobados (una pieza en «Lista» ya lo está), destino y, si viene de una
 *   sábana, su fecha de salida. La UTM no bloquea: avisa (decisión 20).
 * - Con CDM, el destino y la UTM son de la línea y los pega Planning; sin CDM, se pegan en el anuncio.
 * - Monta o devuelve quien administra o tiene la función Trafficker o Community (paso IMPLEMENTACION).
 */

import { prisma } from '../lib/prisma.js';
import { TenantContext, TenantError } from '../lib/tenancy.js';
import { exigirPaso } from '../comun/permisos.js';
import { piezasParaImplementar } from '../services/piezaService.js';
import { copyParaImplementar, copySinPiezaAprobado } from '../myvoice/copyParaProduccion.js';
import { lineasParaImplementar } from '../cdm/planning/planningService.js';

export interface Falta {
  que: 'destino' | 'fecha' | 'utm';
  texto: string;
  /** Si impide marcarlo montado (destino y fecha) o solo avisa (UTM). */
  bloquea: boolean;
  quien: string;
}

/** La URL que se pega en la plataforma: el destino con su UTM. */
const urlCompleta = (destino: string | null, utm: string | null) => {
  if (!destino) return null;
  if (!utm) return destino;
  const limpia = utm.replace(/^[?&]/, '');
  return `${destino}${destino.includes('?') ? '&' : '?'}${limpia}`;
};

/**
 * Lo que se monta, venga de donde venga: una pieza en «Lista» (`pieza:<id>`) o, en los canales sin pieza de diseño,
 * el copy aprobado de una pieza (`copy:<conjunto>`; 2026-11-24, un anuncio de búsqueda de Google Ads no tenía cómo
 * llegar). El id del anuncio en la pantalla y en las rutas es esa clave.
 */
interface Fuente {
  id: string;
  piezaId: string | null;
  conjuntoId: string | null;
  clientId: string;
  titulo: string;
  platform: string;
  formato: string;
  campana: { id: string; nombre: string } | null;
  lineaId: string | null;
  textos: { slot: string; nombre: string; texto: string }[];
  previaUrl: string | null;
  enlace: string | null;
  aprobacionesDeCopy: { por: string; en: string | null; via: string | null }[];
  aprobacionDePieza: { por: string; en: string; via: string } | null;
}

const leerClave = (id: string) =>
  id.startsWith('copy:') ? { clave: id.slice(5) } : { piezaId: id.startsWith('pieza:') ? id.slice(6) : id };

const fuentes = async (tenant: TenantContext, filtro: { clientId?: string; id?: string }): Promise<Fuente[]> => {
  const uno = filtro.id ? leerClave(filtro.id) : null;
  const [piezas, sinPieza] = await Promise.all([
    uno && !('piezaId' in uno) ? [] : piezasParaImplementar(tenant, { clientId: filtro.clientId, piezaId: uno && 'piezaId' in uno ? uno.piezaId : undefined }),
    uno && !('clave' in uno) ? [] : copySinPiezaAprobado(tenant, { clientId: filtro.clientId, clave: uno && 'clave' in uno ? uno.clave : undefined }),
  ]);
  const copy = await copyParaImplementar(piezas.flatMap(p => p.textos.map(t => t.copyId).filter((id): id is string => !!id)));
  const deLasPiezas: Fuente[] = piezas.map(p => {
    const aprobaciones = new Map<string, { por: string; en: string | null; via: string | null }>();
    for (const t of p.textos) {
      const c = t.copyId ? copy.get(t.copyId) : undefined;
      if (c?.aprobadoPor) aprobaciones.set(`${c.aprobadoPor}|${c.via}`, { por: c.aprobadoPor, en: c.aprobadoEn?.toISOString() ?? null, via: c.via });
    }
    return {
      id: `pieza:${p.id}`,
      piezaId: p.id,
      conjuntoId: null,
      clientId: p.clientId,
      titulo: p.titulo,
      platform: p.platform,
      formato: p.formato,
      campana: p.campana ? { id: p.campana.id, nombre: p.campana.nombre } : null,
      lineaId: p.textos.map(t => (t.copyId ? copy.get(t.copyId)?.lineaDePlanningId : null)).find((id): id is string => !!id) ?? null,
      textos: p.textos.map(t => ({ slot: t.slot, nombre: t.nombre, texto: t.texto })),
      previaUrl: p.previaUrl,
      enlace: p.enlace,
      aprobacionesDeCopy: [...aprobaciones.values()],
      aprobacionDePieza: p.aprobadaPor ? { por: p.aprobadaPor.por, en: p.aprobadaPor.createdAt.toISOString(), via: p.aprobadaPor.via } : null,
    };
  });
  const soloTexto: Fuente[] = sinPieza.map(g => ({
    id: `copy:${g.clave}`,
    piezaId: null,
    conjuntoId: g.clave,
    clientId: g.clientId,
    titulo: `${g.platform}${g.piezaIndex ? ` ${g.piezaIndex}` : ''}`,
    platform: g.platform,
    formato: 'Solo texto',
    campana: g.campana ? { id: g.campana.id, nombre: g.campana.nombre } : null,
    lineaId: g.lineaDePlanningId,
    textos: g.textos.map(t => ({ slot: t.slot, nombre: t.nombre, texto: t.texto })),
    previaUrl: null,
    enlace: null,
    aprobacionesDeCopy: g.aprobaciones,
    aprobacionDePieza: null,
  }));
  return [...deLasPiezas, ...soloTexto];
};

/** Lo que se monta de una marca (o uno solo), con su línea y su anuncio, y lo que le falta. */
const armar = async (tenant: TenantContext, filtro: { clientId?: string; id?: string }) => {
  const todas = await fuentes(tenant, filtro);
  const lineas = await lineasParaImplementar(tenant, todas.map(f => f.lineaId).filter((id): id is string => !!id));
  const filas = await prisma.anuncio.findMany({
    where: {
      workspaceId: tenant.workspaceId,
      OR: [
        { piezaId: { in: todas.map(f => f.piezaId).filter((id): id is string => !!id) } },
        { conjuntoId: { in: todas.map(f => f.conjuntoId).filter((id): id is string => !!id) } },
      ],
    },
  });
  const anuncioDe = (f: Fuente) => filas.find(a => (f.piezaId ? a.piezaId === f.piezaId : a.conjuntoId === f.conjuntoId)) ?? null;

  return todas.map(f => {
    const linea = f.lineaId ? lineas.get(f.lineaId) ?? null : null;
    const anuncio = anuncioDe(f);
    const destino = linea ? linea.destino : anuncio?.destino ?? null;
    const utm = linea ? linea.utm : anuncio?.utm ?? null;
    const quienPega = linea ? 'Planning, en la sábana' : 'El responsable de la campaña';
    const faltas: Falta[] = [];
    if (!destino) faltas.push({ que: 'destino', texto: 'Falta el destino', bloquea: true, quien: quienPega });
    if (linea && !linea.desde) faltas.push({ que: 'fecha', texto: 'Falta la fecha de salida', bloquea: true, quien: 'Planning, en la sábana' });
    if (!utm) faltas.push({ que: 'utm', texto: 'Falta la UTM', bloquea: false, quien: quienPega });
    return {
      id: f.id,
      piezaId: f.piezaId,
      conjuntoId: f.conjuntoId,
      clientId: f.clientId,
      titulo: f.titulo,
      platform: f.platform,
      formato: f.formato,
      campana: f.campana,
      linea: linea ? { id: linea.id, planningId: linea.planningId, medio: linea.medio, formato: linea.formato, etapa: linea.etapa, desde: linea.desde, hasta: linea.hasta } : null,
      textos: f.textos,
      previaUrl: f.previaUrl,
      enlace: f.enlace,
      destino,
      utm,
      url: urlCompleta(destino, utm),
      faltas,
      listo: !faltas.some(x => x.bloquea),
      estado: anuncio?.estado ?? 'POR_MONTAR',
      montado: anuncio?.montadoEn
        ? { plataforma: anuncio.plataforma, idEnPlataforma: anuncio.idEnPlataforma, en: anuncio.montadoEn.toISOString() }
        : null,
      novedad: anuncio?.estado === 'CON_NOVEDAD' ? anuncio.novedad : null,
      aprobaciones: { copy: f.aprobacionesDeCopy, pieza: f.aprobacionDePieza },
      // El destino lo pega aquí el responsable solo sin sábana; con sábana se pega en la línea.
      destinoEnLaLinea: Boolean(linea),
    };
  });
};

export const anunciosDeMarca = (tenant: TenantContext, clientId: string) => armar(tenant, { clientId });

const uno = async (tenant: TenantContext, id: string) => {
  const [a] = await armar(tenant, { id });
  if (!a) throw new TenantError('Anuncio no encontrado', 404);
  return a;
};

const registrar = async (
  tenant: TenantContext,
  a: { piezaId: string | null; conjuntoId: string | null; clientId: string },
  data: Record<string, unknown>,
  evento: { tipo: 'MONTADO' | 'DEVUELTO' | 'DESTINO' | 'REABIERTO'; detalle?: string }
) =>
  prisma.$transaction(async tx => {
    const anuncio = await tx.anuncio.upsert({
      where: a.piezaId ? { piezaId: a.piezaId } : { conjuntoId: a.conjuntoId! },
      create: { workspaceId: tenant.workspaceId, clientId: a.clientId, piezaId: a.piezaId, conjuntoId: a.conjuntoId, ...data },
      update: data,
    });
    await tx.anuncioEvento.create({ data: { anuncioId: anuncio.id, tipo: evento.tipo, autorId: tenant.userId, detalle: evento.detalle ?? null } });
    return anuncio;
  });

/** T2 · «Marcar montado y seguir»: plataforma, ID del anuncio y fecha real. Solo si está listo. */
export const montar = async (tenant: TenantContext, id: string, body: { plataforma?: unknown; idEnPlataforma?: unknown; montadoEn?: unknown }) => {
  const a = await uno(tenant, id);
  await exigirPaso(tenant, 'IMPLEMENTACION', a.clientId);
  if (!a.listo) throw new TenantError(a.faltas.filter(f => f.bloquea).map(f => `${f.texto} (${f.quien})`).join('. '), 409);
  const plataforma = typeof body.plataforma === 'string' ? body.plataforma.trim().slice(0, 80) : '';
  const idEnPlataforma = typeof body.idEnPlataforma === 'string' ? body.idEnPlataforma.trim().slice(0, 200) : '';
  if (!plataforma || !idEnPlataforma) throw new TenantError('Falta la plataforma o el ID del anuncio', 400);
  const fecha = typeof body.montadoEn === 'string' && body.montadoEn ? new Date(body.montadoEn) : new Date();
  if (Number.isNaN(fecha.getTime())) throw new TenantError('La fecha no es válida', 400);
  await registrar(tenant, a, { estado: 'MONTADO', plataforma, idEnPlataforma, montadoEn: fecha, montadoPorId: tenant.userId, novedad: null }, { tipo: 'MONTADO', detalle: `${plataforma} · ${idEnPlataforma}` });
  return uno(tenant, id);
};

const MOTIVOS: Record<string, string> = {
  destino: 'El destino no funciona',
  texto: 'La plataforma no acepta un texto',
  medida: 'La pieza no tiene la medida correcta',
  otra: 'Otra cosa',
};

/**
 * T4 · Devolver con novedad: lo decide el trafficker cuando no tiene clara la información, antes o después de
 * montar (decisión 21). El texto es obligatorio y le llega al responsable de la campaña.
 */
export const devolver = async (tenant: TenantContext, id: string, body: { motivo?: unknown; texto?: unknown }) => {
  const a = await uno(tenant, id);
  await exigirPaso(tenant, 'IMPLEMENTACION', a.clientId);
  const motivo = typeof body.motivo === 'string' && MOTIVOS[body.motivo] ? body.motivo : 'otra';
  const texto = typeof body.texto === 'string' ? body.texto.trim().slice(0, 1000) : '';
  if (!texto) throw new TenantError('Cuenta qué pasó: con eso lo arregla quien lo debe', 400);
  const novedad = `${MOTIVOS[motivo]}: ${texto}`;
  await registrar(tenant, a, { estado: 'CON_NOVEDAD', novedad }, { tipo: 'DEVUELTO', detalle: novedad });
  // El aviso, al responsable de la campaña (y nunca a quien lo devolvió).
  const campana = a.campana ? await prisma.project.findUnique({ where: { id: a.campana.id }, select: { responsableId: true } }) : null;
  if (campana?.responsableId && campana.responsableId !== tenant.userId) {
    await prisma.notificacion.create({
      data: {
        workspaceId: tenant.workspaceId,
        userId: campana.responsableId,
        clientId: a.clientId,
        tipo: 'ANUNCIO_DEVUELTO',
        titulo: 'Un anuncio volvió con novedad',
        detalle: `${a.titulo}${a.campana ? ` · ${a.campana.nombre}` : ''}: «${novedad}»`,
      },
    });
  }
  return uno(tenant, id);
};

/** Vuelve a «por montar»: la novedad se resolvió, o lo montado cambió y hay que montarlo otra vez. */
export const reabrir = async (tenant: TenantContext, id: string) => {
  const a = await uno(tenant, id);
  await exigirPaso(tenant, 'IMPLEMENTACION', a.clientId);
  if (a.estado === 'POR_MONTAR') return a;
  await registrar(tenant, a, { estado: 'POR_MONTAR', novedad: null }, { tipo: 'REABIERTO' });
  return uno(tenant, id);
};

/**
 * Sin sábana (el puente de la fase A): el destino y la UTM se pegan en el anuncio. Lo hace quien administra o el
 * responsable de la campaña. Con sábana se pegan en la línea, en CDM.
 */
export const guardarDestino = async (tenant: TenantContext, id: string, body: { destino?: unknown; utm?: unknown }) => {
  const a = await uno(tenant, id);
  if (a.destinoEnLaLinea) throw new TenantError('Esta pieza viene de una sábana: el destino lo pega Planning en la línea', 409);
  const campana = a.campana ? await prisma.project.findUnique({ where: { id: a.campana.id }, select: { responsableId: true } }) : null;
  const administra = tenant.role === 'OWNER' || tenant.role === 'ADMIN';
  if (!administra && campana?.responsableId !== tenant.userId) throw new TenantError('El destino lo pega el responsable de la campaña o quien administra', 403);
  const texto = (x: unknown, max: number) => (typeof x === 'string' ? x.trim().slice(0, max) || null : undefined);
  const destino = texto(body.destino, 2000);
  if (destino && !/^https?:\/\/\S+$/i.test(destino)) throw new TenantError('El destino tiene que ser una URL que empiece por http:// o https://', 400);
  const utm = texto(body.utm, 500);
  await registrar(tenant, a, { ...(destino !== undefined && { destino }), ...(utm !== undefined && { utm }) }, { tipo: 'DESTINO', detalle: destino ?? undefined });
  return uno(tenant, id);
};

/**
 * ⑤ en el encabezado: cuántas piezas listas de la campaña están montadas. Lo dice Implementación sobre su tabla,
 * con las piezas que le pasa la plataforma.
 */
export const pasoImplementacion = async (piezas: { id: string; estado: string }[], conjuntosSoloTexto: string[] = []) => {
  const listas = piezas.filter(p => p.estado === 'LISTA').map(p => p.id);
  const total = listas.length + conjuntosSoloTexto.length;
  if (!total) return { listas: 0, montados: 0, conNovedad: 0 };
  const deEstos = { OR: [{ piezaId: { in: listas } }, { conjuntoId: { in: conjuntosSoloTexto } }] };
  const [montados, conNovedad] = await Promise.all([
    prisma.anuncio.count({ where: { ...deEstos, estado: 'MONTADO' } }),
    prisma.anuncio.count({ where: { ...deEstos, estado: 'CON_NOVEDAD' } }),
  ]);
  return { listas: total, montados, conNovedad };
};
