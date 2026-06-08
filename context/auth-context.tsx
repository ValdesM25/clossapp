"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useAuth } from "@/hooks/use-auth"
import type { UserMode } from "@/types"

type AuthContextValue = {
  userMode: UserMode | null
  userId: string
  userName: string
  isGuest: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  loginAsGuest: () => void
  logout: () => void
  loading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider")
  return ctx
}
