"use client"

import { motion } from "framer-motion"
import { fashionImages } from "@/constants/images"
import type { Prenda } from "@/types"

interface MarketItemCardProps {
  item: Prenda
  i: number
  isRenta: boolean
  onClick: () => void
}

export function MarketItemCard({ item, i, isRenta, onClick }: MarketItemCardProps) {
  return (
    <motion.div key={item.id} whileTap={{ scale: 0.98 }} onClick={onClick}
      className="break-inside-avoid overflow-hidden bg-zinc-50 mb-3 cursor-pointer">
      <img src={item.image_url || fashionImages[i % fashionImages.length]} alt={item.name}
        className="w-full object-cover" style={{ height: i % 2 === 0 ? "180px" : "140px" }} />
      <div className="p-2.5">
        <p className="text-xs font-medium text-zinc-900 truncate">{item.name}</p>
        <p className="text-[10px] text-zinc-400">{item.estado_uso ?? item.category}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs font-semibold text-zinc-900">
            ${isRenta ? (item.precio_renta ?? "—") : (item.precio ?? "—")}
            {isRenta && <span className="text-[9px] text-zinc-400 font-normal ml-0.5">/día</span>}
          </p>
          {isRenta && (
            <span className="text-[9px] border border-zinc-300 text-zinc-500 px-1.5 py-0.5 uppercase tracking-wide">Renta</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
