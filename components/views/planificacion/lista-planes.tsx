"use client"

import { ChevronRight, MapPin, Plus } from "lucide-react"
import { estadoPlan, rangoFechas, type PlanOutfit, type TipoPlan } from "@/lib/planificacion"
import { TIPOS, TarjetasTipo } from "./crear-plan"

const ETIQUETA = { en_curso: "En curso", proximo: "Próximo", terminado: "Terminado" } as const

function TarjetaPlan({ plan, hoy, onAbrir }: { plan: PlanOutfit; hoy: string; onAbrir: () => void }) {
  const Icono = TIPOS.find((t) => t.tipo === plan.tipo)!.icono
  const listos = plan.momentos.filter((m) => m.estado === "listo").length
  const estado = estadoPlan(plan, hoy)
  return (
    <button type="button" onClick={onAbrir} className="w-full border border-zinc-200 hover:border-zinc-900 bg-white p-4 text-left flex items-center gap-3 transition-colors">
      <Icono className="w-5 h-5 text-zinc-900 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 flex flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className="font-serif text-lg text-zinc-900 truncate">{plan.nombre}</span>
          <span className={estado === "en_curso"
            ? "shrink-0 text-xs px-1.5 py-0.5 bg-zinc-900 text-white"
            : "shrink-0 text-xs px-1.5 py-0.5 border border-zinc-200 text-zinc-600"}>
            {ETIQUETA[estado]}
          </span>
        </span>
        <span className="text-xs text-zinc-500">
          {rangoFechas(plan.fecha_inicio, plan.fecha_fin)}
          {plan.lugar && <><MapPin className="inline w-3 h-3 mx-1 -mt-0.5" aria-hidden="true" />{plan.lugar.nombre}</>}
        </span>
        <span className="text-xs text-zinc-700">{listos} de {plan.momentos.length} outfits listos</span>
      </span>
      <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" aria-hidden="true" />
    </button>
  )
}

/** Mis planes: los vigentes arriba y los terminados plegados abajo. */
export function ListaPlanes({ planes, hoy, cuota, puedeCrear, onAbrir, onNuevo }: {
  planes: PlanOutfit[]
  hoy: string
  /** Solo en Elite. */
  cuota: { hoy: number; mes: number } | null
  puedeCrear: boolean
  onAbrir: (id: string) => void
  onNuevo: (tipo: TipoPlan | null) => void
}) {
  const vigentes = planes.filter((p) => estadoPlan(p, hoy) !== "terminado")
  const anteriores = planes.filter((p) => estadoPlan(p, hoy) === "terminado").reverse()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-zinc-900 font-normal">Planificación</h1>
          {puedeCrear && cuota && (
            <p className="text-xs text-zinc-500 mt-1">
              Te quedan {cuota.hoy} {cuota.hoy === 1 ? "día" : "días"} de planificación hoy y {cuota.mes} este mes.
            </p>
          )}
        </div>
        {puedeCrear && planes.length > 0 && (
          <button type="button" onClick={() => onNuevo(null)} className="shrink-0 h-10 px-4 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors">
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Nuevo plan
          </button>
        )}
      </div>

      {planes.length === 0 && puedeCrear && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-700">Arma tus outfits con lo que ya tienes, según lo que harás y el clima.</p>
          <TarjetasTipo onElegir={onNuevo} />
        </div>
      )}

      {vigentes.length > 0 && (
        <div className="flex flex-col gap-2">
          {vigentes.map((p) => <TarjetaPlan key={p.id} plan={p} hoy={hoy} onAbrir={() => onAbrir(p.id)} />)}
        </div>
      )}

      {anteriores.length > 0 && (
        <details className="group">
          <summary className="min-h-10 flex items-center text-xs uppercase tracking-widest text-zinc-500 font-semibold cursor-pointer select-none">
            Anteriores ({anteriores.length})
          </summary>
          <div className="flex flex-col gap-2 mt-2">
            {anteriores.map((p) => <TarjetaPlan key={p.id} plan={p} hoy={hoy} onAbrir={() => onAbrir(p.id)} />)}
          </div>
        </details>
      )}
    </div>
  )
}
