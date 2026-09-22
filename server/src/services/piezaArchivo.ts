/**
 * El archivo de una pieza: validación, medidas y snapshot.
 *
 * Las tres reglas de D6 viven acá, y todas salen del mismo razonamiento: el
 * límite no es lo que aguanta el bucket, es lo que la auditoría puede
 * aprovechar. Para leer el texto de una pieza alcanza con ~1.600 px en el lado
 * largo, y los modelos de visión reescalan la imagen igual antes de mirarla.
 * Subir 50 MB no mejora un solo hallazgo: solo cuesta más en transferencia, en
 * almacenamiento y en la llamada al proveedor.
 *
 *   · **10 MB por pieza**, rechazado antes de guardar nada.
 *   · **PNG, JPG y WEBP.** D6 también aceptaba PDF, pero `sharp` con sus
 *     binarios precompilados no lo rasteriza —hace falta libvips con poppler,
 *     que implica compilarlo—, y un PDF aceptado sin snapshot es una pieza sin
 *     previa y sin auditoría: peor que rechazarlo con un mensaje claro. Si el
 *     equipo entrega PDF a menudo, ahí sí conviene pagar esa compilación.
 *   · **Snapshot JPG de 1.600 px de lado largo**, permanente, que además es la
 *     miniatura del tablero: se paga una vez y sirve dos veces.
 *
 * El original vive en `piezas/originales/` y lo borra la regla de ciclo de vida
 * del bucket a los 90 días; por eso el snapshot no se genera "por las dudas",
 * se genera siempre — es lo único que queda después.
 */

import sharp from 'sharp';
import { TenantError } from '../lib/tenancy.js';
import { storage, StorageKey } from '../lib/storage.js';

export const PESO_MAXIMO = 10 * 1024 * 1024;

export const TIPOS_ACEPTADOS = ['image/png', 'image/jpeg', 'image/webp'] as const;

const LADO_LARGO_SNAPSHOT = 1600;

export interface ArchivoSubido {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

export interface VersionGuardada {
  claveOriginal: StorageKey;
  claveSnapshot: StorageKey | null;
  anchoPx: number | null;
  altoPx: number | null;
  pesoBytes: number;
  contentType: string;
}

const extensionDe = (mimetype: string): string =>
  ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as Record<string, string>)[mimetype] ?? 'bin';

/**
 * Se valida ANTES de tocar el bucket. Un archivo rechazado no deja rastro, y el
 * mensaje dice qué hacer en vez de solo que no se puede: quien lo recibe está
 * en Figma, no leyendo documentación.
 */
export const validarArchivo = (archivo: ArchivoSubido): void => {
  if (!TIPOS_ACEPTADOS.includes(archivo.mimetype as (typeof TIPOS_ACEPTADOS)[number])) {
    throw new TenantError(
      `No se puede subir ${archivo.originalname}. Se aceptan PNG, JPG y WEBP; exportá la pieza a alguno de esos —un PDF hay que exportarlo a imagen.`,
      400
    );
  }
  if (archivo.size > PESO_MAXIMO) {
    const mb = (archivo.size / 1024 / 1024).toFixed(1);
    throw new TenantError(
      `No se subió ${archivo.originalname}: pesa ${mb} MB y el máximo es 10 MB. Exportá en PNG o JPG; con 1.600 px en el lado largo la auditoría lee todo.`,
      400
    );
  }
};

/**
 * Guarda el original y su snapshot. El snapshot puede fallar sin que falle la
 * entrega: un PDF raro o un color space exótico no pueden dejar a un diseñador
 * sin poder entregar su trabajo. En ese caso la versión queda sin snapshot y la
 * tarjeta lo dice, que es el mismo criterio que «no se pudo leer».
 */
export const guardarVersion = async (
  piezaId: string,
  numero: number,
  archivo: ArchivoSubido
): Promise<VersionGuardada> => {
  validarArchivo(archivo);

  const base = `${piezaId}/v${numero}`;
  const claveOriginal = await storage().put(
    `piezas/originales/${base}.${extensionDe(archivo.mimetype)}`,
    archivo.buffer,
    archivo.mimetype
  );

  let claveSnapshot: StorageKey | null = null;
  let anchoPx: number | null = null;
  let altoPx: number | null = null;

  try {
    const entrada = sharp(archivo.buffer, { pages: 1 });
    const meta = await entrada.metadata();
    anchoPx = meta.width ?? null;
    altoPx = meta.height ?? null;

    const snapshot = await entrada
      .resize({ width: LADO_LARGO_SNAPSHOT, height: LADO_LARGO_SNAPSHOT, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    claveSnapshot = await storage().put(`piezas/snapshots/${base}.jpg`, snapshot, 'image/jpeg');
  } catch (e) {
    console.warn(`[pieza] sin snapshot para ${piezaId} v${numero}:`, e instanceof Error ? e.message : e);
  }

  return {
    claveOriginal,
    claveSnapshot,
    anchoPx,
    altoPx,
    pesoBytes: archivo.size,
    contentType: archivo.mimetype,
  };
};

/**
 * Las medidas que pidió el canal, para compararlas con las del archivo. Un
 * formato como "300×250" se lee; "20 s" o "600 px de ancho" no son medidas de
 * imagen y devuelven null, porque inventar una comparación es peor que no
 * hacerla.
 */
export const medidasDelFormato = (formato: string): { ancho: number; alto: number } | null => {
  const m = formato.match(/^(\d{2,5})\s*[×x]\s*(\d{2,5})$/);
  return m ? { ancho: Number(m[1]), alto: Number(m[2]) } : null;
};

/**
 * URL de lectura del snapshot.
 *
 * Con S3 es una URL firmada que vence, que es lo que va a producción. Con el
 * driver local se devuelven los bytes como data URL, porque desde E1 el
 * servidor ya no publica `/uploads` —era el agujero por el que cualquiera con
 * la URL bajaba la guía de marca de cualquier empresa— y sin esto el tablero
 * quedaría sin previa en desarrollo. Es un snapshot de ~100 KB, no el original.
 */
export const urlDeSnapshot = async (clave: StorageKey | null | undefined): Promise<string | null> => {
  if (!clave) return null;
  const driver = storage();
  if (driver.nombre === 's3') return driver.getUrl(clave, 60 * 30);
  try {
    const bytes = await driver.get(clave);
    return `data:image/jpeg;base64,${bytes.toString('base64')}`;
  } catch {
    return null;
  }
};
