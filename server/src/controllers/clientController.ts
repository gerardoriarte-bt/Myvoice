
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
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
    console.error('getClients error:', error);
    res.status(500).json({ error: 'Error al obtener marcas' });
  }
};

export const createClient = async (req: AuthRequest, res: Response) => {
  const { name, industry, logoUrl, logo, voice, brandVoiceGuidelines, valueProposition } = req.body;
  try {
    const client = await prisma.client.create({
      data: { 
        name, 
        industry, 
        logoUrl: logoUrl || logo,
        voice,
        brandVoiceGuidelines,
        valueProposition
      }
    });
    res.status(201).json(client);
  } catch (error) {
    console.error('createClient error:', error);
    res.status(500).json({ error: 'Error al crear la marca' });
  }
};

export const updateClient = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { logo, ...updates } = req.body;
  
  // Handle logo/logoUrl mismatch from frontend
  const data = { ...updates };
  if (logo) data.logoUrl = logo;

  try {
    const client = await prisma.client.update({
      where: { id },
      data
    });
    res.json(client);
  } catch (error) {
    console.error('updateClient error:', error);
    res.status(500).json({ error: 'Error al actualizar la marca' });
  }
};

export const deleteClient = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    // Delete related DNA profiles first if needed, though Prisma might handle it if cascading is set
    await prisma.client.delete({
      where: { id }
    });
    res.json({ message: 'Marca eliminada con éxito' });
  } catch (error) {
    console.error('deleteClient error:', error);
    res.status(500).json({ error: 'Error al eliminar la marca' });
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
    console.error('saveDNAProfile error:', error);
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
    console.error('updateDNAProfile error:', error);
    res.status(500).json({ error: 'Error al actualizar perfil de ADN' });
  }
};

export const deleteDNAProfile = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.contentDNAProfile.delete({
      where: { id }
    });
    res.json({ message: 'Perfil de ADN eliminado' });
  } catch (error) {
    console.error('deleteDNAProfile error:', error);
    res.status(500).json({ error: 'Error al eliminar perfil de ADN' });
  }
};
