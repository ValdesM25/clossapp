import Stripe from "stripe"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { planDeSuscripcion, type PlanCobrado } from "@/lib/plan-stripe"

// Solo servidor: usa la llave secreta de Stripe y la service role de Supabase.

let stripe: Stripe | null = null
export function getStripe(): Stripe {
  const llave = process.env.STRIPE_SECRET_KEY
  if (!llave) throw new Error("Falta STRIPE_SECRET_KEY")
  stripe ??= new Stripe(llave)
  return stripe
}

/** ID de precio de Stripe para cada plan de pago, y su inverso para el webhook. */
export function preciosStripe(): { porPlan: Record<PlanCobrado, string>; porPrecio: Record<string, PlanCobrado> } {
  const plus = process.env.STRIPE_PRICE_PLUS
  const elite = process.env.STRIPE_PRICE_ELITE
  if (!plus || !elite) throw new Error("Faltan STRIPE_PRICE_PLUS o STRIPE_PRICE_ELITE")
  return { porPlan: { plus, elite }, porPrecio: { [plus]: "plus", [elite]: "elite" } }
}

/** Escribe en perfiles columnas que el usuario no puede tocar (plan y datos de Stripe). */
export function supabaseAdmin(): SupabaseClient {
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!llave) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY")
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, llave, { auth: { persistSession: false } })
}

/**
 * Copia el estado completo de la suscripción a perfiles. Repetir el mismo
 * evento deja el mismo resultado. Ignora avisos de una suscripción vieja que
 * terminó cuando la cuenta ya tiene otra.
 */
export async function sincronizarSuscripcion(sub: Stripe.Subscription): Promise<void> {
  const db = supabaseAdmin()
  const cliente = typeof sub.customer === "string" ? sub.customer : sub.customer.id
  const item = sub.items.data[0]
  const plan = planDeSuscripcion(sub.status, item?.price.id, preciosStripe().porPrecio)

  const userId = sub.metadata.user_id
  const filtro = userId ? { user_id: userId } : { stripe_customer_id: cliente }
  const { data: perfil, error } = await db.from("perfiles").select("user_id, stripe_subscription_id").match(filtro).maybeSingle()
  if (error) throw error
  if (!perfil) throw new Error(`Sin perfil para la suscripción ${sub.id}`)
  if (plan === "gratis" && perfil.stripe_subscription_id && perfil.stripe_subscription_id !== sub.id) return

  const { error: errUpdate } = await db.from("perfiles").update({
    plan,
    stripe_customer_id: cliente,
    stripe_subscription_id: sub.id,
    suscripcion_estado: sub.status,
    suscripcion_vence: item ? new Date(item.current_period_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", perfil.user_id)
  if (errUpdate) throw errUpdate
}
