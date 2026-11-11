"use client"

import { Luggage } from "lucide-react"
import type { Prenda } from "@/types"
import { Checkbox } from "@/components/ui/checkbox"
import { maletaDe, type PlanOutfit } from "@/lib/planificacion"

/** Checklist para empacar (solo viajes). Funciona también en solo lectura. */
export function Maleta({ plan, prendas, onEmpacar }: {
  plan: PlanOutfit
  prendas: Prenda[]
  onEmpacar: (prendaId: string, valor: boolean) => void
}) {
  const { grupos, total, empacadas } = maletaDe(plan, prendas)

  return (
    <section aria-labelledby="titulo-maleta" className="flex flex-col gap-4">
      <h3 id="titulo-maleta" className="font-serif text-2xl text-zinc-900 font-normal">Tu maleta</h3>
      <div className="border border-zinc-200 p-4 bg-white flex flex-col gap-4">
        {total === 0 ? (
          <div className="flex items-start gap-3 text-zinc-600">
            <Luggage className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs">Tu maleta aparece cuando tus outfits estén listos.</p>
          </div>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="uppercase tracking-widest text-zinc-500 font-semibold">Empacadas</span>
                <span className="font-medium text-zinc-900">{empacadas} de {total}</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100 overflow-hidden" aria-hidden="true">
                <div className="h-full bg-zinc-900 transition-[width] duration-500" style={{ width: `${Math.round((empacadas / total) * 100)}%` }} />
              </div>
            </div>
            {grupos.map((g) => (
              <div key={g.titulo} className="flex flex-col gap-1">
                <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">{g.titulo}</p>
                {g.prendas.map((p) => {
                  const id = `empacar-${plan.id}-${p.id}`
                  return (
                    <label key={p.id} htmlFor={id} className="flex items-center gap-3 min-h-11 py-1 cursor-pointer">
                      <Checkbox
                        id={id}
                        checked={p.empacada}
                        onCheckedChange={(v) => onEmpacar(p.id, v === true)}
                        className="rounded-none"
                      />
                      {p.image_url
                        ? <img src={p.image_url} alt="" className="w-9 h-9 object-cover shrink-0" />
                        : <div className="w-9 h-9 bg-zinc-100 shrink-0" />}
                      <span className={p.empacada ? "text-xs text-zinc-400 line-through" : "text-xs text-zinc-800"}>{p.name}</span>
                    </label>
                  )
                })}
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  )
}
