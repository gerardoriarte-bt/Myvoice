
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all clients (or current client if restricted)
export const getClients = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  try {
    const clients = await prisma.client.findMany({
      where: user?.role === 'CLIENT' ? { id: user.clientId! } : {},
      include: { dnaProfiles: true }
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener marcas' });
  }
};

export const createClient = async (req: AuthRequest, res: Response) => {
  const { name, industry, logoUrl } = req.body;
  try {
    const client = await prisma.client.create({
      data: { name, industry, logoUrl }
    });
    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la marca' });
  }
};

// DNA Profiles
export const saveDNAProfile = async (req: AuthRequest, res: Response) => {
  const { clientId, ...profileData } = req.body;
  try {
    const profile = await prisma.contentDNAProfile.create({
      data: { ...profileData, clientId }
    });
    res.status(201).json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar perfil de ADN' });
  }
};

export const updateDNAProfile = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const profile = await prisma.contentDNAProfile.update({
      where: { id },
      data: updates
    });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar perfil de ADN' });
  }
};
