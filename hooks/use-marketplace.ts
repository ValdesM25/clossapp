"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import {
  fetchVentaItems, fetchRentaItems, publishForSale,
} from "@/services/marketplace.service"
import { categoriaPermiteRenta } from "@/constants/categories"
import { STATIC_MARKET, STATIC_RENTA } from "@/constants/demo-data"
import type { Prenda } from "@/types"

export type MarketTab = "comprar" | "rentar" | "donar"

export function useMarketplace(userId: string, isGuest: boolean) {
  const [marketTab, setMarketTab] = useState<MarketTab>("comprar")
  const [activeFilter, setActiveFilter] = useState("Todos")
  const [items, setItems] = useState<Prenda[]>([])
  const [rentaItems, setRentaItems] = useState<Prenda[]>([])
  const [loading, setLoading] = useState(true)
  const [sellMode, setSellMode] = useState<"venta" | "renta">("venta")
  const [selling, setSelling] = useState(false)
  const [rentaError, setRentaError] = useState<string | null>(null)

  const supabase = createBrowserSupabaseClient()

  const refresh = useCallback(async () => {
    if (isGuest) { setItems(STATIC_MARKET); setRentaItems(STATIC_RENTA); setLoading(false); return }
    setLoading(true)
    try {
      const [venta, renta] = await Promise.all([
        fetchVentaItems(supabase),
        fetchRentaItems(supabase),
      ])
      // Con cuenta real se muestra lo real aunque esté vacío: las prendas de
      // ejemplo no existen en la base y su compra fallaría.
      setItems(venta)
      setRentaItems(renta)
    } catch (err) {
      console.error("Error fetching marketplace:", err instanceof Error ? err.message : JSON.stringify(err))
    } finally {
      setLoading(false)
    }
  }, [supabase, isGuest])

  useEffect(() => { refresh() }, [refresh])

  const publish = useCallback(async (sellPrenda: Prenda, mode: "venta" | "renta", precio: string, talla: string, estadoUso: string) => {
    if (!sellPrenda || !precio) return
    setSelling(true)
    setRentaError(null)
    try {
      if (mode === "renta") {
        if (!categoriaPermiteRenta(sellPrenda.category)) {
          setRentaError("Solo vestidos y accesorios aplican para renta")
          return
        }
        // publishForRent uses fetch API directly, just call it
        const res = await fetch("/api/renta", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prenda_id: sellPrenda.id, precio_renta: parseFloat(precio), user_id: userId }),
        })
        const data = await res.json()
        if (!res.ok) { setRentaError(data.error); return }
        const { data: updated } = await supabase.from("prendas").select("*").eq("en_renta", true).order("created_at", { ascending: false })
        setRentaItems(updated?.length ? updated : STATIC_RENTA)
      } else {
        const updated = await publishForSale(supabase, sellPrenda.id, parseFloat(precio), talla, estadoUso)
        setItems(updated.length ? updated : STATIC_MARKET)
      }
      return true
    } catch (err) {
      console.error("Error publicando:", err instanceof Error ? err.message : JSON.stringify(err))
      return false
    } finally {
      setSelling(false)
    }
  }, [supabase, userId])

  return {
    marketTab, setMarketTab, activeFilter, setActiveFilter,
    items, rentaItems, loading,
    // Comprar y rentar pasan por el carrito y crear_orden_escrow; se conservan
    // en false para no cambiar las props de ItemDetailModal.
    aparting: false, apartSuccess: false,
    sellMode, setSellMode, selling, rentaError,
    refresh, publish,
  }
}
