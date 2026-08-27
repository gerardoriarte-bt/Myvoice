/**
 * Cifrado de secretos en reposo (AES-256-GCM).
 *
 * `Workspace.aiApiKey` es la credencial de facturación de cada tenant: un dump
 * de la base —o un backup mal guardado— la entregaba en claro.
 *
 * Formato almacenado:  v1:<iv b64>:<authTag b64>:<ciphertext b64>
 *
 * El prefijo de versión es lo que hace innecesaria una columna extra y lo que
 * habilita la migración perezosa: mientras convivan los dos formatos, el
 * prefijo decide qué hacer con cada fila. Un `v2:` futuro (rotación de clave)
 * entra por el mismo camino sin tocar el esquema.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96 bits: el tamaño para el que GCM está especificado
const KEY_BYTES = 32;

let cachedKey: Buffer | null = null;

/**
 * ENCRYPTION_KEY: 32 bytes en base64 (`openssl rand -base64 32`) o 64 hex.
 *
 * Se lee perezosamente y se cachea: los scripts de `server/scripts/` no pasan
 * por el `dotenv.config()` de `index.ts`, así que la variable puede no existir
 * todavía cuando se importa este módulo.
 */
export const loadEncryptionKey = (): Buffer => {
  if (cachedKey) return cachedKey;

  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY no está definida');

  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64');

  if (key.length !== KEY_BYTES) {
    throw new Error(
      `ENCRYPTION_KEY debe decodificar a ${KEY_BYTES} bytes y decodifica a ${key.length}. Generala con: openssl rand -base64 32`
    );
  }

  cachedKey = key;
  return key;
};

/** Un valor sin prefijo de versión es una fila anterior al cifrado. */
export const isEncrypted = (value: string): boolean => value.startsWith(`${VERSION}:`);

export const encryptSecret = (plain: string): string => {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, loadEncryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  // base64 nunca contiene `:`, así que el split de decryptSecret es seguro.
  return [
    VERSION,
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    data.toString('base64'),
  ].join(':');
};

/**
 * Devuelve el texto plano tal cual si el valor no está cifrado: el llamador
 * decide si lo recifra. Si está cifrado y el authTag no valida, tira — un
 * secreto manipulado o descifrado con la clave equivocada no se devuelve a
 * medias.
 */
export const decryptSecret = (stored: string): string => {
  if (!isEncrypted(stored)) return stored;

  const [, ivB64, tagB64, dataB64] = stored.split(':');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Secreto cifrado con formato inválido');

  const decipher = createDecipheriv(ALGORITHM, loadEncryptionKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
};

/** Huella corta para reportes de operación: identifica una clave sin revelarla. */
export const secretFingerprint = (plain: string): string =>
  createHash('sha256').update(plain).digest('hex').slice(0, 8);
