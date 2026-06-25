import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const listPresets = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  try {
    const presets = await prisma.generationPreset.findMany({
      where: { workspaceId: user?.workspaceId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(presets);
  } catch (error) {
    console.error('listPresets error:', error);
    res.status(500).json({ error: 'Error al obtener los presets' });
  }
};

export const createPreset = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { name, clientId, parameters } = req.body;
  if (!name || !parameters) {
    return res.status(400).json({ error: 'name y parameters son obligatorios' });
  }
  try {
    const preset = await prisma.generationPreset.create({
      data: {
        name,
        clientId: clientId || null,
        parameters,
        workspaceId: user?.workspaceId,
      },
    });
    res.status(201).json(preset);
  } catch (error) {
    console.error('createPreset error:', error);
    res.status(500).json({ error: 'Error al crear el preset' });
  }
};

export const deletePreset = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;
  try {
    const preset = await prisma.generationPreset.findUnique({ where: { id } });
    if (!preset) {
      return res.status(404).json({ error: 'Preset no encontrado' });
    }
    if (preset.workspaceId !== user?.workspaceId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este preset' });
    }
    await prisma.generationPreset.delete({ where: { id } });
    res.json({ message: 'Preset eliminado' });
  } catch (error) {
    console.error('deletePreset error:', error);
    res.status(500).json({ error: 'Error al eliminar el preset' });
  }
};
