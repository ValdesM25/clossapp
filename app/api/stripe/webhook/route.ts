import { NextResponse, type NextRequest } from "next/server"
import type Stripe from "stripe"
import { getStripe, sincronizarSuscripcion } from "@/lib/stripe.server"

/**
 * Avisos de Stripe. Verifica la firma con el cuerpo crudo y escribe el plan en
 * perfiles. Si algo falla responde 500 y Stripe reintenta.
 */
export async function POST(req: NextRequest) {
  const secreto = process.env.STRIPE_WEBHOOK_SECRET
  const firma = req.headers.get("stripe-signature")
  if (!secreto || !firma) return NextResponse.json({ error: "Sin firma" }, { status: 400 })

  const stripe = getStripe()
  let evento: Stripe.Event
  try {
    evento = stripe.webhooks.constructEvent(await req.text(), firma, secreto)
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 })
  }

  try {
    let suscripcionId: string | null = null
    if (evento.type === "checkout.session.completed" && evento.data.object.mode === "subscription") {
      const s = evento.data.object.subscription
      suscripcionId = typeof s === "string" ? s : s?.id ?? null
    } else if (
      evento.type === "customer.subscription.created" ||
      evento.type === "customer.subscription.updated" ||
      evento.type === "customer.subscription.deleted"
    ) {
      suscripcionId = evento.data.object.id
    }
    // Se pide la suscripción actual: los avisos pueden llegar desordenados.
    if (suscripcionId) await sincronizarSuscripcion(await stripe.subscriptions.retrieve(suscripcionId))
  } catch (err) {
    console.error("[stripe/webhook]", evento.type, err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "No se pudo procesar" }, { status: 500 })
  }
  return NextResponse.json({ recibido: true })
}
