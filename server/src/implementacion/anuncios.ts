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
 * - **El formato decide el camino** (2026-11-24): con sábana, un formato de solo texto va directo aquí y uno con
 *   archivo espera su pieza; sin sábana decide el canal. Control lista los formatos desalineados con su canal.
 * - **La clase decide quién** (decisión 29): redes sociales las publica el community manager; pagos y lo demás lo
 *   monta el trafficker. Cada uno ve y decide lo suyo; quien administra, todo; quien no tiene ninguna de las dos
 *   funciones lo ve todo, sin actuar.
 */

type Clase = 'PAGOS' | 'REDES_SOCIALES' | 'PROPIOS' | 'TRADICIONAL';

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { canManage, TenantContext, TenantError } from '../lib/tenancy.js';
import { copyEnPiezas, piezasParaImplementar } from '../services/piezaService.js';
import { claseDeCanal, producePieza, zonaDe } from '../channels/registry.js';
import { SELECT_APROBADORES, apruebaLaCampana, quienesAprueban } from '../comun/aprobadores.js';
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
  textos: { slot: string; nombre: string; texto: string; zona: string }[];
  previaUrl: string | null;
  enlace: string | null;
  aprobacionesDeCopy: { por: string; en: string | null; via: string | null }[];
  aprobacionDePieza: { por: string; en: string; via: string } | null;
  /** Solo para el copy sin pieza: si el canal dice que no produce pieza (sin sábana, es lo que decide). */
  soloTextoPorCanal: boolean;
  copyIds: string[];
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
      textos: p.textos.map(t => ({ slot: t.slot, nombre: t.nombre, texto: t.texto, zona: zonaDe(p.platform, t.slot) })),
      previaUrl: p.previaUrl,
      enlace: p.enlace,
      aprobacionesDeCopy: [...aprobaciones.values()],
      aprobacionDePieza: p.aprobadaPor ? { por: p.aprobadaPor.por, en: p.aprobadaPor.createdAt.toISOString(), via: p.aprobadaPor.via } : null,
      soloTextoPorCanal: false,
      copyIds: [],
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
    textos: g.textos.map(t => ({ slot: t.slot, nombre: t.nombre, texto: t.texto, zona: zonaDe(g.platform, t.slot) })),
    previaUrl: null,
    enlace: null,
    aprobacionesDeCopy: g.aprobaciones,
    aprobacionDePieza: null,
    soloTextoPorCanal: !producePieza(g.platform),
    copyIds: g.textos.map(t => t.copyId),
  }));
  return [...deLasPiezas, ...soloTexto];
};

/** Lo que se monta de una marca (o uno solo), con su línea y su anuncio, y lo que le falta. */
const armar = async (tenant: TenantContext, filtro: { clientId?: string; id?: string }) => {
  const candidatas = await fuentes(tenant, filtro);
  const lineas = await lineasParaImplementar(tenant, candidatas.map(f => f.lineaId).filter((id): id is string => !!id));
  // El copy sin pieza entra si su formato (o, sin sábana, su canal) es de solo texto, y si nadie le armó una pieza.
  const enPieza = await copyEnPiezas(tenant, candidatas.flatMap(f => f.copyIds));
  const todas = candidatas.filter(f => {
    if (f.piezaId) return true;
    const linea = f.lineaId ? lineas.get(f.lineaId) : null;
    return (linea ? linea.soloTexto : f.soloTextoPorCanal) && !f.copyIds.some(id => enPieza.has(id));
  });
  const funciones = await prisma.miembroFuncion.findMany({
    where: { workspaceId: tenant.workspaceId, userId: tenant.userId, funcion: { in: ['TRAFFICKER', 'COMMUNITY'] } },
    select: { funcion: true, clientId: true },
  });
  const administra = canManage(tenant.role);
  // Quiénes montan o publican, de todo el workspace: cada anuncio dice con nombre a quién le toca (2026-11-24).
  const montadores = await prisma.miembroFuncion.findMany({
    where: { workspaceId: tenant.workspaceId, funcion: { in: ['TRAFFICKER', 'COMMUNITY'] } },
    select: { funcion: true, clientId: true, user: { select: { id: true, name: true } } },
  });
  const montanDe = (clase: Clase | null, clientId: string) => [
    ...new Map(
      montadores
        .filter(m => (!m.clientId || m.clientId === clientId) && m.funcion === (clase === 'REDES_SOCIALES' ? 'COMMUNITY' : 'TRAFFICKER'))
        .map(m => [m.user.id, { id: m.user.id, nombre: m.user.name }])
    ).values(),
  ];
  // La aprobación final (2026-11-24): según la campaña, la del cliente por enlace o la de un aprobador.
  const campanas = new Map(
    (
      await prisma.project.findMany({
        where: { id: { in: [...new Set(todas.map(f => f.campana?.id).filter((id): id is string => !!id))] } },
        select: { id: true, modoAprobacion: true, ...SELECT_APROBADORES },
      })
    ).map(c => [c.id, c])
  );
  const actuaEn = (clase: Clase | null, clientId: string) =>
    administra ||
    funciones.some(
      f => (!f.clientId || f.clientId === clientId) && (clase === 'REDES_SOCIALES' ? f.funcion === 'COMMUNITY' : f.funcion === 'TRAFFICKER')
    );
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

  const armados = todas.map(f => {
    const linea = f.lineaId ? lineas.get(f.lineaId) ?? null : null;
    const anuncio = anuncioDe(f);
    const clase = ((linea?.clase as Clase | undefined) ?? claseDeCanal(f.platform)) as Clase | null;
    const destino = linea ? linea.destino : anuncio?.destino ?? null;
    const utm = linea ? linea.utm : anuncio?.utm ?? null;
    const sinDestino = !destino && (linea ? Boolean(linea.sinDestino) : Boolean(anuncio?.sinDestino));
    const quienPega = linea ? 'Planning, en la sábana' : 'El responsable de la campaña';
    const faltas: Falta[] = [];
    // Todo anuncio tiene un destino o la marca «No lleva destino» (Gerardo, 2026-11-24): lo que no lleva URL —una
    // publicación orgánica, un push— se decide a propósito, y no pasa en silencio. La UTM solo avisa si hay URL.
    if (!destino && !sinDestino)
      faltas.push({ que: 'destino', texto: 'Falta el destino o marcar que no lleva', bloquea: true, quien: quienPega });
    if (linea && !linea.desde) faltas.push({ que: 'fecha', texto: 'Falta la fecha de salida', bloquea: true, quien: 'Planning, en la sábana' });
    if (destino && !utm) faltas.push({ que: 'utm', texto: 'Falta la UTM', bloquea: false, quien: quienPega });
    return {
      id: f.id,
      piezaId: f.piezaId,
      conjuntoId: f.conjuntoId,
      clientId: f.clientId,
      titulo: f.titulo,
      platform: f.platform,
      formato: f.formato,
      campana: f.campana
        ? {
            ...f.campana,
            modoAprobacion: campanas.get(f.campana.id)?.modoAprobacion ?? 'INTERNA',
            // Autoriza quien aprueba la campaña (responsable o función Aprobación); el enlace también lo crea quien administra.
            puedoAutorizar: apruebaLaCampana(tenant.userId, campanas.get(f.campana.id)),
            // Con nombre, para que siempre se sepa quién decide (2026-11-24).
            aprueban: quienesAprueban(campanas.get(f.campana.id)).map(a => ({ id: a.id, nombre: a.name })),
            puedoEnlace: administra || apruebaLaCampana(tenant.userId, campanas.get(f.campana.id)),
          }
        : null,
      linea: linea ? { id: linea.id, planningId: linea.planningId, medio: linea.medio, formato: linea.formato, etapa: linea.etapa, desde: linea.desde, hasta: linea.hasta } : null,
      textos: f.textos,
      previaUrl: f.previaUrl,
      enlace: f.enlace,
      destino,
      utm,
      url: urlCompleta(destino, utm),
      faltas,
      listo: !faltas.some(x => x.bloquea),
      estado: anuncio?.estado ?? 'POR_APROBAR',
      montado: anuncio?.montadoEn
        ? { plataforma: anuncio.plataforma, idEnPlataforma: anuncio.idEnPlataforma, en: anuncio.montadoEn.toISOString() }
        : null,
      // La del trafficker (con novedad) o la del cliente que pidió cambios (vuelve a por aprobar).
      novedad: anuncio?.estado === 'CON_NOVEDAD' || anuncio?.estado === 'POR_APROBAR' ? anuncio.novedad : null,
      aprobaciones: { copy: f.aprobacionesDeCopy, pieza: f.aprobacionDePieza },
      // El destino lo pega aquí el responsable solo sin sábana; con sábana se pega en la línea.
      destinoEnLaLinea: Boolean(linea),
      sinDestino,
      clase,
      /** Redes sociales se publican (community); lo demás se monta (trafficker). */
      accion: clase === 'REDES_SOCIALES' ? ('publicar' as const) : ('montar' as const),
      /** Quiénes lo montan o publican; vacío = nadie tiene la función: lo hace quien administra. */
      montan: montanDe(clase, f.clientId),
      puedo: actuaEn(clase, f.clientId),
    };
  });
  // Cada uno ve lo suyo: el community, redes sociales; el trafficker, lo demás. Sin ninguna de las dos, todo.
  return administra || funciones.length === 0 ? armados : armados.filter(a => a.puedo);
};

/** Monta o publica quien administra, o quien tiene la función de la clase del anuncio para su marca. */
const exigirQuienActua = (a: { puedo: boolean; accion: 'publicar' | 'montar' }) => {
  if (!a.puedo)
    throw new TenantError(a.accion === 'publicar' ? 'Esto lo publica el community manager' : 'Esto lo monta el trafficker', 403);
};

export const anunciosDeMarca = (tenant: TenantContext, clientId: string) => armar(tenant, { clientId });

const uno = async (tenant: TenantContext, id: string) => {
  const [a] = await armar(tenant, { id });
  if (!a) throw new TenantError('Anuncio no encontrado', 404);
  return a;
};

const registrar = async (
  tenant: TenantContext,
  a: { piezaId: string | null; conjuntoId: string | null; clientId: string; campana: { id: string } | null },
  data: Record<string, unknown>,
  evento: { tipo: 'MONTADO' | 'DEVUELTO' | 'DESTINO' | 'REABIERTO' | 'AUTORIZADO'; detalle?: string }
) =>
  prisma.$transaction(async tx => {
    const anuncio = await tx.anuncio.upsert({
      where: a.piezaId ? { piezaId: a.piezaId } : { conjuntoId: a.conjuntoId! },
      create: { workspaceId: tenant.workspaceId, clientId: a.clientId, projectId: a.campana?.id ?? null, piezaId: a.piezaId, conjuntoId: a.conjuntoId, ...data },
      update: { projectId: a.campana?.id ?? null, ...data },
    });
    await tx.anuncioEvento.create({ data: { anuncioId: anuncio.id, tipo: evento.tipo, autorId: tenant.userId, detalle: evento.detalle ?? null } });
    return anuncio;
  });

/** T2 · «Marcar montado y seguir»: plataforma, ID del anuncio y fecha real. Solo si está listo. */
export const montar = async (tenant: TenantContext, id: string, body: { plataforma?: unknown; idEnPlataforma?: unknown; montadoEn?: unknown }) => {
  const a = await uno(tenant, id);
  exigirQuienActua(a);
  if (!a.listo) throw new TenantError(a.faltas.filter(f => f.bloquea).map(f => `${f.texto} (${f.quien})`).join('. '), 409);
  if (a.estado === 'POR_APROBAR' || a.estado === 'CON_EL_CLIENTE')
    throw new TenantError(
      a.campana?.modoAprobacion === 'CLIENTE' ? 'Falta la aprobación del cliente: se manda por enlace desde la campaña' : 'Falta que un aprobador autorice la implementación',
      409
    );
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
/** El trafficker y el community actúan solo sobre lo aprobado (por el cliente o por un aprobador). */
const exigirAprobado = (a: { estado: string }) => {
  if (a.estado === 'POR_APROBAR' || a.estado === 'CON_EL_CLIENTE') throw new TenantError('Todavía espera la aprobación final', 409);
};

export const devolver = async (tenant: TenantContext, id: string, body: { motivo?: unknown; texto?: unknown }) => {
  const a = await uno(tenant, id);
  exigirQuienActua(a);
  exigirAprobado(a);
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
  exigirQuienActua(a);
  // Reabrir no salta la aprobación final: solo vuelve a «por montar» lo que ya se había aprobado.
  exigirAprobado(a);
  if (a.estado === 'POR_MONTAR') return a;
  await registrar(tenant, a, { estado: 'POR_MONTAR', novedad: null }, { tipo: 'REABIERTO' });
  return uno(tenant, id);
};

/**
 * Sin sábana (el puente de la fase A): el destino y la UTM se pegan en el anuncio. Lo hace quien administra o el
 * responsable de la campaña. Con sábana se pegan en la línea, en CDM.
 */
export const guardarDestino = async (tenant: TenantContext, id: string, body: { destino?: unknown; utm?: unknown; sinDestino?: unknown }) => {
  const a = await uno(tenant, id);
  if (a.destinoEnLaLinea) throw new TenantError('Esta pieza viene de una sábana: el destino lo pega Planning en la línea', 409);
  const campana = a.campana ? await prisma.project.findUnique({ where: { id: a.campana.id }, select: { responsableId: true } }) : null;
  const administra = tenant.role === 'OWNER' || tenant.role === 'ADMIN';
  if (!administra && campana?.responsableId !== tenant.userId) throw new TenantError('El destino lo pega el responsable de la campaña o quien administra', 403);
  const texto = (x: unknown, max: number) => (typeof x === 'string' ? x.trim().slice(0, max) || null : undefined);
  const destino = texto(body.destino, 2000);
  if (destino && !/^https?:\/\/\S+$/i.test(destino)) throw new TenantError('El destino tiene que ser una URL que empiece por http:// o https://', 400);
  const utm = texto(body.utm, 500);
  if (body.sinDestino === true) {
    await registrar(tenant, a, { destino: null, utm: null, sinDestino: true }, { tipo: 'DESTINO', detalle: 'No lleva destino' });
    return uno(tenant, id);
  }
  await registrar(
    tenant,
    a,
    { ...(destino !== undefined && { destino }), ...(destino && { sinDestino: false }), ...(utm !== undefined && { utm }) },
    { tipo: 'DESTINO', detalle: destino ?? undefined }
  );
  return uno(tenant, id);
};

/**
 * ⑤ en el encabezado: cuántas piezas listas de la campaña están montadas. Lo dice Implementación sobre su tabla,
 * con las piezas que le pasa la plataforma.
 */
export const pasoImplementacion = async (piezas: { id: string; estado: string }[], conjuntosSoloTexto: string[] = []) => {
  const listas = piezas.filter(p => p.estado === 'LISTA').map(p => p.id);
  const total = listas.length + conjuntosSoloTexto.length;
  if (!total) return { listas: 0, montados: 0, conNovedad: 0, porAprobar: 0, conElCliente: 0, porMontar: 0, porMontarDe: { piezas: [] as string[], conjuntos: [] as string[] } };
  const deEstos = { OR: [{ piezaId: { in: listas } }, { conjuntoId: { in: conjuntosSoloTexto } }] };
  const porEstado = new Map(
    (await prisma.anuncio.groupBy({ by: ['estado'], where: deEstos, _count: { _all: true } })).map(g => [g.estado, g._count._all])
  );
  const n = (e: string) => porEstado.get(e as never) ?? 0;
  // Qué está por montar (2026-11-25): la plataforma mira su canal para nombrar a quien lo monta o lo publica.
  const porMontarFilas = await prisma.anuncio.findMany({ where: { ...deEstos, estado: 'POR_MONTAR' }, select: { piezaId: true, conjuntoId: true } });
  const porMontarDe = {
    piezas: porMontarFilas.map(f => f.piezaId).filter((id): id is string => !!id),
    conjuntos: porMontarFilas.map(f => f.conjuntoId).filter((id): id is string => !!id),
  };
  const conFila = [...porEstado.values()].reduce((t, c) => t + c, 0);
  // Sin fila todavía = por aprobar: nada se monta sin la aprobación final (2026-11-24).
  return { listas: total, montados: n('MONTADO'), conNovedad: n('CON_NOVEDAD'), porAprobar: total - conFila + n('POR_APROBAR'), conElCliente: n('CON_EL_CLIENTE'), porMontar: n('POR_MONTAR'), porMontarDe };
};

// --------------------------------------------------------------- la aprobación final (2026-11-24)

/**
 * «Autorizar implementación»: en una campaña que aprueba el equipo, quien la aprueba (responsable o función
 * Aprobación) dice explícitamente que esto se puede montar. Solo lo listo (con destino y fecha) y por aprobar.
 */
export const autorizar = async (tenant: TenantContext, ids: unknown) => {
  if (!Array.isArray(ids) || !ids.length) throw new TenantError('Elige qué autorizar', 400);
  const hechos: string[] = [];
  for (const id of ids.filter((x): x is string => typeof x === 'string').slice(0, 200)) {
    const a = await uno(tenant, id);
    if (a.campana?.modoAprobacion === 'CLIENTE') throw new TenantError('Esta campaña la aprueba el cliente: mándale el enlace', 409);
    if (!a.campana?.puedoAutorizar) throw new TenantError('La implementación la autoriza quien aprueba la campaña', 403);
    if (a.estado !== 'POR_APROBAR' || !a.listo) continue;
    await registrar(tenant, a, { estado: 'POR_MONTAR', novedad: null }, { tipo: 'AUTORIZADO' });
    hechos.push(id);
  }
  return { autorizados: hechos.length };
};

const DIAS_DEL_ENLACE = 14;
const urlDe = (token: string) => `${(process.env.APP_URL || 'https://myvoice.lobueno.co').replace(/\/$/, '')}/?review=${token}`;

/** El enlace abierto de la aprobación final de una campaña, si lo hay: se comparte el mismo, no se crea otro. */
const enlaceAbierto = async (workspaceId: string, campanaId: string) => {
  const s = await prisma.reviewSession.findFirst({
    where: {
      workspaceId,
      ronda: 'IMPLEMENTACION',
      status: { not: 'COMPLETED' },
      expiresAt: { gt: new Date() },
      items: { some: { anuncio: { projectId: campanaId } } },
    },
    orderBy: { createdAt: 'desc' },
    select: { token: true, expiresAt: true, _count: { select: { items: true } } },
  });
  return s ? { url: urlDe(s.token), venceEn: s.expiresAt.toISOString(), cuantos: s._count.items } : null;
};

/**
 * «Crear enlace para el cliente»: en una campaña que aprueba el cliente, todo lo listo y por aprobar va en un solo
 * enlace —arte, copy, caption, destino y fechas de cada anuncio—. Lo crea quien aprueba la campaña o quien
 * administra. Si ya hay uno abierto, devuelve ese.
 */
export const enlaceParaElCliente = async (tenant: TenantContext, campanaId: unknown) => {
  if (typeof campanaId !== 'string') throw new TenantError('Falta la campaña', 400);
  const campana = await prisma.project.findFirst({
    where: { id: campanaId, workspaceId: tenant.workspaceId },
    select: { id: true, name: true, modoAprobacion: true, ...SELECT_APROBADORES },
  });
  if (!campana?.clientId) throw new TenantError('Campaña no encontrada', 404);
  if (campana.modoAprobacion !== 'CLIENTE') throw new TenantError('Esta campaña la aprueba el equipo: autorízala desde Implementación', 409);
  if (!canManage(tenant.role) && !apruebaLaCampana(tenant.userId, campana))
    throw new TenantError('El enlace lo crea quien aprueba la campaña o quien administra', 403);
  const abierto = await enlaceAbierto(tenant.workspaceId, campana.id);
  if (abierto) return abierto;
  const deLaCampana = (await armar(tenant, { clientId: campana.clientId })).filter(a => a.campana?.id === campana.id);
  const listos = deLaCampana.filter(a => a.estado === 'POR_APROBAR' && a.listo);
  if (!listos.length) throw new TenantError('No hay nada listo para el cliente: falta el destino o la fecha, o ya está aprobado', 409);
  const sesion = await prisma.$transaction(async tx => {
    const anuncioIds: string[] = [];
    for (const a of listos) {
      const anuncio = await tx.anuncio.upsert({
        where: a.piezaId ? { piezaId: a.piezaId } : { conjuntoId: a.conjuntoId! },
        create: { workspaceId: tenant.workspaceId, clientId: a.clientId, projectId: campana.id, piezaId: a.piezaId, conjuntoId: a.conjuntoId, estado: 'CON_EL_CLIENTE' },
        update: { estado: 'CON_EL_CLIENTE', projectId: campana.id },
      });
      await tx.anuncioEvento.create({ data: { anuncioId: anuncio.id, tipo: 'ENVIADO_AL_CLIENTE', autorId: tenant.userId } });
      anuncioIds.push(anuncio.id);
    }
    return tx.reviewSession.create({
      data: {
        title: `${campana.name} · para implementar`,
        ronda: 'IMPLEMENTACION',
        workspaceId: tenant.workspaceId,
        createdById: tenant.userId,
        expiresAt: new Date(Date.now() + DIAS_DEL_ENLACE * 86_400_000),
        items: { create: anuncioIds.map((anuncioId, sortOrder) => ({ anuncioId, sortOrder })) },
      },
      select: { token: true, expiresAt: true },
    });
  });
  return { url: urlDe(sesion.token), venceEn: sesion.expiresAt.toISOString(), cuantos: listos.length };
};

/** El tenant de quien creó el enlace, para leer lo que el cliente ve con las mismas reglas. */
const comoQuienEnvio = (s: { workspaceId: string; createdById: string }) =>
  ({ workspaceId: s.workspaceId, userId: s.createdById, role: 'OWNER' }) as TenantContext;

/**
 * Lo que ve el cliente detrás del token, sin cuenta: por anuncio, el medio y el formato, el arte, los textos (en la
 * pieza y los que la acompañan), el destino con su UTM y las fechas. Nada interno: ni quién lo hizo ni hallazgos.
 */
export const presentarParaElCliente = async (sesion: { workspaceId: string; createdById: string }, anuncioIds: string[]) => {
  const filas = await prisma.anuncio.findMany({ where: { id: { in: anuncioIds } }, select: { id: true, piezaId: true, conjuntoId: true, clientId: true } });
  const vistos = await Promise.all(
    filas.map(async f => {
      const [a] = await armar(comoQuienEnvio(sesion), { id: f.piezaId ? `pieza:${f.piezaId}` : `copy:${f.conjuntoId}` });
      return a ? { anuncioId: f.id, a } : null;
    })
  );
  const marca = filas[0] ? await prisma.client.findUnique({ where: { id: filas[0].clientId }, select: { name: true } }) : null;
  return {
    marca: marca?.name ?? null,
    campana: vistos.find(v => v?.a.campana)?.a.campana?.nombre ?? null,
    anuncios: vistos
      .filter((v): v is NonNullable<typeof v> => !!v)
      .map(({ anuncioId, a }) => ({
        id: anuncioId,
        medio: a.linea?.medio ?? a.platform,
        formato: a.linea?.formato ?? a.formato,
        platform: a.platform,
        etapa: a.linea?.etapa ?? null,
        desde: a.linea?.desde ?? null,
        hasta: a.linea?.hasta ?? null,
        previaUrl: a.previaUrl,
        enlace: a.enlace,
        soloTexto: !a.piezaId,
        textos: a.textos.filter(t => t.zona !== 'indicacion').map(t => ({ nombre: t.nombre, texto: t.texto, zona: t.zona })),
        url: a.url,
      })),
  };
};

/**
 * La respuesta del cliente, dentro de la transacción del portal: lo aprobado queda «por montar»; lo que pide cambios
 * vuelve a «por aprobar» con su comentario como novedad, y el responsable recibe un aviso.
 */
export const aplicarRespuestaDelCliente = async (
  tx: Prisma.TransactionClient,
  sesion: { workspaceId: string; createdById: string },
  anuncioIds: Set<string>,
  decisiones: { anuncioId: string; decision: 'APPROVED' | 'REJECTED'; comentario: string }[],
  cliente: string
) => {
  const avisos = new Map<string, { campana: string; cambios: number; aprobados: number; clientId: string }>();
  for (const d of decisiones) {
    if (!anuncioIds.has(d.anuncioId)) continue;
    const anuncio = await tx.anuncio.findUnique({
      where: { id: d.anuncioId },
      select: { id: true, estado: true, clientId: true, projectId: true },
    });
    if (!anuncio || anuncio.estado !== 'CON_EL_CLIENTE') continue;
    const aprueba = d.decision === 'APPROVED';
    await tx.anuncio.update({
      where: { id: anuncio.id },
      data: aprueba ? { estado: 'POR_MONTAR', novedad: null } : { estado: 'POR_APROBAR', novedad: `${cliente} pidió cambios: ${d.comentario}` },
    });
    await tx.anuncioEvento.create({
      data: { anuncioId: anuncio.id, tipo: aprueba ? 'APROBADO_CLIENTE' : 'CAMBIOS_CLIENTE', autorId: sesion.createdById, detalle: aprueba ? cliente : `${cliente}: ${d.comentario}` },
    });
    const projectId = anuncio.projectId;
    const clave = projectId ?? anuncio.clientId;
    const previo = avisos.get(clave) ?? { campana: projectId ?? '', cambios: 0, aprobados: 0, clientId: anuncio.clientId };
    if (aprueba) previo.aprobados++;
    else previo.cambios++;
    avisos.set(clave, previo);
  }
  // Un aviso por campaña al responsable (y nunca al cliente, que no tiene cuenta).
  for (const [, v] of avisos) {
    const campana = v.campana ? await tx.project.findUnique({ where: { id: v.campana }, select: { name: true, responsableId: true } }) : null;
    if (!campana?.responsableId) continue;
    await tx.notificacion.create({
      data: {
        workspaceId: sesion.workspaceId,
        userId: campana.responsableId,
        clientId: v.clientId,
        tipo: 'ANUNCIO_DEVUELTO',
        titulo: v.cambios ? 'El cliente pidió cambios para implementar' : 'El cliente aprobó lo que se va a implementar',
        detalle: `${campana.name}: ${v.aprobados} aprobados, ${v.cambios} con cambios`,
      },
    });
  }
};

/** «Por aprobar» del encabezado: lo listo para autorizar en las campañas internas que quien mira aprueba. */
export const porAutorizarDe = async (tenant: TenantContext, clientIds: string[]) => {
  const listas = await Promise.all(clientIds.map(id => armar(tenant, { clientId: id })));
  return listas
    .flat()
    .filter(a => a.estado === 'POR_APROBAR' && a.listo && a.campana?.modoAprobacion === 'INTERNA' && a.campana.puedoAutorizar)
    .map(a => ({ id: a.id, titulo: a.titulo, clientId: a.clientId, campana: a.campana?.nombre ?? null }));
};

/**
 * Qué copy aprobado va directo a Implementación, sin pieza de diseño (2026-11-24): la misma regla que `armar` —con
 * sábana, el formato de la línea es de solo texto; sin sábana, el canal no produce pieza—. My Voice la usa para
 * decir en Copy «Directo a Implementación» en vez de «Mandar a producción»; la plataforma la conecta al arrancar.
 */
export const directosAImplementacion = async (
  tenant: TenantContext,
  grupos: { conjuntoId: string; platform: string; lineaId: string | null; clientId: string }[]
): Promise<Set<string>> => {
  if (!grupos.length) return new Set();
  // Solo en las marcas con Implementación prendida: sin el módulo, lo de solo texto sigue en «Aprobado».
  const conModulo = new Set(
    (
      await prisma.moduloDeMarca.findMany({
        where: { modulo: 'IMPLEMENTACION', clientId: { in: [...new Set(grupos.map(g => g.clientId))] }, client: { workspaceId: tenant.workspaceId } },
        select: { clientId: true },
      })
    ).map(m => m.clientId)
  );
  const deEstas = grupos.filter(g => conModulo.has(g.clientId));
  if (!deEstas.length) return new Set();
  const lineas = await lineasParaImplementar(tenant, deEstas.map(g => g.lineaId).filter((id): id is string => !!id));
  return new Set(
    deEstas.filter(g => (g.lineaId && lineas.get(g.lineaId) ? lineas.get(g.lineaId).soloTexto : !producePieza(g.platform))).map(g => g.conjuntoId)
  );
};

/**
 * T5 (reporte de implementación, 2026-11-24): los anuncios de una campaña, como los ve Implementación, y su historial
 * (autorizar, el cliente, montar, devolver). La plataforma los pone junto a lo planeado en la sábana.
 */
export const anunciosParaReporte = async (tenant: TenantContext, clientId: string, campanaId: string) => {
  const anuncios = (await armar(tenant, { clientId })).filter(a => a.campana?.id === campanaId);
  const filas = await prisma.anuncio.findMany({
    where: {
      workspaceId: tenant.workspaceId,
      OR: [
        { piezaId: { in: anuncios.map(a => a.piezaId).filter((id): id is string => !!id) } },
        { conjuntoId: { in: anuncios.map(a => a.conjuntoId).filter((id): id is string => !!id) } },
      ],
    },
    select: { piezaId: true, conjuntoId: true, eventos: { orderBy: { createdAt: 'asc' }, select: { tipo: true, autorId: true, detalle: true, createdAt: true } } },
  });
  const tituloDe = new Map(anuncios.map(a => [a.piezaId ?? a.conjuntoId, a.titulo]));
  const eventos = filas.flatMap(f =>
    f.eventos.map(e => ({ anuncio: tituloDe.get(f.piezaId ?? f.conjuntoId) ?? 'Anuncio', tipo: e.tipo, autorId: e.autorId, detalle: e.detalle, en: e.createdAt.toISOString() }))
  );
  return { anuncios, eventos };
};

/**
 * Eficiencia (super admin, 2026-11-24): por campaña, cuándo se mandó a aprobar lo primero, cuándo quedó aprobado lo
 * último, cuándo se montó lo primero y lo último, cuántos cambios pidió el cliente y cuántas novedades hubo.
 */
export const eficienciaDeAnuncios = async (campanaIds: string[]) => {
  const anuncios = await prisma.anuncio.findMany({
    where: { OR: [{ projectId: { in: campanaIds } }, { pieza: { projectId: { in: campanaIds } } }] },
    select: { projectId: true, estado: true, pieza: { select: { projectId: true } }, eventos: { select: { tipo: true, createdAt: true } } },
  });
  const t = (xs: Date[], f: (...n: number[]) => number) => (xs.length ? new Date(f(...xs.map(x => x.getTime()))).toISOString() : null);
  return new Map(
    campanaIds.map(id => {
      const suyos = anuncios.filter(a => (a.projectId ?? a.pieza?.projectId) === id);
      const ev = (tipos: string[]) => suyos.flatMap(a => a.eventos.filter(e => tipos.includes(e.tipo)).map(e => e.createdAt));
      return [
        id,
        {
          anuncios: suyos.length,
          montados: suyos.filter(a => a.estado === 'MONTADO').length,
          primerEnvio: t(ev(['ENVIADO_AL_CLIENTE', 'AUTORIZADO']), Math.min),
          primeraAprobacion: t(ev(['APROBADO_CLIENTE', 'AUTORIZADO']), Math.min),
          ultimaAprobacion: t(ev(['APROBADO_CLIENTE', 'AUTORIZADO']), Math.max),
          primerMontado: t(ev(['MONTADO']), Math.min),
          ultimoMontado: t(ev(['MONTADO']), Math.max),
          cambiosDelCliente: ev(['CAMBIOS_CLIENTE']).length,
          novedades: ev(['DEVUELTO']).length,
        },
      ];
    })
  );
};

/**
 * Quiénes montan o publican lo de una marca (2026-11-24): el trafficker y el community con la función para esa marca
 * o para todas. Para decir con nombre a quién le toca el paso ⑤ y cada anuncio. Sin nadie, lo hace quien administra.
 */
export const quienesMontan = async (workspaceId: string, clientId: string) => {
  const fs = await prisma.miembroFuncion.findMany({
    where: { workspaceId, funcion: { in: ['TRAFFICKER', 'COMMUNITY'] }, OR: [{ clientId }, { clientId: null }] },
    select: { funcion: true, user: { select: { id: true, name: true } } },
  });
  const de = (f: 'TRAFFICKER' | 'COMMUNITY') =>
    [...new Map(fs.filter(x => x.funcion === f).map(x => [x.user.id, { id: x.user.id, nombre: x.user.name }])).values()];
  return { trafficker: de('TRAFFICKER'), community: de('COMMUNITY') };
};

/**
 * «Mi cola» (F5, 2026-11-25; el plan de Implementación, pantalla 7): lo que le toca a quien mira en todas las marcas con
 * Implementación, por fecha de salida. Montar o publicar lo aprobado (si tiene la función o administra), autorizar lo
 * listo de las campañas internas que aprueba y corregir lo devuelto con novedad en las que aprueba. Sin fecha, al final.
 */
export const miCola = async (tenant: TenantContext) => {
  const marcas = await prisma.client.findMany({
    where: { workspaceId: tenant.workspaceId, modulos: { some: { modulo: 'IMPLEMENTACION' } } },
    select: { id: true, name: true },
  });
  if (!marcas.length) return [];
  const nombre = new Map(marcas.map(m => [m.id, m.name]));
  const anuncios = (await armar(tenant, {})).filter(a => nombre.has(a.clientId));
  const tareaDe = (a: (typeof anuncios)[number]) => {
    if (a.estado === 'POR_MONTAR' && a.puedo) return a.accion === 'publicar' ? ('publicar' as const) : ('montar' as const);
    if (a.estado === 'POR_APROBAR' && a.listo && a.campana?.modoAprobacion === 'INTERNA' && a.campana.puedoAutorizar) return 'autorizar' as const;
    if (a.estado === 'CON_NOVEDAD' && a.campana?.aprueban.some(p => p.id === tenant.userId)) return 'corregir' as const;
    return null;
  };
  return anuncios
    .map(a => ({ ...a, marca: nombre.get(a.clientId)!, tarea: tareaDe(a) }))
    .filter((a): a is typeof a & { tarea: NonNullable<ReturnType<typeof tareaDe>> } => a.tarea !== null)
    .sort((x, y) => (x.linea?.desde ?? '9999').localeCompare(y.linea?.desde ?? '9999') || x.marca.localeCompare(y.marca));
};
