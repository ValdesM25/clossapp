"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useAuth } from "@/hooks/use-auth"
import type { UserMode } from "@/types"
import type { Plan } from "@/constants/planes"
import type { EstiloPerfil } from "@/constants/onboarding"
import type { ProveedorSocial } from "@/services/auth.service"
import type { TipoDemo } from "@/lib/demo"

type AuthContextValue = {
  userMode: UserMode | null
  userId: string
  userName: string
  userEmail: string
  userPhone: string
  userAvatarUrl: string
  isGuest: boolean
  isRecoleccion: boolean
  isAuthenticated: boolean
  /** true mientras se comprueba si hay una sesion guardada al abrir la app. */
  initializing: boolean
  /** Plan de la cuenta con sesion; null si no hay sesion o aun no se sabe. */
  plan: Plan | null
  /** Perfil de estilo guardado; null si no lo llenó. */
  estilo: EstiloPerfil | null
  mostrarOnboarding: boolean
  abrirOnboarding: () => void
  terminarOnboarding: (estilo?: EstiloPerfil) => Promise<void>
  login: (email: string, password: string, captchaToken?: string) => Promise<void>
  register: (email: string, password: string, captchaToken?: string) => Promise<{ requiereConfirmacion: boolean }>
  loginWithProvider: (provider: ProveedorSocial) => Promise<void>
  resetPassword: (email: string, captchaToken?: string) => Promise<void>
  clearError: () => void
  /** Modo demo activo ("usuario" o "acopio"); null en cuentas reales. */
  demo: TipoDemo | null
  tourActivo: boolean
  iniciarTour: () => void
  cerrarTour: () => void
  entrarModoDemo: (tipo: TipoDemo) => void
  logout: () => Promise<void>
  updateProfile: (data: {
    name?: string
    email?: string
    phone?: string
    avatarUrl?: string
    password?: string
  }) => Promise<void>
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
