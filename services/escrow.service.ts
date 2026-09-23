import type { SupabaseClient } from "@supabase/supabase-js"
import type { CartItem, EscrowOrder, MetodoPagoEscrow } from "@/types/escrow"
import type { AcopioRegistroDB } from "@/types/donaciones"
import { DEMO_ESCROW_ORDERS } from "@/constants/demo-data"

/**
 * Crea una nueva Orden en Custodia (Escrow) reteniendo el dinero de la compra.
 */
export async function createEscrowOrder(
  supabase: SupabaseClient,
  input: {
    buyerUserId: string
    buyerName: string
    buyerEmail?: string
    items: CartItem[]
    subtotal: number
    metodoPago: MetodoPagoEscrow
    puntoAcopioId?: string
    puntoAcopioNombre?: string
  }
): Promise<EscrowOrder> {
  const codeNum = Math.floor(10000 + Math.random() * 90000)
  const orderCode = `ESC-${codeNum}`
  const qrToken = `ESC-QR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  const orderId = `escrow_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

  const newOrder: EscrowOrder = {
    id: orderId,
    orderCode,
    qrToken,
    buyerUserId: input.buyerUserId,
    buyerName: input.buyerName || "Comprador ClossApp",
    buyerEmail: input.buyerEmail || "comprador@clossapp.com",
    items: input.items,
    subtotal: input.subtotal,
    garantiaEscrow: 0.0,
    totalPagado: input.subtotal,
    metodoPago: input.metodoPago,
    status: "pago_en_custodia",
    puntoAcopioId: input.puntoAcopioId || "norte",
    puntoAcopioNombre: input.puntoAcopioNombre || "Centro de Acopio Norte",
    createdAt: new Date().toISOString(),
  }

  // Intentar guardar en la BD de Supabase (tabla `escrow_ordenes`)
  try {
    const validUserId =
      input.buyerUserId && input.buyerUserId !== "guest" && input.buyerUserId.includes("-")
        ? input.buyerUserId
        : null

    const payload = {
      order_code: orderCode,
      qr_token: qrToken,
      buyer_user_id: validUserId || "guest",
      buyer_name: newOrder.buyerName,
      buyer_email: newOrder.buyerEmail,
      items: input.items,
      subtotal: input.subtotal,
      garantia_escrow: 0.0,
      total_pagado: input.subtotal,
      metodo_pago: input.metodoPago,
      status: "pago_en_custodia",
      punto_acopio_id: newOrder.puntoAcopioId,
      punto_acopio_nombre: newOrder.puntoAcopioNombre,
    }

    const { data } = await supabase
      .from("escrow_ordenes")
      .insert(payload)
      .select("*")
      .maybeSingle()

    if (data?.id) {
      newOrder.id = data.id
      newOrder.createdAt = data.created_at || newOrder.createdAt
    }
  } catch (err) {
    console.warn("createEscrowOrder DB notice (using local escrow state):", err)
  }

  // Guardar siempre en localStorage para disponibilidad local inmediata
  if (typeof window !== "undefined") {
    try {
      const localStr = localStorage.getItem("clossapp_escrow_orders_v1")
      const list: EscrowOrder[] = localStr ? JSON.parse(localStr) : []
      const filtered = list.filter((o) => o.id !== newOrder.id && o.orderCode !== newOrder.orderCode)
      filtered.unshift(newOrder)
      localStorage.setItem("clossapp_escrow_orders_v1", JSON.stringify(filtered))
      window.dispatchEvent(new Event("storage"))
    } catch {}
  }

  return newOrder
}

function normalizeCode(str?: string | null): string {
  if (!str) return ""
  return str.trim().toUpperCase().replace(/^#/, "")
}

/**
 * Obtiene las órdenes en custodia asociadas a un usuario o todas si es operador.
 */
export async function fetchUserEscrowOrders(
  supabase: SupabaseClient,
  userId?: string,
  userEmail?: string
): Promise<EscrowOrder[]> {
  let dbOrders: EscrowOrder[] = []

  try {
    // Consultar TODAS las órdenes de la BD de Supabase para sincronizar entre dispositivos (Laptop, iPad, Celular)
    const { data, error } = await supabase
      .from("escrow_ordenes")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("fetchUserEscrowOrders Supabase notice:", error.message || error)
    }

    if (data && data.length > 0) {
      dbOrders = data.map((o) => ({
        id: o.id,
        orderCode: o.order_code,
        qrToken: o.qr_token,
        buyerUserId: o.buyer_user_id || "guest",
        buyerName: o.buyer_name || "Comprador ClossApp",
        buyerEmail: o.buyer_email || "",
        items: Array.isArray(o.items) ? o.items : [],
        subtotal: Number(o.subtotal || 0),
        garantiaEscrow: Number(o.garantia_escrow || 0),
        totalPagado: Number(o.total_pagado || 0),
        metodoPago: o.metodo_pago || "tarjeta",
        status: o.status || "pago_en_custodia",
        puntoAcopioId: o.punto_acopio_id || "norte",
        puntoAcopioNombre: o.punto_acopio_nombre || "Centro de Acopio Norte",
        createdAt: o.created_at,
        validatedAt: o.validated_at,
        validatedBy: o.validated_by,
      }))
    }
  } catch (err) {
    console.warn("fetchUserEscrowOrders DB notice:", err)
  }

  // Combinar con localStorage
  let localOrders: EscrowOrder[] = []
  if (typeof window !== "undefined") {
    try {
      const localStr = localStorage.getItem("clossapp_escrow_orders_v1")
      if (localStr) localOrders = JSON.parse(localStr)
    } catch {}
  }

  const map = new Map<string, EscrowOrder>()

  // 1. Agregar órdenes de localStorage
  localOrders.forEach((o) => {
    const key = normalizeCode(o.orderCode) || o.id
    map.set(key, o)
  })

  // 2. Fusionar u sobrescribir con órdenes de la BD en la nube (la BD tiene prioridad)
  dbOrders.forEach((o) => {
    const key = normalizeCode(o.orderCode) || o.id
    const existing = map.get(key)
    if (!existing) {
      map.set(key, o)
    } else {
      const isReleased = existing.status === "entregado_y_liberado" || o.status === "entregado_y_liberado"
      const merged: EscrowOrder = {
        ...existing,
        ...o,
        status: isReleased ? "entregado_y_liberado" : o.status || existing.status,
        validatedAt: o.validatedAt || existing.validatedAt,
        validatedBy: o.validatedBy || existing.validatedBy,
      }
      map.set(key, merged)
    }
  })

  // Filtrar demo orders si existen órdenes reales creadas por el usuario
  const allOrdersList = Array.from(map.values())
  const realOrders = allOrdersList.filter(
    (o) => !o.id.startsWith("escrow_demo_") && o.orderCode !== "ESC-48291" && o.orderCode !== "ESC-93820"
  )

  const finalList = realOrders.length > 0 ? realOrders : allOrdersList

  // Si no hay ninguna orden (ni en BD ni local ni demo), sembrar demo
  if (finalList.length === 0) {
    DEMO_ESCROW_ORDERS.forEach((o) => map.set(normalizeCode(o.orderCode) || o.id, o as EscrowOrder))
    const demoList = Array.from(map.values())
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("clossapp_escrow_orders_v1", JSON.stringify(demoList))
      } catch {}
    }
    return demoList
  }

  // Guardar la lista unificada en localStorage de este dispositivo
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("clossapp_escrow_orders_v1", JSON.stringify(finalList))
    } catch {}
  }

  return finalList.sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  )
}

/**
 * Procesa la verificación en el Punto de Recolección y LIBERA LOS FONDOS retenidos al vendedor.
 */
export async function liberarFondosEscrow(
  supabase: SupabaseClient,
  qrTokenOrCode: string,
  centroId: string,
  centroNombre?: string
): Promise<{
  success: boolean
  order?: EscrowOrder
  totalLiberado: number
  mensaje: string
}> {
  try {
    const cleanToken = qrTokenOrCode.trim()
    const searchTokens = new Set<string>()

    const addToken = (t: string) => {
      if (!t) return
      const raw = t.trim()
      const norm = normalizeCode(raw)
      if (raw) searchTokens.add(raw)
      if (norm) searchTokens.add(norm)
    }

    addToken(cleanToken)

    if (cleanToken.startsWith("{") && cleanToken.endsWith("}")) {
      try {
        const parsed = JSON.parse(cleanToken)
        if (parsed.token) addToken(String(parsed.token))
        if (parsed.esc) addToken(String(parsed.esc))
        if (parsed.orderCode) addToken(String(parsed.orderCode))
        if (parsed.id) addToken(String(parsed.id))
      } catch {}
    }

    const tokenList = Array.from(searchTokens)
    const allOrders = await fetchUserEscrowOrders(supabase)

    let target = allOrders.find((o) => {
      const normQr = normalizeCode(o.qrToken)
      const normCode = normalizeCode(o.orderCode)
      const normId = normalizeCode(o.id)

      return tokenList.some((st) => {
        const normSt = normalizeCode(st)
        return (
          normQr === normSt ||
          normCode === normSt ||
          normId === normSt ||
          o.qrToken === st ||
          o.orderCode === st ||
          o.id === st
        )
      })
    })

    if (!target) {
      // Intentar buscar en DB directamente por token o código
      for (const st of tokenList) {
        const normSt = normalizeCode(st)
        const { data } = await supabase
          .from("escrow_ordenes")
          .select("*")
          .or(`qr_token.eq.${st},order_code.eq.${st},order_code.eq.${normSt},id.eq.${st}`)
          .maybeSingle()

        if (data) {
          target = {
            id: data.id,
            orderCode: data.order_code,
            qrToken: data.qr_token,
            buyerUserId: data.buyer_user_id || "guest",
            buyerName: data.buyer_name || "Comprador ClossApp",
            buyerEmail: data.buyer_email || "",
            items: Array.isArray(data.items) ? data.items : [],
            subtotal: Number(data.subtotal || 0),
            garantiaEscrow: Number(data.garantia_escrow || 0),
            totalPagado: Number(data.total_pagado || 0),
            metodoPago: data.metodo_pago || "tarjeta",
            status: data.status || "pago_en_custodia",
            puntoAcopioId: data.punto_acopio_id || "norte",
            puntoAcopioNombre: data.punto_acopio_nombre || "Centro de Acopio Norte",
            createdAt: data.created_at,
            validatedAt: data.validated_at,
            validatedBy: data.validated_by,
          }
          break
        }
      }
    }

    if (!target) {
      return {
        success: false,
        totalLiberado: 0,
        mensaje: "Orden de Custodia no encontrada. Verifica el código QR o folio.",
      }
    }

    const cNombre = centroNombre || "Centro de Acopio Norte"
    const validatedTime = new Date().toISOString()
    const totalLiberado = target.totalPagado

    // Actualizar en Supabase DB
    try {
      await supabase
        .from("escrow_ordenes")
        .update({
          status: "entregado_y_liberado",
          validated_at: validatedTime,
          validated_by: centroId,
        })
        .or(`qr_token.eq.${target.qrToken},order_code.eq.${target.orderCode},order_code.eq.${normalizeCode(target.orderCode)}`)
    } catch (err) {
      console.warn("liberarFondosEscrow DB update notice:", err)
    }

    // Registrar en la bitácora SQL `acopio_registros`
    const prendaResumen = target.items.map((i) => i.prenda.name).join(", ") || "Artículos de Marketplace"
    try {
      await supabase.from("acopio_registros").insert({
        punto_acopio_id: centroId,
        punto_acopio_nombre: cNombre,
        donor_name: target.buyerName,
        donor_email: target.buyerEmail,
        cantidad_prendas: target.items.length || 1,
        puntos_otorgados: 0,
        fecha_registro: validatedTime,
        observaciones: `ENTREGA Y LIBERACIÓN DE CUSTODIA (#${target.orderCode}): $${totalLiberado} MXN liberados al vendedor. Productos: ${prendaResumen}`,
      })
    } catch (err) {
      console.warn("liberarFondosEscrow acopio log notice:", err)
    }

    // Actualizar estado local
    const updatedOrder: EscrowOrder = {
      ...target,
      status: "entregado_y_liberado",
      validatedAt: validatedTime,
      validatedBy: centroId,
    }

    if (typeof window !== "undefined") {
      try {
        const localStr = localStorage.getItem("clossapp_escrow_orders_v1")
        const list: EscrowOrder[] = localStr ? JSON.parse(localStr) : []
        const updatedList = list.map((o) =>
          normalizeCode(o.orderCode) === normalizeCode(target.orderCode) || o.id === target.id
            ? { ...o, status: "entregado_y_liberado", validatedAt: validatedTime, validatedBy: centroId }
            : o
        )
        if (!updatedList.some((o) => normalizeCode(o.orderCode) === normalizeCode(target.orderCode) || o.id === target.id)) {
          updatedList.unshift(updatedOrder)
        }
        localStorage.setItem("clossapp_escrow_orders_v1", JSON.stringify(updatedList))

        // También registrar acopio local
        const localRegsStr = localStorage.getItem("clossapp_local_acopio_registros_v1")
        const localRegs: AcopioRegistroDB[] = localRegsStr ? JSON.parse(localRegsStr) : []
        localRegs.unshift({
          id: `escrow_log_${Date.now()}`,
          ticket_id: target.id,
          punto_acopio_id: centroId,
          punto_acopio_nombre: cNombre,
          donor_user_id: target.buyerUserId,
          donor_name: target.buyerName,
          donor_email: target.buyerEmail,
          cantidad_prendas: target.items.length || 1,
          puntos_otorgados: 0,
          fecha_registro: validatedTime,
          observaciones: `ENTREGA Y LIBERACIÓN DE CUSTODIA (#${target.orderCode}): $${totalLiberado} MXN liberados al vendedor. Productos: ${prendaResumen}`,
        })
        localStorage.setItem("clossapp_local_acopio_registros_v1", JSON.stringify(localRegs))

        window.dispatchEvent(new Event("storage"))
        window.dispatchEvent(new CustomEvent("clossapp_escrow_updated", { detail: { order: updatedOrder } }))
      } catch {}
    }

    return {
      success: true,
      order: updatedOrder,
      totalLiberado,
      mensaje: `¡Entrega confirmada! Se han liberado $${totalLiberado} MXN al vendedor.`,
    }
  } catch (err) {
    console.error("liberarFondosEscrow error:", err)
    return {
      success: false,
      totalLiberado: 0,
      mensaje: "Error al procesar la liberación de fondos.",
    }
  }
}
