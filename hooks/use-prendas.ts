"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { fetchPrendas, insertPrenda } from "@/services/prendas.service"
import { GUEST_PRENDAS } from "@/constants/demo-data"
import type { Prenda } from "@/types"

const IS_UUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

export function usePrendas(userId: string, isGuest: boolean) {
  const [prendas, setPrendas] = useState<Prenda[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserSupabaseClient()

  const refresh = useCallback(async () => {
    if (isGuest || !userId || !IS_UUID(userId)) {
      setPrendas(GUEST_PRENDAS)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await fetchPrendas(supabase, userId)
      setPrendas(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      console.error("Error fetching prendas:", msg)
      setPrendas(GUEST_PRENDAS)
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

  return { prendas, loading, refresh, setPrendas, addPrenda }
}
