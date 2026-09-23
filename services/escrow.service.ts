import type { SupabaseClient } from "@supabase/supabase-js"
import type { CartItem, EscrowOrder, MetodoPagoEscrow, EscrowStatus } from "@/types/escrow"
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

  // Intentar guardar en la BD de Supabase (tabla `escrow_ordenes` y `donacion_tickets`)
  try {
    const cleanItems = JSON.parse(JSON.stringify(input.items))
    const validUserId =
      input.buyerUserId && input.buyerUserId !== "guest" && input.buyerUserId.includes("-")
        ? input.buyerUserId
        : "guest"

    // 1. Inserción en `escrow_ordenes`
    try {
      const payloadEscrow = {
        order_code: orderCode,
        qr_token: qrToken,
        buyer_user_id: validUserId,
        buyer_name: newOrder.buyerName,
        buyer_email: newOrder.buyerEmail,
        items: cleanItems,
        subtotal: input.subtotal,
        garantia_escrow: 0.0,
        total_pagado: input.subtotal,
        metodo_pago: input.metodoPago,
        status: "pago_en_custodia",
        punto_acopio_id: newOrder.puntoAcopioId,
        punto_acopio_nombre: newOrder.puntoAcopioNombre,
      }

      const { data: escrowData, error: escrowError } = await supabase
        .from("escrow_ordenes")
        .insert(payloadEscrow)
        .select("*")
        .maybeSingle()

      if (escrowData?.id) {
        newOrder.id = escrowData.id
        newOrder.createdAt = escrowData.created_at || newOrder.createdAt
      } else if (escrowError) {
        console.warn("createEscrowOrder escrow_ordenes notice:", escrowError.message || escrowError)
      }
    } catch (e) {
      console.warn("createEscrowOrder escrow_ordenes catch notice:", e)
    }

    // 2. Inserción de respaldo infalible en `donacion_tickets`
    try {
      const payloadTicket = {
        qr_token: qrToken,
        user_id: validUserId,
        donor_name: newOrder.buyerName,
        donor_email: newOrder.buyerEmail || "",
        punto_acopio_id: newOrder.puntoAcopioId,
        punto_acopio_nombre: newOrder.puntoAcopioNombre,
        status: "pago_en_custodia",
        cantidad_prendas: input.items.length || 1,
        prendas_ids: cleanItems,
        puntos_otorgados: Math.round(input.subtotal),
      }

      await supabase.from("donacion_tickets").insert(payloadTicket)
    } catch (e) {
      console.warn("createEscrowOrder donacion_tickets backup notice:", e)
    }
  } catch (err) {
    console.warn("createEscrowOrder DB notice:", err)
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

  // 1. Consultar la tabla `escrow_ordenes` en Supabase
  try {
    const { data, error } = await supabase
      .from("escrow_ordenes")
      .select("*")
      .order("created_at", { ascending: false })

    if (data && data.length > 0) {
      data.forEach((o) => {
        dbOrders.push({
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
        })
      })
    }
  } catch (err) {
    console.warn("fetchUserEscrowOrders escrow_ordenes notice:", err)
  }

  // 2. Consultar la tabla `donacion_tickets` para obtener órdenes respaldadas en custodia
  try {
    const { data: ticketData } = await supabase
      .from("donacion_tickets")
      .select("*")
      .or("status.eq.pago_en_custodia,status.eq.en_renta_cliente,status.eq.entregado_y_liberado")
      .order("created_at", { ascending: false })

    if (ticketData && ticketData.length > 0) {
      ticketData.forEach((t) => {
        const rawToken = t.qr_token || ""
        const code = rawToken.startsWith("ESC-")
          ? rawToken.replace("ESC-QR-", "ESC-")
          : rawToken
        const items = Array.isArray(t.prendas_ids) ? t.prendas_ids : []

        dbOrders.push({
          id: t.id,
          orderCode: code,
          qrToken: rawToken,
          buyerUserId: t.user_id || "guest",
          buyerName: t.donor_name || "Comprador ClossApp",
          buyerEmail: t.donor_email || "",
          items,
          subtotal: Number(t.puntos_otorgados || 0),
          garantiaEscrow: 0,
          totalPagado: Number(t.puntos_otorgados || 0),
          metodoPago: "tarjeta",
          status: (t.status as EscrowStatus) || "pago_en_custodia",
          puntoAcopioId: t.punto_acopio_id || "norte",
          puntoAcopioNombre: t.punto_acopio_nombre || "Centro de Acopio Norte",
          createdAt: t.created_at,
          validatedAt: t.validated_at,
          validatedBy: t.validated_by,
        })
      })
    }
  } catch (err) {
    console.warn("fetchUserEscrowOrders donacion_tickets notice:", err)
  }

  // Combinar con localStorage
  let localOrders: EscrowOrder[] = []
  if (typeof window !== "undefined") {
    try {
      const localStr = localStorage.getItem("clossapp_escrow_orders_v1")
      if (localStr) localOrders = JSON.parse(localStr)
    } catch {}
  }

  // Auto-sincronizar a Supabase DB cualquier orden real local que no exista aún en la nube
  const unSyncedLocal = localOrders.filter(
    (lo) =>
      !lo.id.startsWith("escrow_demo_") &&
      lo.orderCode !== "ESC-48291" &&
      lo.orderCode !== "ESC-93820" &&
      !dbOrders.some(
        (dbo) => normalizeCode(dbo.orderCode) === normalizeCode(lo.orderCode) || dbo.id === lo.id
      )
  )

  if (unSyncedLocal.length > 0) {
    for (const lo of unSyncedLocal) {
      try {
        const validUserId =
          lo.buyerUserId && lo.buyerUserId !== "guest" && lo.buyerUserId.includes("-")
            ? lo.buyerUserId
            : "guest"

        const { data: insertedData } = await supabase
          .from("escrow_ordenes")
          .insert({
            order_code: lo.orderCode,
            qr_token: lo.qrToken,
            buyer_user_id: validUserId,
            buyer_name: lo.buyerName || "Comprador ClossApp",
            buyer_email: lo.buyerEmail || "",
            items: lo.items,
            subtotal: lo.subtotal,
            garantia_escrow: lo.garantiaEscrow || 0,
            total_pagado: lo.totalPagado,
            metodo_pago: lo.metodoPago,
            status: lo.status || "pago_en_custodia",
            punto_acopio_id: lo.puntoAcopioId || "norte",
            punto_acopio_nombre: lo.puntoAcopioNombre || "Centro de Acopio Norte",
          })
          .select("*")
          .maybeSingle()

        if (insertedData) {
          dbOrders.push({
            id: insertedData.id,
            orderCode: insertedData.order_code,
            qrToken: insertedData.qr_token,
            buyerUserId: insertedData.buyer_user_id || "guest",
            buyerName: insertedData.buyer_name || lo.buyerName,
            buyerEmail: insertedData.buyer_email || lo.buyerEmail || "",
            items: Array.isArray(insertedData.items) ? insertedData.items : lo.items,
            subtotal: Number(insertedData.subtotal || lo.subtotal),
            garantiaEscrow: Number(insertedData.garantia_escrow || 0),
            totalPagado: Number(insertedData.total_pagado || lo.totalPagado),
            metodoPago: insertedData.metodo_pago || lo.metodoPago,
            status: insertedData.status || lo.status,
            puntoAcopioId: insertedData.punto_acopio_id || lo.puntoAcopioId,
            puntoAcopioNombre: insertedData.punto_acopio_nombre || lo.puntoAcopioNombre,
            createdAt: insertedData.created_at || lo.createdAt,
            validatedAt: insertedData.validated_at || lo.validatedAt,
            validatedBy: insertedData.validated_by || lo.validatedBy,
          })
        }
      } catch (err) {
        console.warn("Auto-syncing escrow order to DB notice:", err)
      }
    }
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

  // Filtrar demo orders y obtener la lista real
  const allOrdersList = Array.from(map.values())
  const realOrders = allOrdersList.filter(
    (o) => !o.id.startsWith("escrow_demo_") && o.orderCode !== "ESC-48291" && o.orderCode !== "ESC-93820"
  )

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("clossapp_escrow_orders_v1", JSON.stringify(realOrders))
    } catch {}
  }

  return realOrders.sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  )
}

/**
 * Elimina TODAS las órdenes en custodia (área de venta) tanto de Supabase DB como de localStorage.
 */
export async function clearAllEscrowOrders(supabase: SupabaseClient): Promise<boolean> {
  try {
    await supabase.from("escrow_ordenes").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  } catch (err) {
    console.warn("clearAllEscrowOrders DB delete notice:", err)
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("clossapp_escrow_orders_v1")
      localStorage.setItem("clossapp_escrow_orders_v1", JSON.stringify([]))
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("clossapp_escrow_updated", { detail: { cleared: true } }))
    } catch {}
  }

  return true
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
      // Intentar consultar la lista completa de BD directamente si no estuvo en memoria local
      try {
        const { data: dbAll } = await supabase.from("escrow_ordenes").select("*")
        if (dbAll && dbAll.length > 0) {
          const match = dbAll.find((row: any) => {
            const rowQr = normalizeCode(row.qr_token)
            const rowCode = normalizeCode(row.order_code)
            const rowId = normalizeCode(row.id)
            return tokenList.some((st) => {
              const normSt = normalizeCode(st)
              return (
                rowQr === normSt ||
                rowCode === normSt ||
                rowId === normSt ||
                row.qr_token === st ||
                row.order_code === st ||
                row.id === st
              )
            })
          })

          if (match) {
            target = {
              id: match.id,
              orderCode: match.order_code,
              qrToken: match.qr_token,
              buyerUserId: match.buyer_user_id || "guest",
              buyerName: match.buyer_name || "Comprador ClossApp",
              buyerEmail: match.buyer_email || "",
              items: Array.isArray(match.items) ? match.items : [],
              subtotal: Number(match.subtotal || 0),
              garantiaEscrow: Number(match.garantia_escrow || 0),
              totalPagado: Number(match.total_pagado || 0),
              metodoPago: match.metodo_pago || "tarjeta",
              status: match.status || "pago_en_custodia",
              puntoAcopioId: match.punto_acopio_id || "norte",
              puntoAcopioNombre: match.punto_acopio_nombre || "Centro de Acopio Norte",
              createdAt: match.created_at,
              validatedAt: match.validated_at,
              validatedBy: match.validated_by,
            }
          }
        }
      } catch (err) {
        console.warn("liberarFondosEscrow direct DB lookup notice:", err)
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

    // Actualizar en Supabase DB en ambas tablas para garantizar la sincronización
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
      console.warn("liberarFondosEscrow escrow_ordenes DB update notice:", err)
    }

    try {
      await supabase
        .from("donacion_tickets")
        .update({
          status: "entregado_y_liberado",
          validated_at: validatedTime,
          validated_by: centroId,
        })
        .or(`qr_token.eq.${target.qrToken},id.eq.${target.id}`)
    } catch (err) {
      console.warn("liberarFondosEscrow donacion_tickets DB update notice:", err)
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

/**
 * Paso 1/2 del ciclo de Renta: El operador confirma la RECOLECCIÓN de la prenda por el cliente.
 * Cambia el estado a "en_renta_cliente".
 */
export async function confirmarEntregaRentaCliente(
  supabase: SupabaseClient,
  qrTokenOrCode: string,
  centroId: string,
  centroNombre?: string
): Promise<{
  success: boolean
  order?: EscrowOrder
  mensaje: string
}> {
  try {
    const allOrders = await fetchUserEscrowOrders(supabase)
    const normToken = normalizeCode(qrTokenOrCode)

    const target = allOrders.find(
      (o) =>
        normalizeCode(o.qrToken) === normToken ||
        normalizeCode(o.orderCode) === normToken ||
        o.id === qrTokenOrCode
    )

    if (!target) {
      return {
        success: false,
        mensaje: "Orden de Renta no encontrada. Verifica el código QR #1 de recolección.",
      }
    }

    const validatedTime = new Date().toISOString()

    // Actualizar estado a `en_renta_cliente` en Supabase DB
    try {
      await supabase
        .from("escrow_ordenes")
        .update({ status: "en_renta_cliente" })
        .or(`qr_token.eq.${target.qrToken},order_code.eq.${target.orderCode}`)
    } catch {}

    try {
      await supabase
        .from("donacion_tickets")
        .update({ status: "en_renta_cliente" })
        .or(`qr_token.eq.${target.qrToken},id.eq.${target.id}`)
    } catch {}

    const updatedOrder: EscrowOrder = {
      ...target,
      status: "en_renta_cliente",
      validatedAt: validatedTime,
      validatedBy: centroId,
    }

    if (typeof window !== "undefined") {
      try {
        const localStr = localStorage.getItem("clossapp_escrow_orders_v1")
        const list: EscrowOrder[] = localStr ? JSON.parse(localStr) : []
        const updatedList = list.map((o) =>
          normalizeCode(o.orderCode) === normalizeCode(target.orderCode) || o.id === target.id
            ? { ...o, status: "en_renta_cliente" as EscrowStatus }
            : o
        )
        localStorage.setItem("clossapp_escrow_orders_v1", JSON.stringify(updatedList))
        window.dispatchEvent(new Event("storage"))
        window.dispatchEvent(new CustomEvent("clossapp_escrow_updated", { detail: { order: updatedOrder } }))
      } catch {}
    }

    return {
      success: true,
      order: updatedOrder,
      mensaje: "¡Recolección de Renta confirmada! La prenda ha sido entregada al cliente (Paso 1/2).",
    }
  } catch (err) {
    return {
      success: false,
      mensaje: "Error al procesar la entrega de renta al cliente.",
    }
  }
}
