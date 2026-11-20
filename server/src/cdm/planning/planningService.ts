import { SELECT_APROBADORES, apruebaLaCampana, nombresDe, quienesAprueban } from '../../comun/aprobadores.js';
import { EstadoPlanning, EtapaDeFunnel, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { assertProjectInWorkspace, canManage, TenantContext, TenantError } from '../../lib/tenancy.js';
import { exigirPaso, puedeActuar } from '../../comun/permisos.js';
import { notifyAviso } from '../../services/notificationService.js';

/**
 * El planning de una campaña (F3; en el `.pen`, P1 a P5). Reglas:
 *
 *   · Uno por campaña, y la campaña existe antes (decisión 24): el planning no pide nombre.
 *   · Lo arma Planning en esa marca, o un admin (`exigirPaso(…, 'CDM')`).
 *   · Una línea = un formato en una etapa, con sus piezas (decisión 19). Solo medios activos de la biblioteca.
 *   · Se edita sin enviar o devuelto; enviado espera al responsable de la campaña, que aprueba o devuelve con
 *     comentario (decisión 24). Aprobado, se reabre como versión nueva.
 *   · El historial (`EventoDePlanning`) no se edita.
 *
 * La aprobación del cliente por enlace (P5, campañas «con cliente») llega en F3b.
 */

export const ETAPAS = Object.values(EtapaDeFunnel);
const EDITABLE: EstadoPlanning[] = ['EN_ARMADO', 'DEVUELTO'];

export const assertPlanningInWorkspace = async (tenant: TenantContext, id: string) => {
  const planning = await prisma.planning.findUnique({
    where: { id },
    include: { campana: { select: { id: true, name: true, clientId: true, modoAprobacion: true, ...SELECT_APROBADORES } } },
  });
  if (!planning || planning.workspaceId !== tenant.workspaceId) throw new TenantError('Planning no encontrado', 404);
  return planning;
};

const fecha = (v: unknown): Date | null | undefined => {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new TenantError('Fecha inválida (AAAA-MM-DD)', 400);
  return new Date(`${v}T00:00:00Z`);
};

const etapas = (v: unknown): EtapaDeFunnel[] => {
  if (!Array.isArray(v) || !v.length || v.some(e => !ETAPAS.includes(e))) throw new TenantError('Elige al menos una etapa del funnel', 400);
  return [...new Set(v as EtapaDeFunnel[])];
};

// -------------------------------------------------------------------------------------------------- leer

const INCLUDE_LINEAS = {
  lineas: {
    orderBy: [{ orden: 'asc' as const }],
    include: {
      formato: { select: { id: true, nombre: true, canal: true, tipoArchivo: true, medio: { select: { id: true, nombre: true, clase: true } } } },
      version: {
        select: {
          id: true,
          numero: true,
          anchoPx: true,
          altoPx: true,
          guia: true,
          campos: { select: { clave: true, nombre: true, zona: true, maximo: true, repeticiones: true, ubicacionId: true, orden: true } },
          ubicaciones: {
            orderBy: { orden: 'asc' as const },
            select: { id: true, plataforma: true, nombre: true, porConfirmar: true, alertaTexto: true },
          },
        },
      },
    },
  },
} satisfies Prisma.PlanningInclude;

type LineaConFormato = Prisma.LineaDePlanningGetPayload<{ include: (typeof INCLUDE_LINEAS)['lineas']['include'] }>;

/**
 * Los textos que My Voice va a escribir para la línea, con su largo (P4: «texto 44 car. · título 40 car.»).
 * En una pieza de Meta cada ubicación tiene su largo: manda el más corto entre las que eligió la línea, o entre
 * todas mientras no elija (decisión 18). Las indicaciones para Diseño no se escriben como copy publicable.
 */
const textosDe = (l: LineaConFormato) => {
  const campos = l.version.campos.filter(c => c.zona !== 'INDICACION');
  const elegidas = l.ubicacionIds.length ? new Set(l.ubicacionIds) : null;
  const porClave = new Map<string, { nombre: string; maximo: number | null; repeticiones: number; orden: number }>();
  for (const c of campos) {
    if (c.ubicacionId && elegidas && !elegidas.has(c.ubicacionId)) continue;
    const previo = porClave.get(c.clave);
    const maximo = previo ? (previo.maximo == null ? c.maximo : c.maximo == null ? previo.maximo : Math.min(previo.maximo, c.maximo)) : c.maximo;
    porClave.set(c.clave, { nombre: c.nombre, maximo, repeticiones: c.repeticiones, orden: previo?.orden ?? c.orden });
  }
  return [...porClave.entries()].sort((a, b) => a[1].orden - b[1].orden).map(([clave, t]) => ({ clave, ...t }));
};

const resumen = (lineas: { piezas: number; formatoId: string; formato: { medio: { id: string } } }[]) => ({
  medios: new Set(lineas.map(l => l.formato.medio.id)).size,
  formatos: new Set(lineas.map(l => l.formatoId)).size,
  lineas: lineas.length,
  piezas: lineas.reduce((s, l) => s + l.piezas, 0),
});

/** P1: los plannings de una marca, con lo que pide atención. */
export const listarPlannings = async (tenant: TenantContext, clientId: string) => {
  const plannings = await prisma.planning.findMany({
    where: { workspaceId: tenant.workspaceId, clientId },
    include: {
      campana: { select: { name: true, ...SELECT_APROBADORES } },
      lineas: { select: { piezas: true, formatoId: true, formato: { select: { medio: { select: { id: true } } } } } },
      eventos: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return plannings.map(p => ({
    id: p.id,
    campana: { id: p.campanaId, nombre: p.campana.name },
    estado: p.estado,
    version: p.version,
    desde: p.desde?.toISOString() ?? null,
    hasta: p.hasta?.toISOString() ?? null,
    aprueba: p.campana.responsable,
    // Quienes deciden (decisión 30): el responsable y los sumados.
    aprueban: quienesAprueban(p.campana),
    ultimo: p.eventos[0] ? { tipo: p.eventos[0].tipo, fecha: p.eventos[0].createdAt.toISOString(), comentario: p.eventos[0].comentario } : null,
    ...resumen(p.lineas),
  }));
};

/** P4/P5: el planning con su sábana, su historial y lo que puede hacer quien mira. */
export const detallePlanning = async (tenant: TenantContext, id: string) => {
  const base = await assertPlanningInWorkspace(tenant, id);
  const p = await prisma.planning.findUniqueOrThrow({
    where: { id },
    include: { ...INCLUDE_LINEAS, eventos: { orderBy: { createdAt: 'desc' } } },
  });
  const autores = new Map(
    (await prisma.user.findMany({ where: { id: { in: [...new Set(p.eventos.map(e => e.autorId))] } }, select: { id: true, name: true } })).map(u => [
      u.id,
      u.name,
    ])
  );
  const arma = await puedeActuar(tenant, 'CDM', p.clientId);
  // Decide quien aprueba la campaña: su responsable o un aprobador sumado (decisión 30).
  const esResponsable = apruebaLaCampana(tenant.userId, base.campana);
  return {
    id: p.id,
    clientId: p.clientId,
    campana: { id: base.campana.id, nombre: base.campana.name, modoAprobacion: base.campana.modoAprobacion },
    aprueba: base.campana.responsable,
    aprueban: quienesAprueban(base.campana),
    estado: p.estado,
    version: p.version,
    desde: p.desde?.toISOString() ?? null,
    hasta: p.hasta?.toISOString() ?? null,
    etapas: p.etapas,
    lineas: p.lineas.map(l => ({
      id: l.id,
      formato: { id: l.formato.id, nombre: l.formato.nombre, canal: l.formato.canal, tipoArchivo: l.formato.tipoArchivo },
      medio: { id: l.formato.medio.id, nombre: l.formato.medio.nombre, clase: l.formato.medio.clase },
      medidas:
        (l.version.guia as { medidas?: string[] } | null)?.medidas?.join(' · ') ??
        (l.version.anchoPx && l.version.altoPx ? `${l.version.anchoPx} × ${l.version.altoPx}` : null),
      etapa: l.etapa,
      piezas: l.piezas,
      desde: l.desde?.toISOString() ?? null,
      hasta: l.hasta?.toISOString() ?? null,
      textos: textosDe(l),
      // P4b: las ubicaciones de la pieza y las que eligió la línea (vacío = todas).
      ubicaciones: l.version.ubicaciones,
      ubicacionIds: l.ubicacionIds,
      porConfirmar: l.version.ubicaciones.some(u => u.porConfirmar && (!l.ubicacionIds.length || l.ubicacionIds.includes(u.id))),
    })),
    resumen: resumen(p.lineas),
    eventos: p.eventos.map(e => ({ tipo: e.tipo, version: e.version, autor: autores.get(e.autorId) ?? null, comentario: e.comentario, fecha: e.createdAt.toISOString() })),
    puedo: {
      editar: arma && EDITABLE.includes(p.estado),
      enviar: arma && EDITABLE.includes(p.estado) && p.lineas.length > 0,
      decidir: esResponsable && p.estado === 'POR_APROBAR',
      reabrir: arma && p.estado === 'APROBADO',
      enviarAlCliente: (esResponsable || arma) && p.estado === 'CON_EL_CLIENTE',
      // Para la urgencia: quien administra o quien ya aprueba suma a otro aprobador.
      sumarAprobador: canManage(tenant.role) || esResponsable,
    },
    // El enlace abierto para el cliente, si ya se creó (F3b).
    enlace: await enlaceAbierto(p.id),
  };
};

// ---------------------------------------------------------------------------------------------- escribir

/** Los avisos del planning: van a la campana y, después de la transacción, al correo. */
export const AVISOS_PLANNING = {
  POR_APROBAR: 'PLANNING_POR_APROBAR',
  APROBADO: 'PLANNING_APROBADO',
  DEVUELTO: 'PLANNING_DEVUELTO',
  /** La sábana quedó aprobada del todo: a Copywriting le toca escribir (antes de los pedidos de F4). */
  PARA_COPY: 'PLANNING_PARA_COPY',
} as const;

interface AvisoDePlanning {
  tipo: (typeof AVISOS_PLANNING)[keyof typeof AVISOS_PLANNING];
  userIds: string[];
  titulo: string;
  detalle: string;
}

/** Se escriben en la misma transacción que mueve el planning: no queda un aviso de algo que no pasó. */
const avisar = async (tx: Prisma.TransactionClient, tenant: TenantContext, clientId: string, a: AvisoDePlanning) => {
  // Nunca se le avisa a quien hizo la acción.
  const para = [...new Set(a.userIds)].filter(u => u !== tenant.userId);
  if (para.length) {
    await tx.notificacion.createMany({
      data: para.map(userId => ({ workspaceId: tenant.workspaceId, userId, clientId, tipo: a.tipo, titulo: a.titulo, detalle: a.detalle })),
    });
  }
  return { ...a, userIds: para };
};

/** El correo, sin bloquear la respuesta. Si falla, el aviso ya está en la campana. */
const enviarCorreos = (aviso: Awaited<ReturnType<typeof avisar>>, campanaId: string, marca: string) => {
  if (!aviso.userIds.length) return;
  void (async () => {
    try {
      const gente = await prisma.user.findMany({ where: { id: { in: aviso.userIds } }, select: { email: true } });
      const app = process.env.APP_URL || 'https://myvoice.lobueno.co';
      await notifyAviso({
        para: gente.map(g => g.email),
        tipo: aviso.tipo,
        titulo: aviso.titulo,
        detalle: aviso.detalle,
        marca,
        url: aviso.tipo === AVISOS_PLANNING.PARA_COPY ? `${app}/campana/${campanaId}/myvoice/generar` : `${app}/campana/${campanaId}/cdm/plannings`,
      });
    } catch (error) {
      console.error('[Planning] No se pudo enviar el correo del aviso:', error);
    }
  })();
};

/**
 * Quienes escriben el copy de la marca: la función Copy, para esa marca o para todas. Si nadie la tiene, quien
 * administra, para que la sábana aprobada no quede sin que nadie se entere.
 */
const quienesEscriben = async (tx: Prisma.TransactionClient, workspaceId: string, clientId: string) => {
  const copy = await tx.miembroFuncion.findMany({
    where: { workspaceId, funcion: 'COPY', OR: [{ clientId: null }, { clientId }] },
    select: { userId: true },
  });
  if (copy.length) return copy.map(c => c.userId);
  const jefes = await tx.membership.findMany({ where: { workspaceId, role: { in: ['OWNER', 'ADMIN'] } }, select: { userId: true } });
  return jefes.map(j => j.userId);
};

/** La sábana aprobada del todo le avisa a Copywriting: hay copy por escribir para esta campaña. */
const avisarACopy = async (tx: Prisma.TransactionClient, tenant: TenantContext, p: { id: string; clientId: string }, campana: string, marca: string) => {
  const lineas = await tx.lineaDePlanning.count({ where: { planningId: p.id } });
  return avisar(tx, tenant, p.clientId, {
    tipo: AVISOS_PLANNING.PARA_COPY,
    userIds: await quienesEscriben(tx, tenant.workspaceId, p.clientId),
    titulo: 'Hay copy por escribir',
    detalle: `${campana} · ${marca}: la sábana está aprobada, con ${lineas} ${lineas === 1 ? 'pedido' : 'pedidos'} de copy`,
  });
};

/** Quién armó y quién envió el planning: a ellos les llega la decisión. */
const quienesLoArmaron = async (tx: Prisma.TransactionClient, planningId: string, creadoPorId: string) => {
  const envios = await tx.eventoDePlanning.findMany({ where: { planningId, tipo: 'ENVIADO' }, select: { autorId: true } });
  return [creadoPorId, ...envios.map(e => e.autorId)];
};

const evento = (tx: Prisma.TransactionClient, planningId: string, tipo: Prisma.EventoDePlanningCreateManyInput['tipo'], version: number, autorId: string, comentario?: string) =>
  tx.eventoDePlanning.create({ data: { planningId, tipo, version, autorId, comentario: comentario ?? null } });

/** P2: el planning nace sobre una campaña existente de una marca con CDM. */
export const crearPlanning = async (tenant: TenantContext, body: { campanaId?: unknown; desde?: unknown; hasta?: unknown; etapas?: unknown }) => {
  if (typeof body.campanaId !== 'string') throw new TenantError('Elige la campaña', 400);
  const campana = await assertProjectInWorkspace(tenant, body.campanaId);
  if (!campana.clientId) throw new TenantError('La campaña no tiene marca', 400);
  await exigirPaso(tenant, 'CDM', campana.clientId);
  const cdm = await prisma.moduloDeMarca.findUnique({ where: { clientId_modulo: { clientId: campana.clientId, modulo: 'CDM' } } });
  if (!cdm) throw new TenantError('Esta marca no tiene CDM', 409);
  const existe = await prisma.planning.findUnique({ where: { campanaId: campana.id }, select: { id: true } });
  if (existe) throw Object.assign(new TenantError('La campaña ya tiene su planning', 409), { planningId: existe.id });
  return prisma.$transaction(async tx => {
    const p = await tx.planning.create({
      data: {
        workspaceId: tenant.workspaceId,
        clientId: campana.clientId!,
        campanaId: campana.id,
        desde: fecha(body.desde) ?? null,
        hasta: fecha(body.hasta) ?? null,
        etapas: etapas(body.etapas),
        creadoPorId: tenant.userId,
      },
    });
    await evento(tx, p.id, 'CREADO', 1, tenant.userId);
    return { id: p.id };
  });
};

const editable = async (tenant: TenantContext, id: string) => {
  const p = await assertPlanningInWorkspace(tenant, id);
  await exigirPaso(tenant, 'CDM', p.clientId);
  if (!EDITABLE.includes(p.estado)) throw new TenantError('El planning ya se envió: para cambiarlo, hay que reabrirlo', 409);
  return p;
};

export const actualizarPlanning = async (tenant: TenantContext, id: string, body: { desde?: unknown; hasta?: unknown; etapas?: unknown }) => {
  await editable(tenant, id);
  const data: Prisma.PlanningUpdateInput = {};
  if (body.desde !== undefined) data.desde = fecha(body.desde);
  if (body.hasta !== undefined) data.hasta = fecha(body.hasta);
  if (body.etapas !== undefined) data.etapas = etapas(body.etapas);
  await prisma.planning.update({ where: { id }, data });
};

interface LineaPedida {
  formatoId: string;
  etapa: EtapaDeFunnel;
  piezas: number;
  desde?: string | null;
  hasta?: string | null;
}

/**
 * P3: la selección entera de medios, formatos y piezas por etapa. Reemplaza las líneas: las que siguen
 * (mismo formato y etapa) conservan su id —el `lineaId` estable— y su versión del formato; las nuevas toman la
 * última versión; las que no vienen se borran.
 */
export const guardarLineas = async (tenant: TenantContext, id: string, cuerpo: unknown) => {
  const p = await editable(tenant, id);
  if (!Array.isArray(cuerpo) || cuerpo.length > 300) throw new TenantError('La sábana no se pudo leer', 400);
  const pedidas = cuerpo as LineaPedida[];
  for (const l of pedidas) {
    if (typeof l?.formatoId !== 'string' || !ETAPAS.includes(l.etapa) || !Number.isInteger(l.piezas) || l.piezas < 1 || l.piezas > 50) {
      throw new TenantError('Cada línea necesita un formato, una etapa y entre 1 y 50 piezas', 400);
    }
  }
  const claves = pedidas.map(l => `${l.formatoId}·${l.etapa}`);
  if (new Set(claves).size !== claves.length) throw new TenantError('Hay dos líneas con el mismo formato y etapa', 400);
  const formatos = await prisma.formato.findMany({
    where: { id: { in: [...new Set(pedidas.map(l => l.formatoId))] } },
    include: { medio: { select: { workspaceId: true, estado: true, nombre: true } }, versiones: { orderBy: { numero: 'desc' }, take: 1, select: { id: true } } },
  });
  const porId = new Map(formatos.map(f => [f.id, f]));
  for (const l of pedidas) {
    const f = porId.get(l.formatoId);
    // Un formato de otra agencia responde como si no existiera.
    if (!f || f.medio.workspaceId !== tenant.workspaceId || !f.versiones[0]) throw new TenantError('Formato no encontrado', 404);
    if (f.medio.estado !== 'ACTIVO') throw new TenantError(`${f.medio.nombre} está en borrador: actívalo en la biblioteca para usarlo`, 409);
  }
  await prisma.$transaction(async tx => {
    const actuales = await tx.lineaDePlanning.findMany({ where: { planningId: p.id } });
    const actualPor = new Map(actuales.map(l => [`${l.formatoId}·${l.etapa}`, l]));
    const siguen = new Set<string>();
    for (const [orden, l] of pedidas.entries()) {
      const clave = `${l.formatoId}·${l.etapa}`;
      const actual = actualPor.get(clave);
      const datos = { piezas: l.piezas, orden, desde: fecha(l.desde ?? null), hasta: fecha(l.hasta ?? null) };
      if (actual) {
        siguen.add(actual.id);
        await tx.lineaDePlanning.update({ where: { id: actual.id }, data: datos });
      } else {
        await tx.lineaDePlanning.create({
          data: { planningId: p.id, formatoId: l.formatoId, formatoVersionId: porId.get(l.formatoId)!.versiones[0].id, etapa: l.etapa, ...datos },
        });
      }
    }
    // Se borran solo las que existían y no vinieron (las recién creadas no están en `siguen`).
    const borrar = actuales.filter(a => !siguen.has(a.id)).map(a => a.id);
    if (borrar.length) await tx.lineaDePlanning.deleteMany({ where: { id: { in: borrar } } });
  });
};

/** P4 → P5: se envía al responsable de la campaña. */
export const enviarPlanning = async (tenant: TenantContext, id: string) => {
  const p = await editable(tenant, id);
  if (!p.campana.responsable) throw new TenantError('La campaña no tiene responsable: asígnalo antes de enviar', 409);
  const lineas = await prisma.lineaDePlanning.count({ where: { planningId: id } });
  if (!lineas) throw new TenantError('La sábana está vacía', 409);
  const marca = await prisma.client.findUnique({ where: { id: p.clientId }, select: { name: true } });
  const aviso = await prisma.$transaction(async tx => {
    await tx.planning.update({ where: { id }, data: { estado: 'POR_APROBAR' } });
    await evento(tx, id, 'ENVIADO', p.version, tenant.userId);
    return avisar(tx, tenant, p.clientId, {
      tipo: AVISOS_PLANNING.POR_APROBAR,
      userIds: quienesAprueban(p.campana).map(a => a.id),
      titulo: 'Una sábana espera tu aprobación',
      detalle: `${p.campana.name} · ${marca?.name ?? ''}`,
    });
  });
  enviarCorreos(aviso, p.campana.id, marca?.name ?? '');
};

/** P5: el responsable aprueba o devuelve. Devolver lleva comentario (decisión 24). */
export const decidirPlanning = async (tenant: TenantContext, id: string, accion: 'aprobar' | 'devolver', comentario?: unknown) => {
  const p = await assertPlanningInWorkspace(tenant, id);
  if (p.estado !== 'POR_APROBAR') throw new TenantError('El planning no está esperando aprobación', 409);
  if (!apruebaLaCampana(tenant.userId, p.campana)) {
    throw new TenantError(`La sábana la aprueba ${nombresDe(quienesAprueban(p.campana))}`, 403);
  }
  const texto = typeof comentario === 'string' ? comentario.trim().slice(0, 1000) : '';
  if (accion === 'devolver' && !texto) throw new TenantError('Para devolverla, di qué hay que cambiar', 400);
  const marca = await prisma.client.findUnique({ where: { id: p.clientId }, select: { name: true } });
  // En una campaña «con cliente», la aprobación del responsable no es la última: falta el cliente por enlace.
  const conCliente = accion === 'aprobar' && p.campana.modoAprobacion === 'CLIENTE';
  const avisos = await prisma.$transaction(async tx => {
    await tx.planning.update({
      where: { id },
      data: { estado: accion === 'devolver' ? 'DEVUELTO' : conCliente ? 'CON_EL_CLIENTE' : 'APROBADO' },
    });
    await evento(tx, id, accion === 'aprobar' ? 'APROBADO' : 'DEVUELTO', p.version, tenant.userId, texto || undefined);
    const paraCopy = accion === 'aprobar' && !conCliente ? [await avisarACopy(tx, tenant, p, p.campana.name, marca?.name ?? '')] : [];
    return [...paraCopy, await avisar(tx, tenant, p.clientId, {
      tipo: accion === 'aprobar' ? AVISOS_PLANNING.APROBADO : AVISOS_PLANNING.DEVUELTO,
      userIds: await quienesLoArmaron(tx, id, p.creadoPorId),
      titulo: accion === 'devolver' ? 'Devolvieron la sábana' : conCliente ? 'El responsable aprobó la sábana: falta el cliente' : 'Aprobaron la sábana',
      detalle: accion === 'aprobar' ? `${p.campana.name} · ${marca?.name ?? ''}` : `${p.campana.name}: «${texto}»`,
    })];
  });
  for (const aviso of avisos) enviarCorreos(aviso, p.campana.id, marca?.name ?? '');
};

/** Un planning aprobado se cambia como versión nueva: vuelve a armado y, al enviarlo, a aprobación. */
export const reabrirPlanning = async (tenant: TenantContext, id: string) => {
  const p = await assertPlanningInWorkspace(tenant, id);
  await exigirPaso(tenant, 'CDM', p.clientId);
  if (p.estado !== 'APROBADO') throw new TenantError('Solo se reabre un planning aprobado', 409);
  await prisma.$transaction(async tx => {
    await tx.planning.update({ where: { id }, data: { estado: 'EN_ARMADO', version: p.version + 1 } });
    await evento(tx, id, 'REABIERTO', p.version + 1, tenant.userId);
  });
};

/**
 * P4b: una línea elige sus ubicaciones. El largo para My Voice pasa a ser el más corto entre las elegidas
 * (decisión 18); sin elegir, cuentan todas. Solo ubicaciones de la versión con que se planeó la línea.
 */
export const elegirUbicaciones = async (tenant: TenantContext, id: string, lineaId: string, ubicacionIds: unknown) => {
  const p = await editable(tenant, id);
  if (!Array.isArray(ubicacionIds) || ubicacionIds.some(u => typeof u !== 'string')) throw new TenantError('Ubicaciones inválidas', 400);
  const linea = await prisma.lineaDePlanning.findUnique({
    where: { id: lineaId },
    select: { planningId: true, version: { select: { ubicaciones: { select: { id: true } } } } },
  });
  if (!linea || linea.planningId !== p.id) throw new TenantError('Línea no encontrada', 404);
  const validas = new Set(linea.version.ubicaciones.map(u => u.id));
  const elegidas = [...new Set(ubicacionIds as string[])];
  if (elegidas.some(u => !validas.has(u))) throw new TenantError('Esa ubicación no es de esta pieza', 400);
  // Elegirlas todas es lo mismo que no elegir: se guarda vacío.
  await prisma.lineaDePlanning.update({ where: { id: lineaId }, data: { ubicacionIds: elegidas.length === validas.size ? [] : elegidas } });
};

// ------------------------------------------------------------------------------- el cliente, por enlace (F3b)

const DIAS_DEL_ENLACE = 14;

const urlDe = (token: string) => `${(process.env.APP_URL || 'https://myvoice.lobueno.co').replace(/\/$/, '')}/?review=${token}`;

/** La sesión de revisión abierta del planning, si la hay: el mismo enlace se comparte, no se crea otro. */
const enlaceAbierto = async (planningId: string) => {
  const s = await prisma.reviewSession.findFirst({
    where: { ronda: 'SABANA', status: { not: 'COMPLETED' }, expiresAt: { gt: new Date() }, items: { some: { planningId } } },
    orderBy: { createdAt: 'desc' },
    select: { token: true, expiresAt: true },
  });
  return s ? { url: urlDe(s.token), venceEn: s.expiresAt.toISOString() } : null;
};

/**
 * El enlace para que el cliente apruebe la sábana (P5, campañas «con cliente»). Lo crea el responsable o
 * Planning cuando el responsable ya la aprobó. Si ya hay uno abierto, devuelve ese.
 */
export const enlaceParaElCliente = async (tenant: TenantContext, id: string) => {
  const p = await assertPlanningInWorkspace(tenant, id);
  const puede = apruebaLaCampana(tenant.userId, p.campana) || (await puedeActuar(tenant, 'CDM', p.clientId));
  if (!puede) throw new TenantError('El enlace lo manda el responsable de la campaña o Planning', 403);
  if (p.estado !== 'CON_EL_CLIENTE') throw new TenantError('La sábana todavía no está lista para el cliente', 409);
  const abierto = await enlaceAbierto(p.id);
  if (abierto) return abierto;
  const s = await prisma.$transaction(async tx => {
    const sesion = await tx.reviewSession.create({
      data: {
        title: `Sábana · ${p.campana.name}`,
        ronda: 'SABANA',
        workspaceId: tenant.workspaceId,
        createdById: tenant.userId,
        expiresAt: new Date(Date.now() + DIAS_DEL_ENLACE * 86_400_000),
        items: { create: [{ planningId: p.id }] },
      },
      select: { token: true, expiresAt: true },
    });
    await evento(tx, p.id, 'ENVIADO_AL_CLIENTE', p.version, tenant.userId);
    return sesion;
  });
  return { url: urlDe(s.token), venceEn: s.expiresAt.toISOString() };
};

/**
 * Lo que ve el cliente detrás del token, sin cuenta: la campaña, la marca, las fechas y la sábana. Nada de
 * nombres internos, versiones de formato ni historial: este contenido es público para quien tenga el enlace.
 */
export const presentarParaElCliente = async (planningId: string) => {
  const p = await prisma.planning.findUniqueOrThrow({
    where: { id: planningId },
    include: {
      campana: { select: { name: true, client: { select: { name: true } } } },
      lineas: {
        orderBy: { orden: 'asc' },
        select: {
          id: true,
          etapa: true,
          piezas: true,
          desde: true,
          hasta: true,
          formato: { select: { nombre: true, medio: { select: { nombre: true } } } },
          version: { select: { anchoPx: true, altoPx: true, guia: true } },
        },
      },
    },
  });
  return {
    id: p.id,
    campana: p.campana.name,
    marca: p.campana.client?.name ?? null,
    estado: p.estado,
    desde: p.desde?.toISOString() ?? null,
    hasta: p.hasta?.toISOString() ?? null,
    etapas: p.etapas,
    lineas: p.lineas.map(l => ({
      id: l.id,
      medio: l.formato.medio.nombre,
      formato: l.formato.nombre,
      medidas:
        (l.version.guia as { medidas?: string[] } | null)?.medidas?.join(' · ') ??
        (l.version.anchoPx && l.version.altoPx ? `${l.version.anchoPx} × ${l.version.altoPx}` : null),
      etapa: l.etapa,
      piezas: l.piezas,
      desde: l.desde?.toISOString() ?? null,
      hasta: l.hasta?.toISOString() ?? null,
    })),
  };
};

/**
 * La respuesta del cliente, dentro de la transacción del portal: aprueba la sábana o la devuelve con
 * comentario. Solo si sigue «con el cliente»; el autor del evento es quien mandó el enlace, y el nombre del
 * cliente queda en el comentario. Avisa a quien la armó y al responsable.
 */
export const aplicarRespuestaDelCliente = async (
  tx: Prisma.TransactionClient,
  sesion: { workspaceId: string; createdById: string },
  planningId: string,
  aprueba: boolean,
  comentario: string,
  cliente: string
) => {
  const p = await tx.planning.findUniqueOrThrow({
    where: { id: planningId },
    include: { campana: { select: { id: true, name: true, ...SELECT_APROBADORES, client: { select: { name: true } } } } },
  });
  if (p.estado !== 'CON_EL_CLIENTE') throw new TenantError('Esta sábana ya no espera la respuesta del cliente', 409);
  await tx.planning.update({ where: { id: p.id }, data: { estado: aprueba ? 'APROBADO' : 'DEVUELTO' } });
  const texto = comentario ? `${cliente}: «${comentario}»` : cliente;
  await evento(tx, p.id, aprueba ? 'APROBADO_POR_CLIENTE' : 'DEVUELTO_POR_CLIENTE', p.version, sesion.createdById, texto);
  const tenant = { workspaceId: sesion.workspaceId, userId: '', role: 'MEMBER' } as TenantContext;
  const paraCopy = aprueba ? [await avisarACopy(tx, tenant, p, p.campana.name, p.campana.client?.name ?? '')] : [];
  const aviso = await avisar(tx, tenant, p.clientId, {
    tipo: aprueba ? AVISOS_PLANNING.APROBADO : AVISOS_PLANNING.DEVUELTO,
    userIds: [...(await quienesLoArmaron(tx, p.id, p.creadoPorId)), ...quienesAprueban(p.campana).map(a => a.id)],
    titulo: aprueba ? 'El cliente aprobó la sábana' : 'El cliente devolvió la sábana',
    detalle: aprueba ? `${p.campana.name} · ${p.campana.client?.name ?? ''}` : `${p.campana.name}: «${comentario}»`,
  });
  return () => {
    for (const a of [...paraCopy, aviso]) enviarCorreos(a, p.campana.id, p.campana.client?.name ?? '');
  };
};

/** Las sábanas que esperan la decisión de quien mira (decisión 30: «Por aprobar»). */
export const sabanasPorAprobarDe = async (tenant: TenantContext) => {
  const plannings = await prisma.planning.findMany({
    where: {
      workspaceId: tenant.workspaceId,
      estado: 'POR_APROBAR',
      campana: { OR: [{ responsableId: tenant.userId }, { aprobadores: { some: { userId: tenant.userId } } }] },
    },
    select: { id: true, clientId: true, campana: { select: { id: true, name: true, client: { select: { name: true } } } }, updatedAt: true },
    orderBy: { updatedAt: 'asc' },
  });
  return plannings.map(p => ({
    planningId: p.id,
    campanaId: p.campana.id,
    campana: p.campana.name,
    clientId: p.clientId,
    marca: p.campana.client?.name ?? null,
    desde: p.updatedAt.toISOString(),
  }));
};

/**
 * F4: los pedidos de copy de una marca, es decir, las líneas de sus sábanas aprobadas. Una línea es un pedido:
 * un formato, una etapa, cuántas piezas y el largo de cada texto ya calculado. CDM entrega esto por contrato;
 * Copywriting lo cruza con su copy en la plataforma (`plataforma/pedidosDeCopy.ts`).
 */
export const pedidosDeCopy = async (tenant: TenantContext, clientId: string) => {
  const plannings = await prisma.planning.findMany({
    where: { workspaceId: tenant.workspaceId, clientId, estado: 'APROBADO' },
    include: {
      ...INCLUDE_LINEAS,
      campana: { select: { id: true, name: true, dnaProfileId: true, ...SELECT_APROBADORES } },
    },
    orderBy: [{ desde: 'asc' }, { updatedAt: 'desc' }],
  });
  return plannings.map(p => ({
    planningId: p.id,
    version: p.version,
    campana: { id: p.campana.id, nombre: p.campana.name, dnaProfileId: p.campana.dnaProfileId },
    aprueban: quienesAprueban(p.campana),
    desde: p.desde?.toISOString() ?? null,
    hasta: p.hasta?.toISOString() ?? null,
    lineas: p.lineas.map(l => ({
      id: l.id,
      medio: l.formato.medio.nombre,
      formato: l.formato.nombre,
      // El canal de Generar que escribe este formato. Sin canal (las piezas de Meta Ads, por ahora), Generar
      // todavía no lo sabe escribir.
      canal: l.formato.canal,
      etapa: l.etapa,
      piezas: l.piezas,
      desde: (l.desde ?? p.desde)?.toISOString() ?? null,
      textos: textosDe(l).map(t => ({ clave: t.clave, nombre: t.nombre, maximo: t.maximo, repeticiones: t.repeticiones })),
    })),
  }));
};
