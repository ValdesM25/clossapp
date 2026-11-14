"use client"

import { motion, AnimatePresence } from "framer-motion"
import type { PrendaExt } from "@/types"
import type { PrendaConRotacion } from "@/services/stats.service"
import { useAuthContext } from "@/context/auth-context"
import { SectionTitle } from "./section-title"
import { formatoTiempoGuardada } from "./formato"

interface ForgottenPrendasListProps {
  prendas: PrendaConRotacion[]
  /** Total de dormidas (la lista muestra solo las primeras). */
  totalDormidas: number
  isGuest: boolean
  onSell: (p: PrendaExt) => void
}

export function ForgottenPrendasList({ prendas, totalDormidas, isGuest, onSell }: ForgottenPrendasListProps) {
  // Esencial no vende: el botón lleva a la misma pantalla, que para ese plan es la de donar.
  const { plan } = useAuthContext()
  const accion = plan === "gratis" ? "Donar" : "Vender"

  return (
    <section className="px-4">
      <SectionTitle title="Olvidadas"
        subtitle={totalDormidas > 0
          ? `${totalDormidas} ${totalDormidas === 1 ? "prenda lleva" : "prendas llevan"} más de 6 meses sin salir. ${plan === "gratis" ? "Donarlas" : "Venderlas"} libera espacio${plan === "gratis" ? " y ayuda a alguien más" : " y te deja dinero"}.`
          : undefined} />

      {prendas.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-6 border border-dashed border-zinc-200">
          Nada olvidado. Estás aprovechando todo tu armario.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <AnimatePresence>
            {prendas.map((item) => (
              <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="flex flex-col min-w-0">
                <div className="relative">
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} className="w-full aspect-[3/4] object-cover bg-zinc-100 grayscale-[35%]" />
                    : <div className="w-full aspect-[3/4] bg-zinc-100" />}
                  <span className="absolute bottom-1.5 left-1.5 bg-white/95 text-zinc-900 text-[10px] font-medium px-1.5 py-0.5">
                    {formatoTiempoGuardada(item.diasSinUso)}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-900 truncate mt-1.5">{item.name}</p>
                {!isGuest && (
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => onSell(item)}
                    className="mt-1.5 text-[11px] border border-zinc-900 text-zinc-900 py-1.5 tracking-wide">
                    {accion}
                  </motion.button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      {isGuest && prendas.length > 0 && (
        <p className="text-xs text-zinc-500 text-center pt-3">Inicia sesión para {accion.toLowerCase()} tus prendas.</p>
      )}
    </section>
  )
}
