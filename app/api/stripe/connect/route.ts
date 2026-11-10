import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { getStripe, supabaseAdmin } from "@/lib/stripe.server"
import { cuentaLista, enviarPagosPendientes } from "@/lib/marketplace.server"

/**
 * Cuenta de cobro del vendedor (Stripe Express). Sin cuenta: la crea y manda al alta de Stripe, que pide
 * identificación y CLABE. Con cuenta lista: abre su panel de Stripe para ver depósitos.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Inicia sesión para cobrar tus ventas." }, { status: 401 })

  const { data: perfil, error } = await supabase.from("perfiles").select("stripe_account_id, cobros_activos").eq("user_id", user.id).maybeSingle()
  if (error) return NextResponse.json({ error: "No se pudo leer tu cuenta." }, { status: 500 })

  try {
    const stripe = getStripe()
    if (perfil?.stripe_account_id && perfil.cobros_activos) {
      const link = await stripe.accounts.createLoginLink(perfil.stripe_account_id)
      return NextResponse.json({ url: link.url })
    }

    let cuenta: string | null = perfil?.stripe_account_id ?? null
    // Stripe puede terminar de verificar después del alta: si ya quedó, se activa sin pedir nada más.
    if (cuenta && cuentaLista(await stripe.accounts.retrieve(cuenta))) {
      const { error: errAct } = await supabaseAdmin().from("perfiles").update({ cobros_activos: true }).eq("user_id", user.id)
      if (errAct) throw errAct
      await enviarPagosPendientes(user.id)
      return NextResponse.json({ listo: true })
    }
    if (!cuenta) {
      const nueva = await stripe.accounts.create({
        country: "MX",
        email: user.email,
        business_type: "individual",
        // Express: Stripe hace el alta y la verificación; Clossapp responde por saldos negativos.
        controller: {
          stripe_dashboard: { type: "express" },
          fees: { payer: "application" },
          losses: { payments: "application" },
          requirement_collection: "stripe",
        },
        capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
        metadata: { user_id: user.id },
      }, { idempotencyKey: `cuenta-cobro-${user.id}` })
      cuenta = nueva.id
      const { error: errGuardar } = await supabaseAdmin().from("perfiles").update({ stripe_account_id: cuenta }).eq("user_id", user.id)
      if (errGuardar) throw errGuardar
    }

    const origen = req.nextUrl.origin
    const link = await stripe.accountLinks.create({
      account: cuenta,
      type: "account_onboarding",
      refresh_url: `${origen}/api/stripe/connect/volver?reintentar=1`,
      return_url: `${origen}/api/stripe/connect/volver`,
    })
    return NextResponse.json({ url: link.url })
  } catch (err) {
    console.error("[stripe/connect]", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "No se pudo abrir el alta de tu cuenta de cobro. Intenta de nuevo." }, { status: 500 })
  }
}
