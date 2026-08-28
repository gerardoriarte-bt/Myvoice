import { Response } from 'express';
import { AuthRequest, handleTenantError } from '../middleware/auth.js';
import { Prisma } from '@prisma/client';
import { extractBrandFromPdf } from '../services/brandExtractionService.js';
import { computeBrandFingerprint } from '../services/voiceFingerprintService.js';
import { serverAIConfig } from '../services/aiClient.js';
import {
  assertClientInWorkspace,
  assertDnaProfileInWorkspace,
  pickFields,
} from '../lib/tenancy.js';
import { prisma } from '../lib/prisma.js';
import { claveGuiaDeMarca, storage } from '../lib/storage.js';


/**
 * Campos que el cliente puede modificar. El resto del body se descarta: sin
 * esta lista, un `...updates` permitía enviar `workspaceId` y mover la marca a
 * otro tenant. Los límites (`quotaCostUsdOverride`, `quotaTokensOverride`) se
 * quedan afuera a propósito: un miembro no se amplía su propio techo desde el
 * formulario de la marca.
 */
const CLIENT_UPDATABLE = [
  'name',
  'industry',
  'logoUrl',
  'voice',
  'brandVoiceGuidelines',
  'valueProposition',
  'brandKeywords',
  'brandProhibitions',
] as const;

const DNA_UPDATABLE = [
  'name',
  'voice',
  'goal',
  'product',
  'targetAudience',
  'theme',
  'keywords',
  'brandVoiceGuidelines',
  'valueProposition',
  'primaryCTA',
  'prohibitions',
  'campaignConcept',
  'feedbackExamples',
] as const;

/**
 * Todas las marcas del workspace activo. Los miembros de una empresa ven las
 * marcas de su empresa; nunca las de otra, porque el workspace sale de la
 * membresía verificada, no del token ni del email.
 */
export const getClients = async (req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      where: { workspaceId: req.tenant!.workspaceId },
      include: { dnaProfiles: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(clients);
  } catch (error) {
    handleTenantError(error, res, 'Error al obtener marcas');
  }
};

export const createClient = async (req: AuthRequest, res: Response) => {
  const { name, industry, logoUrl, logo, voice, brandVoiceGuidelines, valueProposition } = req.body;
  if (!name || !industry) {
    return res.status(400).json({ error: 'name e industry son obligatorios' });
  }
  try {
    const client = await prisma.client.create({
      data: {
        workspaceId: req.tenant!.workspaceId,
        name,
        industry,
        logoUrl: logoUrl || logo,
        voice,
        brandVoiceGuidelines,
        valueProposition,
      },
    });
    res.status(201).json(client);
  } catch (error) {
    handleTenantError(error, res, 'Error al crear la marca');
  }
};

export const updateClient = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await assertClientInWorkspace(req.tenant!, id);

    const data: Record<string, any> = pickFields(req.body, CLIENT_UPDATABLE);
    // El frontend manda `logo`; la columna es `logoUrl`.
    if (req.body.logo) data.logoUrl = req.body.logo;

    const client = await prisma.client.update({ where: { id }, data });
    res.json(client);
  } catch (error) {
    handleTenantError(error, res, 'Error al actualizar la marca');
  }
};

export const deleteClient = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await assertClientInWorkspace(req.tenant!, id);
    await prisma.client.delete({ where: { id } });
    res.json({ message: 'Marca eliminada con éxito' });
  } catch (error) {
    handleTenantError(error, res, 'Error al eliminar la marca');
  }
};

// ------------------------------------------------------------ DNA Profiles

export const saveDNAProfile = async (req: AuthRequest, res: Response) => {
  const { clientId } = req.body;
  try {
    await assertClientInWorkspace(req.tenant!, clientId);
    const profile = await prisma.contentDNAProfile.create({
      data: { ...(pickFields(req.body, DNA_UPDATABLE) as any), clientId },
    });
    res.status(201).json(profile);
  } catch (error) {
    handleTenantError(error, res, 'Error al guardar perfil de ADN');
  }
};

export const updateDNAProfile = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await assertDnaProfileInWorkspace(req.tenant!, id);
    const profile = await prisma.contentDNAProfile.update({
      where: { id },
      data: pickFields(req.body, DNA_UPDATABLE) as any,
    });
    res.json(profile);
  } catch (error) {
    handleTenantError(error, res, 'Error al actualizar perfil de ADN');
  }
};

export const duplicateDNAProfile = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const original = await assertDnaProfileInWorkspace(req.tenant!, id);
    const { id: _id, createdAt: _createdAt, feedbackExamples, client: _client, ...fields } = original;
    const copy = await prisma.contentDNAProfile.create({
      data: {
        ...fields,
        name: `Copia de ${original.name}`,
        feedbackExamples: feedbackExamples ?? Prisma.JsonNull,
      },
    });
    res.status(201).json(copy);
  } catch (error) {
    handleTenantError(error, res, 'Error al duplicar la campaña');
  }
};

export const deleteDNAProfile = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await assertDnaProfileInWorkspace(req.tenant!, id);
    await prisma.contentDNAProfile.delete({ where: { id } });
    res.json({ message: 'Perfil de ADN eliminado' });
  } catch (error) {
    handleTenantError(error, res, 'Error al eliminar perfil de ADN');
  }
};

export const getDNAInsights = async (req: AuthRequest, res: Response) => {
  const { id } = req.params; // dna profile id
  try {
    const profile = await assertDnaProfileInWorkspace(req.tenant!, id);
    const clientId = profile.clientId;

    const [approvedCount, totalSaved, negatives, recentApproved] = await Promise.all([
      prisma.savedVariation.count({ where: { clientId, isApproved: true } }),
      prisma.savedVariation.count({ where: { clientId } }),
      prisma.negativeFeedback.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.savedVariation.findMany({
        where: { clientId, isApproved: true },
        orderBy: { savedAt: 'desc' },
        take: 3,
        select: { platform: true, content: true },
      }),
    ]);

    const reasonMap: Record<string, number> = {};
    negatives.forEach((n: any) => {
      const key = n.reason.substring(0, 60);
      reasonMap[key] = (reasonMap[key] || 0) + 1;
    });
    const topReasons = Object.entries(reasonMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reason, count]) => ({ reason, count }));

    res.json({ approvedCount, totalSaved, negativeCount: negatives.length, topReasons, recentApproved });
  } catch (error) {
    handleTenantError(error, res, 'Error al obtener insights');
  }
};

// ------------------------------------------------------------- brand assets

export const uploadBrandGuideline = async (
  req: AuthRequest & { file?: Express.Multer.File },
  res: Response
) => {
  const { id } = req.params;
  try {
    const client = await assertClientInWorkspace(req.tenant!, id);
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo PDF' });

    // Dónde termina el archivo lo decide el entorno, no este handler: con
    // S3_BUCKET configurado va al bucket, sin él al disco del contenedor como
    // siempre. Ver lib/storage.ts y docs/plan-e1-almacenamiento.md.
    const clave = await storage().put(claveGuiaDeMarca(id), req.file.buffer, 'application/pdf');
    const publicUrl = await storage().getUrl(clave);

    const extracted = await extractBrandFromPdf(
      req.file.buffer,
      client.name,
      client.industry,
      serverAIConfig()
    );

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
    handleTenantError(error, res, error?.message || 'Error procesando el PDF');
  }
};

export const computeFingerprint = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await assertClientInWorkspace(req.tenant!, id);

    const client = await prisma.client.findUniqueOrThrow({
      where: { id },
      include: {
        dnaProfiles: { select: { feedbackExamples: true } },
        variations: { where: { isApproved: true }, select: { content: true }, take: 50 },
      },
    });

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
      data: { brandFingerprint: fingerprint as any, brandFingerprintAt: new Date() },
    });
    res.json({ client: updated, fingerprint });
  } catch (error: any) {
    handleTenantError(error, res, error?.message || 'Error calculando fingerprint');
  }
};
