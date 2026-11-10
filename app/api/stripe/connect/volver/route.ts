import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { getStripe, supabaseAdmin } from "@/lib/stripe.server"
import { cuentaLista, enviarPagosPendientes } from "@/lib/marketplace.server"

/** Regreso del alta de Stripe: revisa si la cuenta ya puede cobrar y manda los pagos que estaban esperando. */
export async function GET(req: NextRequest) {
  const origen = req.nextUrl.origin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origen}/`)

  const { data: perfil } = await supabase.from("perfiles").select("stripe_account_id").eq("user_id", user.id).maybeSingle()
  if (!perfil?.stripe_account_id) return NextResponse.redirect(`${origen}/?cobros=pendiente`)

  try {
    const stripe = getStripe()
    const cuenta = await stripe.accounts.retrieve(perfil.stripe_account_id)
    const lista = cuentaLista(cuenta)
    const { error } = await supabaseAdmin().from("perfiles").update({ cobros_activos: lista }).eq("user_id", user.id)
    if (error) throw error
    if (lista) {
      await enviarPagosPendientes(user.id)
      return NextResponse.redirect(`${origen}/?cobros=ok`)
    }
    // El enlace de alta caducó: se abre uno nuevo en lugar de dejar a la persona a medias.
    if (req.nextUrl.searchParams.has("reintentar")) {
      const link = await stripe.accountLinks.create({
        account: cuenta.id, type: "account_onboarding",
        refresh_url: `${origen}/api/stripe/connect/volver?reintentar=1`, return_url: `${origen}/api/stripe/connect/volver`,
      })
      return NextResponse.redirect(link.url)
    }
    // Datos enviados pero Stripe aún verifica, o faltan datos: la app lo dice y deja volver a intentarlo.
    return NextResponse.redirect(`${origen}/?cobros=pendiente`)
  } catch (err) {
    console.error("[stripe/connect/volver]", err instanceof Error ? err.message : err)
    return NextResponse.redirect(`${origen}/?cobros=error`)
  }
}
