"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { CenteredModal } from "@/components/shared/centered-modal"
import { RentDatePicker } from "./rent-date-picker"
import type { Prenda } from "@/types"

interface ItemDetailModalProps {
  item: Prenda | null
  isRenta: boolean
  apartSuccess: boolean
  aparting: boolean
  isGuest: boolean
  onClose: () => void
  onApartar: (fechaRenta?: string) => void
}

export function ItemDetailModal({ item, isRenta, apartSuccess, aparting, isGuest, onClose, onApartar }: ItemDetailModalProps) {
  const [showFecha, setShowFecha] = useState(false)

  function handleClose() {
    setShowFecha(false)
    onClose()
  }

  function handleApartar() {
    if (isRenta) {
      setShowFecha(true)
    } else {
      onApartar()
    }
  }

  return (
    <CenteredModal open={!!item} onClose={handleClose}>
      {item && (
        <div className="flex flex-col">
          <img src={item.image_url} alt={item.name} className="w-full h-64 object-cover" />
          <div className="p-6 flex flex-col gap-4">
            <div>
              <h2 className="font-serif text-xl text-zinc-900">{item.name}</h2>
              <p className="text-xs text-zinc-400 uppercase tracking-widest mt-1">{item.category}</p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                  {isRenta ? "Precio / día" : "Precio"}
                </p>
                <p className="font-serif text-2xl text-zinc-900">
                  ${isRenta ? (item.precio_renta ?? "—") : (item.precio ?? "—")}
                </p>
              </div>
              {item.talla && (
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Talla</p>
                  <p className="text-sm font-medium text-zinc-900">{item.talla}</p>
                </div>
              )}
              {item.estado_uso && (
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Estado</p>
                  <p className="text-sm font-medium text-zinc-900">{item.estado_uso}</p>
                </div>
              )}
            </div>
            {apartSuccess ? (
              <div className="w-full py-3 border border-zinc-200 text-zinc-600 text-sm text-center tracking-wide">
                {isRenta ? "Solicitud enviada" : "Apartado correctamente"}
              </div>
            ) : isRenta && showFecha ? (
              <RentDatePicker
                onConfirm={(fecha) => onApartar(fecha)}
                onCancel={() => setShowFecha(false)}
                aparting={aparting}
              />
            ) : (
              <motion.button whileTap={{ scale: 0.98 }} onClick={handleApartar} disabled={aparting || isGuest}
                className={cn("w-full py-3 text-sm font-medium tracking-wide flex items-center justify-center gap-2",
                  isGuest ? "bg-zinc-100 text-zinc-400 cursor-default" : "bg-zinc-900 text-white disabled:opacity-50")}>
                {aparting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isGuest ? "Solo lectura" : aparting ? "Procesando..." : isRenta ? "Solicitar Renta" : "Apartar"}
              </motion.button>
            )}
          </div>
        </div>
      )}
    </CenteredModal>
  )
}
