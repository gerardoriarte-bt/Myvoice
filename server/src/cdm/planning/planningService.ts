import { EstadoPlanning, EtapaDeFunnel, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { assertProjectInWorkspace, TenantContext, TenantError } from '../../lib/tenancy.js';
import { exigirPaso, puedeActuar } from '../../comun/permisos.js';

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
    include: { campana: { select: { id: true, name: true, clientId: true, modoAprobacion: true, responsable: { select: { id: true, name: true } } } } },
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
      campana: { select: { name: true, responsable: { select: { id: true, name: true } } } },
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
  const esResponsable = base.campana.responsable?.id === tenant.userId;
  return {
    id: p.id,
    clientId: p.clientId,
    campana: { id: base.campana.id, nombre: base.campana.name, modoAprobacion: base.campana.modoAprobacion },
    aprueba: base.campana.responsable,
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
    })),
    resumen: resumen(p.lineas),
    eventos: p.eventos.map(e => ({ tipo: e.tipo, version: e.version, autor: autores.get(e.autorId) ?? null, comentario: e.comentario, fecha: e.createdAt.toISOString() })),
    puedo: {
      editar: arma && EDITABLE.includes(p.estado),
      enviar: arma && EDITABLE.includes(p.estado) && p.lineas.length > 0,
      decidir: esResponsable && p.estado === 'POR_APROBAR',
      reabrir: arma && p.estado === 'APROBADO',
    },
  };
};

// ---------------------------------------------------------------------------------------------- escribir

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
  await prisma.$transaction(async tx => {
    await tx.planning.update({ where: { id }, data: { estado: 'POR_APROBAR' } });
    await evento(tx, id, 'ENVIADO', p.version, tenant.userId);
  });
};

/** P5: el responsable aprueba o devuelve. Devolver lleva comentario (decisión 24). */
export const decidirPlanning = async (tenant: TenantContext, id: string, accion: 'aprobar' | 'devolver', comentario?: unknown) => {
  const p = await assertPlanningInWorkspace(tenant, id);
  if (p.estado !== 'POR_APROBAR') throw new TenantError('El planning no está esperando aprobación', 409);
  if (p.campana.responsable?.id !== tenant.userId) {
    throw new TenantError(`La sábana la aprueba ${p.campana.responsable?.name ?? 'el responsable de la campaña'}`, 403);
  }
  const texto = typeof comentario === 'string' ? comentario.trim().slice(0, 1000) : '';
  if (accion === 'devolver' && !texto) throw new TenantError('Para devolverla, di qué hay que cambiar', 400);
  await prisma.$transaction(async tx => {
    await tx.planning.update({ where: { id }, data: { estado: accion === 'aprobar' ? 'APROBADO' : 'DEVUELTO' } });
    await evento(tx, id, accion === 'aprobar' ? 'APROBADO' : 'DEVUELTO', p.version, tenant.userId, texto || undefined);
  });
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
