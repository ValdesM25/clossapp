"use client"

import { motion } from "framer-motion"
import { ETIQUETA_CATEGORIA } from "@/constants/categories"
import type { CategoriaResumen } from "@/services/stats.service"
import { SectionTitle } from "./section-title"

interface CategoryBarsProps {
  categorias: CategoriaResumen[]
}

/**
 * Una barra por categoría: el largo es cuántas prendas tienes y la parte oscura
 * cuántas de ellas usaste en 6 meses. Misma unidad (prendas) en todo el eje.
 */
export function CategoryBars({ categorias }: CategoryBarsProps) {
  if (categorias.length === 0) return null
  const max = Math.max(...categorias.map((c) => c.total))

  return (
    <section className="px-4">
      <SectionTitle title="Por categoría" subtitle="Cuántas tienes y cuántas usaste en los últimos 6 meses."
        aside={
          <div className="flex items-center gap-3 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-[2px] bg-zinc-900" aria-hidden />En uso</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-[2px] bg-zinc-200" aria-hidden />Guardadas</span>
          </div>
        } />

      <ul className="flex flex-col gap-3.5">
        {categorias.map((c, i) => {
          const ancho = (c.total / max) * 100
          const enUsoPct = c.total ? (c.enUso / c.total) * 100 : 0
          return (
            <li key={c.categoria}>
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <span className="text-xs font-medium text-zinc-900 truncate">{ETIQUETA_CATEGORIA[c.categoria]}</span>
                <span className="text-[11px] text-zinc-500 shrink-0 tabular-nums">
                  <span className="text-zinc-900 font-medium">{c.enUso}</span> de {c.total} en uso · {c.usos} {c.usos === 1 ? "uso" : "usos"}
                </span>
              </div>
              <motion.div className="flex h-2.5 gap-[2px]"
                role="img" aria-label={`${ETIQUETA_CATEGORIA[c.categoria]}: ${c.enUso} de ${c.total} en uso`}
                initial={{ width: 0 }} animate={{ width: `${ancho}%` }}
                transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: 0.05 * i }}>
                {c.enUso > 0 && (
                  <div className="h-full bg-zinc-900 rounded-l-[4px] last:rounded-r-[4px]" style={{ flexGrow: enUsoPct, flexBasis: 0 }} />
                )}
                {c.enUso < c.total && (
                  <div className="h-full bg-zinc-200 rounded-r-[4px] first:rounded-l-[4px]" style={{ flexGrow: 100 - enUsoPct, flexBasis: 0 }} />
                )}
              </motion.div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
