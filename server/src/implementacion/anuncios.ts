/**
 * F5 · Implementación (⑤): el trafficker y el community manager montan lo aprobado y dejan constancia. Es lo único
 * que decide qué anuncio está listo y qué le falta (plan de Implementación, PR #65, nivel 1 «Reglas»).
 *
 * - Un anuncio es una pieza en «Lista». Lee por contrato: la pieza a Producción, el copy a My Voice y la línea de
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
import { copyParaImplementar } from '../myvoice/copyParaProduccion.js';
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

/** Las piezas listas de una marca (o una sola), con su línea, su copy y su anuncio, y lo que les falta. */
const armar = async (tenant: TenantContext, filtro: { clientId?: string; piezaId?: string }) => {
  const piezas = await piezasParaImplementar(tenant, filtro);
  const copy = await copyParaImplementar(piezas.flatMap(p => p.textos.map(t => t.copyId).filter((id): id is string => !!id)));
  const lineaDe = (p: (typeof piezas)[number]) =>
    p.textos.map(t => (t.copyId ? copy.get(t.copyId)?.lineaDePlanningId : null)).find((id): id is string => !!id) ?? null;
  const lineas = await lineasParaImplementar(tenant, piezas.map(lineaDe).filter((id): id is string => !!id));
  const anuncios = new Map(
    (await prisma.anuncio.findMany({ where: { workspaceId: tenant.workspaceId, piezaId: { in: piezas.map(p => p.id) } } })).map(a => [a.piezaId, a])
  );

  return piezas.map(p => {
    const lineaId = lineaDe(p);
    const linea = lineaId ? lineas.get(lineaId) ?? null : null;
    const anuncio = anuncios.get(p.id) ?? null;
    const destino = linea ? linea.destino : anuncio?.destino ?? null;
    const utm = linea ? linea.utm : anuncio?.utm ?? null;
    const quienPega = linea ? 'Planning, en la sábana' : 'El responsable de la campaña';
    const faltas: Falta[] = [];
    if (!destino) faltas.push({ que: 'destino', texto: 'Falta el destino', bloquea: true, quien: quienPega });
    if (linea && !linea.desde) faltas.push({ que: 'fecha', texto: 'Falta la fecha de salida', bloquea: true, quien: 'Planning, en la sábana' });
    if (!utm) faltas.push({ que: 'utm', texto: 'Falta la UTM', bloquea: false, quien: quienPega });
    // Quién aprobó el copy: una línea por persona y vía, la más reciente.
    const aprobacionesDeCopy = new Map<string, { por: string; en: string | null; via: string | null }>();
    for (const t of p.textos) {
      const c = t.copyId ? copy.get(t.copyId) : undefined;
      if (c?.aprobadoPor) aprobacionesDeCopy.set(`${c.aprobadoPor}|${c.via}`, { por: c.aprobadoPor, en: c.aprobadoEn?.toISOString() ?? null, via: c.via });
    }
    return {
      piezaId: p.id,
      clientId: p.clientId,
      titulo: p.titulo,
      platform: p.platform,
      formato: p.formato,
      campana: p.campana ? { id: p.campana.id, nombre: p.campana.nombre } : null,
      linea: linea ? { id: linea.id, planningId: linea.planningId, medio: linea.medio, formato: linea.formato, etapa: linea.etapa, desde: linea.desde, hasta: linea.hasta } : null,
      textos: p.textos.map(t => ({ slot: t.slot, nombre: t.nombre, texto: t.texto })),
      previaUrl: p.previaUrl,
      enlace: p.enlace,
      destino,
      utm,
      url: urlCompleta(destino, utm),
      faltas,
      listo: !faltas.some(f => f.bloquea),
      estado: anuncio?.estado ?? 'POR_MONTAR',
      montado: anuncio?.montadoEn
        ? { plataforma: anuncio.plataforma, idEnPlataforma: anuncio.idEnPlataforma, en: anuncio.montadoEn.toISOString() }
        : null,
      novedad: anuncio?.estado === 'CON_NOVEDAD' ? anuncio.novedad : null,
      aprobaciones: {
        copy: [...aprobacionesDeCopy.values()],
        pieza: p.aprobadaPor ? { por: p.aprobadaPor.por, en: p.aprobadaPor.createdAt.toISOString(), via: p.aprobadaPor.via } : null,
      },
      // El destino lo pega aquí el responsable solo sin sábana; con sábana se pega en la línea.
      destinoEnLaLinea: Boolean(linea),
    };
  });
};

export const anunciosDeMarca = (tenant: TenantContext, clientId: string) => armar(tenant, { clientId });

const uno = async (tenant: TenantContext, piezaId: string) => {
  const [a] = await armar(tenant, { piezaId });
  if (!a) throw new TenantError('Anuncio no encontrado', 404);
  return a;
};

const registrar = async (tenant: TenantContext, a: { piezaId: string; clientId: string }, data: Record<string, unknown>, evento: { tipo: 'MONTADO' | 'DEVUELTO' | 'DESTINO' | 'REABIERTO'; detalle?: string }) =>
  prisma.$transaction(async tx => {
    const anuncio = await tx.anuncio.upsert({
      where: { piezaId: a.piezaId },
      create: { workspaceId: tenant.workspaceId, clientId: a.clientId, piezaId: a.piezaId, ...data },
      update: data,
    });
    await tx.anuncioEvento.create({ data: { anuncioId: anuncio.id, tipo: evento.tipo, autorId: tenant.userId, detalle: evento.detalle ?? null } });
    return anuncio;
  });

/** T2 · «Marcar montado y seguir»: plataforma, ID del anuncio y fecha real. Solo si está listo. */
export const montar = async (tenant: TenantContext, piezaId: string, body: { plataforma?: unknown; idEnPlataforma?: unknown; montadoEn?: unknown }) => {
  const a = await uno(tenant, piezaId);
  await exigirPaso(tenant, 'IMPLEMENTACION', a.clientId);
  if (!a.listo) throw new TenantError(a.faltas.filter(f => f.bloquea).map(f => `${f.texto} (${f.quien})`).join('. '), 409);
  const plataforma = typeof body.plataforma === 'string' ? body.plataforma.trim().slice(0, 80) : '';
  const idEnPlataforma = typeof body.idEnPlataforma === 'string' ? body.idEnPlataforma.trim().slice(0, 200) : '';
  if (!plataforma || !idEnPlataforma) throw new TenantError('Falta la plataforma o el ID del anuncio', 400);
  const fecha = typeof body.montadoEn === 'string' && body.montadoEn ? new Date(body.montadoEn) : new Date();
  if (Number.isNaN(fecha.getTime())) throw new TenantError('La fecha no es válida', 400);
  await registrar(tenant, a, { estado: 'MONTADO', plataforma, idEnPlataforma, montadoEn: fecha, montadoPorId: tenant.userId, novedad: null }, { tipo: 'MONTADO', detalle: `${plataforma} · ${idEnPlataforma}` });
  return uno(tenant, piezaId);
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
export const devolver = async (tenant: TenantContext, piezaId: string, body: { motivo?: unknown; texto?: unknown }) => {
  const a = await uno(tenant, piezaId);
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
  return uno(tenant, piezaId);
};

/** Vuelve a «por montar»: la novedad se resolvió, o lo montado cambió y hay que montarlo otra vez. */
export const reabrir = async (tenant: TenantContext, piezaId: string) => {
  const a = await uno(tenant, piezaId);
  await exigirPaso(tenant, 'IMPLEMENTACION', a.clientId);
  if (a.estado === 'POR_MONTAR') return a;
  await registrar(tenant, a, { estado: 'POR_MONTAR', novedad: null }, { tipo: 'REABIERTO' });
  return uno(tenant, piezaId);
};

/**
 * Sin sábana (el puente de la fase A): el destino y la UTM se pegan en el anuncio. Lo hace quien administra o el
 * responsable de la campaña. Con sábana se pegan en la línea, en CDM.
 */
export const guardarDestino = async (tenant: TenantContext, piezaId: string, body: { destino?: unknown; utm?: unknown }) => {
  const a = await uno(tenant, piezaId);
  if (a.destinoEnLaLinea) throw new TenantError('Esta pieza viene de una sábana: el destino lo pega Planning en la línea', 409);
  const campana = a.campana ? await prisma.project.findUnique({ where: { id: a.campana.id }, select: { responsableId: true } }) : null;
  const administra = tenant.role === 'OWNER' || tenant.role === 'ADMIN';
  if (!administra && campana?.responsableId !== tenant.userId) throw new TenantError('El destino lo pega el responsable de la campaña o quien administra', 403);
  const texto = (x: unknown, max: number) => (typeof x === 'string' ? x.trim().slice(0, max) || null : undefined);
  const destino = texto(body.destino, 2000);
  if (destino && !/^https?:\/\/\S+$/i.test(destino)) throw new TenantError('El destino tiene que ser una URL que empiece por http:// o https://', 400);
  const utm = texto(body.utm, 500);
  await registrar(tenant, a, { ...(destino !== undefined && { destino }), ...(utm !== undefined && { utm }) }, { tipo: 'DESTINO', detalle: destino ?? undefined });
  return uno(tenant, piezaId);
};

/**
 * ⑤ en el encabezado: cuántas piezas listas de la campaña están montadas. Lo dice Implementación sobre su tabla,
 * con las piezas que le pasa la plataforma.
 */
export const pasoImplementacion = async (piezas: { id: string; estado: string }[]) => {
  const listas = piezas.filter(p => p.estado === 'LISTA');
  const montados = listas.length
    ? await prisma.anuncio.count({ where: { piezaId: { in: listas.map(p => p.id) }, estado: 'MONTADO' } })
    : 0;
  const conNovedad = listas.length
    ? await prisma.anuncio.count({ where: { piezaId: { in: listas.map(p => p.id) }, estado: 'CON_NOVEDAD' } })
    : 0;
  return { listas: listas.length, montados, conNovedad };
};
