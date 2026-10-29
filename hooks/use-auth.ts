"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { signIn, signUp, signInWithProvider, requestPasswordReset, displayNameFor, type ProveedorSocial } from "@/services/auth.service"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import type { UserMode } from "@/types"
import type { Plan } from "@/constants/planes"
import type { EstiloPerfil } from "@/constants/onboarding"

const GUEST = { id: "guest", name: "Invitada" } as const

export function useAuth() {
  const [userMode, setUserMode] = useState<UserMode | null>(null)
  const [userId, setUserId] = useState<string>(GUEST.id)
  const [userName, setUserName] = useState("Mariela")
  const [userEmail, setUserEmail] = useState("mariela@clossapp.com")
  const [userPhone, setUserPhone] = useState("+52 844 123 4567")
  const [userAvatarUrl, setUserAvatarUrl] = useState("https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80")
  // null mientras no se sabe (o si la tabla perfiles aun no existe): no se bloquea nada.
  const [plan, setPlan] = useState<Plan | null>(null)
  const [estilo, setEstilo] = useState<EstiloPerfil | null>(null)
  // true = mostrar el recorrido de estilo (cuenta nueva o abierto desde el menú).
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Arranca en true para no mostrar el login un instante antes de saber si ya
  // hay sesion guardada. Es lo que hace que la app instalada no pida la clave
  // en cada apertura.
  const [initializing, setInitializing] = useState(true)

  // Un unico cliente por montaje: crear uno nuevo en cada render dejaria
  // suscripciones de auth colgadas.
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])

  const isGuest = userMode === "GUEST"
  const isRecoleccion = userMode === "RECOLECCION"
  const isAuthenticated = userMode !== null

  useEffect(() => {
    let active = true

    const adopt = (user: { id: string; email?: string | null } | undefined | null) => {
      if (!active || !user) return
      setUserMode("VIP")
      setUserId(user.id)
      setUserName(displayNameFor(user.email, GUEST.name))
      if (user.email) setUserEmail(user.email)
      supabase.from("perfiles").select("plan, estilo, onboarding_completado").eq("user_id", user.id).maybeSingle()
        .then(({ data }) => {
          if (!active || !data) return
          setPlan(data.plan as Plan)
          setEstilo((data.estilo as EstiloPerfil | null) ?? null)
          if (!data.onboarding_completado) setMostrarOnboarding(true)
        })
    }

    // Supabase guarda la sesion en el navegador; esto la recupera al abrir.
    supabase.auth
      .getSession()
      .then(({ data }) => adopt(data.session?.user))
      .catch((err) => {
        console.error("[auth] no se pudo restaurar la sesion", err instanceof Error ? err.message : err)
      })
      .finally(() => {
        if (active) setInitializing(false)
      })

    // Mantiene el estado en sincronia ante refresh de token, login o logout
    // (incluso disparados desde otra pestana).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === "SIGNED_OUT") {
        setUserMode(null)
        setUserId(GUEST.id)
        setUserName(GUEST.name)
        setUserEmail("")
        setPlan(null)
        setEstilo(null)
        setMostrarOnboarding(false)
        return
      }
      adopt(session?.user)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [supabase])

  const login = useCallback(
    async (email: string, password: string, captchaToken?: string) => {
      setLoading(true)
      setError(null)
      try {
        if (email.toLowerCase().includes("recoleccion") || email.toLowerCase().includes("acopio") || password === "recoleccion") {
          setUserMode("RECOLECCION")
          setUserId("punto_centro_norte")
          setUserName("Centro de Acopio Norte - San Patricio")
          setUserEmail(email || "recoleccion@clossapp.com")
          setUserAvatarUrl("https://images.unsplash.com/photo-1578354637658-75508851ed05?w=80&q=80")
          return
        }

        const { uuid, displayName } = await signIn(supabase, email, password, captchaToken)
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
    },
    [supabase]
  )

  // Envuelve una accion de auth con loading/error compartidos con el login.
  const conEstado = useCallback(async <T,>(accion: () => Promise<T>): Promise<T> => {
    setLoading(true)
    setError(null)
    try {
      return await accion()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal. Intenta de nuevo.")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(
    (email: string, password: string, captchaToken?: string) =>
      conEstado(() => signUp(supabase, email, password, captchaToken)),
    [supabase, conEstado]
  )

  const loginWithProvider = useCallback(
    (provider: ProveedorSocial) => conEstado(() => signInWithProvider(supabase, provider)),
    [supabase, conEstado]
  )

  const resetPassword = useCallback(
    (email: string, captchaToken?: string) => conEstado(() => requestPasswordReset(supabase, email, captchaToken)),
    [supabase, conEstado]
  )

  const clearError = useCallback(() => setError(null), [])

  const loginAsGuest = useCallback(() => {
    setUserMode("GUEST")
    setUserId(GUEST.id)
    setUserName("Mariela (Invitada)")
    setUserEmail("invitada@clossapp.com")
  }, [])

  const loginAsRecoleccion = useCallback(() => {
    setUserMode("RECOLECCION")
    setUserId("punto_centro_norte")
    setUserName("Centro de Acopio Norte - San Patricio")
    setUserEmail("recoleccion@clossapp.com")
    setUserAvatarUrl("https://images.unsplash.com/photo-1578354637658-75508851ed05?w=80&q=80")
  }, [])

  const logout = useCallback(async () => {
    // Ahora que la sesion sobrevive al cierre, limpiar solo el estado de React
    // no alcanza: sin signOut volveria sola en la proxima apertura.
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error("[auth] fallo el cierre de sesion", err instanceof Error ? err.message : err)
    }
    setUserMode(null)
    setUserId(GUEST.id)
    setUserName(GUEST.name)
    setUserEmail("")
    setPlan(null)
    setEstilo(null)
    setMostrarOnboarding(false)
  }, [supabase])

  /**
   * Cierra el recorrido. Con `nuevo` guarda las respuestas; sin él (Saltar)
   * solo lo marca como visto para no volver a mostrarlo al entrar.
   */
  const terminarOnboarding = useCallback(async (nuevo?: EstiloPerfil) => {
    setMostrarOnboarding(false)
    if (nuevo) setEstilo(nuevo)
    if (userMode !== "VIP") return
    const cambios = { onboarding_completado: true, updated_at: new Date().toISOString(), ...(nuevo ? { estilo: nuevo } : {}) }
    const { error } = await supabase.from("perfiles").update(cambios).eq("user_id", userId)
    if (error) console.error("[perfil] no se guardó el estilo", error.message)
  }, [supabase, userId, userMode])

  const abrirOnboarding = useCallback(() => setMostrarOnboarding(true), [])

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
        await supabase.auth.updateUser({ password: data.password })
      } catch (err) {
        console.warn("[updateProfile] Error updating password in Supabase:", err)
      }
    }
  }, [userMode, supabase])

  return {
    userMode, userId, userName, userEmail, userPhone, userAvatarUrl, isGuest, isRecoleccion, isAuthenticated, initializing, plan,
    estilo, mostrarOnboarding, abrirOnboarding, terminarOnboarding,
    login, register, loginWithProvider, resetPassword, clearError,
    loginAsGuest, loginAsRecoleccion, logout, updateProfile, loading, error,
  }
}
