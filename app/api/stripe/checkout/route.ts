import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { getStripe, preciosStripe, supabaseAdmin } from "@/lib/stripe.server"
import { esDePago, normalizarPlan } from "@/constants/planes"

/** Abre el pago de Stripe para pasar a Plus o Elite. El usuario sale de la sesión, nunca del body. */
export async function POST(req: NextRequest) {
  const { plan } = await req.json().catch(() => ({}))
  if (plan !== "plus" && plan !== "elite") {
    return NextResponse.json({ error: "Plan no válido" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Inicia sesión para elegir un plan." }, { status: 401 })

  const { data: perfil, error } = await supabase.from("perfiles").select("plan, stripe_customer_id").eq("user_id", user.id).maybeSingle()
  if (error) {
    console.error("[stripe/checkout]", error.message)
    return NextResponse.json({ error: "No se pudo leer tu plan." }, { status: 500 })
  }
  // Un segundo pago crearía otra suscripción; el cambio de plan va por el portal.
  if (esDePago(normalizarPlan(perfil?.plan))) {
    return NextResponse.json({ error: "Ya tienes un plan de pago. Cámbialo desde Administrar suscripción." }, { status: 409 })
  }

  try {
    const stripe = getStripe()
    let cliente: string | null = perfil?.stripe_customer_id ?? null
    if (!cliente) {
      const nuevo = await stripe.customers.create(
        { email: user.email, metadata: { user_id: user.id } },
        { idempotencyKey: `cliente-${user.id}` },
      )
      cliente = nuevo.id
      const { error: errGuardar } = await supabaseAdmin().from("perfiles").update({ stripe_customer_id: cliente }).eq("user_id", user.id)
      if (errGuardar) throw errGuardar
    }

    const origen = req.nextUrl.origin
    const sesion = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: cliente,
      client_reference_id: user.id,
      line_items: [{ price: preciosStripe().porPlan[plan as "plus" | "elite"], quantity: 1 }],
      subscription_data: { metadata: { user_id: user.id } },
      locale: "es-419",
      success_url: `${origen}/planes?pago=ok`,
      cancel_url: `${origen}/planes?plan=${plan}`,
    })
    return NextResponse.json({ url: sesion.url })
  } catch (err) {
    console.error("[stripe/checkout]", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "No se pudo iniciar el pago. Intenta de nuevo." }, { status: 500 })
  }
}
