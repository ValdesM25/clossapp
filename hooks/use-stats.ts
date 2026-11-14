"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { computeStats, fetchStats, type StatsResult } from "@/services/stats.service"
import { GUEST_PRENDAS } from "@/constants/demo-data"

const IS_UUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
const GUEST_OUTFITS = 3

export function useStats(userId: string, userName: string, isGuest: boolean) {
  const [stats, setStats] = useState<StatsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  // El demo pasa por el mismo cálculo que un usuario real, sin red.
  const guestStats = useMemo(() => (isGuest ? computeStats(GUEST_PRENDAS, GUEST_OUTFITS) : null), [isGuest])

  const refresh = useCallback(async () => {
    if (isGuest) return
    if (!userId || !IS_UUID(userId)) { setLoading(false); return }
    setLoading(true)
    setError(false)
    try {
      setStats(await fetchStats(supabase, userId, userName))
    } catch (err) {
      console.error("Error fetching stats:", err instanceof Error ? err.message : JSON.stringify(err))
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [supabase, userId, userName, isGuest])

  useEffect(() => { refresh() }, [refresh])

  if (guestStats) return { stats: guestStats, loading: false, error: false, refresh }
  return { stats, loading, error, refresh }
}
