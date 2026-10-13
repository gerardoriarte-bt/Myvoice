/**
 * Cuándo dos marcas «se llaman igual» (docs/plan-marcas-relacionadas.md).
 *
 * Sin mayúsculas, sin tildes y con los espacios colapsados: «Terpel»,
 * «terpel » y «TÉRPEL» son la misma; «Terpel CRM» es otra.
 *
 * Vive acá y no en `shared/` porque la API compila solo `src/` y su imagen de
 * Docker se arma desde `server/`. El frontend tiene una copia en
 * `utils/nombreDeMarca.ts` solo para avisar antes de crear una marca: la
 * verdad la calcula este archivo (`nombreRepetidoCon` en GET /clients). Si
 * cambiás la regla, cambiala en los dos.
 */
export const normalizarNombre = (nombre: string): string =>
  nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
