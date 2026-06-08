"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { fetchStats } from "@/services/stats.service"
import type { PrendaExt } from "@/types"

export function useStats(userId: string, userName: string, isGuest: boolean) {
  const [stats, setStats] = useState({ total: 0, usos: 0, outfits: 0, sinUsar: 0 })
  const [topPrendas, setTopPrendas] = useState<PrendaExt[]>([])
  const [olvidadas, setOlvidadas] = useState<PrendaExt[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserSupabaseClient()

  const refresh = useCallback(async () => {
    if (isGuest) { setLoading(false); return }
    setLoading(true)
    try {
      const result = await fetchStats(supabase, userId, userName)
      setStats({ total: result.total, usos: result.usos, outfits: result.outfits, sinUsar: result.sinUsar })
      setTopPrendas(result.topPrendas)
      setOlvidadas(result.olvidadas)
    } catch (err) {
      console.error("Error fetching stats:", err)
    } finally {
      setLoading(false)
    }
  }, [supabase, userId, userName, isGuest])

  useEffect(() => { refresh() }, [refresh])

  return { stats, topPrendas, olvidadas, loading, refresh }
}
