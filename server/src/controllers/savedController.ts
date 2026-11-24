import { lineaDePedido } from '../myvoice/pedidosDeCopy.js';
import { SELECT_APROBADORES, apruebaLaCampana, exigirElegible, quienesAprueban } from '../comun/aprobadores.js';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import {
  assertClientInWorkspace,
  assertMemberOfWorkspace,
  assertProjectInWorkspace,
  assertVariationInWorkspace,
  filterVariationsInWorkspace,
  canManage,
  pickFields,
  TenantError,
  TenantContext,
} from '../lib/tenancy.js';
import { assertPuedeActuar } from '../comun/permisos.js';
import { prisma } from '../lib/prisma.js';
import { resolveSlotLabel, zonaDe, producePieza } from '../channels/registry.js';
import { ModoAprobacion } from '@prisma/client';
import {
  assertCampanaDeLaMarca,
  campanaDeBrief,
  decidirAprobacion,
  etapasDe,
  SIN_APROBACION,
} from '../services/aprobacion.js';

/**
 * Campos editables de una variación guardada. Antes el handler hacía
 * `{ approvalNote, ...rest }` y pasaba `rest` entero a prisma.update, así que
 * el cliente podía enviar `clientId` y reasignar la fila a otro tenant.
 *
 * `slot`, `slotLabel`, `variationIndex` y `slotInferred` quedan fuera a propósito: son
 * procedencia, no contenido, y dejarlas entrar abriría un camino para reescribir el linaje
 * de una pieza desde el body. Si algún día hace falta corregir a mano un slot inferido, ese
 * handler tiene que re-derivar `slotLabel` del registry y poner `slotInferred = false` en el
 * mismo update, o la bandera queda mintiendo.
 */
/*
 * `isApproved` no está: aprobar tiene dueño —el responsable de la campaña— y
 * pasa por `POST /saved/aprobacion` (services/aprobacion.ts). Acá cualquiera
 * del workspace podía tildarlo, incluso quien no administra.
 */
const VARIATION_UPDATABLE = [
  'content',
  'charCount',
  'tags',
  'approvalNote',
  'projectId',
  'type',
] as const;

export const getSavedVariations = async (req: AuthRequest, res: Response) => {
  try {
    const variations = await prisma.savedVariation.findMany({
      where: { client: { workspaceId: req.tenant!.workspaceId } },
      include: {
        project: { include: { responsable: { select: { id: true, name: true, email: true } } } },
        client: true,
      },
      orderBy: { savedAt: 'desc' },
    });
    // El paso del recorrido viaja con cada copy: la pantalla no tiene cómo
    // saber, sin tres consultas más, si algo está con el cliente o ya en una pieza.
    const etapas = await etapasDe(variations, req.tenant!);
    // La zona se calcula al leer, como la etapa: depende del spec del canal, no se guarda.
    // `llevaArte`: si el canal produce pieza de diseño. Copy lo usa para no pedir «mandar a producción» lo que no la lleva.
    res.json(variations.map(v => ({ ...v, etapa: etapas.get(v.id), zona: zonaDe(v.platform, v.slot), llevaArte: producePieza(v.platform) })));
  } catch (error) {
    handleTenantError(error, res, 'Error al obtener el copy');
  }
};

/**
 * Guardar el copy en SU campaña. Si viene `dnaProfileId` —lo normal desde
 * Generar— la campaña es la del brief y no se pregunta: elegirla a mano era
 * elegir dos veces lo mismo, con la posibilidad de elegir distinto.
 */
/**
 * F4: el pedido (línea de una sábana aprobada) al que responde este copy. Tiene que ser de la misma campaña y del
 * mismo canal; si no, se rechaza en vez de contar copy en el pedido equivocado. La línea la responde CDM por la
 * función que registra la plataforma (`lineaDePedido`), sin que My Voice lea su tabla.
 */
const pedidoValido = async (tenant: TenantContext, lineaId: string, campanaId: string | null, platform: unknown) => {
  const linea = await lineaDePedido(tenant, lineaId);
  if (!linea) throw new TenantError('Pedido de copy no encontrado', 404);
  if (linea.campanaId !== campanaId) throw new TenantError('El pedido es de otra campaña', 400);
  if (!linea.aprobada) throw new TenantError('La sábana de este pedido ya no está aprobada', 409);
  if (linea.canal !== platform) throw new TenantError(`El pedido es de ${linea.canal ?? 'otro canal'}`, 400);
  return lineaId;
};

export const saveVariation = async (req: AuthRequest, res: Response) => {
  // `slotLabel` NO se lee del body: la etiqueta la resuelve el servidor contra el registry.
  const { clientId, projectId, dnaProfileId, platform, type, content, charCount, tags, slot, variationIndex, conjuntoId, piezaIndex, lineaDePlanningId } =
    req.body;
  try {
    const tenant = req.tenant!;
    await assertClientInWorkspace(tenant, clientId);
    await assertPuedeActuar(tenant, 'COPY', clientId);
    let campanaId: string | null = null;
    if (projectId) {
      campanaId = (await assertCampanaDeLaMarca(tenant, projectId, clientId)).id;
    } else if (dnaProfileId) {
      const campana = await campanaDeBrief(tenant, dnaProfileId);
      if (campana.clientId && campana.clientId !== clientId)
        throw new TenantError('El brief es de otra marca', 400);
      campanaId = campana.id;
    }

    // El slot es procedencia, no contenido: se guarda tal como lo emitió el writer. Un slot
    // que no pertenece al canal se guarda igual con slotLabel null — perder el guardado del
    // usuario por un spec desactualizado es peor que un label vacío, y
    // `slotLabel IS NULL AND slot IS NOT NULL` detecta el caso desde SQL.
    const slotId = typeof slot === 'string' && slot.trim() ? slot.trim().slice(0, 64) : null;
    const index = Number.isInteger(variationIndex) && variationIndex >= 1 ? variationIndex : null;
    // La pieza a la que pertenece el texto: lo pone el motor al generar (un uuid por pieza).
    const conjunto = typeof conjuntoId === 'string' && /^[0-9a-f-]{36}$/i.test(conjuntoId) ? conjuntoId : null;
    const pieza = Number.isInteger(piezaIndex) && piezaIndex >= 1 && piezaIndex <= 10 ? piezaIndex : null;
    const linea = typeof lineaDePlanningId === 'string' && lineaDePlanningId ? await pedidoValido(tenant, lineaDePlanningId, campanaId, platform) : null;

    const variation = await prisma.savedVariation.create({
      data: {
        clientId,
        projectId: campanaId,
        platform,
        type,
        content,
        charCount,
        tags: tags || [],
        slot: slotId,
        slotLabel: resolveSlotLabel(platform, slotId),
        variationIndex: index,
        conjuntoId: conjunto,
        piezaIndex: pieza,
        lineaDePlanningId: linea,
      },
      include: { project: { include: { responsable: { select: { id: true, name: true, email: true } } } } },
    });
    res.status(201).json({ ...variation, etapa: campanaId ? 'POR_APROBAR' : 'SIN_CAMPANA', zona: zonaDe(platform, slotId) });
  } catch (error) {
    handleTenantError(error, res, 'Error al guardar el copy');
  }
};

/** Aprobar o desaprobar, por el responsable de la campaña. */
export const decidirAprobacionHandler = async (req: AuthRequest, res: Response) => {
  const { ids, aprobar } = req.body ?? {};
  if (typeof aprobar !== 'boolean') return res.status(400).json({ error: 'aprobar tiene que ser true o false' });
  try {
    res.json(await decidirAprobacion(req.tenant!, ids, aprobar));
  } catch (error) {
    handleTenantError(error, res, 'Error al decidir la aprobación');
  }
};

export const updateVariation = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const tenant = req.tenant!;
    const current = await assertVariationInWorkspace(tenant, id);
    await assertPuedeActuar(tenant, 'COPY', current.clientId);

    const updates: Record<string, any> = pickFields(req.body, VARIATION_UPDATABLE);
    if (updates.projectId) await assertCampanaDeLaMarca(tenant, updates.projectId, current.clientId);

    /*
     * Lo aprobado es ESE texto en ESA campaña. Cambiar cualquiera de las dos
     * cosas lo devuelve a «por aprobar»: si no, se aprobaba una frase y se
     * producía otra, o se aprobaba con las reglas de una campaña y se
     * producía con las de otra.
     */
    const cambiaTexto = typeof updates.content === 'string' && updates.content !== current.content;
    const cambiaCampana = 'projectId' in updates && (updates.projectId || null) !== current.projectId;
    if (current.isApproved && (cambiaTexto || cambiaCampana)) Object.assign(updates, SIN_APROBACION);

    // Save current content as a version before updating
    if (updates.content && updates.content !== current.content) {
      const versions = Array.isArray(current.previousVersions)
        ? (current.previousVersions as any[])
        : [];
      const newVersion = {
        content: current.content,
        charCount: current.charCount,
        editedAt: new Date().toISOString(),
      };
      updates.previousVersions = [...versions, newVersion].slice(-10);
    }

    const variation = await prisma.savedVariation.update({ where: { id }, data: updates });
    res.json(variation);
  } catch (error) {
    handleTenantError(error, res, 'Error al actualizar contenido');
  }
};

export const deleteVariation = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await assertVariationInWorkspace(req.tenant!, id);
    await prisma.savedVariation.delete({ where: { id } });
    res.json({ message: 'Contenido eliminado' });
  } catch (error) {
    handleTenantError(error, res, 'Error al eliminar contenido');
  }
};

export const bulkDeleteSaved = async (req: AuthRequest, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids debe ser un array no vacío' });
  }
  try {
    const owned = await filterVariationsInWorkspace(req.tenant!, ids);
    await prisma.savedVariation.deleteMany({ where: { id: { in: owned } } });
    res.json({ success: true, deleted: owned.length, skipped: ids.length - owned.length });
  } catch (error) {
    handleTenantError(error, res, 'Error al eliminar contenidos');
  }
};

// ------------------------------------------------------------------ proyectos

const INCLUDE_CAMPANA = { responsable: { select: { id: true, name: true, email: true } }, workspace: SELECT_APROBADORES.workspace } as const;

/** La campaña con quiénes la aprueban (responsable y función Aprobación en Equipo), sin el workspace que se leyó para eso. */
const presentarCampana = <T extends { workspace?: unknown } & Parameters<typeof quienesAprueban>[0]>(p: T) => {
  const { workspace: _w, ...campana } = p;
  return { ...campana, aprueban: quienesAprueban(p) };
};

/**
 * Las campañas. Con `?clientId=` solo las de esa marca —más las viejas sin
 * marca que tienen copy suyo, que la migración no pudo asignar.
 */
export const getProjects = async (req: AuthRequest, res: Response) => {
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
  try {
    const projects = await prisma.project.findMany({
      where: {
        workspaceId: req.tenant!.workspaceId,
        ...(clientId && {
          OR: [{ clientId }, { clientId: null, variations: { some: { clientId } } }],
        }),
      },
      include: INCLUDE_CAMPANA,
      orderBy: { createdAt: 'desc' },
    });
    res.json(projects.map(presentarCampana));
  } catch (error) {
    handleTenantError(error, res, 'Error al obtener las campañas');
  }
};

/** La campaña de un brief: la crea la primera vez que alguien la pide. */
export const getCampanaDeBrief = async (req: AuthRequest, res: Response) => {
  try {
    res.json(await campanaDeBrief(req.tenant!, req.params.dnaProfileId));
  } catch (error) {
    handleTenantError(error, res, 'Error al obtener la campaña');
  }
};

export const createProject = async (req: AuthRequest, res: Response) => {
  const { name, clientId } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    if (clientId) await assertClientInWorkspace(req.tenant!, clientId);
    const project = await prisma.project.create({
      data: { name: name.trim(), workspaceId: req.tenant!.workspaceId, clientId: clientId || null },
      include: INCLUDE_CAMPANA,
    });
    res.status(201).json(presentarCampana(project));
  } catch (error) {
    handleTenantError(error, res, 'Error al crear la campaña');
  }
};

/**
 * Lo editable de una campaña: cómo se aprueba y quién responde. Con lista
 * blanca explícita: el body no puede reasignar `workspaceId` ni `clientId`.
 *
 * `pideAprobacionDeCliente` ya no se escribe: si el cliente ve también el arte
 * lo dice el modo de la campaña (docs/plan-produccion-con-responsable.md). Era
 * un interruptor suelto que cualquiera cambiaba desde la columna Lista.
 *
 * El modo y el responsable los decide quien administra: son la regla bajo la
 * que se aprueba, y quien aprueba no puede elegirse a sí mismo.
 */
export const updateProject = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { modoAprobacion, responsableId } = req.body ?? {};
  const data: Record<string, unknown> = {};
  try {
    const tenant = req.tenant!;
    if (modoAprobacion !== undefined || responsableId !== undefined) {
      if (!canManage(tenant.role))
        return res.status(403).json({ error: 'Cómo se aprueba una campaña lo decide quien administra' });
      if (modoAprobacion !== undefined) {
        if (!Object.values(ModoAprobacion).includes(modoAprobacion))
          return res.status(400).json({ error: 'modoAprobacion tiene que ser INTERNA o CLIENTE' });
        data.modoAprobacion = modoAprobacion;
      }
      if (responsableId !== undefined) {
        if (responsableId !== null) {
          await assertMemberOfWorkspace(tenant, responsableId);
          // Solo quien tiene la función Aprobación (o cualquiera, si nadie la tiene todavía).
          const campana = await assertProjectInWorkspace(tenant, id);
          await exigirElegible(tenant.workspaceId, campana.clientId, responsableId);
        }
        data.responsableId = responsableId;
      }
    }
    if (!Object.keys(data).length) return res.status(400).json({ error: 'No hay nada que cambiar' });

    await assertProjectInWorkspace(tenant, id);
    const project = await prisma.project.update({ where: { id }, data, include: INCLUDE_CAMPANA });
    res.json(presentarCampana(project));
  } catch (error) {
    handleTenantError(error, res, 'Error al actualizar la campaña');
  }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await assertProjectInWorkspace(req.tenant!, id);
    await prisma.project.delete({ where: { id } });
    res.json({ message: 'Proyecto eliminado' });
  } catch (error) {
    handleTenantError(error, res, 'Error al eliminar proyecto');
  }
};

// ------------------------------------------------------------------- feedback

/**
 * El feedback negativo entra al contexto de generación de la marca, así que un
 * clientId sin verificar permitía envenenar los prompts de otro tenant.
 */
export const saveNegativeFeedback = async (req: AuthRequest, res: Response) => {
  const { clientId, platform, content, reason } = req.body;
  if (!clientId || !content || !reason) {
    return res.status(400).json({ error: 'clientId, content y reason son obligatorios' });
  }
  try {
    await assertClientInWorkspace(req.tenant!, clientId);
    const entry = await prisma.negativeFeedback.create({
      data: { clientId, platform: platform || '', content, reason },
    });
    res.status(201).json(entry);
  } catch (error) {
    handleTenantError(error, res, 'Error al guardar feedback negativo');
  }
};

/**
 * «Juntar en un anuncio» (2026-11-24): el copy aprobado de antes de las piezas (sin `conjuntoId`) de un canal sin
 * arte —búsqueda de Google Ads, WhatsApp, push— no pasa solo a Implementación, porque nadie sabe qué textos van
 * juntos. Quien aprueba la campaña o quien administra elige los textos de un anuncio y les pone un mismo
 * `conjuntoId`: desde ahí pasan solos, como el copy nuevo. No cambia la aprobación ni el texto.
 */
export const juntarEnUnAnuncio = async (req: AuthRequest, res: Response) => {
  try {
    const tenant = req.tenant!;
    const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids.filter((x: unknown): x is string => typeof x === 'string') : [];
    if (!ids.length || ids.length > 50) return res.status(400).json({ error: 'Elige entre 1 y 50 textos' });
    const textos = await prisma.savedVariation.findMany({
      where: { id: { in: ids }, client: { workspaceId: tenant.workspaceId } },
      select: { id: true, clientId: true, projectId: true, platform: true, conjuntoId: true, isApproved: true },
    });
    // Lo de otra empresa no existe para esta: 404, no 403.
    if (textos.length !== new Set(ids).size) return res.status(404).json({ error: 'Copy no encontrado' });
    const [primero] = textos;
    if (textos.some(t => t.clientId !== primero.clientId || t.projectId !== primero.projectId || t.platform !== primero.platform))
      return res.status(400).json({ error: 'Un anuncio es de un solo canal y una sola campaña' });
    if (!primero.projectId) return res.status(400).json({ error: 'El copy no tiene campaña' });
    if (producePieza(primero.platform)) return res.status(400).json({ error: 'Este canal lleva arte: se manda a producción' });
    if (textos.some(t => t.conjuntoId)) return res.status(409).json({ error: 'Alguno ya es parte de un anuncio' });
    if (textos.some(t => !t.isApproved)) return res.status(409).json({ error: 'Junta solo copy aprobado' });
    const campana = await prisma.project.findFirst({ where: { id: primero.projectId, workspaceId: tenant.workspaceId }, select: SELECT_APROBADORES });
    if (!canManage(tenant.role) && !apruebaLaCampana(tenant.userId, campana))
      return res.status(403).json({ error: 'Lo junta quien aprueba la campaña o quien administra' });
    const conjuntoId = randomUUID();
    // `conjuntoId: null` en el where: si otro lo juntó mientras tanto, no se pisa.
    const { count } = await prisma.savedVariation.updateMany({ where: { id: { in: ids }, conjuntoId: null }, data: { conjuntoId } });
    if (count !== ids.length) return res.status(409).json({ error: 'Alguno ya es parte de un anuncio' });
    res.json({ conjuntoId, textos: count });
  } catch (error) {
    handleTenantError(error, res, 'Error al juntar el copy en un anuncio');
  }
};
