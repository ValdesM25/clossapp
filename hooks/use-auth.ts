"use client"

import { useState, useCallback } from "react"
import { signIn } from "@/services/auth.service"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import type { UserMode } from "@/types"

export function useAuth() {
  const [userMode, setUserMode] = useState<UserMode | null>(null)
  const [userId, setUserId] = useState("guest")
  const [userName, setUserName] = useState("Invitada")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isGuest = userMode === "GUEST"
  const isAuthenticated = userMode !== null

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createBrowserSupabaseClient()
      const { uuid, displayName } = await signIn(supabase, email, password)
      setUserMode("VIP")
      setUserId(uuid)
      setUserName(displayName)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código no reconocido")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const loginAsGuest = useCallback(() => {
    setUserMode("GUEST")
    setUserId("guest")
    setUserName("Invitada")
  }, [])

  const logout = useCallback(() => {
    setUserMode(null)
    setUserId("guest")
    setUserName("Invitada")
  }, [])

  return {
    userMode, userId, userName, isGuest, isAuthenticated,
    login, loginAsGuest, logout, loading, error,
  }
}
