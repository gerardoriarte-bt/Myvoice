/**
 * Lectura de la API key de IA de un workspace.
 *
 * Es el único lugar del sistema que descifra `Workspace.aiApiKey`: la columna
 * se escribe cifrada en `controllers/workspaceController.ts` y se lee acá. Una
 * copia de esta lógica que se olvide de descifrar le manda el ciphertext al
 * proveedor, así que los llamadores (generate y refine) tienen que pasar por
 * esta función y no leer la columna directamente.
 *
 * No vive en `services/aiClient.ts` porque ese archivo es deliberadamente puro
 * (no conoce Prisma), ni en `lib/crypto.ts` porque el script de recifrado usa
 * su propio PrismaClient y no debe arrastrar el singleton.
 */

import { prisma } from './prisma.js';
import { decryptSecret, encryptSecret, isEncrypted } from './crypto.js';
import { TenantError } from './tenancy.js';

/**
 * Migración perezosa: la fila venía en texto plano de antes del cifrado. La
 * reciframos fuera del camino crítico —la generación no espera este UPDATE— y
 * con un compare-and-set contra el valor que leímos, para no pisar una clave
 * que el usuario haya guardado mientras tanto. Si falla, la próxima lectura lo
 * reintenta: no hay estado intermedio que reparar.
 *
 * Se usa `updateMany` y no `update` porque el `where` de `update` solo admite
 * campos únicos y acá hace falta el filtro extra sobre `aiApiKey`.
 */
const recifrarEnSegundoPlano = (workspaceId: string, valorLeido: string, plano: string) => {
  let cifrado: string;
  try {
    cifrado = encryptSecret(plano);
  } catch (err) {
    // Entorno mal configurado. La generación con la clave en claro sigue
    // andando: no la cortamos por no poder recifrar.
    console.error('[crypto] no se pudo cifrar la API key del workspace', workspaceId, err);
    return;
  }

  void prisma.workspace
    .updateMany({
      where: { id: workspaceId, aiApiKey: valorLeido },
      data: { aiApiKey: cifrado },
    })
    // El .catch es obligatorio: sin él, un fallo de base se vuelve una
    // unhandled rejection que tumba el proceso.
    .catch(err =>
      console.error('[crypto] no se pudo recifrar la API key del workspace', workspaceId, err)
    );
};

/**
 * Devuelve la API key en claro a partir del valor almacenado, y recifra la fila
 * si todavía estaba en texto plano.
 *
 * Si el valor está cifrado y no se puede descifrar, tira en vez de caer a la
 * clave del servidor: facturar el consumo del tenant contra la cuenta de la
 * agencia sin que nadie se entere es peor que cortar la generación.
 */
export const decryptWorkspaceApiKey = (workspaceId: string, stored: string): string => {
  let plano: string;
  try {
    plano = decryptSecret(stored);
  } catch {
    throw new TenantError(
      'La API key de IA del workspace no se pudo descifrar. Revisá ENCRYPTION_KEY o volvé a cargarla desde Configuración.',
      500
    );
  }

  if (!isEncrypted(stored)) recifrarEnSegundoPlano(workspaceId, stored, plano);

  return plano;
};
