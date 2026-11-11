"use client"

import { useState } from "react"
import { Calendar, MapPin, Sparkles, Trash2 } from "lucide-react"
import type { Prenda } from "@/types"
import { cn } from "@/lib/utils"
import { diasDe, diasEntre, rangoFechas, type MomentoPlan, type PlanOutfit, type TipoPlan } from "@/lib/planificacion"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { MomentoCard } from "./momento-card"
import { Maleta } from "./maleta"

export const NOMBRE_TIPO: Record<TipoPlan, string> = { semana: "Mi semana", fecha: "Fecha importante", viaje: "Viaje" }

const DIA_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

export type AccionesPlan = {
  onArmar: () => void
  onOtro: (momentoId: string) => void
  onBorrar: () => Promise<void>
  onEmpacar: (prendaId: string, valor: boolean) => void
  onMeLoPuse: (momento: MomentoPlan) => Promise<void>
}

/** Un plan completo. En la vista previa se dibuja con el ejemplo y `soloLectura`. */
export function PlanDetalle({
  plan, prendas, hoy, soloLectura, generando, regenerando, cuota, avisoCuota, itemsShop, userId, acciones,
}: {
  plan: PlanOutfit
  prendas: Prenda[]
  hoy: string
  soloLectura: boolean
  generando: string | null
  regenerando: string | null
  cuota: { hoy: number; mes: number } | null
  avisoCuota: string | null
  itemsShop: Prenda[] | null
  userId: string
  acciones: AccionesPlan
}) {
  const fechas = diasEntre(plan.fecha_inicio, plan.fecha_fin)
  const [dia, setDia] = useState(() => fechas.includes(hoy) ? hoy : fechas[0])
  const [borrando, setBorrando] = useState(false)

  const armando = generando === plan.id
  const ocupado = generando !== null
  const listos = plan.momentos.filter((m) => m.estado === "listo").length
  const total = plan.momentos.length
  const sinListo = plan.momentos.filter((m) => m.estado !== "listo")
  const diasFaltan = diasDe(sinListo)
  const quedaHoy = cuota ? Math.min(cuota.hoy, cuota.mes) : 0
  const esViaje = plan.tipo === "viaje"

  return (
    <div className="flex flex-col gap-6">
      {/* Portada */}
      <div className="bg-[#121212] text-white p-6 flex flex-col gap-4">
        <div>
          <p className="text-xs tracking-widest text-zinc-400 uppercase font-semibold">{NOMBRE_TIPO[plan.tipo]}</p>
          <h2 className="font-serif text-3xl text-white font-normal mt-2 tracking-tight">{plan.nombre}</h2>
          <div className="flex items-center gap-4 text-xs text-zinc-300 flex-wrap mt-3">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
              {rangoFechas(plan.fecha_inicio, plan.fecha_fin)}
            </span>
            {plan.lugar && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                {plan.lugar.nombre}
              </span>
            )}
          </div>
        </div>
        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-zinc-300 mb-2">{listos} de {total} outfits listos</p>
          <div className="w-full h-1.5 bg-white/10 overflow-hidden" aria-hidden="true">
            <div className="h-full bg-white transition-[width] duration-500" style={{ width: `${total ? Math.round((listos / total) * 100) : 0}%` }} />
          </div>
        </div>
      </div>

      <p aria-live="polite" className="text-xs text-zinc-700 flex items-center gap-1.5 empty:hidden">
        {armando && !regenerando && <><Sparkles className="w-3.5 h-3.5 animate-pulse" aria-hidden="true" />Armando tus outfits… {listos} de {total}</>}
      </p>

      {/* Completar lo que falta */}
      {!soloLectura && !ocupado && sinListo.length > 0 && (
        <div className="border border-zinc-200 bg-zinc-50 p-4 flex flex-col gap-3">
          {quedaHoy > 0 ? (
            <>
              <p className="text-xs text-zinc-700">Te faltan {diasFaltan} {diasFaltan === 1 ? "día" : "días"} por armar.</p>
              <button type="button" onClick={acciones.onArmar} className="self-start h-10 px-4 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium flex items-center gap-2 transition-colors">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Completar
              </button>
            </>
          ) : (
            <p className="text-xs text-zinc-700">
              Te faltan {diasFaltan} {diasFaltan === 1 ? "día" : "días"} por armar. {avisoCuota ?? "Mañana puedes completarlos."}
            </p>
          )}
        </div>
      )}

      <div className={cn("grid grid-cols-1 gap-8 items-start", esViaje && "lg:grid-cols-12")}>
        <section aria-labelledby={`dias-${plan.id}`} className={cn("flex flex-col gap-4", esViaje && "lg:col-span-8")}>
          <h3 id={`dias-${plan.id}`} className="font-serif text-2xl text-zinc-900 font-normal">Tus outfits, día a día</h3>

          {/* Selector de días */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 snap-x">
            {fechas.map((f) => {
              const delDia = plan.momentos.filter((m) => m.fecha === f)
              const punto = delDia.some((m) => m.estado === "error") ? "bg-red-500"
                : delDia.every((m) => m.estado === "listo") ? "bg-emerald-500" : "bg-zinc-300"
              const activo = f === dia
              const d = new Date(`${f}T00:00:00Z`)
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setDia(f)}
                  className={cn(
                    "snap-start shrink-0 w-16 h-[72px] border flex flex-col items-center justify-center gap-1 transition-colors",
                    activo ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-900 border-zinc-200 hover:border-zinc-400",
                  )}
                >
                  <span className="text-xs">{DIA_SEMANA[d.getUTCDay()]}</span>
                  <span className="text-lg font-serif leading-none">{d.getUTCDate()}</span>
                  <span className={cn("w-1.5 h-1.5 rounded-full", punto)} aria-hidden="true" />
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-4">
            {plan.momentos.filter((m) => m.fecha === dia).map((m) => (
              <MomentoCard
                key={m.id}
                momento={m}
                prendas={prendas}
                hoy={hoy}
                armando={ocupado}
                regenerando={regenerando === m.id}
                soloLectura={soloLectura}
                cuotaHoy={cuota ? Math.min(cuota.hoy, cuota.mes) : null}
                itemsShop={itemsShop}
                userId={userId}
                onOtro={() => acciones.onOtro(m.id)}
                onReintentar={acciones.onArmar}
                onMeLoPuse={() => acciones.onMeLoPuse(m)}
              />
            ))}
          </div>
        </section>

        {esViaje && (
          <div className="lg:col-span-4">
            <Maleta plan={plan} prendas={prendas} onEmpacar={acciones.onEmpacar} />
          </div>
        )}
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button type="button" disabled={ocupado} className="self-start h-10 px-2 text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1.5 transition-colors disabled:opacity-50">
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            Borrar plan
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif font-normal">¿Borrar este plan?</AlertDialogTitle>
            <AlertDialogDescription>Se borran sus outfits y su maleta.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none h-10">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none h-10 bg-zinc-900 hover:bg-zinc-800"
              disabled={borrando}
              onClick={async (e) => {
                e.preventDefault()
                setBorrando(true)
                try { await acciones.onBorrar() } finally { setBorrando(false) }
              }}
            >
              {borrando ? "Borrando…" : "Borrar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
