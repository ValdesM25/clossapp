"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ORDEN_ROTACION, ROTACION_INFO, type PrendaConRotacion, type Rotacion } from "@/services/stats.service"
import { SectionTitle } from "./section-title"
import { formatoUltimoUso } from "./formato"

interface RotationBarProps {
  rotacion: Record<Rotacion, number>
  prendas: PrendaConRotacion[]
}

// Un solo tono de oscuro a claro: más oscuro = más uso. "Nueva" lleva trama porque
// no es "menos uso", es "todavía sin historial".
const RELLENO: Record<Rotacion, React.CSSProperties> = {
  activa: { background: "#18181b" },
  ocasional: { background: "#71717a" },
  dormida: { background: "#d4d4d8" },
  nueva: { background: "repeating-linear-gradient(135deg, #a1a1aa 0 1.5px, #f4f4f5 1.5px 5px)" },
}

export function RotationBar({ rotacion, prendas }: RotationBarProps) {
  const total = ORDEN_ROTACION.reduce((s, r) => s + rotacion[r], 0)
  const [elegida, setElegida] = useState<Rotacion | null>(null)
  if (total === 0) return null

  const segmentos = ORDEN_ROTACION.filter((r) => rotacion[r] > 0)
  const lista = elegida ? prendas.filter((p) => p.rotacion === elegida) : []

  function alternar(r: Rotacion) {
    setElegida((actual) => (actual === r ? null : r))
  }

  return (
    <section className="px-4">
      <SectionTitle title="Rotación" subtitle="Qué tan seguido sale cada prenda del clóset. Toca un grupo para verlo." />

      <div className="flex h-11 gap-[2px]" role="group" aria-label="Distribución de prendas por rotación">
        {segmentos.map((r, i) => {
          const pct = (rotacion[r] / total) * 100
          const apagado = elegida !== null && elegida !== r
          return (
            <motion.button key={r} type="button" onClick={() => alternar(r)}
              aria-pressed={elegida === r}
              aria-label={`${ROTACION_INFO[r].nombre}: ${rotacion[r]} de ${total}`}
              className="relative h-full min-w-[10px] first:rounded-l-[4px] last:rounded-r-[4px] transition-opacity"
              style={{ ...RELLENO[r], opacity: apagado ? 0.25 : 1 }}
              initial={{ flexGrow: 0, flexBasis: 0 }}
              animate={{ flexGrow: pct, flexBasis: 0 }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1], delay: 0.1 + i * 0.06 }}>
              {pct >= 14 && (
                <span className={`absolute inset-0 flex items-center justify-center text-[11px] font-medium ${r === "activa" || r === "ocasional" ? "text-white" : "text-zinc-900"}`}>
                  {Math.round(pct)}%
                </span>
              )}
            </motion.button>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        {ORDEN_ROTACION.filter((r) => r !== "nueva" || rotacion.nueva > 0).map((r) => (
          <button key={r} type="button" onClick={() => rotacion[r] > 0 && alternar(r)}
            aria-pressed={elegida === r} disabled={rotacion[r] === 0}
            className={`flex items-center gap-2.5 p-2.5 border text-left transition-colors disabled:opacity-50 ${elegida === r ? "border-zinc-900" : "border-zinc-100"}`}>
            <span className="w-3 h-3 shrink-0 rounded-[2px]" style={RELLENO[r]} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-zinc-900">{ROTACION_INFO[r].nombre}</span>
                <span className="font-serif text-base text-zinc-900 leading-none">{rotacion[r]}</span>
              </span>
              <span className="block text-[10px] text-zinc-500 truncate">{ROTACION_INFO[r].detalle}</span>
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {elegida && (
          <motion.div key={elegida} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="flex gap-2 overflow-x-auto pt-3 pb-1 -mx-4 px-4 snap-x">
              {lista.map((p) => (
                <div key={p.id} className="w-20 shrink-0 snap-start">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} className="w-20 h-24 object-cover bg-zinc-100" />
                    : <div className="w-20 h-24 bg-zinc-100" />}
                  <p className="text-[11px] text-zinc-900 truncate mt-1">{p.name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{formatoUltimoUso(p.diasSinUso)}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
