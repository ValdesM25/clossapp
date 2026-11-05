// Sin imports a propósito: se prueba con `node --test lib/plan-stripe.test.mjs`.

export type PlanCobrado = "plus" | "elite"

/** Estados de Stripe en los que la cuenta conserva el plan; past_due mientras Stripe reintenta el cobro. */
const ESTADOS_CON_PLAN = new Set(["active", "trialing", "past_due"])

/**
 * Plan que le toca a una cuenta según su suscripción de Stripe.
 * `precios` mapea el ID de precio de Stripe al plan. Un precio desconocido da "gratis".
 */
export function planDeSuscripcion(
  estado: string,
  precioId: string | null | undefined,
  precios: Record<string, PlanCobrado>,
): "gratis" | PlanCobrado {
  if (!ESTADOS_CON_PLAN.has(estado) || !precioId) return "gratis"
  return precios[precioId] ?? "gratis"
}
