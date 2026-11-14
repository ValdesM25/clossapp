"use client"

import { motion } from "framer-motion"
import type { PrendaConRotacion } from "@/services/stats.service"
import { SectionTitle } from "./section-title"
import { formatoMoneda, formatoUltimoUso } from "./formato"

interface TopPrendasListProps {
  prendas: PrendaConRotacion[]
}

export function TopPrendasList({ prendas }: TopPrendasListProps) {
  const max = Math.max(1, ...prendas.map((p) => p.usos ?? 0))

  return (
    <section>
      <div className="px-4">
        <SectionTitle title="Tus favoritas" subtitle="Las prendas que más te pones." />
      </div>
      {prendas.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-6 mx-4 border border-dashed border-zinc-200">
          Cuando uses prendas en tus outfits, aquí aparecerán tus favoritas.
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
          {prendas.map((p, i) => {
            const usos = p.usos ?? 0
            return (
              <motion.article key={p.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * i }}
                className="w-36 shrink-0 snap-start">
                <div className="relative">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} className="w-36 h-44 object-cover bg-zinc-100" />
                    : <div className="w-36 h-44 bg-zinc-100" />}
                  <span className="absolute top-2 left-2 bg-white text-zinc-900 font-serif text-sm w-7 h-7 flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <p className="text-xs font-medium text-zinc-900 truncate mt-2">{p.name}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1.5 bg-zinc-100 rounded-[4px] overflow-hidden">
                    <motion.div className="h-full bg-zinc-900 rounded-[4px]"
                      initial={{ width: 0 }} animate={{ width: `${(usos / max) * 100}%` }}
                      transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: 0.15 + 0.05 * i }} />
                  </div>
                  <span className="text-[11px] text-zinc-900 font-medium tabular-nums shrink-0">{usos} {usos === 1 ? "uso" : "usos"}</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 truncate">
                  {p.costoPorUso !== null ? `${formatoMoneda(p.costoPorUso)} por uso · ` : ""}{formatoUltimoUso(p.diasSinUso)}
                </p>
              </motion.article>
            )
          })}
        </div>
      )}
    </section>
  )
}
