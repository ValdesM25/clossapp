"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Loader2, ShoppingBag, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { CenteredModal } from "@/components/shared/centered-modal"
import { RentDatePicker } from "./rent-date-picker"
import { useCartContext } from "@/context/cart-context"
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
  const { addToCart } = useCartContext()

  function handleClose() {
    setShowFecha(false)
    onClose()
  }

  function handleApartar() {
    if (isRenta && !showFecha) {
      setShowFecha(true)
    } else if (!isRenta) {
      if (item) {
        addToCart(item, "compra")
        handleClose()
      }
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

            {/* Escrow Custody Protection Notice */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center gap-2 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Pago en Custodia Escrow:</strong> Tu dinero queda retenido de forma segura hasta que recojas el producto.
              </span>
            </div>

            {apartSuccess ? (
              <div className="w-full py-3 border border-zinc-200 text-zinc-600 text-sm text-center tracking-wide">
                {isRenta ? "Solicitud enviada" : "Apartado correctamente"}
              </div>
            ) : isRenta && showFecha ? (
              <RentDatePicker
                prendaId={item?.id}
                onConfirm={(fecha) => {
                  if (item) {
                    onApartar(fecha)
                  }
                }}
                onCancel={() => setShowFecha(false)}
                aparting={aparting}
              />
            ) : (
              <motion.button whileTap={{ scale: 0.98 }} onClick={handleApartar} disabled={aparting || isGuest}
                className={cn("w-full py-3 text-sm font-medium tracking-wide flex items-center justify-center gap-2 rounded",
                  isGuest ? "bg-zinc-100 text-zinc-400 cursor-default" : "bg-zinc-900 text-white hover:bg-zinc-800 transition-colors disabled:opacity-50")}>
                {aparting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4 text-emerald-400" />}
                {isGuest ? "Solo lectura" : aparting ? "Procesando..." : isRenta ? "Solicitar Renta" : "Agregar al Carrito de Custodia"}
              </motion.button>
            )}
          </div>
        </div>
      )}
    </CenteredModal>
  )
}
