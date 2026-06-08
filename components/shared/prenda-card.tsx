"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { fashionImages } from "@/constants/images"
import type { Prenda } from "@/types"

interface PrendaCardProps {
  pren: Prenda
  i: number
  height?: (i: number) => number
  badge?: React.ReactNode
  caption?: React.ReactNode
  onClick?: () => void
  className?: string
}

export function PrendaCard({ pren, i, height, badge, caption, onClick, className }: PrendaCardProps) {
  const h = height ? height(i) : (i % 3 === 0 ? 180 : i % 3 === 1 ? 140 : 160)
  return (
    <div onClick={onClick}
      className={cn(
        "break-inside-avoid relative overflow-hidden mb-3 cursor-pointer active:opacity-80 transition-opacity",
        pren.en_renta ? "bg-zinc-200 opacity-60" : "bg-zinc-50",
        className
      )}>
      <img src={pren.image_url || fashionImages[i % fashionImages.length]} alt={pren.name}
        className={cn("w-full object-cover", pren.en_renta && "grayscale")}
        style={{ height: h }} />
      {badge}
      <div className="p-3">
        <p className="text-xs font-medium text-zinc-900 truncate">{pren.name}</p>
        <p className="text-[10px] text-zinc-400 mt-0.5">{pren.category}</p>
        {caption}
      </div>
    </div>
  )
}
