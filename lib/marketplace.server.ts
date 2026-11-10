import type Stripe from "stripe"
import { getStripe, supabaseAdmin } from "@/lib/stripe.server"
import { repartoPorVendedor, estadoCuenta, type EstadoCobros } from "@/lib/marketplace"
import { avisar } from "@/lib/push.server"

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

/** Guarda en qué punto del alta va la cuenta de cobro. Regresa el estado anterior para saber si hubo cambio. */
export async function guardarEstadoCuenta(userId: string, cuenta: Parameters<typeof estadoCuenta>[0]): Promise<{ anterior: EstadoCobros | null; nuevo: EstadoCobros }> {
  const db = supabaseAdmin()
  const nuevo = estadoCuenta(cuenta)
  const { data, error } = await db.from("perfiles").select("cobros_estado").eq("user_id", userId).maybeSingle()
  if (error) throw error
  const { error: errUp } = await db.from("perfiles").update({ cobros_estado: nuevo, cobros_activos: nuevo === "activa" }).eq("user_id", userId)
  if (errUp) throw errUp
  return { anterior: (data?.cobros_estado as EstadoCobros | undefined) ?? null, nuevo }
}

/** Dueño de una cuenta de cobro de Stripe, para los avisos del webhook. */
export async function usuarioDeCuenta(cuentaId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin().from("perfiles").select("user_id").eq("stripe_account_id", cuentaId).maybeSingle()
  if (error) throw error
  return data?.user_id ?? null
}

type ItemOrden = { tipo?: string; sellerId: string; fechaRenta?: string | null; prenda?: { name?: string } }

/** "Vestido azul" si es una sola prenda, "3 prendas" si son varias. */
function nombrePrendas(items: ItemOrden[]): string {
  return items.length === 1 ? items[0].prenda?.name ?? "1 prenda" : `${items.length} prendas`
}

const pesos = (centavos: number) => `$${(centavos / 100).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Avisa a cada vendedor que su prenda se pagó y debe llevarla al centro de acopio. Un solo aviso por vendedor. */
async function avisarVentas(items: ItemOrden[], centro: string): Promise<void> {
  const porVendedor = new Map<string, ItemOrden[]>()
  for (const i of items) if (i.sellerId) porVendedor.set(i.sellerId, [...(porVendedor.get(i.sellerId) ?? []), i])
  await Promise.all([...porVendedor].map(([vendedor, suyos]) => {
    const rentas = suyos.filter((i) => i.tipo === "renta").length
    const url = "/?vender=1"
    if (suyos.length > 1) {
      const titulo = rentas === 0 ? `¡Vendiste ${suyos.length} prendas!` : rentas === suyos.length ? `Rentaron ${suyos.length} prendas` : `Tienes ${suyos.length} pedidos nuevos`
      return avisar(vendedor, { title: titulo, body: `Llévalas al centro ${centro} para que te paguen.`, url })
    }
    const [it] = suyos
    if (it.tipo === "renta") {
      const dia = it.fechaRenta ? new Date(`${it.fechaRenta}T00:00:00Z`).toLocaleDateString("es-MX", { day: "numeric", month: "long", timeZone: "UTC" }) : ""
      return avisar(vendedor, { title: `Rentaron ${nombrePrendas(suyos)}`, body: `${dia ? `Para el ${dia}. ` : ""}Llévala al centro ${centro}.`, url })
    }
    return avisar(vendedor, { title: `¡Vendiste ${nombrePrendas(suyos)}!`, body: `Llévala al centro ${centro} para que te paguen.`, url })
  }))
}

/** Tras liberar una orden, le dice a cada vendedor si ya se le depositó o si falta conectar su cuenta. */
export async function avisarPagosOrden(ordenId: string): Promise<void> {
  const db = supabaseAdmin()
  const [{ data: orden, error }, { data: pagos, error: errP }] = await Promise.all([
    db.from("escrow_ordenes").select("items").eq("id", ordenId).single(),
    db.from("escrow_pagos_vendedor").select("vendedor_id, estado, neto_centavos").eq("orden_id", ordenId),
  ])
  if (error) throw error
  if (errP) throw errP
  const items = orden.items as ItemOrden[]
  await Promise.all((pagos ?? []).map((p) => {
    const nombre = nombrePrendas(items.filter((i) => i.sellerId === p.vendedor_id))
    const monto = pesos(p.neto_centavos)
    if (p.estado === "enviado") return avisar(p.vendedor_id, { title: `Entregaste ${nombre}`, body: `Te depositamos ${monto} en tu cuenta de Stripe.`, url: "/?vender=1" })
    if (p.estado === "pendiente") return avisar(p.vendedor_id, { title: `Entregaste ${nombre}`, body: `Conecta tu cuenta de cobro para recibir ${monto}.`, url: "/?vender=1" })
  }))
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
    .eq("id", ordenId).eq("status", "pendiente_pago").select("id, items, punto_acopio_nombre")
  if (error) throw error
  // Solo la primera confirmación avisa: un reintento ya no encuentra la orden en pendiente_pago.
  if (pagada?.length) return avisarVentas(pagada[0].items as ItemOrden[], pagada[0].punto_acopio_nombre)

  const { data: orden, error: errLeer } = await db.from("escrow_ordenes").select("status").eq("id", ordenId).single()
  if (errLeer) throw errLeer
  if (orden.status !== "cancelado") return
  const r = await stripe.refunds.create({ payment_intent: piId }, { idempotencyKey: `reembolso-${ordenId}` })
  const { error: errUp } = await db.from("escrow_ordenes")
    .update({ stripe_payment_intent: piId, stripe_charge_id: cargo, stripe_reembolso_id: r.id }).eq("id", ordenId)
  if (errUp) throw errUp
}
