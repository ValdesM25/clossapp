"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Loader2, Building2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useAuthContext } from "@/context/auth-context"

export function LoginView() {
  const { login, loginAsGuest, loginAsRecoleccion, loading, error } = useAuthContext()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  async function handleEnter() {
    if (!email.trim() || !password.trim()) return
    try { await login(email, password) } catch { }
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
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-widest">Correo electrónico</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleEnter()}
                  placeholder="tu@correo.com (ej. recoleccion@clossapp.com)" type="email"
                  className="mt-2 h-11 w-full rounded-none border border-zinc-900 text-sm text-zinc-900 focus-visible:ring-0 focus-visible:border-zinc-900" />
              </div>

              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-widest">Contraseña</label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleEnter()}
                  placeholder="••••••••" type="password"
                  className="mt-2 h-11 w-full rounded-none border border-zinc-900 text-sm text-zinc-900 focus-visible:ring-0 focus-visible:border-zinc-900" />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <motion.button whileTap={{ scale: 0.98 }} onClick={handleEnter} disabled={loading}
                className="w-full h-11 bg-zinc-900 text-white text-sm font-medium tracking-wide disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuar con correo electrónico"}
              </motion.button>

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
