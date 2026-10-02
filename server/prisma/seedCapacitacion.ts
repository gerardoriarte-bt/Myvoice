/**
 * Workspace de capacitación: LoBueno, con el flujo entero ya recorrido a medias.
 *
 *   CAPACITACION_PASSWORD=... npm run seed:capacitacion
 *
 * Existe para mostrar la herramienta de punta a punta sin que quien capacita
 * tenga que fabricar el estado a mano antes de cada sesión. Cada etapa queda
 * con trabajo hecho —para mostrar cómo se ve— y con una acción pendiente —para
 * hacerla en vivo—. El guion que recorre todo está en `docs/capacitacion-lobueno.md`.
 *
 * **Es un reset, no un upsert.** Cada corrida borra el workspace
 * `lobueno-capacitacion` completo y lo vuelve a armar, con las fechas corridas a
 * «hoy». Así, después de una sesión en la que se aprobó, devolvió y subió de
 * todo, se corre otra vez y la próxima arranca igual. No toca ningún otro
 * workspace: lo único que busca para borrar es ese slug.
 *
 * Los cuatro usuarios viven en un dominio que no es de nadie
 * (`capacitacion.lobueno.co`). Si alguno de esos emails tuviera una membresía
 * en otro workspace, el script se niega: cambiarle la contraseña a una cuenta
 * real sería el peor efecto secundario posible de un seed.
 *
 * Las artes de las piezas se dibujan acá (SVG → PNG con sharp) y se suben con el
 * driver de almacenamiento activo: con `S3_BUCKET` van al bucket, sin él al
 * disco de `server/uploads`. Además deja en `server/capacitacion-artes/` las dos
 * artes que el diseñador sube EN VIVO durante la capacitación.
 *
 * Las fuentes las pone el sistema operativo (librsvg vía fontconfig). En macOS
 * no hace falta nada; la imagen del backend no trae fuentes ni `shared/`, así
 * que en producción no se corre dentro de ella: `deploy/seed-capacitacion.sh`
 * levanta un Node desechable al lado del backend, con fuentes instaladas.
 */
import dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import {
  AuditoriaEstado,
  FuncionEquipo,
  HallazgoDecision,
  HallazgoTipo,
  PiezaEstado,
  PiezaTipo,
  Prisma,
  PrismaClient,
  ReviewDecision,
  RondaRevision,
  ReviewSessionStatus,
  WorkspaceRole,
} from '@prisma/client';
import { initStorage, storage } from '../src/lib/storage.js';
import { esSlotDeInstruccion, getChannelSpec, resolveSlotLabel } from '../src/channels/registry.js';
import {
  LOBUENO_APPROVED_EXAMPLES,
  LOBUENO_BRAND,
  LOBUENO_CHANNEL_COPY,
  LOBUENO_COHERENCE,
  LOBUENO_DNA_PROFILES,
  LOBUENO_NEGATIVE_EXAMPLES,
  LOBUENO_SPINE,
  LobuenoCopyItem,
} from '../../shared/lobuenoBrand.js';

const SLUG = 'lobueno-capacitacion';
const DOMINIO = 'capacitacion.lobueno.co';
const DIR_ARTES = path.resolve(process.cwd(), 'capacitacion-artes');

// ------------------------------------------------------------------ el reloj

/** Todo se fecha relativo a la corrida: la capacitación siempre ocurre «hoy». */
const AHORA = Date.now();
const hace = (dias: number, horas = 0, minutos = 0) =>
  new Date(AHORA - ((dias * 24 + horas) * 60 + minutos) * 60_000);
const dentroDe = (dias: number) => new Date(AHORA + dias * 24 * 60 * 60_000);

const huellaDe = (formato: string, ids: string[]) =>
  createHash('sha256').update([formato, ...[...ids].sort()].join('|')).digest('hex');

// ------------------------------------------------------------------ el equipo

const EQUIPO = [
  { clave: 'laura', nombre: 'Laura Gómez', puesto: 'Dirección de cuentas', rol: WorkspaceRole.OWNER, funcion: FuncionEquipo.APROBACION },
  { clave: 'andres', nombre: 'Andrés Mejía', puesto: 'Redacción', rol: WorkspaceRole.ADMIN, funcion: FuncionEquipo.COPY },
  { clave: 'sofia', nombre: 'Sofía Vargas', puesto: 'Diseño', rol: WorkspaceRole.MEMBER, funcion: FuncionEquipo.DISENO },
  { clave: 'mateo', nombre: 'Mateo Ríos', puesto: 'Diseño', rol: WorkspaceRole.MEMBER, funcion: FuncionEquipo.DISENO },
] as const;

type ClaveEquipo = (typeof EQUIPO)[number]['clave'];

/** Quien revisa desde el portal no tiene cuenta: solo deja su nombre. */
const REVISORA_CLIENTE = 'Natalia Ospina · Mercadeo LoBueno';

// ------------------------------------------------------- campaña 2 (copy nuevo)

/**
 * La segunda campaña sale del brief «El costo del copy genérico». El fixture
 * compartido solo trae copy de la primera, así que este va escrito acá, dentro
 * de los límites reales de cada slot (ver `src/channels/specs/*`).
 */
const SPINE_COSTO = {
  concept: 'El 71% de su copy podría ser de su competencia.',
  keyMessage: 'Bien escrito no es lo mismo que suyo: la voz de una marca se mide, y casi nadie la mide.',
  tone: 'Analítico y sobrio. La cifra hace el trabajo; el texto no la adorna.',
  heroCTA: 'Descargue el estudio',
  angles: [
    { name: 'La cifra', premise: 'El 71% es el titular. Todo lo demás lo explica.', register: 'Dato primero, contexto después, cierre seco' },
    { name: 'El método', premise: 'Cómo se midió: 400 piezas contra el fingerprint de cada marca.', register: 'Primera persona plural, demostrativo' },
  ],
};

const COPY_COSTO: Record<string, LobuenoCopyItem[]> = {
  Email: [
    { slot: 'subject', variationIndex: 1, type: 'La cifra', budget: 50, content: 'El 71% de su copy podría ser de otra marca.', score: 10 },
    { slot: 'subject', variationIndex: 2, type: 'El método', budget: 50, content: 'Medimos 400 piezas. Esto encontramos.', score: 9 },
    { slot: 'preheader', variationIndex: 1, type: 'La cifra', budget: 90, content: 'Un estudio propio sobre cuánto se parecen las marcas cuando escriben con IA genérica.', score: 9 },
    { slot: 'header', variationIndex: 1, type: 'Standard', budget: 80, content: 'Bien escrito no es lo mismo que suyo.', score: 10 },
    {
      slot: 'body', variationIndex: 1, type: 'El método', budget: 600, score: 9,
      content:
        'Tomamos 400 piezas de marcas colombianas escritas con herramientas de IA genéricas y las medimos contra el fingerprint de voz de cada marca.\n\nEl 71% podía atribuirse a cualquier competidor del mismo sector. No tenían errores. Tenían el tono de la categoría, no el de la marca.\n\nEl estudio completo trae el método, las cinco señales que más se repiten y una prueba para hacerle a su propio copy en diez minutos.',
    },
    { slot: 'cta', variationIndex: 1, type: 'Standard', budget: 25, content: 'Descargue el estudio', score: 9 },
  ],
  'Instagram Post': [
    { slot: 'hook', variationIndex: 1, type: 'La cifra', budget: 80, content: 'El 71% de su copy podría ser de su competencia.', score: 10 },
    { slot: 'hook', variationIndex: 2, type: 'El método', budget: 80, content: 'Bien escrito. Intercambiable.', score: 9 },
    { slot: 'body', variationIndex: 1, type: 'La cifra', budget: 124, content: 'Medimos 400 piezas hechas con IA genérica. Siete de cada diez sonaban a la categoría. El estudio, en el link.', score: 9 },
    { slot: 'hashtags', variationIndex: 1, type: 'Standard', content: '#VozDeMarca #EstudioLoBueno #ADNdeMarca', score: 8 },
    {
      slot: 'visualBrief', variationIndex: 1, type: 'Standard', score: 9,
      content: 'Gráfico de barras sobrio: 71% en el color de la marca, 29% en gris. Fondo claro, sin íconos ni personas. La cifra ocupa la mitad superior.',
    },
  ],
  'Push Notification': [
    { slot: 'title', variationIndex: 1, type: 'La cifra', budget: 25, content: 'El 71% era intercambiable', score: 9 },
    { slot: 'text', variationIndex: 1, type: 'El método', budget: 40, content: 'Mida su copy contra el estudio.', score: 8 },
  ],
  'Google Ads': [
    { slot: 'shortTitle', variationIndex: 1, type: 'Standard', budget: 30, content: 'El costo del copy genérico', score: 9 },
    { slot: 'shortTitle', variationIndex: 2, type: 'Standard', budget: 30, content: 'Estudio: 400 piezas medidas', score: 8 },
    { slot: 'description', variationIndex: 1, type: 'Standard', budget: 90, content: 'Medimos 400 piezas con IA genérica: el 71% podía ser de otra marca.', score: 9 },
  ],
};

// --------------------------------------------------------------- las artes

/**
 * Un bloque de texto de un arte. Las artes son deliberadamente sobrias —fondo
 * claro, tipografía negra, una barra de acento—: tienen que parecer una pieza,
 * no competir con la herramienta durante la capacitación.
 */
interface Bloque {
  texto: string;
  /** Tamaño en px sobre el lienzo final. */
  tam: number;
  peso?: 400 | 600 | 800;
  color?: string;
  /** Recuadro de color detrás, para un botón o un sticker. */
  boton?: string;
}

const escaparXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Corte de línea por ancho estimado. No es tipografía fina: alcanza para que el texto entre. */
const partirEnLineas = (texto: string, maxCaracteres: number): string[] => {
  const lineas: string[] = [];
  for (const parrafo of texto.split('\n')) {
    if (!parrafo.trim()) {
      lineas.push('');
      continue;
    }
    let actual = '';
    for (const palabra of parrafo.split(/\s+/)) {
      if (actual && (actual + ' ' + palabra).length > maxCaracteres) {
        lineas.push(actual);
        actual = palabra;
      } else {
        actual = actual ? `${actual} ${palabra}` : palabra;
      }
    }
    if (actual) lineas.push(actual);
  }
  return lineas;
};

const dibujarArte = async (ancho: number, alto: number, bloques: Bloque[]): Promise<Buffer> => {
  const margen = Math.round(ancho * 0.08);
  const util = ancho - margen * 2;
  let y = Math.round(alto * 0.14);
  const partes: string[] = [
    `<rect width="${ancho}" height="${alto}" fill="#F4F1EA"/>`,
    `<rect x="${margen}" y="${Math.round(alto * 0.06)}" width="${Math.round(ancho * 0.12)}" height="${Math.max(6, Math.round(ancho * 0.012))}" fill="#E8412C"/>`,
  ];

  for (const b of bloques) {
    // 0,6 y no 0,5: en el servidor la fuente es DejaVu, bastante más ancha que
    // la Helvetica de una Mac, y con 0,5 el titular se salía del lienzo.
    const maxCar = Math.max(8, Math.floor(util / (b.tam * 0.6)));
    const lineas = partirEnLineas(b.texto, maxCar);
    const interlinea = Math.round(b.tam * 1.25);
    if (b.boton) {
      const anchoBoton = Math.min(util, Math.round(Math.max(...lineas.map(l => l.length)) * b.tam * 0.62 + b.tam * 1.6));
      const altoBoton = interlinea * lineas.length + Math.round(b.tam * 0.9);
      partes.push(`<rect x="${margen}" y="${y}" width="${anchoBoton}" height="${altoBoton}" rx="${Math.round(b.tam * 0.4)}" fill="${b.boton}"/>`);
      y += Math.round(b.tam * 0.45);
    }
    for (const linea of lineas) {
      y += interlinea;
      if (!linea) continue;
      partes.push(
        `<text x="${margen + (b.boton ? Math.round(b.tam * 0.8) : 0)}" y="${y - Math.round(b.tam * 0.25)}" ` +
          `font-family="Helvetica Neue, Helvetica, Arial, DejaVu Sans, sans-serif" font-size="${b.tam}" ` +
          `font-weight="${b.peso ?? 400}" fill="${b.color ?? '#141414'}">${escaparXml(linea)}</text>`
      );
    }
    y += Math.round(b.tam * (b.boton ? 1.4 : 0.9));
  }

  partes.push(
    `<text x="${margen}" y="${alto - Math.round(alto * 0.05)}" font-family="Helvetica Neue, Helvetica, Arial, DejaVu Sans, sans-serif" ` +
      `font-size="${Math.round(ancho * 0.03)}" font-weight="800" fill="#141414">LoBueno</text>`
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}">${partes.join('')}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
};

/** Sube el arte como si lo hubiera entregado un diseñador: original + snapshot. */
const subirVersion = async (clave: string, numero: number, png: Buffer) => {
  const base = `capacitacion/${clave}-v${numero}`;
  const meta = await sharp(png).metadata();
  const snapshot = await sharp(png)
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return {
    claveOriginal: await storage().put(`piezas/originales/${base}.png`, png, 'image/png'),
    claveSnapshot: await storage().put(`piezas/snapshots/${base}.jpg`, snapshot, 'image/jpeg'),
    anchoPx: meta.width ?? null,
    altoPx: meta.height ?? null,
    pesoBytes: png.length,
    contentType: 'image/png',
  };
};

// ------------------------------------------------------------ helpers de copy

const copyDe = (canal: string, slot: string, n = 1): string => {
  const item = LOBUENO_CHANNEL_COPY[canal]?.find(i => i.slot === slot && i.variationIndex === n);
  if (!item) throw new Error(`El fixture no tiene ${canal}/${slot}#${n}`);
  return item.content;
};

/** Variaciones con la forma que guarda el motor en outputJson (la que lee Historial). */
const comoSalidaDelMotor = (copy: Record<string, LobuenoCopyItem[]>, canales: string[]) =>
  canales.flatMap(canal =>
    (copy[canal] ?? []).map((it, i) => {
      const charCount = it.unit === 'word' ? it.content.trim().split(/\s+/).length : [...it.content].length;
      return {
        id: `cap-${canal.replace(/\s+/g, '-').toLowerCase()}-${it.slot}-${it.variationIndex}-${i}`,
        platform: canal,
        slot: it.slot,
        slotLabel: resolveSlotLabel(canal, it.slot),
        variationIndex: it.variationIndex,
        type: it.type,
        content: it.content,
        charCount,
        budget: it.budget,
        budgetUnit: it.unit ?? 'char',
        budgetOk: it.budget ? charCount <= it.budget : true,
        score: it.score,
        scoreRationale: it.scoreRationale,
        editorFlags: it.editorFlags,
        autofixed: it.autofixed,
      };
    })
  );

/** Uso de una generación, con la misma forma que UsageTotal de pricing.ts. */
const usoDe = (canales: number, costoUsd: number) => {
  const promptTokens = 1400 + canales * 3100;
  const completionTokens = 400 + canales * 850;
  const cachedTokens = Math.round(promptTokens * 0.62);
  return {
    promptTokens,
    completionTokens,
    cachedTokens,
    cacheWriteTokens: Math.round(promptTokens * 0.08),
    costUsd: costoUsd,
    estimated: false,
    byStage: {
      director: { tokens: 1850, costUsd: Number((costoUsd * 0.06).toFixed(6)) },
      writer: { tokens: canales * 2600, costUsd: Number((costoUsd * 0.62).toFixed(6)) },
      critic: { tokens: canales * 900, costUsd: Number((costoUsd * 0.14).toFixed(6)) },
      fixer: { tokens: canales * 250, costUsd: Number((costoUsd * 0.06).toFixed(6)) },
      supercritic: { tokens: 2600, costUsd: Number((costoUsd * 0.12).toFixed(6)) },
    },
  };
};

// ------------------------------------------------------------------- main

async function main() {
  const password = process.env.CAPACITACION_PASSWORD;
  if (!password || password.length < 8) {
    console.error('[capacitacion] Falta CAPACITACION_PASSWORD (8+ caracteres). Es la contraseña de los cuatro usuarios de la capacitación.');
    process.exit(1);
  }

  initStorage();
  const prisma = new PrismaClient();
  console.log(`Almacenamiento: ${storage().nombre}${storage().nombre === 'local' ? ' (server/uploads)' : ''}`);

  // ---- 0. Ninguna cuenta real puede caer en el reset ------------------------
  const emails = EQUIPO.map(p => `${p.clave}@${DOMINIO}`);
  const ajenas = await prisma.membership.findMany({
    where: { user: { email: { in: emails } }, workspace: { slug: { not: SLUG } } },
    select: { user: { select: { email: true } }, workspace: { select: { name: true } } },
  });
  if (ajenas.length > 0) {
    console.error('[capacitacion] Abortado: estas cuentas tienen acceso a otros workspaces y no se van a tocar:');
    for (const a of ajenas) console.error(`  ${a.user.email} → ${a.workspace.name}`);
    process.exit(1);
  }

  // ---- 1. Las artes, antes de abrir la transacción --------------------------
  // Subir archivos dentro de una transacción la dejaría abierta lo que tarde la
  // red. Las claves son fijas por pieza, así que una corrida pisa la anterior.
  const hookPost = copyDe('Instagram Post', 'hook', 1);
  const bodyPost = copyDe('Instagram Post', 'body', 1);
  const hashtags = copyDe('Instagram Post', 'hashtags', 1);
  const copyHistoria = copyDe('Instagram Historia', 'copy', 1);
  const swipeHistoria = copyDe('Instagram Historia', 'swipeCTA', 1);
  const hookAB = copyDe('Instagram Post', 'hook', 2);
  const hookABEditado = 'Le medimos la voz a su marca. Da cifras, no opiniones.';

  const post = (hook: string, extra: Bloque[] = []) =>
    dibujarArte(1080, 1080, [
      { texto: hook, tam: 92, peso: 800 },
      { texto: bodyPost, tam: 40 },
      ...extra,
      { texto: hashtags, tam: 30, color: '#6B6B6B' },
    ]);

  const historia = (copy: string, etiqueta: string) =>
    dibujarArte(1080, 1920, [
      { texto: etiqueta, tam: 34, color: '#6B6B6B' },
      { texto: copy, tam: 104, peso: 800 },
      { texto: swipeHistoria, tam: 46, peso: 600, color: '#FFFFFF', boton: '#141414' },
    ]);

  console.log('Dibujando artes…');
  const arteSubido = {
    // v1 trae dos errores a propósito: la tilde de «Rápido» y un CTA con
    // exclamación que la marca no usa. La auditoría los encontró y la pieza volvió.
    postV1: await subirVersion('post-feed', 1, await post(hookPost.replace('Rápido', 'Rapido'), [
      { texto: '¡Pida su demo!', tam: 40, peso: 600, color: '#FFFFFF', boton: '#E8412C' },
    ])),
    postV2: await subirVersion('post-feed', 2, await post(hookPost)),
    // La historia que espera decisión: el copy no es el aprobado y la etiqueta tutea.
    historiaV1: await subirVersion('historia', 1, await historia(
      copyHistoria.replace('categoría', 'competencia'),
      'Desliza hacia arriba'
    )),
    email: await subirVersion('email', 1, await dibujarArte(600, 1100, [
      { texto: copyDe('Email', 'header', 1), tam: 40, peso: 800 },
      { texto: copyDe('Email', 'body', 1), tam: 15 },
      { texto: copyDe('Email', 'cta', 2), tam: 22, peso: 600, color: '#FFFFFF', boton: '#141414' },
    ])),
  };

  // Lo que el diseñador sube EN VIVO. Van con el copy correcto: si la auditoría
  // encuentra algo en estas, es material de conversación, no un error del guion.
  await fs.mkdir(DIR_ARTES, { recursive: true });
  await fs.writeFile(path.join(DIR_ARTES, '1-post-ab-1080x1080.png'), await post(hookABEditado));
  await fs.writeFile(path.join(DIR_ARTES, '2-historia-corregida-1080x1920.png'), await historia(copyHistoria, 'Deslice hacia arriba'));

  // ---- 2. Todo lo demás, en una sola transacción ----------------------------
  const passwordHash = await bcrypt.hash(password, 10);

  const resumen = await prisma.$transaction(
    async tx => {
      await borrarWorkspaceAnterior(tx);

      const ws = await tx.workspace.create({
        data: { name: 'LoBueno · Capacitación', slug: SLUG, plan: 'agency' },
      });

      // -- El equipo
      const u = {} as Record<ClaveEquipo, string>;
      for (const p of EQUIPO) {
        const email = `${p.clave}@${DOMINIO}`;
        const user = await tx.user.upsert({
          where: { email },
          update: { name: p.nombre, passwordHash, workspaceId: ws.id, clientId: null },
          create: { email, name: p.nombre, passwordHash, workspaceId: ws.id },
        });
        u[p.clave] = user.id;
        await tx.membership.create({ data: { userId: user.id, workspaceId: ws.id, role: p.rol } });
        await tx.miembroFuncion.create({ data: { workspaceId: ws.id, userId: user.id, funcion: p.funcion } });
      }

      // -- Preparar: la marca, su ADN y su memoria
      const marca = await tx.client.create({
        data: {
          name: LOBUENO_BRAND.name,
          industry: LOBUENO_BRAND.industry,
          voice: LOBUENO_BRAND.voice,
          valueProposition: LOBUENO_BRAND.valueProposition,
          brandVoiceGuidelines: LOBUENO_BRAND.brandVoiceGuidelines,
          brandKeywords: LOBUENO_BRAND.brandKeywords,
          brandProhibitions: LOBUENO_BRAND.brandProhibitions,
          brandFingerprint: LOBUENO_BRAND.brandFingerprint as unknown as Prisma.InputJsonValue,
          brandFingerprintAt: hace(30),
          workspaceId: ws.id,
          createdAt: hace(32),
        },
      });

      const briefs: Record<string, string> = {};
      for (const [i, p] of LOBUENO_DNA_PROFILES.entries()) {
        const { key, ...campos } = p;
        const creado = await tx.contentDNAProfile.create({
          data: {
            ...campos,
            clientId: marca.id,
            createdAt: hace(30 - i),
            feedbackExamples: LOBUENO_APPROVED_EXAMPLES.map(e => ({ platform: e.platform, content: e.content })),
          },
        });
        briefs[key] = creado.id;
      }

      // Los aprobados «históricos», sin campaña: son los few-shot del motor.
      for (const [i, ex] of LOBUENO_APPROVED_EXAMPLES.entries()) {
        await tx.savedVariation.create({
          data: {
            clientId: marca.id, platform: ex.platform, type: ex.type, content: ex.content,
            charCount: ex.content.length, tags: ex.tags, isApproved: true, approvalNote: ex.approvalNote,
            savedAt: hace(29, i),
          },
        });
      }
      for (const n of LOBUENO_NEGATIVE_EXAMPLES) {
        await tx.negativeFeedback.create({ data: { ...n, clientId: marca.id, createdAt: hace(29) } });
      }

      const lanzamiento = await tx.project.create({
        data: { name: 'Lanzamiento My Voice', workspaceId: ws.id, pideAprobacionDeCliente: true, createdAt: hace(16) },
      });
      const costo = await tx.project.create({
        data: { name: 'El costo del copy genérico', workspaceId: ws.id, createdAt: hace(4) },
      });
      await tx.project.create({
        data: { name: 'Talento 2026', workspaceId: ws.id, createdAt: hace(1) },
      });

      await tx.generationPreset.create({
        data: {
          name: 'LoBueno — Lanzamiento (8 canales)',
          workspaceId: ws.id,
          clientId: marca.id,
          parameters: { platforms: Object.keys(LOBUENO_CHANNEL_COPY), funnelStage: 'CONVERSION' },
        },
      });

      // -- Escribir: las generaciones que ya pasaron
      const canalesLanzamiento = Object.keys(LOBUENO_CHANNEL_COPY);
      const generaciones = [
        {
          // El primer intento, con cuatro canales, antes de afinar el brief.
          cuando: hace(24, 5), brief: 'my-voice-lanzamiento', canales: ['Email', 'Instagram Post', 'Google Ads', 'Push Notification'],
          spine: LOBUENO_SPINE, copy: LOBUENO_CHANNEL_COPY, coherencia: null, costo: 0.1184, ms: 41_200,
        },
        {
          cuando: hace(15, 6), brief: 'my-voice-lanzamiento', canales: canalesLanzamiento,
          spine: LOBUENO_SPINE, copy: LOBUENO_CHANNEL_COPY, coherencia: LOBUENO_COHERENCE, costo: 0.2961, ms: 78_400,
        },
        {
          cuando: hace(15, 5, 40), brief: 'my-voice-lanzamiento', canales: ['WhatsApp'], regenerado: 'WhatsApp',
          spine: null, copy: LOBUENO_CHANNEL_COPY, coherencia: null, costo: 0.0312, ms: 14_900,
        },
        {
          cuando: hace(3, 4), brief: 'costo-copy-generico', canales: Object.keys(COPY_COSTO),
          spine: SPINE_COSTO, copy: COPY_COSTO, coherencia: { coherenceScore: 9, summary: 'La cifra del 71% ancla los cuatro canales; registro «usted» sostenido.', issues: [], flags: [] },
          costo: 0.1647, ms: 52_300,
        },
      ];
      for (const g of generaciones) {
        const uso = usoDe(g.canales.length, g.costo);
        await tx.generationLog.create({
          data: {
            clientId: marca.id, userId: u.andres, workspaceId: ws.id, dnaProfileId: briefs[g.brief],
            platforms: g.canales, funnelStage: 'CONVERSION', createdAt: g.cuando,
            spineJson: g.spine ?? Prisma.JsonNull,
            outputJson: {
              variations: comoSalidaDelMotor(g.copy, g.canales),
              ...(g.coherencia ? { coherence: g.coherencia } : {}),
              usage: uso,
              ...('regenerado' in g ? { regeneratedChannel: g.regenerado } : {}),
            } as Prisma.InputJsonValue,
            promptTokens: uso.promptTokens, completionTokens: uso.completionTokens,
            cachedTokens: uso.cachedTokens, cacheWriteTokens: uso.cacheWriteTokens,
            costUsd: g.costo, costEstimated: false, durationMs: g.ms,
            model: 'claude-sonnet-4-6', provider: 'anthropic',
            stageBreakdown: uso.byStage,
          },
        });
      }

      // Consumo por periodo, cuadrado con los logs (mes UTC, ver UsagePeriod).
      const periodos = new Map<number, { generaciones: number; costo: number; tokens: number }>();
      for (const g of generaciones) {
        const inicio = Date.UTC(g.cuando.getUTCFullYear(), g.cuando.getUTCMonth(), 1);
        const uso = usoDe(g.canales.length, g.costo);
        const p = periodos.get(inicio) ?? { generaciones: 0, costo: 0, tokens: 0 };
        p.generaciones += 1;
        p.costo += g.costo;
        p.tokens += uso.promptTokens + uso.completionTokens;
        periodos.set(inicio, p);
      }
      for (const [inicio, p] of periodos) {
        await tx.usagePeriod.create({
          data: {
            workspaceId: ws.id, clientId: marca.id, periodStart: new Date(inicio),
            generations: p.generaciones, costUsd: Number(p.costo.toFixed(6)), tokens: p.tokens,
          },
        });
      }

      // -- Aprobar, ronda de copy: lo que Andrés guardó de la generación buena
      const guardar = async (
        projectId: string, canal: string, it: LobuenoCopyItem, savedAt: Date, extra: Partial<Prisma.SavedVariationUncheckedCreateInput> = {}
      ) =>
        tx.savedVariation.create({
          data: {
            clientId: marca.id, projectId, platform: canal, type: it.type, content: it.content,
            charCount: [...it.content].length, tags: [], slot: it.slot,
            slotLabel: resolveSlotLabel(canal, it.slot), variationIndex: it.variationIndex,
            savedAt, ...extra,
          },
        });

      const ELEGIDOS_LANZAMIENTO: [string, string, number[]][] = [
        ['Instagram Post', 'hook', [1, 2, 3]], ['Instagram Post', 'body', [1, 2]],
        ['Instagram Post', 'hashtags', [1]], ['Instagram Post', 'visualBrief', [1]],
        ['Instagram Historia', 'copy', [1, 2]], ['Instagram Historia', 'swipeCTA', [1]],
        ['Instagram Carrusel', 'slide1Hook', [1]], ['Instagram Carrusel', 'slidesBody', [1, 2, 3, 4, 5]],
        ['Instagram Carrusel', 'slideFinalCTA', [1]], ['Instagram Carrusel', 'caption', [1]],
        ['Email', 'subject', [1, 2]], ['Email', 'preheader', [1]], ['Email', 'header', [1]],
        ['Email', 'body', [1]], ['Email', 'cta', [2]],
        ['TikTok', 'verbalHook', [1]], ['TikTok', 'narrative', [1]], ['TikTok', 'caption', [1]], ['TikTok', 'cta', [1]],
        ['Google Ads', 'shortTitle', [1, 2, 4]], ['Google Ads', 'description', [1, 2]],
        ['Push Notification', 'title', [1]], ['Push Notification', 'text', [1]],
      ];
      /** Lo que la clienta rechazó en la ronda 1, con sus palabras. */
      const RECHAZOS: Record<string, string> = {
        'Email/subject/2': 'Suena a regaño. Prefiero que el asunto no le haga preguntas al lector.',
        'Google Ads/shortTitle/4': 'Es casi igual al anuncio de la competencia. Busquemos otro.',
      };
      const COMENTARIOS_APROBADOS: Record<string, string> = {
        'Instagram Post/hook/1': 'Este es el tono. Que todo suene así.',
        'Email/body/1': 'Aprobado. El segundo párrafo es el mejor de toda la campaña.',
      };

      const sv = new Map<string, { id: string; content: string; slot: string | null; slotLabel: string | null }>();
      let minuto = 0;
      for (const [canal, slot, indices] of ELEGIDOS_LANZAMIENTO) {
        for (const n of indices) {
          const it = LOBUENO_CHANNEL_COPY[canal].find(i => i.slot === slot && i.variationIndex === n)!;
          const clave = `${canal}/${slot}/${n}`;
          const creado = await guardar(lanzamiento.id, canal, it, hace(15, 4, -minuto++), {
            isApproved: !RECHAZOS[clave],
            approvalNote: COMENTARIOS_APROBADOS[clave] ?? null,
          });
          sv.set(clave, creado);
        }
      }
      // WhatsApp entró después de la revisión: aprobado internamente, nunca pasó por la clienta.
      for (const [slot, n] of [['message', 1], ['cta', 1]] as const) {
        const it = LOBUENO_CHANNEL_COPY.WhatsApp.find(i => i.slot === slot && i.variationIndex === n)!;
        await guardar(lanzamiento.id, 'WhatsApp', it, hace(12), { isApproved: false });
      }

      const ronda1 = await tx.reviewSession.create({
        data: {
          title: 'Lanzamiento My Voice — copy para aprobar',
          status: ReviewSessionStatus.COMPLETED,
          ronda: RondaRevision.COPY,
          expiresAt: hace(7),
          createdAt: hace(14, 22),
          workspaceId: ws.id,
          createdById: u.laura,
          items: {
            createMany: { data: [...sv.values()].map((v, i) => ({ savedVariationId: v.id, sortOrder: i })) },
          },
        },
      });
      await tx.reviewSubmission.create({
        data: {
          reviewSessionId: ronda1.id,
          reviewerName: REVISORA_CLIENTE,
          submittedAt: hace(13, 19),
          feedbacks: {
            createMany: {
              data: [...sv.entries()].map(([clave, v]) => ({
                savedVariationId: v.id,
                decision: RECHAZOS[clave] ? ReviewDecision.REJECTED : ReviewDecision.APPROVED,
                feedbackCopy: RECHAZOS[clave] ?? COMENTARIOS_APROBADOS[clave] ?? null,
              })),
            },
          },
        },
      });
      // Igual que submitReview: cada rechazo entra como anti-ejemplo del motor.
      for (const [clave, motivo] of Object.entries(RECHAZOS)) {
        const v = sv.get(clave)!;
        await tx.negativeFeedback.create({
          data: { clientId: marca.id, platform: clave.split('/')[0], content: v.content, reason: motivo, createdAt: hace(13, 19) },
        });
      }

      // -- Aprobar, ronda de copy pendiente: la segunda campaña espera a la clienta
      const guardadosCosto: string[] = [];
      for (const [canal, items] of Object.entries(COPY_COSTO)) {
        for (const it of items) {
          const creado = await guardar(costo.id, canal, it, hace(3, 3));
          if (!esSlotDeInstruccion(it.slot)) guardadosCosto.push(creado.id);
        }
      }
      const ronda2 = await tx.reviewSession.create({
        data: {
          title: 'El costo del copy genérico — copy para aprobar',
          ronda: RondaRevision.COPY,
          expiresAt: dentroDe(7),
          createdAt: hace(1, 2),
          workspaceId: ws.id,
          createdById: u.laura,
          items: { createMany: { data: guardadosCosto.map((id, i) => ({ savedVariationId: id, sortOrder: i })) } },
        },
      });

      // -- Producir: el tablero, con una pieza en cada situación que vale mostrar
      type SlotDePieza = { clave: string };
      const crearPieza = async (d: {
        canal: string; tipo: PiezaTipo; formato: string; titulo: string; estado: PiezaEstado;
        slots: SlotDePieza[]; creada: Date; estadoDesde: Date;
        asignadaA?: ClaveEquipo; grupoId?: string; enlace?: string;
      }) => {
        const orden = (slot: string | null) => getChannelSpec(d.canal)?.slots.findIndex(s => s.id === slot) ?? 99;
        const usados = d.slots.map(s => sv.get(s.clave)!).sort((a, b) => orden(a.slot) - orden(b.slot));
        return tx.pieza.create({
          data: {
            workspaceId: ws.id, clientId: marca.id, projectId: lanzamiento.id,
            platform: d.canal, tipo: d.tipo, formato: d.formato, titulo: d.titulo, estado: d.estado,
            huella: huellaDe(d.formato, usados.map(v => v.id)),
            asignadaAId: d.asignadaA ? u[d.asignadaA] : null,
            grupoId: d.grupoId ?? null, enlace: d.enlace ?? null,
            creadaPorId: u.laura, createdAt: d.creada, estadoDesde: d.estadoDesde,
            slots: {
              create: usados.map((v, i) => ({
                savedVariationId: v.id, slot: v.slot ?? 'sinSlot', slotLabel: v.slotLabel ?? v.slot ?? 'sinSlot',
                textoCongelado: v.content, esInstruccion: esSlotDeInstruccion(v.slot), orden: i,
              })),
            },
          },
        });
      };
      const evento = (piezaId: string, tipo: string, cuando: Date, autor: ClaveEquipo | null, extra: {
        de?: PiezaEstado; a?: PiezaEstado; nota?: string; categoria?: 'COPY' | 'DISENO';
      } = {}) =>
        tx.piezaEvento.create({
          data: {
            piezaId, tipo, createdAt: cuando, autorId: autor ? u[autor] : null,
            deEstado: extra.de ?? null, aEstado: extra.a ?? null,
            nota: extra.nota ?? null, categoria: extra.categoria ?? null,
          },
        });
      const { POR_ASIGNAR, EN_DISENO, POR_REVISAR, LISTA } = PiezaEstado;
      const grupoFeed = randomUUID();

      // 1. Post de feed — LISTA. La historia completa: v1 con errores, devuelta, v2 limpia.
      const pPost = await crearPieza({
        canal: 'Instagram Post', tipo: PiezaTipo.GRAFICA, formato: '1080×1080',
        titulo: 'Post de feed — Rápido escribe cualquiera', estado: LISTA, grupoId: grupoFeed,
        slots: [{ clave: 'Instagram Post/hook/1' }, { clave: 'Instagram Post/body/1' }, { clave: 'Instagram Post/hashtags/1' }, { clave: 'Instagram Post/visualBrief/1' }],
        asignadaA: 'mateo', creada: hace(12, 3), estadoDesde: hace(1, 5),
      });
      await evento(pPost.id, 'CREADA', hace(12, 3), 'laura', { a: POR_ASIGNAR });
      await evento(pPost.id, 'ASIGNADA', hace(12, 2), 'laura', { de: POR_ASIGNAR, a: EN_DISENO });
      await evento(pPost.id, 'ENTREGADA', hace(6, 7), 'mateo', { de: EN_DISENO, a: POR_REVISAR, nota: 'Versión 1' });
      await evento(pPost.id, 'DEVUELTA', hace(5, 22), 'laura', {
        de: POR_REVISAR, a: EN_DISENO, categoria: 'DISENO',
        nota: 'Falta la tilde de «Rápido» y sobra el «¡Pida su demo!»: el CTA va en el caption y la marca no usa exclamaciones.',
      });
      await evento(pPost.id, 'ENTREGADA', hace(2, 6), 'mateo', { de: EN_DISENO, a: POR_REVISAR, nota: 'Versión 2' });
      await evento(pPost.id, 'ACEPTADA', hace(1, 5), 'laura', { de: POR_REVISAR, a: LISTA });
      await tx.piezaVersion.create({
        data: {
          piezaId: pPost.id, numero: 1, ...arteSubido.postV1, subidaPorId: u.mateo, createdAt: hace(6, 7),
          estadoAuditoria: AuditoriaEstado.COMPLETA, auditadaAt: hace(6, 6, 58), costoUsd: 0.0041, modelo: 'claude-sonnet-4-6',
          hallazgos: {
            create: [
              {
                tipo: HallazgoTipo.HECHO, slot: 'hook', slotLabel: resolveSlotLabel('Instagram Post', 'hook'),
                esperado: hookPost, encontrado: hookPost.replace('Rápido', 'Rapido'),
                detalle: 'Falta la tilde en «Rápido».',
                decision: HallazgoDecision.CORREGIDO, decididoPorId: u.laura, decididoAt: hace(5, 22),
              },
              {
                tipo: HallazgoTipo.JUICIO, encontrado: '¡Pida su demo!',
                detalle: 'El botón usa signos de exclamación; el fingerprint de la marca marca 0,1 por pieza y la guía pide cerrar en seco.',
                decision: HallazgoDecision.CORREGIDO, decididoPorId: u.laura, decididoAt: hace(5, 22),
              },
            ],
          },
        },
      });
      await tx.piezaVersion.create({
        data: {
          piezaId: pPost.id, numero: 2, ...arteSubido.postV2, subidaPorId: u.mateo, createdAt: hace(2, 6),
          estadoAuditoria: AuditoriaEstado.COMPLETA, auditadaAt: hace(2, 5, 58), costoUsd: 0.0038, modelo: 'claude-sonnet-4-6',
        },
      });

      // 2. Historia hermana — POR REVISAR, con hallazgos esperando decisión en vivo.
      const pHistoria = await crearPieza({
        canal: 'Instagram Historia', tipo: PiezaTipo.GRAFICA, formato: '1080×1920',
        titulo: 'Historia — ¿Su copy suena a su marca?', estado: POR_REVISAR, grupoId: grupoFeed,
        slots: [{ clave: 'Instagram Historia/copy/1' }, { clave: 'Instagram Historia/swipeCTA/1' }],
        asignadaA: 'sofia', creada: hace(12, 3), estadoDesde: hace(0, 3),
      });
      await evento(pHistoria.id, 'CREADA', hace(12, 3), 'laura', { a: POR_ASIGNAR });
      await evento(pHistoria.id, 'ASIGNADA', hace(4, 1), 'laura', { de: POR_ASIGNAR, a: EN_DISENO });
      await evento(pHistoria.id, 'COMENTARIO', hace(3, 20), 'sofia', {
        nota: 'Uso el mismo fondo del post de feed para que se lean como una sola pieza.',
      });
      await evento(pHistoria.id, 'ENTREGADA', hace(0, 3), 'sofia', { de: EN_DISENO, a: POR_REVISAR, nota: 'Versión 1' });
      await tx.piezaVersion.create({
        data: {
          piezaId: pHistoria.id, numero: 1, ...arteSubido.historiaV1, subidaPorId: u.sofia, createdAt: hace(0, 3),
          estadoAuditoria: AuditoriaEstado.COMPLETA, auditadaAt: hace(0, 2, 58), costoUsd: 0.0036, modelo: 'claude-sonnet-4-6',
          hallazgos: {
            create: [
              {
                tipo: HallazgoTipo.HECHO, slot: 'copy', slotLabel: resolveSlotLabel('Instagram Historia', 'copy'),
                esperado: copyHistoria, encontrado: copyHistoria.replace('categoría', 'competencia'),
                detalle: 'La pieza dice «competencia» donde el aprobado dice «categoría».',
              },
              {
                tipo: HallazgoTipo.JUICIO, encontrado: 'Desliza hacia arriba',
                detalle: '«Desliza» tutea; la marca le habla al lector de usted («Deslice»).',
              },
            ],
          },
        },
      });

      // 3. A/B del post — EN DISEÑO, y el copy cambió después de mandarlo a producir.
      const pAB = await crearPieza({
        canal: 'Instagram Post', tipo: PiezaTipo.GRAFICA, formato: '1080×1080',
        titulo: 'Post de feed (B) — Le medimos la voz', estado: EN_DISENO,
        slots: [{ clave: 'Instagram Post/hook/2' }, { clave: 'Instagram Post/body/1' }, { clave: 'Instagram Post/hashtags/1' }, { clave: 'Instagram Post/visualBrief/1' }],
        asignadaA: 'sofia', creada: hace(12, 3), estadoDesde: hace(1, 4),
      });
      await evento(pAB.id, 'CREADA', hace(12, 3), 'laura', { a: POR_ASIGNAR });
      await evento(pAB.id, 'ASIGNADA', hace(1, 4), 'laura', { de: POR_ASIGNAR, a: EN_DISENO });
      await evento(pAB.id, 'COMENTARIO', hace(1, 1), 'andres', {
        nota: 'Ajusté el hook en Copy aprobado después de hablar con Natalia: «Da números» le sonaba frío.', categoria: 'COPY',
      });
      // El cambio en la Biblioteca que dispara el aviso de desfase en la tarjeta.
      await tx.savedVariation.update({
        where: { id: sv.get('Instagram Post/hook/2')!.id },
        data: { content: hookABEditado, charCount: [...hookABEditado].length, previousVersions: [{ content: hookAB, charCount: [...hookAB].length, editedAt: hace(1, 1).toISOString() }] },
      });

      // 4. Carrusel — POR ASIGNAR, para asignarlo en vivo.
      const pCarrusel = await crearPieza({
        canal: 'Instagram Carrusel', tipo: PiezaTipo.GRAFICA, formato: '1080×1350',
        titulo: 'Carrusel — Adivine cuál es su marca', estado: POR_ASIGNAR,
        slots: [
          { clave: 'Instagram Carrusel/slide1Hook/1' },
          ...[1, 2, 3, 4, 5].map(n => ({ clave: `Instagram Carrusel/slidesBody/${n}` })),
          { clave: 'Instagram Carrusel/slideFinalCTA/1' }, { clave: 'Instagram Carrusel/caption/1' },
        ],
        creada: hace(12, 3), estadoDesde: hace(12, 3),
      });
      await evento(pCarrusel.id, 'CREADA', hace(12, 3), 'laura', { a: POR_ASIGNAR });

      // 5. Email — LISTA, con un hallazgo ILEGIBLE que alguien aceptó con nota.
      const pEmail = await crearPieza({
        canal: 'Email', tipo: PiezaTipo.GRAFICA, formato: '600 px de ancho',
        titulo: 'Email de lanzamiento — Su marca ya sabe hablar', estado: LISTA,
        slots: [{ clave: 'Email/header/1' }, { clave: 'Email/body/1' }, { clave: 'Email/cta/2' }],
        asignadaA: 'mateo', creada: hace(12, 3), estadoDesde: hace(6, 2),
      });
      await evento(pEmail.id, 'CREADA', hace(12, 3), 'laura', { a: POR_ASIGNAR });
      await evento(pEmail.id, 'ASIGNADA', hace(12, 2), 'laura', { de: POR_ASIGNAR, a: EN_DISENO });
      await evento(pEmail.id, 'ENTREGADA', hace(7, 4), 'mateo', { de: EN_DISENO, a: POR_REVISAR, nota: 'Versión 1' });
      await evento(pEmail.id, 'ACEPTADA', hace(6, 2), 'laura', { de: POR_REVISAR, a: LISTA });
      await tx.piezaVersion.create({
        data: {
          piezaId: pEmail.id, numero: 1, ...arteSubido.email, subidaPorId: u.mateo, createdAt: hace(7, 4),
          estadoAuditoria: AuditoriaEstado.COMPLETA, auditadaAt: hace(7, 3, 58), costoUsd: 0.0044, modelo: 'claude-sonnet-4-6',
          hallazgos: {
            create: [{
              tipo: HallazgoTipo.ILEGIBLE, slot: 'body', slotLabel: resolveSlotLabel('Email', 'body'),
              esperado: copyDe('Email', 'body', 1),
              detalle: 'No se pudo leer este texto en la pieza. Eso no significa que esté mal.',
              decision: HallazgoDecision.ACEPTADO, decididoPorId: u.laura, decididoAt: hace(6, 2),
              notaDecision: 'En el tamaño real del correo se lee bien; la miniatura lo achica.',
            }],
          },
        },
      });

      // 6. TikTok — LISTA. Video: se entrega con enlace, sin archivo ni auditoría.
      const pTikTok = await crearPieza({
        canal: 'TikTok', tipo: PiezaTipo.VIDEO, formato: '1080×1920',
        titulo: 'TikTok — Seis titulares, seis marcas', estado: LISTA,
        slots: [{ clave: 'TikTok/verbalHook/1' }, { clave: 'TikTok/narrative/1' }, { clave: 'TikTok/caption/1' }, { clave: 'TikTok/cta/1' }],
        asignadaA: 'mateo', creada: hace(12, 3), estadoDesde: hace(4, 3),
        enlace: 'https://drive.google.com/drive/folders/capacitacion-lobueno-tiktok',
      });
      await evento(pTikTok.id, 'CREADA', hace(12, 3), 'laura', { a: POR_ASIGNAR });
      await evento(pTikTok.id, 'ASIGNADA', hace(12, 2), 'laura', { de: POR_ASIGNAR, a: EN_DISENO });
      await evento(pTikTok.id, 'ENTREGADA', hace(5, 1), 'mateo', { de: EN_DISENO, a: POR_REVISAR, nota: 'Enlace al corte v2' });
      await evento(pTikTok.id, 'ACEPTADA', hace(4, 3), 'laura', { de: POR_REVISAR, a: LISTA });

      // -- Aprobar, ronda de piezas: el arte terminado espera a la clienta
      const ronda3 = await tx.reviewSession.create({
        data: {
          title: 'Lanzamiento My Voice — piezas para aprobar',
          ronda: RondaRevision.PIEZA,
          expiresAt: dentroDe(7),
          createdAt: hace(0, 20),
          workspaceId: ws.id,
          createdById: u.laura,
          items: { createMany: { data: [pPost.id, pEmail.id].map((piezaId, i) => ({ piezaId, sortOrder: i })) } },
        },
      });

      // -- La bandeja de cada uno
      const aviso = (para: ClaveEquipo, d: { tipo: 'ASIGNACION' | 'ENTREGA'; titulo: string; detalle: string; piezaId?: string; cantidad?: number; cuando: Date; leida?: Date }) =>
        tx.notificacion.create({
          data: {
            workspaceId: ws.id, userId: u[para], clientId: marca.id, tipo: d.tipo, titulo: d.titulo, detalle: d.detalle,
            piezaId: d.piezaId ?? null, cantidad: d.cantidad ?? 1, createdAt: d.cuando, updatedAt: d.cuando, leidaAt: d.leida ?? null,
          },
        });
      await aviso('mateo', { tipo: 'ASIGNACION', titulo: 'Te asignaron 3 piezas', detalle: 'LoBueno', cantidad: 3, cuando: hace(12, 2), leida: hace(12, 1) });
      await aviso('laura', { tipo: 'ENTREGA', titulo: 'Una pieza espera tu visto bueno', detalle: `${pEmail.titulo} · LoBueno`, piezaId: pEmail.id, cuando: hace(7, 4), leida: hace(6, 2) });
      await aviso('sofia', { tipo: 'ASIGNACION', titulo: 'Te asignaron una pieza', detalle: `${pHistoria.titulo} · LoBueno`, piezaId: pHistoria.id, cuando: hace(4, 1), leida: hace(4) });
      await aviso('laura', { tipo: 'ENTREGA', titulo: 'Una pieza espera tu visto bueno', detalle: `${pPost.titulo} · LoBueno`, piezaId: pPost.id, cuando: hace(2, 6), leida: hace(1, 5) });
      await aviso('sofia', { tipo: 'ASIGNACION', titulo: 'Te asignaron una pieza', detalle: `${pAB.titulo} · LoBueno`, piezaId: pAB.id, cuando: hace(1, 4) });
      await aviso('laura', { tipo: 'ENTREGA', titulo: 'Una pieza espera tu visto bueno', detalle: `${pHistoria.titulo} · LoBueno`, piezaId: pHistoria.id, cuando: hace(0, 3) });

      return { ronda2: ronda2.token, ronda3: ronda3.token, workspace: ws.name };
    },
    { timeout: 120_000, maxWait: 20_000 }
  );

  await prisma.$disconnect();

  const base = (process.env.APP_URL || 'https://myvoice.lobueno.co').replace(/\/$/, '');
  console.log(`\nListo: ${resumen.workspace}\n`);
  console.log('Usuarios (contraseña: la de CAPACITACION_PASSWORD)');
  for (const p of EQUIPO) console.log(`  ${`${p.clave}@${DOMINIO}`.padEnd(32)} ${p.nombre} — ${p.puesto} (${p.rol})`);
  console.log('\nEnlaces del cliente (sin login)');
  console.log(`  Copy, campaña 2:   ${base}/?review=${resumen.ronda2}`);
  console.log(`  Piezas, campaña 1: ${base}/?review=${resumen.ronda3}`);
  console.log(`\nArtes para subir en vivo: ${DIR_ARTES}`);
  console.log('\nGuion: docs/capacitacion-lobueno.md');
}

/**
 * Borra el workspace de capacitación de una corrida anterior. El orden importa:
 * varias relaciones no tienen cascada a propósito (borrar una marca no puede
 * llevarse puesto su historial de gasto en producción), así que acá se desarma
 * de las hojas hacia la raíz.
 */
const borrarWorkspaceAnterior = async (tx: Prisma.TransactionClient) => {
  const previo = await tx.workspace.findUnique({ where: { slug: SLUG }, select: { id: true } });
  if (!previo) return;
  const workspaceId = previo.id;
  const clientIds = (await tx.client.findMany({ where: { workspaceId }, select: { id: true } })).map(c => c.id);
  const deMarcas = { clientId: { in: clientIds } };

  await tx.notificacion.deleteMany({ where: { workspaceId } });
  await tx.miembroFuncion.deleteMany({ where: { workspaceId } });
  await tx.reviewSession.deleteMany({ where: { workspaceId } });
  await tx.pieza.deleteMany({ where: { workspaceId } });
  await tx.savedVariation.deleteMany({ where: deMarcas });
  await tx.negativeFeedback.deleteMany({ where: deMarcas });
  await tx.contentDNAProfile.deleteMany({ where: deMarcas });
  await tx.usagePeriod.deleteMany({ where: { workspaceId } });
  await tx.generationLog.deleteMany({ where: { OR: [{ workspaceId }, deMarcas] } });
  await tx.generationPreset.deleteMany({ where: { workspaceId } });
  await tx.workspaceInvite.deleteMany({ where: { workspaceId } });
  await tx.user.updateMany({ where: { workspaceId }, data: { workspaceId: null } });
  await tx.user.updateMany({ where: deMarcas, data: { clientId: null } });
  await tx.client.deleteMany({ where: { workspaceId } });
  await tx.project.deleteMany({ where: { workspaceId } });
  await tx.membership.deleteMany({ where: { workspaceId } });
  await tx.workspace.delete({ where: { id: workspaceId } });
};

main().catch(e => {
  console.error(e);
  process.exit(1);
});
