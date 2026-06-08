import { motion, AnimatePresence } from "framer-motion"
import type { PrendaExt } from "@/types"

interface ForgottenPrendasListProps {
  prendas: PrendaExt[]
  isGuest: boolean
  onSell: (p: PrendaExt) => void
  formatDate: (iso?: string | null) => string
}

export function ForgottenPrendasList({ prendas, isGuest, onSell, formatDate }: ForgottenPrendasListProps) {
  return (
    <section className="px-4">
      <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Prendas Olvidadas</p>
      <div className="flex flex-col gap-2">
        <AnimatePresence>
          {(isGuest ? [] : prendas).map((item) => (
            <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: 60, transition: { duration: 0.25 } }}
              className="flex items-center gap-3 border border-zinc-100 p-4">
              {item.image_url && <img src={item.image_url} alt={item.name} className="w-10 h-10 object-cover shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-900 truncate">{item.name}</p>
                <p className="text-[10px] text-zinc-400">{formatDate(item.ultimo_uso)}</p>
              </div>
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => onSell(item)}
                className="shrink-0 text-xs border border-zinc-900 text-zinc-900 px-3 py-1.5 tracking-wide">
                Vender
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
        {!isGuest && prendas.length === 0 && <p className="text-xs text-zinc-400 text-center py-4">Sin prendas olvidadas</p>}
        {isGuest && <p className="text-xs text-zinc-400 text-center py-4">Inicia sesión para ver tus estadísticas</p>}
      </div>
    </section>
  )
}
