"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { netoVendedor, type PagoVenta } from "@/lib/ventas"
import type { CartItem } from "@/types/escrow"

/** Se dispara al publicar una prenda para que el espacio de vendedor, si está abierto, se actualice. */
export const EVENTO_PUBLICADA = "clossapp:prenda-publicada"

export type Venta = {
  ordenId: string
  status: string
  fecha: string
  items: CartItem[]
  pago: PagoVenta | null
  netoCentavos: number
}

export type Publicada = {
  id: string
  name: string
  image_url: string
  precio: number | null
  precio_renta: number | null
  en_venta: boolean
  en_renta: boolean
  publicada_en: string | null
}

export type RentaEnCurso = { ordenId: string; item: CartItem; compradora: string }

/** Una prenda publicada para venta y renta a la vez cuenta como venta. */
export const modoDePublicada = (p: Pick<Publicada, "en_venta">): "venta" | "renta" => (p.en_venta ? "venta" : "renta")

async function leer(supabase: SupabaseClient, userId: string) {
  const [ordenes, pagos, prendas] = await Promise.all([
    supabase.from("escrow_ordenes").select("id, status, items, buyer_name, created_at")
      .contains("vendedor_ids", [userId]).neq("status", "pendiente_pago").order("created_at", { ascending: false }),
    supabase.from("escrow_pagos_vendedor").select("orden_id, neto_centavos, estado, enviado_at").eq("vendedor_id", userId),
    supabase.from("prendas").select("id, name, image_url, precio, precio_renta, en_venta, en_renta, publicada_en")
      .eq("user_id", userId).or("en_venta.eq.true,en_renta.eq.true").order("publicada_en", { ascending: false, nullsFirst: false }),
  ])
  const falla = ordenes.error ?? pagos.error ?? prendas.error
  if (falla) throw falla

  const pagoDe = new Map<string, PagoVenta>((pagos.data ?? []).map((p) => [
    p.orden_id as string,
    { estado: p.estado, netoCentavos: p.neto_centavos, enviadoAt: p.enviado_at },
  ]))
  const ventas: Venta[] = []
  const rentas: RentaEnCurso[] = []
  for (const o of ordenes.data ?? []) {
    // La orden puede traer prendas de otras personas: solo cuentan las mías.
    const mios = ((o.items ?? []) as CartItem[]).filter((it) => it.sellerId === userId)
    const pago = pagoDe.get(o.id) ?? null
    ventas.push({
      ordenId: o.id, status: o.status, fecha: o.created_at, items: mios, pago,
      netoCentavos: pago ? pago.netoCentavos : netoVendedor(mios.map((it) => it.precio)),
    })
    if (o.status === "en_renta_cliente") {
      for (const item of mios) if (item.tipo === "renta") rentas.push({ ordenId: o.id, item, compradora: o.buyer_name ?? "Comprador ClossApp" })
    }
  }
  const publicadas: Publicada[] = (prendas.data ?? []).map((p) => ({ ...p, id: String(p.id), en_venta: !!p.en_venta, en_renta: !!p.en_renta }))
  return { ventas, rentas, publicadas }
}

export function useVentas(userId: string) {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [publicadas, setPublicadas] = useState<Publicada[]>([])
  const [rentasEnCurso, setRentasEnCurso] = useState<RentaEnCurso[]>([])
  const [cargando, setCargando] = useState(true)
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])

  const recargar = useCallback(() =>
    leer(supabase, userId)
      .then((r) => { setVentas(r.ventas); setRentasEnCurso(r.rentas); setPublicadas(r.publicadas) })
      .catch((err) => console.error("Error leyendo ventas:", err instanceof Error ? err.message : JSON.stringify(err)))
      .finally(() => setCargando(false)),
  [supabase, userId])

  useEffect(() => {
    void recargar()
    const alCambiar = () => void recargar()
    window.addEventListener(EVENTO_PUBLICADA, alCambiar)
    // El depósito al vendedor se escribe después de que la orden cambia: se escuchan las dos tablas.
    const channel = supabase
      .channel("realtime:ventas")
      .on("postgres_changes", { event: "*", schema: "public", table: "escrow_ordenes" }, alCambiar)
      .on("postgres_changes", { event: "*", schema: "public", table: "escrow_pagos_vendedor" }, alCambiar)
      .subscribe()
    return () => {
      window.removeEventListener(EVENTO_PUBLICADA, alCambiar)
      supabase.removeChannel(channel)
    }
  }, [recargar, supabase])

  async function actualizar(id: string, cambios: Record<string, unknown>, fallback: string): Promise<{ error?: string }> {
    const { error } = await supabase.from("prendas").update(cambios).eq("id", id)
    if (error) return { error: fallback }
    await recargar()
    return {}
  }

  const cambiarPrecio = (prenda: Publicada, nuevo: number) =>
    actualizar(prenda.id, { [modoDePublicada(prenda) === "venta" ? "precio" : "precio_renta"]: nuevo }, "No se pudo cambiar el precio. Intenta de nuevo.")

  const quitar = (prenda: Publicada) =>
    actualizar(prenda.id, { [modoDePublicada(prenda) === "venta" ? "en_venta" : "en_renta"]: false }, "No se pudo quitar la prenda. Intenta de nuevo.")

  return { ventas, publicadas, rentasEnCurso, cargando, recargar, cambiarPrecio, quitar }
}
