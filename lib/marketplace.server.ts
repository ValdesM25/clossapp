import type Stripe from "stripe"
import { getStripe, supabaseAdmin } from "@/lib/stripe.server"
import { repartoPorVendedor } from "@/lib/marketplace"

// Solo servidor: mueve dinero real de la cuenta de Clossapp a las cuentas de cobro de los vendedores.

/** Al liberar una orden, apunta lo que le toca a cada vendedor y lo manda a quien ya tiene cuenta de cobro. */
export async function registrarPagosVendedores(ordenId: string): Promise<void> {
  const db = supabaseAdmin()
  const { data: orden, error } = await db.from("escrow_ordenes").select("id, items, status").eq("id", ordenId).single()
  if (error) throw error
  if (orden.status !== "entregado_y_liberado") throw new Error(`La orden ${ordenId} no está liberada`)

  const items = (orden.items as { sellerId: string; precio: number }[]).filter((i) => i.sellerId)
  const filas = repartoPorVendedor(items).map((p) => ({
    orden_id: ordenId,
    vendedor_id: p.vendedorId,
    bruto_centavos: p.brutoCentavos,
    comision_centavos: p.comisionCentavos,
    neto_centavos: p.netoCentavos,
  }))
  // ignoreDuplicates: liberar dos veces (o reintentar) no duplica pagos.
  const { error: errIns } = await db.from("escrow_pagos_vendedor").upsert(filas, { onConflict: "orden_id,vendedor_id", ignoreDuplicates: true })
  if (errIns) throw errIns
  await enviarPagosPendientes()
}

/**
 * Transfiere los pagos pendientes de vendedores con cuenta de cobro activa. Se llama al liberar una orden
 * y cuando alguien termina de conectar su cuenta; cada llamada reintenta los que hayan fallado antes.
 */
export async function enviarPagosPendientes(vendedorId?: string): Promise<void> {
  const db = supabaseAdmin()
  let q = db.from("escrow_pagos_vendedor")
    .select("id, vendedor_id, neto_centavos, escrow_ordenes(order_code, stripe_charge_id)")
    .eq("estado", "pendiente").limit(50)
  if (vendedorId) q = q.eq("vendedor_id", vendedorId)
  const { data: pendientes, error } = await q
  if (error) throw error
  if (!pendientes?.length) return

  const ids = [...new Set(pendientes.map((p) => p.vendedor_id))]
  const { data: cuentas, error: errC } = await db.from("perfiles").select("user_id, stripe_account_id")
    .in("user_id", ids).eq("cobros_activos", true)
  if (errC) throw errC
  const cuentaDe = new Map((cuentas ?? []).map((c) => [c.user_id, c.stripe_account_id as string]))

  const stripe = getStripe()
  for (const p of pendientes) {
    const destino = cuentaDe.get(p.vendedor_id)
    const orden = p.escrow_ordenes as unknown as { order_code: string; stripe_charge_id: string | null } | null
    if (!destino || !orden?.stripe_charge_id || p.neto_centavos <= 0) continue
    try {
      const t = await stripe.transfers.create({
        amount: p.neto_centavos,
        currency: "mxn",
        destination: destino,
        // Ligada al cobro: sale aunque ese dinero todavía no esté disponible en la cuenta de Clossapp.
        source_transaction: orden.stripe_charge_id,
        transfer_group: orden.order_code,
        metadata: { pago_vendedor_id: p.id },
      }, { idempotencyKey: `pago-vendedor-${p.id}` })
      const { error: errUp } = await db.from("escrow_pagos_vendedor")
        .update({ estado: "enviado", stripe_transfer_id: t.id, enviado_at: new Date().toISOString() }).eq("id", p.id)
      if (errUp) console.error("[marketplace] transferencia hecha sin marcar", p.id, t.id, errUp.message)
    } catch (err) {
      console.error("[marketplace] transferencia falló", p.id, err instanceof Error ? err.message : err)
    }
  }
}

/** Cuenta de cobro lista: Stripe ya verificó a la persona y puede recibir transferencias y depósitos. */
export function cuentaLista(cuenta: { payouts_enabled?: boolean; capabilities?: { transfers?: string } | null }): boolean {
  return !!cuenta.payouts_enabled && cuenta.capabilities?.transfers === "active"
}

/**
 * Pago de una compra del marketplace confirmado por Stripe: la orden pasa a custodia. Si la orden se
 * canceló o expiró antes de que llegara el pago, se devuelve el dinero. Repetir el aviso no cambia nada.
 */
export async function confirmarPagoMarketplace(sesion: Stripe.Checkout.Session): Promise<void> {
  const ordenId = sesion.metadata?.orden_id
  if (!ordenId || sesion.payment_status !== "paid") return
  const piId = typeof sesion.payment_intent === "string" ? sesion.payment_intent : sesion.payment_intent?.id
  if (!piId) throw new Error(`Pago sin payment_intent en la sesión ${sesion.id}`)

  const stripe = getStripe()
  const db = supabaseAdmin()
  const pi = await stripe.paymentIntents.retrieve(piId)
  const cargo = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id ?? null
  const { data: pagada, error } = await db.from("escrow_ordenes")
    .update({ status: "pago_en_custodia", stripe_payment_intent: piId, stripe_charge_id: cargo })
    .eq("id", ordenId).eq("status", "pendiente_pago").select("id")
  if (error) throw error
  if (pagada?.length) return

  const { data: orden, error: errLeer } = await db.from("escrow_ordenes").select("status").eq("id", ordenId).single()
  if (errLeer) throw errLeer
  if (orden.status !== "cancelado") return
  const r = await stripe.refunds.create({ payment_intent: piId }, { idempotencyKey: `reembolso-${ordenId}` })
  const { error: errUp } = await db.from("escrow_ordenes")
    .update({ stripe_payment_intent: piId, stripe_charge_id: cargo, stripe_reembolso_id: r.id }).eq("id", ordenId)
  if (errUp) throw errUp
}
