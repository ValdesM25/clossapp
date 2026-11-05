import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { getStripe } from "@/lib/stripe.server"

/** Abre el portal de Stripe: cambiar de plan, actualizar la tarjeta o cancelar. */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Inicia sesión para administrar tu suscripción." }, { status: 401 })

  const { data: perfil, error } = await supabase.from("perfiles").select("stripe_customer_id").eq("user_id", user.id).maybeSingle()
  if (error) {
    console.error("[stripe/portal]", error.message)
    return NextResponse.json({ error: "No se pudo leer tu suscripción." }, { status: 500 })
  }
  if (!perfil?.stripe_customer_id) {
    return NextResponse.json({ error: "Tu cuenta no tiene una suscripción pagada." }, { status: 404 })
  }

  try {
    const sesion = await getStripe().billingPortal.sessions.create({
      customer: perfil.stripe_customer_id,
      locale: "es-419",
      return_url: `${req.nextUrl.origin}/planes`,
    })
    return NextResponse.json({ url: sesion.url })
  } catch (err) {
    console.error("[stripe/portal]", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "No se pudo abrir el portal. Intenta de nuevo." }, { status: 500 })
  }
}
