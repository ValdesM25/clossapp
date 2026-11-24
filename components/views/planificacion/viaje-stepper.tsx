"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const PASOS = [
  { num: 1 as const, label: "Destino" },
  { num: 2 as const, label: "Lugares" },
  { num: 3 as const, label: "Outfits" },
]

/** Barra de pasos editorial: PLANIFICA TU VIAJE — (1) Destino — (2) Lugares — (3) Outfits. */
export function ViajeStepper({
  pasoActual,
  onPaso,
}: {
  pasoActual: 1 | 2 | 3
  onPaso?: (paso: 1 | 2 | 3) => void
}) {
  return (
    <div className="border-b border-zinc-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-medium shrink-0">
        Planifica tu viaje
      </span>

      <ol className="flex items-center justify-between sm:justify-end sm:flex-1 gap-2 sm:gap-8 md:gap-14" aria-label="Pasos del viaje">
        {PASOS.map(({ num, label }) => {
          const completado = num < pasoActual
          const activo = num === pasoActual
          const clickable = Boolean(onPaso && num < pasoActual)
          return (
            <li key={num} className="flex items-center">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onPaso?.(num)}
                className={cn(
                  "flex items-center gap-2 text-xs transition-colors disabled:cursor-default",
                  clickable && "hover:opacity-80 cursor-pointer"
                )}
              >
                <span
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium transition-colors shrink-0",
                    completado || activo
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-300 text-zinc-500 bg-transparent"
                  )}
                >
                  {completado ? <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" /> : num}
                </span>
                <span
                  className={cn(
                    "text-xs tracking-wide",
                    activo || completado ? "text-zinc-900 font-medium" : "text-zinc-500"
                  )}
                >
                  {label}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
