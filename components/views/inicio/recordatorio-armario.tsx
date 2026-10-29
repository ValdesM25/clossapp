"use client"

import { useEffect, useState } from "react"
import { ShoppingBag, X } from "lucide-react"
import { CLAVE_DESCARTE, finDescarte, necesitaRecordatorio } from "@/constants/recordatorio"
import type { Prenda } from "@/types"

interface RecordatorioArmarioProps {
  prendas: Prenda[]
  onAgregar: () => void
}

/** Banner "¿Compraste algo nuevo?" cuando el armario lleva días sin cambios. */
export function RecordatorioArmario({ prendas, onAgregar }: RecordatorioArmarioProps) {
  // Arranca oculto y se decide en el cliente: localStorage no existe en el servidor.
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const descartadoHasta = Number(localStorage.getItem(CLAVE_DESCARTE) ?? 0)
    setVisible(Date.now() > descartadoHasta && necesitaRecordatorio(prendas.map((p) => p.created_at)))
  }, [prendas])

  function descartar() {
    localStorage.setItem(CLAVE_DESCARTE, String(finDescarte()))
    setVisible(false)
  }

  if (!visible) return null
  return (
    <section role="status" className="flex items-start gap-3 border border-zinc-900 px-4 py-3">
      <ShoppingBag className="w-4 h-4 text-zinc-900 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <p className="text-sm text-zinc-900">¿Compraste algo nuevo?</p>
        <p className="text-xs text-zinc-500 mt-0.5">Súbelo a tu armario para que tus outfits estén al día. Si es compra reciente, ganas puntos.</p>
        <button type="button" onClick={onAgregar}
          className="mt-2 text-xs text-zinc-900 underline underline-offset-2">
          Agregar prenda
        </button>
      </div>
      <button type="button" onClick={descartar} aria-label="Ocultar recordatorio por una semana"
        className="w-8 h-8 -mr-2 -mt-1 flex items-center justify-center text-zinc-400 hover:text-zinc-900">
        <X className="w-4 h-4" />
      </button>
    </section>
  )
}
