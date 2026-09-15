"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { fetchReparaciones, createReparacion, completeReparacion } from "@/services/reparaciones.service"
import { GUEST_REPARACIONES } from "@/constants/demo-data"
import type { ReparacionDB } from "@/types"

const IS_UUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

export function useReparaciones(userId: string, isGuest: boolean) {
  const [reparaciones, setReparaciones] = useState<ReparacionDB[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserSupabaseClient()

  const refresh = useCallback(async () => {
    if (isGuest || !userId || !IS_UUID(userId)) { setReparaciones(GUEST_REPARACIONES); setLoading(false); return }
    setLoading(true)
    try {
      const data = await fetchReparaciones(supabase, userId)
      setReparaciones(data)
    } catch (err) {
      console.error("Error fetching reparaciones:", err instanceof Error ? err.message : JSON.stringify(err))
      setReparaciones(GUEST_REPARACIONES)
    } finally {
      setLoading(false)
    }
  }, [supabase, userId, isGuest])

  useEffect(() => { refresh() }, [refresh])

  const add = useCallback(async (payload: Omit<Parameters<typeof createReparacion>[1], "user_id"> & { user_id: string; completado: boolean }) => {
    const updated = await createReparacion(supabase, payload)
    setReparaciones(updated)
  }, [supabase])

  const complete = useCallback(async (id: string) => {
    await completeReparacion(supabase, id)
    setReparaciones((prev) => prev.filter((r) => r.id !== id))
  }, [supabase])

  return { reparaciones, loading, refresh, add, complete }
}
