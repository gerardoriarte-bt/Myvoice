
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { Prisma } from '@prisma/client';
import path from 'node:path';
import fs from 'node:fs/promises';
import { extractBrandFromPdf } from '../services/brandExtractionService.js';
import { computeBrandFingerprint } from '../services/voiceFingerprintService.js';
import { serverAIConfig } from '../services/aiClient.js';
import { prisma } from '../lib/prisma.js';
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

// Get all clients (or current client if restricted)
export const getClients = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  try {
    const clients = await prisma.client.findMany({
      where: {
        workspaceId: user?.workspaceId,
        ...(user?.role === 'CLIENT' ? { id: user.clientId! } : {})
      },
      include: { dnaProfiles: true }
    });
    res.json(clients);
  } catch (error) {
    console.error('getClients error:', error);
    res.status(500).json({ error: 'Error al obtener marcas' });
  }
};

export const createClient = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { name, industry, logoUrl, logo, voice, brandVoiceGuidelines, valueProposition } = req.body;
  try {
    const client = await prisma.client.create({
      data: { 
        workspaceId: user?.workspaceId,
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

export const uploadBrandGuideline = async (req: AuthRequest & { file?: Express.Multer.File }, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  try {
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return res.status(404).json({ error: 'Marca no encontrada' });
    if (client.workspaceId && client.workspaceId !== user?.workspaceId) {
      return res.status(403).json({ error: 'Sin permiso sobre esta marca' });
    }
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo PDF' });

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const safeName = `${id}-${Date.now()}.pdf`;
    const fullPath = path.join(UPLOAD_DIR, safeName);
    await fs.writeFile(fullPath, req.file.buffer);
    const publicUrl = `/uploads/${safeName}`;

    const extracted = await extractBrandFromPdf(req.file.buffer, client.name, client.industry, serverAIConfig());

    const updated = await prisma.client.update({
      where: { id },
      data: {
        brandGuidelinePdfUrl: publicUrl,
        brandGuidelineFileName: req.file.originalname,
        brandGuidelineExtractedAt: new Date(),
        voice: extracted.voice || client.voice,
        valueProposition: extracted.valueProposition || client.valueProposition,
        brandVoiceGuidelines: extracted.brandVoiceGuidelines || client.brandVoiceGuidelines,
        brandKeywords: extracted.keywords || client.brandKeywords,
        brandProhibitions: extracted.prohibitions || client.brandProhibitions,
      },
    });

    res.json({ client: updated, extracted });
  } catch (error: any) {
    console.error('uploadBrandGuideline error:', error);
    res.status(500).json({ error: error?.message || 'Error procesando el PDF' });
  }
};

export const computeFingerprint = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  try {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        dnaProfiles: { select: { feedbackExamples: true } },
        variations: { where: { isApproved: true }, select: { content: true }, take: 50 },
      },
    });
    if (!client) return res.status(404).json({ error: 'Marca no encontrada' });
    if (client.workspaceId && client.workspaceId !== user?.workspaceId) {
      return res.status(403).json({ error: 'Sin permiso sobre esta marca' });
    }

    const profileExamples = client.dnaProfiles.flatMap((p: any) => {
      const examples = (p.feedbackExamples || []) as { platform?: string; content?: string }[];
      return examples.map(e => e.content).filter((c): c is string => !!c);
    });
    const approvedExamples = client.variations.map(v => v.content).filter(Boolean);
    const allTexts = [...approvedExamples, ...profileExamples].filter(Boolean);

    if (allTexts.length < 3) {
      return res.status(400).json({
        error: `Se necesitan al menos 3 ejemplos aprobados o de few-shot para calcular el fingerprint. Hay ${allTexts.length}.`,
      });
    }

    const fingerprint = await computeBrandFingerprint(allTexts, serverAIConfig());
    const updated = await prisma.client.update({
      where: { id },
      data: {
        brandFingerprint: fingerprint as any,
        brandFingerprintAt: new Date(),
      },
    });
    res.json({ client: updated, fingerprint });
  } catch (error: any) {
    console.error('computeFingerprint error:', error);
    res.status(500).json({ error: error?.message || 'Error calculando fingerprint' });
  }
};

export const duplicateDNAProfile = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const original = await prisma.contentDNAProfile.findUnique({ where: { id } });
    if (!original) return res.status(404).json({ error: 'Campaña no encontrada' });

    const { id: _id, createdAt: _createdAt, feedbackExamples, ...fields } = original;
    const copy = await prisma.contentDNAProfile.create({
      data: {
        ...fields,
        name: `Copia de ${original.name}`,
        feedbackExamples: feedbackExamples ?? Prisma.JsonNull,
      },
    });
    res.status(201).json(copy);
  } catch (error) {
    console.error('duplicateDNAProfile error:', error);
    res.status(500).json({ error: 'Error al duplicar la campaña' });
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

export const getDNAInsights = async (req: AuthRequest, res: Response) => {
  const { id } = req.params; // dna profile id
  try {
    const profile = await prisma.contentDNAProfile.findUnique({ where: { id } });
    if (!profile) return res.status(404).json({ error: "Perfil no encontrado" });
    const clientId = profile.clientId;
    // Fetch approved variations count
    const approvedCount = await prisma.savedVariation.count({ where: { clientId, isApproved: true } });
    // Fetch total saved
    const totalSaved = await prisma.savedVariation.count({ where: { clientId } });
    // Fetch negative feedback
    const negatives = await prisma.negativeFeedback.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, take: 20 });
    const negativeCount = negatives.length;
    // Top rejection reasons (group by reason, top 3)
    const reasonMap: Record<string, number> = {};
    negatives.forEach((n: any) => { const key = n.reason.substring(0, 60); reasonMap[key] = (reasonMap[key] || 0) + 1; });
    const topReasons = Object.entries(reasonMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([reason, count]) => ({ reason, count }));
    // Recent approved sample
    const recentApproved = await prisma.savedVariation.findMany({ where: { clientId, isApproved: true }, orderBy: { savedAt: "desc" }, take: 3, select: { platform: true, content: true } });
    res.json({ approvedCount, totalSaved, negativeCount, topReasons, recentApproved });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener insights" });
  }
};
