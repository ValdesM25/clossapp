"use client"

import { useState } from "react"
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
    try { await login(email, password) } catch {}
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen bg-white flex flex-col items-center justify-center px-8 gap-10">
      <div className="text-center">
        <h1 className="font-serif text-4xl tracking-tight text-zinc-900">Clossapp</h1>
        <p className="text-xs text-zinc-400 mt-2 tracking-widest uppercase">Tu armario digital</p>
      </div>
      <div className="w-full flex flex-col gap-3">
        <label className="text-xs text-zinc-500 uppercase tracking-widest text-center block">Correo electrónico</label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleEnter()}
          placeholder="tu@correo.com" type="email"
          className="h-12 rounded-none border-zinc-900 text-center text-base tracking-widest focus-visible:ring-0 focus-visible:border-zinc-900" />
        <label className="text-xs text-zinc-500 uppercase tracking-widest text-center block">Contraseña</label>
        <Input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleEnter()}
          placeholder="••••••••" type="password"
          className="h-12 rounded-none border-zinc-900 text-center text-base tracking-widest focus-visible:ring-0 focus-visible:border-zinc-900" />
        {error && <p className="text-xs text-zinc-500 text-center">{error}</p>}
        <motion.button whileTap={{ scale: 0.98 }} onClick={handleEnter} disabled={loading}
          className="w-full h-12 bg-zinc-900 text-white text-sm font-medium tracking-wide flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
        </motion.button>
        <motion.button whileTap={{ scale: 0.98 }} onClick={loginAsGuest}
          className="w-full h-12 border border-zinc-300 text-zinc-600 text-sm tracking-wide">
          Explorar como invitada
        </motion.button>
      </div>
    </motion.div>
  )
}
