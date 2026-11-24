/**
 * El paso de una campaña en el encabezado (F0): el tipo que comparten los módulos y la plataforma. Cada módulo
 * dice cómo va su paso; la plataforma (`plataforma/proceso.ts`) los junta. Sin imports, como todo `contrato/`.
 */

export type PasoId = 'marca' | 'cdm' | 'myvoice' | 'produccion' | 'implementacion';

/**
 * hecho = ✓ · activo = en curso · pendiente = no empezó · bloqueado = espera algo de otro paso ·
 * neutro = sin campaña elegida, solo navega.
 */
export type EstadoPaso = 'hecho' | 'activo' | 'pendiente' | 'bloqueado' | 'neutro';

export interface Paso {
  paso: PasoId;
  estado: EstadoPaso;
  /** La línea chica bajo el nombre del paso: «6 de 17 piezas». */
  texto?: string;
  /** Qué falta, cuando está bloqueado o pendiente. */
  falta?: string;
  /** A quién le toca destrabarlo. */
  quien?: { id: string; nombre: string };
  /** Todos los que pueden destrabarlo (2026-11-24): los aprobadores de la campaña, o quienes montan. */
  quienes?: { id: string; nombre: string }[];
  avance?: { hechas: number; total: number };
}
