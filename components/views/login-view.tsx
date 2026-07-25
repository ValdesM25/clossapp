"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useAuthContext } from "@/context/auth-context"

export function LoginView() {
  const { login, loginAsGuest, loading, error } = useAuthContext()
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
              <img src="/logo_f.png" alt="Clossapp Logo" className="mx-auto h-48 sm:h-56 w-auto object-contain -mt-6 -mb-6 sm:-mb-10 hover:scale-105 transition-transform duration-300 relative z-0" />
              <p className="text-sm text-zinc-500 relative z-10"> <b>Tu armario digital</b></p>

              <p className="mt-8 text-xs text-zinc-500 leading-relaxed text-center">
                Al continuar navegando, incluso a través de nuestras plataformas asociadas, se aplicarán nuestros <a href="#" className="underline hover:text-zinc-800">Términos y condiciones</a>. Por favor, lee nuestra <a href="#" className="underline hover:text-zinc-800">Política de Privacidad</a> para más detalles sobre cómo gestionamos tus datos.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-widest">Correo electrónico</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleEnter()}
                  placeholder="tu@correo.com" type="email"
                  className="mt-2 h-12 w-full rounded-none border border-zinc-900 text-sm text-zinc-900 focus-visible:ring-0 focus-visible:border-zinc-900" />
              </div>

              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-widest">Contraseña</label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleEnter()}
                  placeholder="••••••••" type="password"
                  className="mt-2 h-12 w-full rounded-none border border-zinc-900 text-sm text-zinc-900 focus-visible:ring-0 focus-visible:border-zinc-900" />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <motion.button whileTap={{ scale: 0.98 }} onClick={handleEnter} disabled={loading}
                className="w-full h-12 bg-zinc-900 text-white text-sm font-medium tracking-wide disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuar con correo electrónico"}
              </motion.button>

              <motion.button whileTap={{ scale: 0.98 }} onClick={loginAsGuest}
                className="w-full h-12 border border-zinc-300 text-zinc-600 text-sm font-medium tracking-wide">
                Explorar como invitada
              </motion.button>

              <p className="text-[11px] leading-relaxed text-zinc-400 text-center">
                Al continuar aceptas nuestras{" "}
                <Link href="/politicas" className="text-zinc-600 underline underline-offset-2 hover:text-zinc-900 transition-colors">
                  políticas y términos
                </Link>
                , incluido el aviso de privacidad.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
