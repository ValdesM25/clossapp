import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { getStripe, supabaseAdmin } from "@/lib/stripe.server"
import { esDePago, normalizarPlan } from "@/constants/planes"

const OPCIONES = new Set(["desc_20", "desc_50", "mes_gratis"])

/**
 * Canjea puntos por un descuento. Si la cuenta ya paga, se pega a su suscripción y sale en el
 * próximo cobro; si no, queda pendiente y /api/stripe/checkout lo aplica en su primer pago.
 */
export async function POST(req: NextRequest) {
  const { opcion } = await req.json().catch(() => ({}))
  if (!OPCIONES.has(opcion)) return NextResponse.json({ error: "Opción no válida" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Crea una cuenta para canjear tus puntos." }, { status: 401 })

  const { data: perfil } = await supabase.from("perfiles").select("plan, stripe_subscription_id").eq("user_id", user.id).maybeSingle()
  const subId: string | null = esDePago(normalizarPlan(perfil?.plan)) ? perfil?.stripe_subscription_id ?? null : null

  try {
    // Un cupón por cobro: otro encima reemplazaría al que ya está esperando.
    if (subId && (await getStripe().subscriptions.retrieve(subId)).discounts.length > 0) {
      return NextResponse.json({ error: "Ya tienes un descuento para tu próximo cobro. Canjea otro después de ese cobro." }, { status: 409 })
    }
  } catch (err) {
    console.error("[puntos/canjear] stripe", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "No se pudo canjear. Intenta de nuevo." }, { status: 500 })
  }

  const { data, error } = await supabase.rpc("canjear_puntos", { p_opcion: opcion })
  if (error || !data) {
    const m = error?.message ?? ""
    const msg = m.includes("PUNTOS_INSUFICIENTES") ? "No te alcanzan los puntos para este descuento."
      : m.includes("DESCUENTO_PENDIENTE") ? "Ya tienes un descuento esperando tu primer pago. Canjea otro después."
        : "No se pudo canjear. Intenta de nuevo."
    return NextResponse.json({ error: msg }, { status: error ? 409 : 500 })
  }
  if (!subId) return NextResponse.json({ saldo: data.saldo, aplicado: false })

  const db = supabaseAdmin()
  try {
    await getStripe().subscriptions.update(subId, { discounts: [{ coupon: `canje_${opcion}` }] })
  } catch (err) {
    // Sin descuento no se cobran los puntos: se deshace el canje.
    console.error("[puntos/canjear] aplicar", err instanceof Error ? err.message : err)
    await db.from("descuentos_canje").delete().eq("id", data.descuento_id)
    await db.from("puntos_historial").delete().eq("id", data.historial_id)
    return NextResponse.json({ error: "No se pudo aplicar el descuento. No se usaron tus puntos." }, { status: 500 })
  }
  const { error: errMarcar } = await db.from("descuentos_canje")
    .update({ estado: "aplicado", aplicado_en: subId, aplicado_at: new Date().toISOString() }).eq("id", data.descuento_id)
  if (errMarcar) console.error("[puntos/canjear] marcar aplicado", errMarcar.message)
  return NextResponse.json({ saldo: data.saldo, aplicado: true })
}
