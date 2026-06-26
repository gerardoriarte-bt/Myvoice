
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const getSavedVariations = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  try {
    const where = user?.role === 'CLIENT'
      ? { clientId: user.clientId! }
      : { client: { workspaceId: user?.workspaceId } };
    const variations = await prisma.savedVariation.findMany({
      where,
      include: { project: true, client: true },
      orderBy: { savedAt: 'desc' }
    });
    res.json(variations);
  } catch (error) {
    console.error('getSavedVariations error:', error);
    res.status(500).json({ error: 'Error al obtener la biblioteca' });
  }
};

export const saveVariation = async (req: AuthRequest, res: Response) => {
  const { clientId, projectId, platform, type, content, charCount, tags } = req.body;
  try {
    const variation = await prisma.savedVariation.create({
      data: { 
        clientId, 
        projectId: projectId || null, 
        platform, 
        type, 
        content, 
        charCount,
        tags: tags || []
      }
    });
    res.status(201).json(variation);
  } catch (error) {
    console.error('saveVariation error:', error);
    res.status(500).json({ error: 'Error al guardar en la biblioteca' });
  }
};

export const getProjects = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  try {
    const projects = await prisma.project.findMany({
      where: { workspaceId: user?.workspaceId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (error) {
    console.error('getProjects error:', error);
    res.status(500).json({ error: 'Error al obtener proyectos' });
  }
};

export const createProject = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { name } = req.body;
  try {
    const project = await prisma.project.create({
      data: { 
        name,
        workspaceId: user?.workspaceId
      }
    });
    res.status(201).json(project);
  } catch (error) {
    console.error('createProject error:', error);
    res.status(500).json({ error: 'Error al crear proyecto' });
  }
};

export const updateVariation = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { approvalNote, ...rest } = req.body;
  const updates: any = { ...rest };
  if (approvalNote !== undefined) updates.approvalNote = approvalNote;
  try {
    // Save current content as a version before updating
    const current = await prisma.savedVariation.findUnique({ where: { id }, select: { content: true, charCount: true, previousVersions: true } });
    if (current && rest.content && rest.content !== current.content) {
      const versions = Array.isArray(current.previousVersions) ? current.previousVersions as any[] : [];
      const newVersion = { content: current.content, charCount: current.charCount, editedAt: new Date().toISOString() };
      updates.previousVersions = [...versions, newVersion].slice(-10);
    }
    const variation = await prisma.savedVariation.update({
      where: { id },
      data: updates
    });
    res.json(variation);
  } catch (error) {
    console.error('updateVariation error:', error);
    res.status(500).json({ error: 'Error al actualizar contenido' });
  }
};

export const deleteVariation = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.savedVariation.delete({ where: { id } });
    res.json({ message: 'Contenido eliminado' });
  } catch (error) {
    console.error('deleteVariation error:', error);
    res.status(500).json({ error: 'Error al eliminar contenido' });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    // Note: Variations with this projectId will have setNull or cascade depending on schema
    await prisma.project.delete({ where: { id } });
    res.json({ message: 'Proyecto eliminado' });
  } catch (error) {
    console.error('deleteProject error:', error);
    res.status(500).json({ error: 'Error al eliminar proyecto' });
  }
};

export const saveNegativeFeedback = async (req: AuthRequest, res: Response) => {
  const { clientId, platform, content, reason } = req.body;
  if (!clientId || !content || !reason) {
    return res.status(400).json({ error: 'clientId, content y reason son obligatorios' });
  }
  try {
    const entry = await prisma.negativeFeedback.create({
      data: { clientId, platform: platform || '', content, reason }
    });
    res.status(201).json(entry);
  } catch (error) {
    console.error('saveNegativeFeedback error:', error);
    res.status(500).json({ error: 'Error al guardar feedback negativo' });
  }
};

export const bulkDeleteSaved = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids debe ser un array no vacío' });
  }
  try {
    if (user?.role === 'ADMIN') {
      await prisma.savedVariation.deleteMany({
        where: {
          id: { in: ids },
          client: { workspaceId: user.workspaceId },
        },
      });
    } else {
      await prisma.savedVariation.deleteMany({
        where: {
          id: { in: ids },
          clientId: user?.clientId!,
        },
      });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('bulkDeleteSaved error:', error);
    res.status(500).json({ error: 'Error al eliminar contenidos' });
  }
};
