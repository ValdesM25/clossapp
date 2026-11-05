"use client"

import { useEffect, useState } from "react"
import { ArrowRight, X } from "lucide-react"

const POSPONER_MS = 14 * 86_400_000

interface CompletarPerfilProps {
  userId: string
  onAbrir: () => void
}

/** Pide las preguntas que se sacaron del registro (tallas, inspiración, cómo compras). */
export function CompletarPerfil({ userId, onAbrir }: CompletarPerfilProps) {
  const clave = `completar-perfil-hasta:${userId}`
  // Arranca oculto: localStorage solo existe en el cliente.
  const [visible, setVisible] = useState(false)
  useEffect(() => { setVisible(Date.now() > Number(localStorage.getItem(clave) ?? 0)) }, [clave])

  if (!visible) return null

  function posponer() {
    localStorage.setItem(clave, String(Date.now() + POSPONER_MS))
    setVisible(false)
  }

  return (
    <section aria-labelledby="completar-perfil" className="relative border border-zinc-200 p-5 pr-12">
      <button type="button" onClick={posponer} aria-label="Recordármelo en dos semanas"
        className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-900">
        <X className="w-4 h-4" />
      </button>
      <h2 id="completar-perfil" className="text-sm font-medium text-zinc-900">Afina tus sugerencias</h2>
      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">Tres preguntas rápidas sobre tallas, inspiración y cómo compras.</p>
      <button type="button" onClick={onAbrir}
        className="mt-3 min-h-10 text-sm text-zinc-900 font-medium flex items-center gap-1.5">
        Contestar <ArrowRight className="w-4 h-4" />
      </button>
    </section>
  )
}
