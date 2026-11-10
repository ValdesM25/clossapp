"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { signIn, signUp, signInWithProvider, requestPasswordReset, displayNameFor, type ProveedorSocial } from "@/services/auth.service"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import type { UserMode } from "@/types"
import { normalizarPlan, type Plan } from "@/constants/planes"
import type { EstiloPerfil, ModoOnboarding } from "@/constants/onboarding"
import { entrarDemo, salirDemo, restaurarSiQuedoDemo, type TipoDemo } from "@/lib/demo"

const GUEST = { id: "guest", name: "Visita" } as const
const AVATAR_DEMO = "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80"

// Si supabase-js se queda esperando su lock (PWA con pestañas viejas), la UI no debe quedar congelada.
function conTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout de auth")), ms))])
}

export function useAuth() {
  const [userMode, setUserMode] = useState<UserMode | null>(null)
  const [userId, setUserId] = useState<string>(GUEST.id)
  const [userName, setUserName] = useState("Alex")
  const [userEmail, setUserEmail] = useState("alex@clossapp.com")
  const [userPhone, setUserPhone] = useState("+52 844 123 4567")
  const [userAvatarUrl, setUserAvatarUrl] = useState("")
  // null mientras no se sabe (o si la tabla perfiles aun no existe): no se bloquea nada.
  const [plan, setPlan] = useState<Plan | null>(null)
  const [estilo, setEstilo] = useState<EstiloPerfil | null>(null)
  // Solo muestra el acceso a /admin; los permisos reales los revisa la base.
  const [esAdmin, setEsAdmin] = useState(false)
  // Cuenta de cobro de Stripe lista para recibir el dinero de ventas y rentas.
  const [cobrosActivos, setCobrosActivos] = useState(false)
  // Qué parte del recorrido de estilo mostrar (cuenta nueva, preguntas pospuestas o desde el menú).
  const [mostrarOnboarding, setMostrarOnboarding] = useState<ModoOnboarding | false>(false)
  // Modo demo (reemplaza al invitado): datos simulados + recorrido guiado.
  const [demo, setDemo] = useState<TipoDemo | null>(null)
  const [tourActivo, setTourActivo] = useState(false)
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

  // Fuente única de "quién entró": lee el perfil antes de elegir el modo, así
  // una cuenta de punto de recolección va directo a su portal sin pasar por la app.
  const aplicarSesion = useCallback(async (user: { id: string; email?: string | null }) => {
    const { data } = await supabase
      .from("perfiles")
      .select("plan, estilo, onboarding_completado, rol, punto_acopio_nombre, es_admin, nombre, telefono, avatar_url, cobros_activos")
      .eq("user_id", user.id)
      .maybeSingle()
    setUserId(user.id)
    if (user.email) setUserEmail(user.email)
    if (data?.rol === "acopio") {
      setUserMode("RECOLECCION")
      setUserName(data.punto_acopio_nombre || "Punto de recolección")
      setUserAvatarUrl("https://images.unsplash.com/photo-1578354637658-75508851ed05?w=80&q=80")
      return
    }
    setUserMode("VIP")
    setUserName(data?.nombre || displayNameFor(user.email, GUEST.name))
    // Sin datos guardados no se muestran los de ejemplo del estado inicial.
    setUserPhone(data?.telefono ?? "")
    // Sin foto propia queda vacío (se muestra la inicial), nunca la de otra cuenta o la de ejemplo.
    setUserAvatarUrl(data?.avatar_url ?? "")
    if (!data) return
    setEsAdmin(!!data.es_admin)
    setCobrosActivos(!!data.cobros_activos)
    setPlan(normalizarPlan(data.plan))
    setEstilo((data.estilo as EstiloPerfil | null) ?? null)
    if (!data.onboarding_completado) setMostrarOnboarding("inicial")
  }, [supabase])

  useEffect(() => {
    let active = true
    // Si la pestaña se cerró en plena demo, devuelve localStorage a como estaba.
    restaurarSiQuedoDemo()

    const adopt = async (user: { id: string; email?: string | null } | undefined | null) => {
      if (!active || !user) return
      await aplicarSesion(user)
    }

    // Supabase guarda la sesion en el navegador; esto la recupera al abrir.
    conTimeout(supabase.auth.getSession().then(({ data }) => adopt(data.session?.user)))
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
        setUserAvatarUrl("")
        setPlan(null)
        setEstilo(null)
        setEsAdmin(false)
        setCobrosActivos(false)
        setMostrarOnboarding(false)
        return
      }
      // Solo cuando cambia la cuenta: el refresco de token no necesita releer el perfil.
      if (event !== "SIGNED_IN" && event !== "USER_UPDATED") return
      // Fuera del callback: supabase-js se bloquea si se le hacen consultas desde dentro.
      setTimeout(() => void adopt(session?.user), 0)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [supabase, aplicarSesion])

  const login = useCallback(
    async (email: string, password: string, captchaToken?: string) => {
      setLoading(true)
      setError(null)
      try {
        const { uuid } = await signIn(supabase, email, password, captchaToken)
        await aplicarSesion({ id: uuid, email })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Correo o contraseña incorrectos.")
        throw err
      } finally {
        setLoading(false)
      }
    },
    [supabase, aplicarSesion]
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

  const entrarModoDemo = useCallback((tipo: TipoDemo) => {
    entrarDemo(tipo)
    setDemo(tipo)
    setTourActivo(true)
    if (tipo === "acopio") {
      setUserMode("RECOLECCION")
      setUserId("demo_acopio")
      setUserName("Centro Demo Clossapp")
      setUserEmail("centro@ejemplo.com")
      setUserAvatarUrl("https://images.unsplash.com/photo-1578354637658-75508851ed05?w=80&q=80")
      return
    }
    // La demo de usuario reutiliza el modo "GUEST": datos de ejemplo y sin escribir en la base.
    setUserMode("GUEST")
    setUserId(GUEST.id)
    setUserName("Alex (demo)")
    setUserEmail("alex@ejemplo.com")
    setUserAvatarUrl(AVATAR_DEMO)
  }, [])

  const iniciarTour = useCallback(() => setTourActivo(true), [])
  const cerrarTour = useCallback(() => setTourActivo(false), [])

  const logout = useCallback(async () => {
    if (demo) {
      salirDemo()
      setDemo(null)
      setTourActivo(false)
      setUserMode(null)
      setUserId(GUEST.id)
      setUserName(GUEST.name)
      setUserEmail("")
      setUserAvatarUrl("")
      return
    }
    // Primero se limpia la UI: si signOut se cuelga, el usuario igual ve el login.
    setUserMode(null)
    setUserId(GUEST.id)
    setUserName(GUEST.name)
    setUserEmail("")
    setUserAvatarUrl("")
    setPlan(null)
    setEstilo(null)
    setEsAdmin(false)
    setCobrosActivos(false)
    setMostrarOnboarding(false)
    // La sesion sobrevive al cierre: sin signOut volveria sola en la proxima apertura.
    try {
      await conTimeout(supabase.auth.signOut())
    } catch (err) {
      console.error("[auth] fallo el cierre de sesion", err instanceof Error ? err.message : err)
    }
  }, [supabase, demo])

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

  const abrirOnboarding = useCallback((modo: ModoOnboarding = "todo") => setMostrarOnboarding(modo), [])

  const updateProfile = useCallback(async (data: {
    name?: string
    phone?: string
    avatarBlob?: Blob
    password?: string
  }) => {
    // Demo: se ve el cambio, pero no se guarda nada.
    if (userMode !== "VIP") {
      if (data.name !== undefined) setUserName(data.name)
      if (data.phone !== undefined) setUserPhone(data.phone)
      if (data.avatarBlob) setUserAvatarUrl(URL.createObjectURL(data.avatarBlob))
      return
    }

    let avatarUrl: string | undefined
    if (data.avatarBlob) {
      // Ruta nueva en cada subida: closet-images no tiene policy de UPDATE, asi que no se puede sobrescribir.
      // La foto anterior se borra despues de guardar la nueva.
      const path = `${userId}/avatar-${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage.from("closet-images").upload(path, data.avatarBlob, { contentType: "image/jpeg" })
      if (upErr) throw new Error(upErr.message)
      avatarUrl = supabase.storage.from("closet-images").getPublicUrl(path).data.publicUrl
    }

    const { error } = await supabase.from("perfiles").update({
      ...(data.name !== undefined ? { nombre: data.name.trim() || null } : {}),
      ...(data.phone !== undefined ? { telefono: data.phone.trim() || null } : {}),
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId)
    if (error) throw new Error(error.message)

    if (data.name !== undefined && data.name.trim()) setUserName(data.name.trim())
    if (data.phone !== undefined) setUserPhone(data.phone)
    if (avatarUrl) {
      // Solo se borra si era una foto subida por el usuario (no la de ejemplo).
      const previa = userAvatarUrl.split("/closet-images/")[1]
      if (previa?.startsWith(`${userId}/avatar-`)) {
        const { error: rmErr } = await supabase.storage.from("closet-images").remove([previa])
        if (rmErr) console.warn("[perfil] no se pudo borrar la foto anterior", rmErr.message)
      }
      setUserAvatarUrl(avatarUrl)
    }

    if (data.password) {
      const { error: pwErr } = await supabase.auth.updateUser({ password: data.password })
      if (pwErr) throw new Error(pwErr.message)
    }
  }, [userMode, userId, userAvatarUrl, supabase])

  return {
    userMode, userId, userName, userEmail, userPhone, userAvatarUrl, isGuest, isRecoleccion, isAuthenticated, initializing, plan,
    estilo, mostrarOnboarding, abrirOnboarding, terminarOnboarding, esAdmin, cobrosActivos,
    demo, tourActivo, iniciarTour, cerrarTour, entrarModoDemo,
    login, register, loginWithProvider, resetPassword, clearError,
    logout, updateProfile, loading, error,
  }
}
