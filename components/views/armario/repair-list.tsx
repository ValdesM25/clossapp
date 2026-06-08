"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Check, Shirt, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Prenda, ReparacionDB } from "@/types"

interface RepairListProps {
  reparaciones: ReparacionDB[]
  prendas: Prenda[]
  loading: boolean
  onComplete: (id: string) => void
}

export function RepairList({ reparaciones, prendas, loading, onComplete }: RepairListProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 text-zinc-400 animate-spin" /></div>
    )
  }

  return (
    <AnimatePresence>
      {reparaciones.length === 0 ? (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-zinc-400 text-center py-4">
          Sin reparaciones pendientes
        </motion.p>
      ) : reparaciones.map((rep) => {
        const prenda = prendas.find((p) => p.id === rep.prenda_id)
        return (
          <motion.div key={rep.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
            className="flex items-center gap-3 border border-zinc-100 p-3">
            {prenda?.image_url
              ? <img src={prenda.image_url} alt={prenda.name} className="w-10 h-10 object-cover shrink-0" />
              : <div className="w-10 h-10 bg-zinc-100 flex items-center justify-center shrink-0"><Shirt className="w-4 h-4 text-zinc-300" /></div>}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-900 truncate">{rep.prenda}</p>
              <p className="text-[10px] text-zinc-400 truncate">{rep.tarea}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={cn("text-[10px] px-2 py-0.5 border",
                rep.prioridad === "Alta" ? "border-zinc-900 text-zinc-900" :
                  rep.prioridad === "Media" ? "border-zinc-400 text-zinc-500" : "border-zinc-200 text-zinc-400")}>
                {rep.prioridad}
              </span>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => onComplete(rep.id)}
                className="w-7 h-7 border border-zinc-200 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-zinc-500" />
              </motion.button>
            </div>
          </motion.div>
        )
      })}
    </AnimatePresence>
  )
}
