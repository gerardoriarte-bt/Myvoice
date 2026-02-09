
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSavedVariations = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  try {
    const variations = await prisma.savedVariation.findMany({
      where: user?.role === 'CLIENT' ? { clientId: user.clientId! } : {},
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
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (error) {
    console.error('getProjects error:', error);
    res.status(500).json({ error: 'Error al obtener proyectos' });
  }
};

export const createProject = async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  try {
    const project = await prisma.project.create({
      data: { name }
    });
    res.status(201).json(project);
  } catch (error) {
    console.error('createProject error:', error);
    res.status(500).json({ error: 'Error al crear proyecto' });
  }
};

export const updateVariation = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  try {
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
