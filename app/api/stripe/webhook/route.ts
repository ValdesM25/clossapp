import { NextResponse, type NextRequest } from "next/server"
import type Stripe from "stripe"
import { getStripe, sincronizarSuscripcion, supabaseAdmin } from "@/lib/stripe.server"
import { confirmarPagoMarketplace, enviarPagosPendientes, guardarEstadoCuenta, usuarioDeCuenta } from "@/lib/marketplace.server"
import { avisar } from "@/lib/push.server"

/**
 * Avisos de Stripe. Verifica la firma con el cuerpo crudo y escribe el plan en
 * perfiles o el pago de una compra del marketplace. Si algo falla responde 500 y Stripe reintenta.
 */
export async function POST(req: NextRequest) {
  const secreto = process.env.STRIPE_WEBHOOK_SECRET
  const firma = req.headers.get("stripe-signature")
  if (!secreto || !firma) return NextResponse.json({ error: "Sin firma" }, { status: 400 })

  const stripe = getStripe()
  const cuerpo = await req.text()
  let evento: Stripe.Event
  try {
    evento = stripe.webhooks.constructEvent(cuerpo, firma, secreto)
  } catch {
    // Los avisos de cuentas conectadas llegan de otro destino de webhook, con su propio secreto.
    const secretoConnect = process.env.STRIPE_CONNECT_WEBHOOK_SECRET
    try {
      if (!secretoConnect) throw new Error("Sin secreto de Connect")
      evento = stripe.webhooks.constructEvent(cuerpo, firma, secretoConnect)
    } catch {
      return NextResponse.json({ error: "Firma inválida" }, { status: 400 })
    }
  }

  try {
    // Cuenta de cobro de un vendedor: avisa solo cuando cambia de estado.
    if (evento.type === "account.updated") {
      const userId = await usuarioDeCuenta(evento.data.object.id)
      if (!userId) return NextResponse.json({ recibido: true })
      const { anterior, nuevo } = await guardarEstadoCuenta(userId, evento.data.object)
      if (nuevo === anterior) return NextResponse.json({ recibido: true })
      if (nuevo === "activa") {
        // Un fallo al transferir se reintenta en la próxima liberación; no debe callar el aviso.
        await enviarPagosPendientes(userId).catch((err) => console.error("[stripe/webhook] pagos pendientes", err instanceof Error ? err.message : err))
        await avisar(userId, { title: "Tu cuenta de cobro está lista", body: "Ya puedes publicar y recibir el pago de tus ventas.", url: "/?vender=1" })
      } else if (nuevo === "requiere_datos" && (anterior === "activa" || anterior === "en_revision")) {
        // Durante la primera alta también faltan datos; solo se avisa si ya la había terminado.
        await avisar(userId, { title: "Stripe necesita más datos", body: "Complétalos para que podamos pagarte tus ventas.", url: "/?vender=1" })
      }
      return NextResponse.json({ recibido: true })
    }
    // Compra del marketplace (pago único): no toca planes.
    if (evento.type === "checkout.session.completed" && evento.data.object.metadata?.tipo === "marketplace") {
      await confirmarPagoMarketplace(evento.data.object)
      return NextResponse.json({ recibido: true })
    }
    let suscripcionId: string | null = null
    if (evento.type === "checkout.session.completed" && evento.data.object.mode === "subscription") {
      const s = evento.data.object.subscription
      suscripcionId = typeof s === "string" ? s : s?.id ?? null
      // El descuento canjeado con puntos ya se usó en este pago.
      const descuentoId = evento.data.object.metadata?.descuento_id
      if (descuentoId) {
        const { error } = await supabaseAdmin().from("descuentos_canje")
          .update({ estado: "aplicado", aplicado_en: suscripcionId, aplicado_at: new Date().toISOString() })
          .eq("id", descuentoId).eq("estado", "pendiente")
        if (error) throw error
      }
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
