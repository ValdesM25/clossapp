"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { fetchPrendas, insertPrenda, deletePrenda as deletePrendaService } from "@/services/prendas.service"
import { GUEST_PRENDAS } from "@/constants/demo-data"
import type { Prenda } from "@/types"

const IS_UUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

export function deduplicatePrendas(items: Prenda[]): Prenda[] {
  const seen = new Set<string>()
  return items.filter((p) => {
    const key = (p.name || "").trim().toLowerCase()
    if (!key) return true
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function usePrendas(userId: string, isGuest: boolean) {
  const [prendas, setPrendas] = useState<Prenda[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserSupabaseClient()

  const refresh = useCallback(async () => {
    if (isGuest || !userId || !IS_UUID(userId)) {
      setPrendas(deduplicatePrendas(GUEST_PRENDAS))
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await fetchPrendas(supabase, userId)
      setPrendas(deduplicatePrendas(data))
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      console.error("Error fetching prendas:", msg)
      setPrendas(deduplicatePrendas(GUEST_PRENDAS))
    } finally {
      setLoading(false)
    }
  }, [supabase, userId, isGuest])

  useEffect(() => { refresh() }, [refresh])

  const addPrenda = useCallback(async (payload: Parameters<typeof insertPrenda>[1]) => {
    if (!IS_UUID(payload.user_id)) {
      console.warn("Skipping DB insert for non-UUID user:", payload.user_id)
      return
    }
    await insertPrenda(supabase, payload)
    await refresh()
  }, [supabase, refresh])

  const deletePrenda = useCallback(async (prendaId: string) => {
    setPrendas((prev) => prev.filter((p) => p.id !== prendaId))
    if (isGuest || !userId || !IS_UUID(userId)) return
    try {
      await deletePrendaService(supabase, prendaId)
    } catch (err) {
      console.error("Error deleting prenda:", err)
      await refresh()
    }
  }, [supabase, userId, isGuest, refresh])

  return { prendas, loading, refresh, setPrendas, addPrenda, deletePrenda }
}

