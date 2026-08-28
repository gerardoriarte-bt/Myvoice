/**
 * Almacenamiento de archivos, con dos drivers detrás de una sola interfaz.
 *
 * El criterio es el mismo que usa `services/aiClient.ts` con los cuatro
 * proveedores de IA: el call site no sabe cuál está activo. `clientController`
 * pide guardar un archivo y recibir una URL; si eso termina en el disco del
 * contenedor o en S3 es una decisión de entorno, no de código de negocio.
 *
 *   sin S3_BUCKET  → driver `local`, que hace exactamente lo que se hacía antes
 *   con S3_BUCKET  → driver `s3`, con URL firmada y vencimiento
 *
 * Que el driver local siga funcionando no es cortesía para desarrollo: es lo
 * que permite desplegar este código antes de que exista el bucket, sin que se
 * rompa nada en el medio.
 *
 * Ver `docs/plan-e1-almacenamiento.md`.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Clave del objeto, no una URL. Ver D4 del plan: una URL firmada vence. */
export type StorageKey = string;

export interface StorageDriver {
  readonly nombre: 'local' | 's3';
  /** Guarda el contenido y devuelve la clave con la que se lo vuelve a pedir. */
  put(clave: StorageKey, contenido: Buffer, contentType: string): Promise<StorageKey>;
  /**
   * URL para leer el objeto. En S3 vence; en local no, porque el driver local
   * no puede firmar nada — es una de las razones por las que no va a producción.
   */
  getUrl(clave: StorageKey, segundos?: number): Promise<string>;
  delete(clave: StorageKey): Promise<void>;
}

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

/**
 * Driver local: el comportamiento que el producto tuvo hasta ahora, encapsulado
 * sin cambios. Escribe en `uploads/` y devuelve la ruta que sirve
 * `express.static`.
 *
 * Sus dos límites, escritos acá para que nadie lo elija por accidente en
 * producción: los archivos mueren con el contenedor, y la URL que devuelve **no
 * está autenticada ni vence**.
 */
const localDriver: StorageDriver = {
  nombre: 'local',

  async put(clave, contenido) {
    const destino = path.join(UPLOAD_DIR, clave);
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(destino, contenido);
    return clave;
  },

  async getUrl(clave) {
    return `/uploads/${clave}`;
  },

  async delete(clave) {
    await fs.rm(path.join(UPLOAD_DIR, clave), { force: true });
  },
};

/**
 * Cuánto vive una URL firmada. Corta a propósito: es un enlace a la guía de
 * marca de una empresa, y el que la pide ya pasó por `assertClientInWorkspace`.
 * Si alguien la reenvía, deja de servir en minutos en vez de para siempre —que
 * es el problema que tenía el driver local servido por express.static.
 */
const VENCIMIENTO_URL_SEGUNDOS = Number(process.env.S3_URL_TTL_SEGUNDOS) || 600;

/**
 * Driver S3. Las credenciales las resuelve el SDK solo: en la EC2 salen del rol
 * de instancia, así que no hay llaves que rotar ni que puedan aparecer en un
 * dump de la base. Es la misma lección que dejó `Workspace.aiApiKey`.
 */
const crearDriverS3 = (bucket: string): StorageDriver => {
  const cliente = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

  return {
    nombre: 's3',

    async put(clave, contenido, contentType) {
      await cliente.send(
        new PutObjectCommand({ Bucket: bucket, Key: clave, Body: contenido, ContentType: contentType })
      );
      return clave;
    },

    async getUrl(clave, segundos = VENCIMIENTO_URL_SEGUNDOS) {
      return getSignedUrl(cliente, new GetObjectCommand({ Bucket: bucket, Key: clave }), {
        expiresIn: segundos,
      });
    },

    async delete(clave) {
      await cliente.send(new DeleteObjectCommand({ Bucket: bucket, Key: clave }));
    },
  };
};

let driverActivo: StorageDriver = localDriver;

/**
 * Se llama una vez al arrancar. Sin `S3_BUCKET` el producto sigue funcionando
 * con el disco del contenedor: es lo que permite desplegar este código antes de
 * que el bucket exista.
 */
export const initStorage = (): StorageDriver => {
  const bucket = process.env.S3_BUCKET?.trim();
  driverActivo = bucket ? crearDriverS3(bucket) : localDriver;
  return driverActivo;
};

/** true cuando los archivos NO están en el disco del contenedor. */
export const almacenamientoExterno = (): boolean => driverActivo.nombre === 's3';

export const storage = (): StorageDriver => driverActivo;

/** Solo para las pruebas y para el arranque; el resto del código usa `storage()`. */
export const setStorageDriver = (driver: StorageDriver): void => {
  driverActivo = driver;
};

/**
 * Nombre del objeto de una guía de marca. Incluye el `clientId` para que el
 * origen del archivo sea legible desde la consola del bucket, y un sello de
 * tiempo para que subir una guía nueva no pise la anterior: el histórico se
 * conserva aunque la base apunte solo a la última.
 */
export const claveGuiaDeMarca = (clientId: string): StorageKey =>
  `guias/${clientId}-${Date.now()}.pdf`;
