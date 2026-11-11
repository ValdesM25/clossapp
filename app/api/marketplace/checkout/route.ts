import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { getStripe, supabaseAdmin } from "@/lib/stripe.server"
import { PUNTO_ENTREGA } from "@/constants/donaciones"

type ItemOrden = { tipo: "compra" | "renta"; precio: number; fechaRenta: string | null; prenda: { name: string } }

/**
 * Compra o renta del marketplace con pago real. La base arma la orden (precios y disponibilidad salen de
 * ahí, nunca del cliente) y aparta las prendas; luego se abre el pago en Stripe. El dinero queda en
 * custodia hasta que el centro de acopio confirma la entrega.
 */
export async function POST(req: NextRequest) {
  const { items } = await req.json().catch(() => ({}))
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Tu carrito está vacío." }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Inicia sesión para comprar." }, { status: 401 })

  const { data: orden, error } = await supabase.rpc("crear_orden_escrow", {
    p_items: items.map((it: { prenda_id: unknown; tipo: unknown; fecha_renta?: unknown }) => ({
      prenda_id: Number(it.prenda_id), tipo: it.tipo, fecha_renta: it.fecha_renta ?? null,
    })),
    p_metodo: "tarjeta",
    p_punto_id: PUNTO_ENTREGA.id,
    p_punto_nombre: PUNTO_ENTREGA.nombre,
  })
  if (error || !orden) {
    // Los errores de la base traen "CODIGO: mensaje para la persona".
    const msg = error?.message.split(": ").slice(1).join(": ") || "No se pudo crear tu pedido. Intenta de nuevo."
    return NextResponse.json({ error: msg }, { status: 409 })
  }

  try {
    const origen = req.nextUrl.origin
    const sesion = await getStripe().checkout.sessions.create({
      mode: "payment",
      // Solo tarjeta (incluye Apple Pay y Google Pay): OXXO o transferencia se confirman días después y la orden apartaría prendas.
      allowed_payment_method_types: ["card"],
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: (orden.items as ItemOrden[]).map((it) => ({
        quantity: 1,
        price_data: {
          currency: "mxn",
          unit_amount: Math.round(Number(it.precio) * 100),
          product_data: { name: it.tipo === "renta" ? `Renta: ${it.prenda.name} (${it.fechaRenta})` : it.prenda.name },
        },
      })),
      payment_intent_data: { transfer_group: orden.order_code, metadata: { orden_id: orden.id } },
      metadata: { tipo: "marketplace", orden_id: orden.id },
      // Lo mínimo que permite Stripe; a los 45 min la base libera las prendas apartadas.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      locale: "es-419",
      success_url: `${origen}/?pedido=ok`,
      cancel_url: `${origen}/?pedido=cancelado`,
    }, { idempotencyKey: `orden-${orden.id}` })

    const { error: errGuardar } = await supabaseAdmin().from("escrow_ordenes").update({ stripe_checkout_id: sesion.id }).eq("id", orden.id)
    if (errGuardar) console.error("[marketplace/checkout] guardar sesión", errGuardar.message)
    return NextResponse.json({ url: sesion.url })
  } catch (err) {
    console.error("[marketplace/checkout]", err instanceof Error ? err.message : err)
    // Sin pago abierto, las prendas no se quedan apartadas.
    await supabase.rpc("cancelar_orden_escrow", { p_token: orden.order_code })
    return NextResponse.json({ error: "No se pudo abrir el pago. Intenta de nuevo (el total mínimo es $10 MXN)." }, { status: 500 })
  }
}
