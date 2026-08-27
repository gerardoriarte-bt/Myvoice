import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import {
  assertClientInWorkspace,
  assertProjectInWorkspace,
  assertVariationInWorkspace,
  filterVariationsInWorkspace,
  pickFields,
} from '../lib/tenancy.js';
import { prisma } from '../lib/prisma.js';
import { resolveSlotLabel } from '../channels/registry.js';

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
const VARIATION_UPDATABLE = [
  'content',
  'charCount',
  'tags',
  'isApproved',
  'approvalNote',
  'projectId',
  'type',
] as const;

export const getSavedVariations = async (req: AuthRequest, res: Response) => {
  try {
    const variations = await prisma.savedVariation.findMany({
      where: { client: { workspaceId: req.tenant!.workspaceId } },
      include: { project: true, client: true },
      orderBy: { savedAt: 'desc' },
    });
    res.json(variations);
  } catch (error) {
    handleTenantError(error, res, 'Error al obtener la biblioteca');
  }
};

export const saveVariation = async (req: AuthRequest, res: Response) => {
  // `slotLabel` NO se lee del body: la etiqueta la resuelve el servidor contra el registry.
  const { clientId, projectId, platform, type, content, charCount, tags, slot, variationIndex } =
    req.body;
  try {
    const tenant = req.tenant!;
    await assertClientInWorkspace(tenant, clientId);
    if (projectId) await assertProjectInWorkspace(tenant, projectId);

    // El slot es procedencia, no contenido: se guarda tal como lo emitió el writer. Un slot
    // que no pertenece al canal se guarda igual con slotLabel null — perder el guardado del
    // usuario por un spec desactualizado es peor que un label vacío, y
    // `slotLabel IS NULL AND slot IS NOT NULL` detecta el caso desde SQL.
    const slotId = typeof slot === 'string' && slot.trim() ? slot.trim().slice(0, 64) : null;
    const index = Number.isInteger(variationIndex) && variationIndex >= 1 ? variationIndex : null;

    const variation = await prisma.savedVariation.create({
      data: {
        clientId,
        projectId: projectId || null,
        platform,
        type,
        content,
        charCount,
        tags: tags || [],
        slot: slotId,
        slotLabel: resolveSlotLabel(platform, slotId),
        variationIndex: index,
      },
    });
    res.status(201).json(variation);
  } catch (error) {
    handleTenantError(error, res, 'Error al guardar en la biblioteca');
  }
};

export const updateVariation = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const tenant = req.tenant!;
    const current = await assertVariationInWorkspace(tenant, id);

    const updates: Record<string, any> = pickFields(req.body, VARIATION_UPDATABLE);
    if (updates.projectId) await assertProjectInWorkspace(tenant, updates.projectId);

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

export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      where: { workspaceId: req.tenant!.workspaceId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(projects);
  } catch (error) {
    handleTenantError(error, res, 'Error al obtener proyectos');
  }
};

export const createProject = async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    const project = await prisma.project.create({
      data: { name: name.trim(), workspaceId: req.tenant!.workspaceId },
    });
    res.status(201).json(project);
  } catch (error) {
    handleTenantError(error, res, 'Error al crear proyecto');
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
