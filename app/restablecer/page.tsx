"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { createClient } from "@/utils/supabase/client"
import { validarPassword } from "@/services/auth.service"

const inputClass = "mt-2 h-11 w-full rounded-none border border-zinc-900 text-sm text-zinc-900 focus-visible:ring-0 focus-visible:border-zinc-900"

/** Llega aquí desde el enlace de "olvidé mi contraseña", ya con sesión de recuperación. */
export default function RestablecerPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmacion, setConfirmacion] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    const invalida = validarPassword(password)
    if (invalida) return setError(invalida)
    if (password !== confirmacion) return setError("Las contraseñas no coinciden.")
    setGuardando(true)
    setError(null)
    const { error } = await createClient().auth.updateUser({ password })
    setGuardando(false)
    if (error) {
      setError("El enlace expiró o ya se usó. Pide uno nuevo desde el inicio de sesión.")
      return
    }
    router.replace("/")
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <form onSubmit={guardar} className="w-full max-w-md space-y-4">
        <img src="/logo.svg" alt="Clossapp" className="mx-auto h-12 w-auto mb-8" />
        <h1 className="font-serif text-2xl text-zinc-900 text-center">Nueva contraseña</h1>
        <p className="text-xs text-zinc-500 text-center">Mínimo 8 caracteres, con letras y números.</p>
        <div>
          <label htmlFor="password" className="text-xs text-zinc-500 uppercase tracking-widest">Contraseña nueva</label>
          <Input id="password" type="password" autoComplete="new-password" value={password}
            onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="confirmacion" className="text-xs text-zinc-500 uppercase tracking-widest">Repite la contraseña</label>
          <Input id="confirmacion" type="password" autoComplete="new-password" value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)} className={inputClass} />
        </div>
        {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
        <button type="submit" disabled={guardando}
          className="w-full h-11 bg-zinc-900 text-white text-sm font-medium tracking-wide disabled:opacity-50 flex items-center justify-center">
          {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar contraseña"}
        </button>
      </form>
    </main>
  )
}
