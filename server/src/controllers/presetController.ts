import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { assertClientInWorkspace, assertPresetInWorkspace } from '../lib/tenancy.js';
import { prisma } from '../lib/prisma.js';

export const listPresets = async (req: AuthRequest, res: Response) => {
  try {
    const presets = await prisma.generationPreset.findMany({
      where: { workspaceId: req.tenant!.workspaceId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(presets);
  } catch (error) {
    console.error('listPresets error:', error);
    res.status(500).json({ error: 'Error al obtener los presets' });
  }
};

export const createPreset = async (req: AuthRequest, res: Response) => {
  const { name, clientId, parameters } = req.body;
  if (!name || !parameters) {
    return res.status(400).json({ error: 'name y parameters son obligatorios' });
  }
  try {
    const tenant = req.tenant!;
    if (clientId) await assertClientInWorkspace(tenant, clientId);

    const preset = await prisma.generationPreset.create({
      data: {
        name,
        clientId: clientId || null,
        parameters,
        workspaceId: tenant.workspaceId,
      },
    });
    res.status(201).json(preset);
  } catch (error) {
    handleTenantError(error, res, 'Error al crear el preset');
  }
};

export const deletePreset = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await assertPresetInWorkspace(req.tenant!, id);
    await prisma.generationPreset.delete({ where: { id } });
    res.json({ message: 'Preset eliminado' });
  } catch (error) {
    handleTenantError(error, res, 'Error al eliminar el preset');
  }
};
