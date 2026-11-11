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

/** Los avisos de la base llegan como "CODIGO: mensaje"; la persona ve una frase amable. */
function mensajePublicar(msg: string | undefined, propio = false): string {
  if (msg?.includes("SIN_CUENTA_COBRO")) return "Conecta tu cuenta de cobro para publicar. Tócala en Vender."
  if (msg?.includes("PLAN_SIN_MARKETPLACE")) return "Vender y rentar es parte de Plus y Elite."
  if (msg?.includes("PRENDA_EN_PEDIDO")) return "Esta prenda ya está en un pedido en curso. Podrás publicarla si se cancela."
  // propio: texto que ya escribió nuestra API y se puede mostrar tal cual.
  return propio && msg ? msg : "No se pudo publicar la prenda. Intenta de nuevo."
}

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

  const publish = useCallback(async (sellPrenda: Prenda, mode: "venta" | "renta", precio: string, talla: string, estadoUso: string): Promise<{ error?: string }> => {
    const valor = parseFloat(precio)
    if (!(valor > 0)) return { error: "Escribe un precio mayor a 0." }
    setSelling(true)
    setRentaError(null)
    try {
      if (mode === "renta") {
        if (!categoriaPermiteRenta(sellPrenda.category)) {
          const error = "Solo vestidos y accesorios aplican para renta"
          setRentaError(error)
          return { error }
        }
        // publishForRent uses fetch API directly, just call it
        const res = await fetch("/api/renta", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prenda_id: sellPrenda.id, precio_renta: valor, user_id: userId }),
        })
        const data = await res.json()
        if (!res.ok) {
          const error = mensajePublicar(data.error, true)
          setRentaError(error)
          return { error }
        }
        const { data: updated } = await supabase.from("prendas").select("*").eq("en_renta", true).order("created_at", { ascending: false })
        setRentaItems(updated ?? [])
      } else {
        const updated = await publishForSale(supabase, sellPrenda.id, valor, talla, estadoUso)
        setItems(updated)
      }
      return {}
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : ""
      console.error("Error publicando:", msg || JSON.stringify(err))
      return { error: mensajePublicar(msg) }
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
