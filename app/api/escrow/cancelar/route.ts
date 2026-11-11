import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { getStripe, supabaseAdmin } from "@/lib/stripe.server"

/** Cancela un pedido antes de la entrega y reembolsa todo lo pagado. */
export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({}))
  if (typeof token !== "string") return NextResponse.json({ error: "Solicitud no válida" }, { status: 400 })

  const supabase = await createClient()
  // La base decide quién puede (quien compró, el centro o admin) y regresa las prendas a la venta.
  const { data: orden, error } = await supabase.rpc("cancelar_orden_escrow", { p_token: token })
  if (error || !orden) return NextResponse.json({ error: error?.message ?? "No se pudo cancelar el pedido." }, { status: 409 })
  if (!orden.stripe_payment_intent) return NextResponse.json(orden)

  try {
    const r = await getStripe().refunds.create({ payment_intent: orden.stripe_payment_intent }, { idempotencyKey: `reembolso-${orden.id}` })
    await supabaseAdmin().from("escrow_ordenes").update({ stripe_reembolso_id: r.id }).eq("id", orden.id)
    return NextResponse.json({ ...orden, stripe_reembolso_id: r.id })
  } catch (err) {
    console.error("[escrow/cancelar] reembolso", orden.id, err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "Se canceló tu pedido, pero el reembolso no salió. Escríbenos a support@clossapp.com." }, { status: 502 })
  }
}
