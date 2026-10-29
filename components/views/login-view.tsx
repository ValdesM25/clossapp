"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Loader2, Building2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Turnstile, TURNSTILE_SITE_KEY, type TurnstileHandle } from "@/components/shared/turnstile"
import { useAuthContext } from "@/context/auth-context"
import type { ProveedorSocial } from "@/services/auth.service"

type Modo = "entrar" | "crear" | "recuperar"

const TEXTO_BOTON: Record<Modo, string> = {
  entrar: "Entrar con correo electrónico",
  crear: "Crear cuenta",
  recuperar: "Enviar enlace para recuperar",
}

export function LoginView() {
  const { login, register, loginWithProvider, resetPassword, clearError, loginAsGuest, loginAsRecoleccion, loading, error } = useAuthContext()
  const [modo, setModo] = useState<Modo>("entrar")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [aviso, setAviso] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captchaRef = useRef<TurnstileHandle>(null)
  const esperandoCaptcha = !!TURNSTILE_SITE_KEY && !captchaToken

  // /auth/callback redirige con ?auth_error=1 si el enlace del correo falló o expiró.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
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
      className="h-screen bg-white overflow-hidden">
      <div className="flex h-full w-full">
        <div className="hidden lg:block h-full w-[50%]">
          <img src="/img_login_1mitad.jpg" alt="Imagen de bienvenida" className="h-full w-full object-cover" />
        </div>

        <div className="flex h-full w-full lg:w-[49%] flex-col justify-center bg-white px-6 py-8 sm:px-10 sm:py-12 lg:px-16">
          <div className="w-full max-w-md mx-auto -mt-10">
            <div className="mb-8 text-center">
              <img src="/logo.svg" alt="Clossapp" className="mx-auto h-12 sm:h-14 w-auto mt-12 mb-12 sm:mt-14 hover:scale-105 transition-transform duration-300 relative z-0" />
              <p className="text-sm text-zinc-500 relative z-10"> <b>Tu armario digital</b></p>

              <p className="mt-8 text-xs text-zinc-500 leading-relaxed text-center">
                Al continuar navegando, incluso a través de nuestras plataformas asociadas, se aplicarán nuestros{" "}
                <Link href="/politicas#terminos" className="underline text-zinc-700 hover:text-zinc-900 transition-colors">
                  Términos y condiciones
                </Link>
                . Por favor, lee nuestra{" "}
                <Link href="/politicas#privacidad" className="underline text-zinc-700 hover:text-zinc-900 transition-colors">
                  Política de Privacidad
                </Link>{" "}
                para más detalles sobre cómo gestionamos tus datos.
              </p>
            </div>

            <div className="space-y-3">
              {modo !== "recuperar" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => social("google")} disabled={loading}
                      className="h-11 border border-zinc-900 text-zinc-900 text-xs font-medium tracking-wide flex items-center justify-center gap-2 disabled:opacity-50">
                      <GoogleIcon /> Google
                    </motion.button>
                    <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => social("facebook")} disabled={loading}
                      className="h-11 border border-zinc-900 text-zinc-900 text-xs font-medium tracking-wide flex items-center justify-center gap-2 disabled:opacity-50">
                      <FacebookIcon /> Facebook
                    </motion.button>
                  </div>
                  <div className="flex items-center gap-3 py-1" aria-hidden="true">
                    <span className="h-px flex-1 bg-zinc-200" />
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest">o con tu correo</span>
                    <span className="h-px flex-1 bg-zinc-200" />
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label htmlFor="login-email" className="text-xs text-zinc-500 uppercase tracking-widest">Correo electrónico</label>
                  <Input id="login-email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com" type="email" autoComplete="email"
                    className="mt-2 h-11 w-full rounded-none border border-zinc-900 text-sm text-zinc-900 focus-visible:ring-0 focus-visible:border-zinc-900" />
                </div>

                {modo !== "recuperar" && (
                  <div>
                    <label htmlFor="login-password" className="text-xs text-zinc-500 uppercase tracking-widest">Contraseña</label>
                    <Input id="login-password" value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" type="password" autoComplete={modo === "crear" ? "new-password" : "current-password"}
                      className="mt-2 h-11 w-full rounded-none border border-zinc-900 text-sm text-zinc-900 focus-visible:ring-0 focus-visible:border-zinc-900" />
                    {modo === "crear" && <p className="mt-1.5 text-[11px] text-zinc-400">Mínimo 8 caracteres, con letras y números.</p>}
                  </div>
                )}

                <Turnstile ref={captchaRef} onToken={setCaptchaToken} />

                {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
                {aviso && <p role="status" className="text-xs text-zinc-700 border border-zinc-200 px-4 py-3">{aviso}</p>}

                <motion.button type="submit" whileTap={{ scale: 0.98 }} disabled={loading || esperandoCaptcha}
                  className="w-full h-11 bg-zinc-900 text-white text-sm font-medium tracking-wide disabled:opacity-50 flex items-center justify-center">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : TEXTO_BOTON[modo]}
                </motion.button>
              </form>

              <div className="flex justify-between text-[11px]">
                {modo === "entrar" ? (
                  <>
                    <button type="button" onClick={() => cambiarModo("crear")} className="text-zinc-600 underline underline-offset-2 hover:text-zinc-900">Crear cuenta</button>
                    <button type="button" onClick={() => cambiarModo("recuperar")} className="text-zinc-500 hover:text-zinc-900">Olvidé mi contraseña</button>
                  </>
                ) : (
                  <button type="button" onClick={() => cambiarModo("entrar")} className="text-zinc-600 underline underline-offset-2 hover:text-zinc-900">Ya tengo cuenta, entrar</button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <motion.button whileTap={{ scale: 0.98 }} onClick={loginAsGuest}
                  className="w-full h-11 border border-zinc-300 text-zinc-600 text-xs font-medium tracking-wide hover:border-zinc-400 transition-colors">
                  Explorar como invitada
                </motion.button>

                <motion.button whileTap={{ scale: 0.98 }} onClick={loginAsRecoleccion}
                  className="w-full h-11 border border-emerald-600 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 text-xs font-medium tracking-wide flex items-center justify-center gap-1.5 transition-colors">
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  Punto de Recolección
                </motion.button>
              </div>

              <p className="text-[11px] leading-relaxed text-zinc-400 text-center">
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
