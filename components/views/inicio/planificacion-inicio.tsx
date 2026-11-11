"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, CalendarDays, Check, Luggage, Shirt } from "lucide-react"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Prenda } from "@/types"
import type { Plan } from "@/constants/planes"
import { cn } from "@/lib/utils"
import { navegarA } from "@/lib/navegar"
import { proximoPlan, rangoFechas, type MomentoPlan, type PlanOutfit } from "@/lib/planificacion"
import { marcarUsado } from "@/services/planificacion.service"

/** Outfit planeado para hoy: ocupa el lugar del outfit del día (no gasta IA). */
export function OutfitPlaneado({ deHoy, prendas, supabase, onCambio }: {
  deHoy: { plan: PlanOutfit; momento: MomentoPlan }[]
  prendas: Prenda[]
  supabase: SupabaseClient
  onCambio: () => Promise<void>
}) {
  const [guardando, setGuardando] = useState(false)
  const { plan, momento } = deHoy[0]
  const noche = deHoy.find((x) => x.momento !== momento && x.momento.momento === "noche")
  const outfit = momento.outfit!
  const piezas = outfit.prenda_ids
    .map((id) => prendas.find((p) => String(p.id) === id))
    .filter((p): p is Prenda => !!p)

  async function meLoPuse() {
    if (guardando || momento.usado_en) return
    setGuardando(true)
    try {
      await marcarUsado(supabase, momento)
      await onCambio()
    } catch (e) {
      console.error("[outfit-planeado]", e)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="bg-zinc-900 text-white p-5 sm:p-6">
      <span className="text-[11px] uppercase tracking-widest px-2 py-0.5 bg-white/10 text-zinc-300">
        Hoy tienes planeado · {plan.nombre}
      </span>
      <h2 className="font-serif text-xl text-white mt-2">{outfit.titulo}</h2>
      <p className="text-xs text-zinc-400 mt-1 max-w-md leading-relaxed">
        {momento.actividad.trim() || "Día casual"} · {outfit.descripcion}
      </p>

      <div className="grid grid-cols-3 gap-2 my-4">
        {piezas.map((p) => (
          <div key={p.id} className="min-w-0">
            <img src={p.image_url} alt={p.name} className="w-full aspect-[3/4] object-cover bg-white/5" />
            <p className="text-xs text-white truncate mt-2">{p.name}</p>
          </div>
        ))}
      </div>

      {noche?.momento.outfit && (
        <p className="text-xs text-zinc-300 mb-3">Para la noche: {noche.momento.outfit.titulo}</p>
      )}

      <div className="flex gap-3 pt-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={meLoPuse}
          disabled={guardando || !!momento.usado_en}
          className={cn(
            "flex-1 h-11 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
            momento.usado_en ? "bg-emerald-600 text-white" : "bg-white text-zinc-900 hover:bg-zinc-100 disabled:opacity-60",
          )}
        >
          {momento.usado_en ? <Check className="w-4 h-4" aria-hidden="true" /> : <Shirt className="w-4 h-4" aria-hidden="true" />}
          {momento.usado_en ? "Usado" : guardando ? "Guardando…" : "Me lo puse"}
        </motion.button>
        <button
          type="button"
          onClick={() => navegarA("planificacion", { planId: plan.id })}
          className="h-11 px-4 border border-white/30 hover:border-white text-sm font-medium flex items-center gap-1.5 transition-colors"
        >
          Ver plan <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

/**
 * Tarjeta de Planificación en Inicio: el próximo plan, una invitación a crear uno (Elite)
 * o la vista previa (sin Elite, demo e invitado). El centro de acopio no ve Inicio.
 */
export function TarjetaPlanificacion({ planes, plan, previa, hoy }: {
  planes: PlanOutfit[]
  plan: Plan | null
  previa: boolean
  hoy: string
}) {
  const proximo = previa ? null : proximoPlan(planes, hoy)
  const tarjeta = "w-full border border-zinc-200 hover:border-zinc-900 p-5 text-left flex items-start gap-4 transition-colors"

  if (proximo) {
    const listos = proximo.momentos.filter((m) => m.estado === "listo").length
    return (
      <button type="button" onClick={() => navegarA("planificacion", { planId: proximo.id })} className={tarjeta}>
        <Luggage className="w-5 h-5 text-zinc-900 shrink-0 mt-0.5" aria-hidden="true" />
        <span className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="text-xs text-zinc-500 uppercase tracking-widest">Tu próximo plan</span>
          <span className="font-serif text-xl text-zinc-900 truncate">{proximo.nombre}</span>
          <span className="text-xs text-zinc-600">
            {rangoFechas(proximo.fecha_inicio, proximo.fecha_fin)} · {listos} de {proximo.momentos.length} outfits listos
          </span>
        </span>
        <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0 mt-1" aria-hidden="true" />
      </button>
    )
  }

  if (plan === "elite" && !previa) {
    return (
      <div className="border border-zinc-200 p-5 flex flex-col items-start gap-3">
        <CalendarDays className="w-5 h-5 text-zinc-900" aria-hidden="true" />
        <div>
          <h2 className="font-serif text-xl text-zinc-900">Planea tu semana</h2>
          <p className="text-sm text-zinc-500 mt-1 leading-relaxed">Outfits para cada día según tu agenda y el clima.</p>
        </div>
        <button type="button" onClick={() => navegarA("planificacion")}
          className="h-11 px-5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium transition-colors">
          Crear plan
        </button>
      </div>
    )
  }

  return (
    <button type="button" onClick={() => navegarA("planificacion")} className={tarjeta}>
      <Luggage className="w-5 h-5 text-zinc-900 shrink-0 mt-0.5" aria-hidden="true" />
      <span className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="font-serif text-xl text-zinc-900">Planifica tu semana y tus viajes</span>
        <span className="self-start text-[11px] uppercase tracking-widest px-1.5 py-0.5 border border-zinc-300 text-zinc-700">Elite</span>
        <span className="text-xs text-zinc-600 leading-relaxed">Outfits para cada día, fechas importantes y tu maleta lista.</span>
      </span>
      <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0 mt-1" aria-hidden="true" />
    </button>
  )
}
