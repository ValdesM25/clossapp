"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { fetchPrendas, insertPrenda } from "@/services/prendas.service"
import { GUEST_PRENDAS } from "@/constants/demo-data"
import type { Prenda } from "@/types"

export function usePrendas(userId: string, isGuest: boolean) {
  const [prendas, setPrendas] = useState<Prenda[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserSupabaseClient()

  const refresh = useCallback(async () => {
    if (isGuest) { setPrendas(GUEST_PRENDAS); setLoading(false); return }
    setLoading(true)
    try {
      const data = await fetchPrendas(supabase, userId)
      setPrendas(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      console.error("Error fetching prendas:", msg)
    } finally {
      setLoading(false)
    }
  }, [supabase, userId, isGuest])

  useEffect(() => { refresh() }, [refresh])

  const addPrenda = useCallback(async (payload: Parameters<typeof insertPrenda>[1]) => {
    await insertPrenda(supabase, payload)
    await refresh()
  }, [supabase, refresh])

  return { prendas, loading, refresh, setPrendas, addPrenda }
}
