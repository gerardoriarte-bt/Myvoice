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
  TenantContext,
  TenantError,
} from '../lib/tenancy.js';
import { normalizarNombre } from '../lib/nombreDeMarca.js';
import { unirMarcas } from '../services/unirMarcas.js';
import { prisma } from '../lib/prisma.js';
import { claveGuiaDeMarca, storage } from '../lib/storage.js';
import { guardarAdnDesdeColumnas } from '../comun/adn/guardarAdn.js';
import { resolverAdn } from '../comun/adn/resolverAdn.js';
import { COLUMNAS_ADN, SECCIONES_ADN } from '../comun/adn/secciones.js';
import { esTratamiento } from '../comun/adn/tratamiento.js';
import { avisarAdnPorRevisar, confirmarAdn, estadoDeRevision, revisarSeccion } from '../comun/adn/revisionAdn.js';


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
/**
 * `Client.brandGuidelinePdfUrl` guarda la CLAVE del objeto, no una URL: una URL
 * firmada vence, y guardar algo que caduca es guardar basura. La URL se arma
 * acá, al leer, y solo para quien ya pasó el filtro de workspace.
 *
 * Las filas anteriores a E1 guardan `/uploads/...`, que ya es una ruta servible:
 * se devuelven tal cual hasta que el script de migración las convierta.
 */
const conUrlDeGuia = async <T extends { brandGuidelinePdfUrl: string | null }>(cliente: T): Promise<T> => {
  const guardado = cliente.brandGuidelinePdfUrl;
  if (!guardado || guardado.startsWith('/uploads/') || guardado.startsWith('http')) return cliente;
  return { ...cliente, brandGuidelinePdfUrl: await storage().getUrl(guardado) };
};

export const getClients = async (req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      where: { workspaceId: req.tenant!.workspaceId },
      include: { dnaProfiles: true, seccionesAdn: { select: { revisadaEn: true } } },
      orderBy: { createdAt: 'asc' },
    });
    // Una madre con submarcas y el ADN sin confirmar pide revisión (docs/plan-revision-adn.md).
    const conRevision = conRelaciones(clients).map(({ seccionesAdn, ...m }) => ({
      ...m,
      adnPorRevisar:
        m.conteos.complementarias > 0 && !m.adnConfirmadoEn
          ? { revisadas: seccionesAdn.filter(s => s.revisadaEn).length, total: SECCIONES_ADN.length }
          : null,
    }));
    res.json(await Promise.all(conRevision.map(conUrlDeGuia)));
  } catch (error) {
    handleTenantError(error, res, 'Error al obtener marcas');
  }
};

/**
 * Lo que la pantalla necesita para notar marcas relacionadas, calculado al
 * leer y no guardado (docs/plan-marcas-relacionadas.md): con quién comparte
 * nombre —el aviso no tiene estado propio, así que no puede quedar desfasado
 * del nombre ni hay nada que descartar— y lo que distingue a cada una.
 * Se calcula sobre la lista del workspace, nunca entre workspaces.
 */
const conRelaciones = <T extends { id: string; name: string; marcaMadreId: string | null; dnaProfiles: unknown[] }>(
  marcas: T[]
) => {
  const porNombre = new Map<string, string[]>();
  for (const m of marcas) {
    const clave = normalizarNombre(m.name);
    porNombre.set(clave, [...(porNombre.get(clave) ?? []), m.id]);
  }
  return marcas.map(m => ({
    ...m,
    nombreRepetidoCon: (porNombre.get(normalizarNombre(m.name)) ?? []).filter(id => id !== m.id),
    conteos: {
      campanas: m.dnaProfiles.length,
      complementarias: marcas.filter(o => o.marcaMadreId === m.id).length,
    },
  }));
};

/**
 * Valida una marca madre antes de escribirla. `marcaId` es null al crear.
 *
 * Un solo nivel, en las dos direcciones: la madre no puede ser complementaria
 * de otra, y una marca que ya tiene complementarias no puede pasar a ser
 * complementaria. Una madre de otro workspace es 404, como cualquier id ajeno.
 */
const validarMadre = async (tenant: TenantContext, marcaId: string | null, madreId: string) => {
  if (marcaId && madreId === marcaId) throw new TenantError('Una marca no puede ser parte de sí misma', 400);
  const madre = await assertClientInWorkspace(tenant, madreId);
  if (madre.marcaMadreId)
    throw new TenantError(`«${madre.name}» ya es submarca de otra: una submarca no tiene submarcas`, 400);
  if (marcaId) {
    const hijas = await prisma.client.count({ where: { marcaMadreId: marcaId } });
    if (hijas > 0)
      throw new TenantError(
        `Esta marca tiene ${hijas === 1 ? 'una submarca' : `${hijas} submarcas`}, así que no puede ser submarca de otra`,
        400
      );
  }
};

/** `marcaMadreId` del body: undefined = no tocar, null o '' = soltar, string = validar. */
const madreDelBody = (body: any): string | null | undefined => {
  if (!body || !('marcaMadreId' in body)) return undefined;
  const v = body.marcaMadreId;
  if (v === null || v === '') return null;
  if (typeof v !== 'string') throw new TenantError('marcaMadreId tiene que ser un id o null', 400);
  return v;
};

export const createClient = async (req: AuthRequest, res: Response) => {
  const { name, industry, logoUrl, logo, voice, brandVoiceGuidelines, valueProposition } = req.body;
  if (!name || !industry) {
    return res.status(400).json({ error: 'name e industry son obligatorios' });
  }
  try {
    const marcaMadreId = madreDelBody(req.body);
    if (marcaMadreId) await validarMadre(req.tenant!, null, marcaMadreId);
    const client = await prisma.$transaction(async tx => {
      const creada = await tx.client.create({
        data: {
          marcaMadreId: marcaMadreId ?? null,
          workspaceId: req.tenant!.workspaceId,
          name,
          industry,
          logoUrl: logoUrl || logo,
          voice,
          brandVoiceGuidelines,
          valueProposition,
        },
      });
      await guardarAdnDesdeColumnas(creada.id, { autorId: req.tenant!.userId, tx });
      return creada;
    });
    // Su madre puede haber tenido recién su primera submarca: pide revisar su ADN.
    if (client.marcaMadreId)
      avisarAdnPorRevisar({ clientId: client.marcaMadreId }).catch(e => console.error('[adn] aviso:', e));
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
    // El tratamiento tampoco: es un enum, y un valor que no existe es un 400, no un 500 de Prisma.
    if (req.body && 'tratamiento' in req.body) {
      const t = req.body.tratamiento;
      if (t !== null && t !== '' && !esTratamiento(t))
        throw new TenantError('El tratamiento tiene que ser TU, VOS o USTED', 400);
      data.tratamiento = t || null;
    }
    // La marca madre no va por la lista blanca: se valida antes de escribirla.
    const marcaMadreId = madreDelBody(req.body);
    if (marcaMadreId) await validarMadre(req.tenant!, id, marcaMadreId);
    if (marcaMadreId !== undefined) data.marcaMadreId = marcaMadreId;

    // Si cambia el ADN o la familia, las secciones y su versión cambian en la misma transacción.
    const tocaAdn = marcaMadreId !== undefined || COLUMNAS_ADN.some(c => c in data);
    const client = await prisma.$transaction(async tx => {
      const actualizada = await tx.client.update({ where: { id }, data });
      if (tocaAdn)
        await guardarAdnDesdeColumnas(id, {
          motivo: marcaMadreId !== undefined ? 'familia' : 'adn',
          autorId: req.tenant!.userId,
          tx,
        });
      return actualizada;
    });
    if (marcaMadreId)
      avisarAdnPorRevisar({ clientId: marcaMadreId }).catch(e => console.error('[adn] aviso:', e));
    res.json(await conUrlDeGuia(client));
  } catch (error) {
    handleTenantError(error, res, 'Error al actualizar la marca');
  }
};

export const deleteClient = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await assertClientInWorkspace(req.tenant!, id);
    await prisma.$transaction(async tx => {
      // Sus submarcas quedan sueltas (onDelete: SetNull): dejan de heredar, y eso es una versión nueva.
      const submarcas = await tx.client.findMany({ where: { marcaMadreId: id }, select: { id: true } });
      await tx.client.delete({ where: { id } });
      for (const sub of submarcas)
        await guardarAdnDesdeColumnas(sub.id, { motivo: 'familia', autorId: req.tenant!.userId, tx });
    });
    res.json({ message: 'Marca eliminada con éxito' });
  } catch (error) {
    handleTenantError(error, res, 'Error al eliminar la marca');
  }
};

/**
 * El ADN de la marca resuelto con el de su madre, con el origen de cada sección (decisión 16). Es lo
 * mismo que recibe el motor. `?version=N` resuelve una versión guardada.
 */
export const getAdnResuelto = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await assertClientInWorkspace(req.tenant!, id);
    const version = req.query.version != null ? Number(req.query.version) : null;
    if (version != null && (!Number.isInteger(version) || version < 1))
      return res.status(400).json({ error: 'version tiene que ser un entero positivo' });
    res.json(await resolverAdn(id, { version }));
  } catch (error) {
    handleTenantError(error, res, 'Error al resolver el ADN');
  }
};

/** La revisión del ADN antes de que lo hereden las submarcas (docs/plan-revision-adn.md). */
export const getRevisionAdn = async (req: AuthRequest, res: Response) => {
  try {
    await assertClientInWorkspace(req.tenant!, req.params.id);
    res.json(await estadoDeRevision(req.params.id));
  } catch (error) {
    handleTenantError(error, res, 'Error al leer la revisión del ADN');
  }
};

/** «Está bien» (sin `texto`) o «Corregir» (con `texto`) una sección. */
export const postRevisarSeccion = async (req: AuthRequest, res: Response) => {
  try {
    await assertClientInWorkspace(req.tenant!, req.params.id);
    const texto = req.body && 'texto' in req.body ? req.body.texto : undefined;
    res.json(await revisarSeccion(req.tenant!, req.params.id, req.params.clave, texto));
  } catch (error) {
    handleTenantError(error, res, 'Error al revisar la sección');
  }
};

export const postConfirmarAdn = async (req: AuthRequest, res: Response) => {
  try {
    await assertClientInWorkspace(req.tenant!, req.params.id);
    res.json(await confirmarAdn(req.tenant!, req.params.id));
  } catch (error) {
    handleTenantError(error, res, 'Error al confirmar el ADN');
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

/**
 * Borra la guía de marca: limpia las tres columnas Y el objeto del bucket.
 *
 * Es un endpoint propio y no un campo más de `updateClient` por una razón de
 * seguridad, no de estilo: si `brandGuidelinePdfUrl` entrara en la allow-list,
 * cualquier miembro podría escribir ahí la clave de la guía de OTRA marca y
 * leerla con la URL firmada que el servidor genera al leer. El campo lo escribe
 * el servidor o no lo escribe nadie.
 *
 * Hasta ahora la app mandaba los tres campos por `PUT /clients/:id`, donde
 * `pickFields` los descartaba en silencio: el frontend mostraba el manual
 * borrado y la base lo conservaba. Y el archivo quedaba huérfano en el disco —
 * es el origen de los 53 MB de PDF sin dueño que había en producción.
 */
export const deleteBrandGuideline = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const client = await assertClientInWorkspace(req.tenant!, id);
    const anterior = client.brandGuidelinePdfUrl;

    const updated = await prisma.client.update({
      where: { id },
      data: {
        brandGuidelinePdfUrl: null,
        brandGuidelineFileName: null,
        brandGuidelineExtractedAt: null,
      },
    });

    // El archivo se borra DESPUÉS de que la base dejó de apuntarlo: si esto
    // falla, queda un objeto huérfano —basura— y no una fila que apunta a algo
    // que ya no existe. El ADN extraído no se toca: es lo que alimenta al motor
    // y borrar la guía no debería vaciar la marca.
    if (anterior && !anterior.startsWith('/uploads/') && !anterior.startsWith('http')) {
      await storage().delete(anterior).catch(err => {
        console.warn(`[storage] no se pudo borrar la guía ${anterior}: ${err?.message}`);
      });
    }

    res.json(updated);
  } catch (error) {
    handleTenantError(error, res, 'Error al eliminar el manual de marca');
  }
};

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
    // Una marca, un archivo. Sin esto cada resubida deja el objeto anterior
    // huérfano en el bucket para siempre: la acumulación no es un PDF por marca
    // sino todas las versiones que alguna vez se subieron. Se borra DESPUÉS de
    // subir la nueva, y solo si la anterior era una clave nuestra —las filas
    // previas a E1 guardan una ruta /uploads/... que el driver no sabe borrar.
    const anterior = client.brandGuidelinePdfUrl;
    const clave = await storage().put(claveGuiaDeMarca(id), req.file.buffer, 'application/pdf');
    if (anterior && !anterior.startsWith('/uploads/') && !anterior.startsWith('http')) {
      await storage().delete(anterior).catch(err => {
        // Un archivo viejo que no se pudo borrar es basura, no un error: la
        // guía nueva ya está arriba y la fila se va a actualizar igual.
        console.warn(`[storage] no se pudo borrar la guía anterior ${anterior}: ${err?.message}`);
      });
    }

    const extracted = await extractBrandFromPdf(
      req.file.buffer,
      client.name,
      client.industry,
      serverAIConfig()
    );

    const updated = await prisma.$transaction(async tx => {
      const actualizada = await tx.client.update({
        where: { id },
        data: {
          brandGuidelinePdfUrl: clave,
          brandGuidelineFileName: req.file!.originalname,
          brandGuidelineExtractedAt: new Date(),
          voice: extracted.voice || client.voice,
          valueProposition: extracted.valueProposition || client.valueProposition,
          brandVoiceGuidelines: extracted.brandVoiceGuidelines || client.brandVoiceGuidelines,
          brandKeywords: extracted.keywords || client.brandKeywords,
          brandProhibitions: extracted.prohibitions || client.brandProhibitions,
        },
      });
      await guardarAdnDesdeColumnas(id, { autorId: req.tenant!.userId, tx });
      return actualizada;
    });

    res.json({ client: await conUrlDeGuia(updated), extracted });
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
    res.json({ client: await conUrlDeGuia(updated), fingerprint });
  } catch (error: any) {
    handleTenantError(error, res, error?.message || 'Error calculando fingerprint');
  }
};

/**
 * Une la marca `:id` con `destinoId`: todo pasa al destino y `:id` se borra.
 * Ver services/unirMarcas.ts. No se puede deshacer; la pantalla lo dice.
 */
export const unirConOtra = async (req: AuthRequest, res: Response) => {
  try {
    res.json(await unirMarcas(req.tenant!, req.params.id, req.body?.destinoId));
  } catch (error) {
    handleTenantError(error, res, 'Error al fusionar las marcas');
  }
};
