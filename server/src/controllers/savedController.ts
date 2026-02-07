
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
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
    res.status(500).json({ error: 'Error al obtener la biblioteca' });
  }
};

export const saveVariation = async (req: AuthRequest, res: Response) => {
  const { clientId, projectId, platform, type, content, charCount } = req.body;
  try {
    const variation = await prisma.savedVariation.create({
      data: { clientId, projectId, platform, type, content, charCount }
    });
    res.status(201).json(variation);
  } catch (error) {
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
    res.status(500).json({ error: 'Error al crear proyecto' });
  }
};
