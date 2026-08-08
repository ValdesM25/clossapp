"use client"

import { useState, useCallback } from "react"
import { signIn } from "@/services/auth.service"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import type { UserMode } from "@/types"

export function useAuth() {
  const [userMode, setUserMode] = useState<UserMode | null>(null)
  const [userId, setUserId] = useState("guest")
  const [userName, setUserName] = useState("Mariela")
  const [userEmail, setUserEmail] = useState("mariela@clossapp.com")
  const [userPhone, setUserPhone] = useState("+52 844 123 4567")
  const [userAvatarUrl, setUserAvatarUrl] = useState("https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isGuest = userMode !== "VIP"
  const isAuthenticated = userMode !== null

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createBrowserSupabaseClient()
      const { uuid, displayName } = await signIn(supabase, email, password)
      setUserMode("VIP")
      setUserId(uuid)
      setUserName(displayName || email.split("@")[0])
      setUserEmail(email)
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
    setUserName("Mariela (Invitada)")
    setUserEmail("invitada@clossapp.com")
  }, [])

  const logout = useCallback(() => {
    setUserMode(null)
    setUserId("guest")
    setUserName("Invitada")
    setUserEmail("")
  }, [])

  const updateProfile = useCallback(async (data: {
    name?: string
    email?: string
    phone?: string
    avatarUrl?: string
    password?: string
  }) => {
    if (data.name !== undefined) setUserName(data.name)
    if (data.email !== undefined) setUserEmail(data.email)
    if (data.phone !== undefined) setUserPhone(data.phone)
    if (data.avatarUrl !== undefined) setUserAvatarUrl(data.avatarUrl)

    if (data.password && userMode === "VIP") {
      try {
        const supabase = createBrowserSupabaseClient()
        await supabase.auth.updateUser({ password: data.password })
      } catch (err) {
        console.warn("[updateProfile] Error updating password in Supabase:", err)
      }
    }
  }, [userMode])

  return {
    userMode, userId, userName, userEmail, userPhone, userAvatarUrl, isGuest, isAuthenticated,
    login, loginAsGuest, logout, updateProfile, loading, error,
  }
}
