"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Turnstile, TURNSTILE_SITE_KEY, type TurnstileHandle } from "@/components/shared/turnstile"
import { useAuthContext } from "@/context/auth-context"
import { ERROR_CREDENCIALES, type ProveedorSocial } from "@/services/auth.service"
import { guardarVolverA } from "@/lib/volver-a"

type Modo = "entrar" | "crear" | "recuperar"

// Proveedores activos, ej. "google,facebook". Se encienden aquí solo después de
// configurarlos en Supabase; así producción no muestra botones que fallan.
const PROVEEDORES = (process.env.NEXT_PUBLIC_LOGIN_SOCIAL ?? "").split(",").map((p) => p.trim())
const CON_GOOGLE = PROVEEDORES.includes("google")
const CON_FACEBOOK = PROVEEDORES.includes("facebook")

const TEXTO_BOTON: Record<Modo, string> = {
  entrar: "Iniciar sesión",
  crear: "Crear cuenta",
  recuperar: "Enviar enlace para recuperar",
}

export function LoginView() {
  const { login, register, loginWithProvider, resetPassword, clearError, entrarModoDemo, loading, error } = useAuthContext()
  const [modo, setModo] = useState<Modo>("entrar")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaFallo, setCaptchaFallo] = useState(false)
  const captchaRef = useRef<TurnstileHandle>(null)
  const esperandoCaptcha = !!TURNSTILE_SITE_KEY && !captchaToken

  // /auth/callback redirige con ?auth_error=1 si el enlace del correo falló o expiró.
  // ?volver=/ruta: a dónde regresar al terminar de entrar (lo usa /centros).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    guardarVolverA(params.get("volver"))
    if (params.has("auth_error")) {
      setAviso("El enlace expiró o ya se usó. Intenta entrar de nuevo o pide otro correo.")
      window.history.replaceState(null, "", window.location.pathname)
    }
  }, [])

  function cambiarModo(m: Modo) {
    setModo(m)
    setAviso(null)
    clearError()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || (modo !== "recuperar" && !password)) return
    setAviso(null)
    const token = captchaToken ?? undefined
    try {
      if (modo === "entrar") {
        await login(email, password, token)
      } else if (modo === "crear") {
        const { requiereConfirmacion } = await register(email, password, token)
        if (requiereConfirmacion) {
          setAviso(`Te mandamos un correo a ${email.trim()}. Abre el enlace para activar tu cuenta.`)
          setPassword("")
        }
      } else {
        await resetPassword(email, token)
        setAviso("Si el correo tiene cuenta, te llegará un enlace para elegir una contraseña nueva.")
      }
    } catch { /* el error ya queda en el contexto */ }
    finally {
      // Cada token de Turnstile sirve una sola vez.
      captchaRef.current?.reset()
    }
  }

  async function social(provider: ProveedorSocial) {
    try { await loginWithProvider(provider) } catch { /* error en el contexto */ }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-dvh bg-zinc-50/60 sm:py-8 sm:px-4 flex flex-col justify-center items-center">
      {/* Tarjeta principal estilo app / referencia: en móvil ancho completo, en PC contenedor centrado */}
      <div className="w-full sm:max-w-md bg-white min-h-dvh sm:min-h-0 sm:rounded-3xl sm:shadow-[0_8px_30px_rgb(0,0,0,0.06)] sm:border sm:border-zinc-200/80 overflow-hidden flex flex-col">
        {/* Imagen en la parte de arriba con degradado suave hacia el blanco */}
        <div className="relative h-60 sm:h-64 w-full overflow-hidden shrink-0 bg-zinc-100">
          <img
            src="/img_login_1mitad.jpg"
            alt="Imagen de bienvenida"
            className="h-full w-full object-cover object-center"
          />
          {/* Degradado que desvanece la foto hacia blanco exactamente como la referencia */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
        </div>

        {/* Contenido / Formulario */}
        <div className="px-6 pb-10 pt-0 sm:px-8 flex-1 flex flex-col">
          {/* Logo en medio, posicionado con la transición del degradado */}
          <div className="mb-6 text-center -mt-12 relative z-10">
            <img src="/logo.svg" alt="Clossapp" className="mx-auto h-12 w-auto mb-2 drop-shadow-xs" />
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Tu armario digital</p>
          </div>

            {/* Pestañas de modo (Iniciar sesión / Crear cuenta) al estilo del diseño de referencia */}
            <div className="flex items-center gap-6 border-b border-zinc-200 mb-6">
              <button
                type="button"
                onClick={() => cambiarModo("entrar")}
                className={cn(
                  "pb-2.5 text-sm font-semibold transition-colors relative",
                  modo === "entrar"
                    ? "text-zinc-900 border-b-2 border-zinc-900 -mb-px"
                    : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => cambiarModo("crear")}
                className={cn(
                  "pb-2.5 text-sm font-semibold transition-colors relative",
                  modo === "crear"
                    ? "text-zinc-900 border-b-2 border-zinc-900 -mb-px"
                    : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                Crear cuenta
              </button>
              {modo === "recuperar" && (
                <span className="pb-2.5 text-sm font-semibold text-zinc-900 border-b-2 border-zinc-900 -mb-px">
                  Recuperar contraseña
                </span>
              )}
            </div>

            <div className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Correo electrónico
                  </label>
                  <Input
                    id="login-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@ejemplo.com"
                    type="email"
                    autoComplete="email"
                    className="h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:border-zinc-900 focus-visible:ring-1 focus-visible:ring-zinc-900"
                  />
                </div>

                {modo !== "recuperar" && (
                  <div>
                    <label htmlFor="login-password" className="block text-xs font-medium text-zinc-700 mb-1.5">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        type={mostrarPassword ? "text" : "password"}
                        autoComplete={modo === "crear" ? "new-password" : "current-password"}
                        className="h-12 w-full rounded-xl border border-zinc-300 bg-white pr-11 pl-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:border-zinc-900 focus-visible:ring-1 focus-visible:ring-zinc-900"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarPassword((prev) => !prev)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors p-1"
                        aria-label={mostrarPassword ? "Ocultar contraseña" : "Ver contraseña"}
                      >
                        {mostrarPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {modo === "crear" && (
                      <p className="mt-1.5 text-xs text-zinc-500">Mínimo 8 caracteres, con letras y números.</p>
                    )}
                  </div>
                )}

                {/* Enlace de ¿Olvidaste tu contraseña? centrado justo debajo de contraseña como en la referencia */}
                {modo === "entrar" && (
                  <div className="text-center pt-0.5">
                    <button
                      type="button"
                      onClick={() => cambiarModo("recuperar")}
                      className="text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                )}

                <Turnstile ref={captchaRef} onToken={(t) => { setCaptchaToken(t); if (t) setCaptchaFallo(false) }} onFallo={() => setCaptchaFallo(true)} />
                {captchaFallo && !captchaToken && (
                  <p role="alert" className="text-xs text-red-500 font-medium">
                    No cargó la verificación anti-robots. Desactiva el bloqueador de anuncios o recarga la página.
                  </p>
                )}

                {error && <p role="alert" className="text-xs text-red-500 font-medium">{error}</p>}
                {/* Supabase no revela si el correo existe: ante credenciales que no coinciden se invita a registrarse. */}
                {modo === "entrar" && error === ERROR_CREDENCIALES && (
                  <p className="text-xs text-zinc-700 border border-zinc-200 rounded-xl px-4 py-3 bg-zinc-50">
                    ¿Aún no tienes cuenta?{" "}
                    <button type="button" onClick={() => cambiarModo("crear")} className="font-semibold underline underline-offset-2">Créala gratis</button>
                    {" "}con este correo, o{" "}
                    <button type="button" onClick={() => cambiarModo("recuperar")} className="font-semibold underline underline-offset-2">recupera tu contraseña</button>.
                  </p>
                )}
                {aviso && <p role="status" className="text-xs text-zinc-700 border border-zinc-200 rounded-xl px-4 py-3 bg-zinc-50">{aviso}</p>}

                {/* Botón principal (Iniciar sesión) */}
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  disabled={loading || esperandoCaptcha}
                  className="w-full h-12 rounded-xl bg-zinc-900 text-white text-sm font-medium tracking-wide disabled:opacity-50 flex items-center justify-center hover:bg-zinc-800 transition-colors shadow-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : esperandoCaptcha ? "Verificando…" : TEXTO_BOTON[modo]}
                </motion.button>
              </form>

              {/* Volver a iniciar sesión si está en modo recuperar */}
              {modo === "recuperar" && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => cambiarModo("entrar")}
                    className="text-xs font-medium text-zinc-600 hover:text-zinc-900 underline underline-offset-2"
                  >
                    Volver a iniciar sesión
                  </button>
                </div>
              )}

              {/* Separador y Google como en la referencia */}
              {modo !== "recuperar" && (CON_GOOGLE || CON_FACEBOOK) && (
                <>
                  <div className="flex items-center gap-3 py-1" aria-hidden="true">
                    <span className="h-px flex-1 bg-zinc-200" />
                    <span className="text-xs text-zinc-400 font-normal">O continúa con</span>
                    <span className="h-px flex-1 bg-zinc-200" />
                  </div>
                  <div className={cn("grid gap-2", CON_GOOGLE && CON_FACEBOOK ? "grid-cols-2" : "grid-cols-1")}>
                    {CON_GOOGLE && (
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => social("google")}
                        disabled={loading}
                        className="h-12 rounded-xl border border-zinc-300 hover:bg-zinc-50 text-zinc-800 text-xs font-medium tracking-wide flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50 shadow-sm"
                      >
                        <GoogleIcon /> Continuar con Google
                      </motion.button>
                    )}
                    {CON_FACEBOOK && (
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => social("facebook")}
                        disabled={loading}
                        className="h-12 rounded-xl border border-zinc-300 hover:bg-zinc-50 text-zinc-800 text-xs font-medium tracking-wide flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50 shadow-sm"
                      >
                        <FacebookIcon /> Continuar con Facebook
                      </motion.button>
                    )}
                  </div>
                </>
              )}

              {/* Modo demo: datos de ejemplo y recorrido guiado */}
              <div className="!mt-7 rounded-2xl border border-zinc-200 p-4 space-y-3 bg-zinc-50/50">
                <p className="text-xs text-zinc-500 uppercase tracking-widest text-center font-medium">¿Solo quieres conocer Clossapp?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => entrarModoDemo("usuario")}
                    className="w-full h-10 rounded-lg border border-zinc-300 bg-white text-zinc-700 text-xs font-medium hover:border-zinc-900 transition-colors"
                  >
                    Demo de usuario
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => entrarModoDemo("acopio")}
                    className="w-full h-10 rounded-lg border border-zinc-900 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors"
                  >
                    Demo de centro de acopio
                  </motion.button>
                </div>
                <p className="text-[11px] text-zinc-400 text-center">Datos de ejemplo y una guía paso a paso. Nada se guarda.</p>
              </div>

              {/* Enlace para centros de acopio */}
              <p className="text-xs text-zinc-500 text-center pt-1">
                ¿Eres un punto de recolección? Entra con el correo de tu centro.{" "}
                <Link href="/centros" className="underline underline-offset-2 text-zinc-700 hover:text-zinc-900 font-medium">
                  Quiero ser centro de acopio
                </Link>
              </p>

              {/* Aviso legal */}
              <p className="text-xs leading-relaxed text-zinc-400 text-center">
                Al continuar aceptas nuestros{" "}
                <Link href="/politicas#terminos" className="text-zinc-600 underline underline-offset-2 hover:text-zinc-900 transition-colors">
                  términos y condiciones
                </Link>{" "}
                y nuestra{" "}
                <Link href="/politicas#privacidad" className="text-zinc-600 underline underline-offset-2 hover:text-zinc-900 transition-colors">
                  política de privacidad
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
    </motion.div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8l4-3z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4h-3V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" />
    </svg>
  )
}
