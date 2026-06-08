"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { Prenda } from "@/types"

interface OutfitCardProps {
  index: number
  outfit: { titulo: string; descripcion: string; prenda_ids: string[] }
  outfitPrendas: Prenda[]
  isElegido: boolean
  isEligiendo: boolean
  isGuest: boolean
  onElegir: () => void
}

export function OutfitCard({
  index, outfit, outfitPrendas, isElegido, isEligiendo, isGuest, onElegir,
}: OutfitCardProps) {
  const [showDesc, setShowDesc] = useState(false)

  const tops = outfitPrendas.filter((p) => ["top", "outerwear"].some((k) => p.category?.toLowerCase().includes(k) || (p.metadata as Record<string, string> | null)?.categoria?.toLowerCase().includes(k)))
  const bottoms = outfitPrendas.filter((p) => ["bottom", "calzado"].some((k) => p.category?.toLowerCase().includes(k) || (p.metadata as Record<string, string> | null)?.categoria?.toLowerCase().includes(k)))
  const accesorios = outfitPrendas.filter((p) => ["accesorio"].some((k) => p.category?.toLowerCase().includes(k) || (p.metadata as Record<string, string> | null)?.categoria?.toLowerCase().includes(k)))
  const hasLayers = tops.length + bottoms.length + accesorios.length > 0
  const allPhotos = hasLayers ? [...tops, ...bottoms, ...accesorios] : outfitPrendas

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: index * 0.08 } }}
      className="border border-zinc-200 flex flex-col">

      {allPhotos.length > 0 ? (
        <div className="grid grid-cols-3 gap-px bg-zinc-100">
          {allPhotos.map((p) => (
            <div key={p.id} className="relative bg-white aspect-square overflow-hidden">
              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              <span className="absolute bottom-0 left-0 right-0 text-[8px] text-white bg-black/40 text-center py-0.5 uppercase tracking-wide truncate px-1">
                {p.category}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-zinc-50 flex items-center justify-center py-8">
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Sin imágenes disponibles</p>
        </div>
      )}

      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Look 0{index + 1}</p>
          <h3 className="font-serif text-zinc-900 text-lg leading-tight">{outfit.titulo}</h3>
        </div>
        <button
          onClick={() => setShowDesc((v) => !v)}
          className="shrink-0 mt-1 w-6 h-6 border border-zinc-300 flex items-center justify-center text-zinc-400 hover:border-zinc-900 hover:text-zinc-900 transition-colors"
          title="Ver justificación">
          <span className="text-[10px] font-medium">?</span>
        </button>
      </div>

      <AnimatePresence>
        {showDesc && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden">
            <p className="px-4 pb-3 text-xs text-zinc-500 leading-relaxed border-t border-zinc-100 pt-3">
              {outfit.descripcion}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 pb-4">
        {isElegido ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="w-full py-2.5 border border-zinc-200 text-zinc-400 text-xs text-center tracking-widest uppercase">
            Outfit registrado
          </motion.div>
        ) : (
          <motion.button whileTap={{ scale: 0.98 }} onClick={onElegir}
            disabled={isEligiendo || isGuest}
            className="w-full py-2.5 border border-zinc-900 text-zinc-900 text-xs font-medium tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-40">
            {isEligiendo ? <span className="inline-block w-3.5 h-3.5 border-2 border-zinc-400/30 border-t-zinc-400 rounded-full animate-spin" /> : null}
            {isEligiendo ? "Registrando..." : "Elegir este outfit"}
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}
