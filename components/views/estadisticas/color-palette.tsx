"use client"

import { motion } from "framer-motion"
import { FAMILIAS_COLOR } from "@/constants/colores"
import type { ColorResumen } from "@/services/stats.service"
import { SectionTitle } from "./section-title"

interface ColorPaletteProps {
  colores: ColorResumen[]
  sinColor: number
}

// Los tonos muy claros se pierden sobre fondo blanco: llevan un filo gris.
const CLAROS = new Set(["blanco", "beige", "amarillo"])

export function ColorPalette({ colores, sinColor }: ColorPaletteProps) {
  if (colores.length === 0) return null
  const total = colores.reduce((s, c) => s + c.total, 0)

  return (
    <section className="px-4">
      <SectionTitle title="Tu paleta" subtitle="Los colores que dominan tu armario." />

      <div className="flex h-16 gap-[2px] overflow-hidden rounded-[4px]" role="img"
        aria-label={colores.map((c) => `${FAMILIAS_COLOR[c.familia].nombre} ${c.total}`).join(", ")}>
        {colores.map((c, i) => (
          <motion.div key={c.familia} title={`${FAMILIAS_COLOR[c.familia].nombre}: ${c.total}`}
            className={`h-full min-w-[6px] ${CLAROS.has(c.familia) ? "shadow-[inset_0_0_0_1px_#e4e4e7]" : ""}`}
            style={{ background: FAMILIAS_COLOR[c.familia].hex, flexBasis: 0 }}
            initial={{ flexGrow: 0, opacity: 0 }} animate={{ flexGrow: c.total, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: 0.05 * i }} />
        ))}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
        {colores.map((c) => (
          <li key={c.familia} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-full shrink-0 ${CLAROS.has(c.familia) ? "ring-1 ring-zinc-300" : ""}`}
              style={{ background: FAMILIAS_COLOR[c.familia].hex }} aria-hidden />
            <span className="text-xs text-zinc-900">{FAMILIAS_COLOR[c.familia].nombre}</span>
            <span className="text-[11px] text-zinc-500 tabular-nums">{Math.round((c.total / total) * 100)}%</span>
          </li>
        ))}
      </ul>

      {sinColor > 0 && (
        <p className="text-[11px] text-zinc-400 mt-3">
          {sinColor} {sinColor === 1 ? "prenda no tiene" : "prendas no tienen"} color detectado.
        </p>
      )}
    </section>
  )
}
