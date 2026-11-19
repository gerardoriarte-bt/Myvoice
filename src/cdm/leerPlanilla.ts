/**
 * Lee en el navegador la planilla de especificaciones de un medio (.xlsx) y la deja como las filas que espera
 * el servidor (`server/src/cdm/biblioteca/cargarPlanilla.ts`). El servidor no abre planillas: así un archivo
 * subido nunca se interpreta allá. Es la misma lectura que `scripts/planilla-a-json.cjs`.
 */
import type { PlanillaDeMedio } from '../../types';

export const leerPlanilla = async (archivo: File, medio: string, fecha: string): Promise<PlanillaDeMedio> => {
  // `xlsx` pesa: se carga solo cuando alguien sube una planilla.
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await archivo.arrayBuffer(), { type: 'array' });
  const hoja = (nombre: string) =>
    wb.Sheets[nombre] ? (XLSX.utils.sheet_to_json(wb.Sheets[nombre], { defval: '' }) as Record<string, unknown>[]) : [];
  const alertas = wb.Sheets['Alertas y notas']
    ? (XLSX.utils.sheet_to_json(wb.Sheets['Alertas y notas'], { header: 1, defval: '' }) as unknown[][])
        .filter(f => Number.isInteger(f[0]))
        .map(([numero, formato, ubicacion, inconsistencia, accion]) => ({
          numero: Number(numero),
          formato: String(formato),
          ubicacion: String(ubicacion),
          inconsistencia: String(inconsistencia),
          accion: String(accion),
        }))
    : [];
  return { medio, fuente: archivo.name, fecha, especificaciones: hoja('Especificaciones'), zonasSeguras: hoja('Zonas seguras'), alertas };
};
