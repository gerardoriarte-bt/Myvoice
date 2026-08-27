/**
 * Límites de consumo por plan, EN CÓDIGO.
 *
 * Los planes cambian con un deploy, no a pedido de un cliente: viven en el diff,
 * donde el cambio queda revisado y fechado, y no en un CRUD de admin donde una
 * edición apurada duplica el techo de un tenant sin dejar rastro.
 *
 * Las cifras de abajo son PROVISORIAS. B1 se despliega en modo observación
 * (`QUOTA_ENFORCE` sin definir) justamente para calibrarlas contra las filas
 * reales de UsagePeriod antes de que corten a alguien.
 */

export interface PlanLimits {
  label: string;
  /** Techo de gasto del workspace en el periodo, en USD. */
  costUsdPerPeriod: number;
  /**
   * Techo secundario en tokens (prompt + completion). No es redundante: cuando
   * el modelo no está en MODEL_PRICING y el proveedor no reporta costo,
   * services/pricing.ts registra 0 USD y una cuota medida solo en dinero queda
   * abierta de par en par.
   */
  tokensPerPeriod: number;
}

/**
 * Las tres claves que ya existen en la data: `agency` es el default del schema
 * y del alta de usuario, `company` el del alta de workspace, y `free` el plan
 * de entrada.
 */
export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free:    { label: 'Free',    costUsdPerPeriod: 2,   tokensPerPeriod: 1_000_000 },
  company: { label: 'Empresa', costUsdPerPeriod: 25,  tokensPerPeriod: 15_000_000 },
  agency:  { label: 'Agencia', costUsdPerPeriod: 150, tokensPerPeriod: 80_000_000 },
};

export const FALLBACK_PLAN = 'agency';

export const PLANES_VALIDOS = Object.keys(PLAN_LIMITS);

const planesAdvertidos = new Set<string>();

/**
 * Ante un plan desconocido (un typo en el alta, un plan viejo que se renombró)
 * nunca se cae a "ilimitado" ni se corta el servicio de un tenant activo: se
 * aplica el fallback y se avisa una sola vez por valor, como hace
 * services/pricing.ts con los modelos sin tarifa.
 */
export const resolvePlanLimits = (plan?: string | null): PlanLimits => {
  const clave = plan?.trim();
  if (clave && PLAN_LIMITS[clave]) return PLAN_LIMITS[clave];

  const etiqueta = clave || '(sin plan)';
  if (!planesAdvertidos.has(etiqueta)) {
    planesAdvertidos.add(etiqueta);
    console.warn(
      `[planLimits] Plan desconocido "${etiqueta}". Se aplican los límites de "${FALLBACK_PLAN}". ` +
      `Agregalo a PLAN_LIMITS en lib/planLimits.ts o corregí Workspace.plan.`
    );
  }
  return PLAN_LIMITS[FALLBACK_PLAN];
};
