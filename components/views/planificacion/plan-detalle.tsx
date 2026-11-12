"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Calendar, Check, ChevronLeft, ChevronRight, Luggage, MapPin, Shirt, Sparkles, Trash2 } from "lucide-react"
import type { Prenda } from "@/types"
import { cn } from "@/lib/utils"
import { cuentaRegresiva, diasDe, diasEntre, estadoPlan, fechaCorta, maletaDe, rangoFechas, type MomentoPlan, type PlanOutfit, type TipoPlan } from "@/lib/planificacion"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { MomentoCard } from "./momento-card"
import { Maleta } from "./maleta"

export const NOMBRE_TIPO: Record<TipoPlan, string> = { semana: "Mi semana", fecha: "Fecha importante", viaje: "Viaje" }

const DIA_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const botonDia = "h-12 px-3 border border-zinc-200 hover:border-zinc-900 bg-white text-xs font-medium text-zinc-800 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:hover:border-zinc-200"

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
  const [pestana, setPestana] = useState<"outfits" | "maleta">("outfits")
  const seccion = useRef<HTMLElement>(null)
  const tira = useRef<HTMLDivElement>(null)
  // El día elegido queda centrado en la tira (se mueve la tira, no la página).
  useEffect(() => {
    const t = tira.current, el = t?.querySelector<HTMLElement>("[aria-pressed=true]")
    if (t && el) t.scrollTo({ left: el.offsetLeft - (t.clientWidth - el.offsetWidth) / 2, behavior: "smooth" })
  }, [dia])

  const armando = generando === plan.id
  const ocupado = generando !== null
  const listos = plan.momentos.filter((m) => m.estado === "listo").length
  const total = plan.momentos.length
  const sinListo = plan.momentos.filter((m) => m.estado !== "listo")
  const diasFaltan = diasDe(sinListo)
  const quedaHoy = cuota ? Math.min(cuota.hoy, cuota.mes) : 0
  const esViaje = plan.tipo === "viaje"

  const maleta = esViaje ? maletaDe(plan, prendas) : null
  const estado = estadoPlan(plan, hoy)
  const i = fechas.indexOf(dia)
  /** Cambia de día; desde los botones de abajo, además regresa al inicio de la sección. */
  const irA = (n: number, subir = false) => {
    if (n < 0 || n >= fechas.length) return
    setDia(fechas[n])
    if (subir) seccion.current?.scrollIntoView({ block: "start" })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Portada */}
      <div className="bg-[#121212] text-white p-6 flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs tracking-widest text-zinc-400 uppercase font-semibold">{NOMBRE_TIPO[plan.tipo]}</p>
            <p className={cn("text-xs px-2 py-1 shrink-0", estado === "en_curso" ? "bg-white text-zinc-900 font-medium" : "border border-white/20 text-zinc-300")}>
              {cuentaRegresiva(plan, hoy)}
            </p>
          </div>
          <h2 className="font-serif text-3xl text-white font-normal mt-3 tracking-tight text-balance">{plan.nombre}</h2>
          <div className="flex items-center gap-x-4 gap-y-1.5 text-xs text-zinc-300 flex-wrap mt-3">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
              {rangoFechas(plan.fecha_inicio, plan.fecha_fin)}
            </span>
            {plan.lugar && (
              <span className="flex items-center gap-1.5 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
                <span className="truncate">{plan.lugar.nombre}</span>
              </span>
            )}
          </div>
        </div>
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-zinc-300 mb-2">
            <span>{listos === total && total > 0 ? "Todos tus outfits están listos" : `${listos} de ${total} outfits listos`}</span>
            {listos === total && total > 0 && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
          </div>
          <div className="w-full h-1 bg-white/10 overflow-hidden" aria-hidden="true">
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

      {/* En celular la maleta queda a un toque, no al final de todos los outfits. */}
      {maleta && (
        <div role="tablist" aria-label="Secciones del viaje" className="grid grid-cols-2 border border-zinc-200 bg-white p-1 gap-1 lg:hidden">
          {([["outfits", "Outfits", Shirt, `${listos}/${total}`], ["maleta", "Maleta", Luggage, `${maleta.empacadas}/${maleta.total}`]] as const).map(([id, titulo, Icono, cuenta]) => (
            <button key={id} type="button" role="tab" aria-selected={pestana === id} onClick={() => setPestana(id)}
              className={cn("h-11 text-sm font-medium flex items-center justify-center gap-2 transition-colors", pestana === id ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900")}>
              <Icono className="w-4 h-4" aria-hidden="true" />
              {titulo}
              <span className={cn("text-xs tabular-nums", pestana === id ? "text-zinc-300" : "text-zinc-400")}>{cuenta}</span>
            </button>
          ))}
        </div>
      )}

      <div className={cn("grid grid-cols-1 gap-8 items-start", esViaje && "lg:grid-cols-12")}>
        <section ref={seccion} aria-labelledby={`dias-${plan.id}`} className={cn("flex-col gap-4 scroll-mt-4 min-w-0", pestana === "outfits" ? "flex" : "hidden lg:flex", esViaje && "lg:col-span-8")}>
          <h3 id={`dias-${plan.id}`} className="font-serif text-2xl text-zinc-900 font-normal">Tus outfits, día a día</h3>

          {/* Selector de días: se queda arriba al bajar por los outfits. */}
          {fechas.length > 1 && (
            <div ref={tira} className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-white/95 backdrop-blur border-b border-zinc-100 flex gap-2 overflow-x-auto snap-x scroll-px-4 [scrollbar-width:none] overscroll-x-contain">
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
                    aria-label={`${fechaCorta(f)}${f === hoy ? ", hoy" : ""}`}
                    onClick={() => setDia(f)}
                    className={cn(
                      "snap-start shrink-0 w-14 h-16 border flex flex-col items-center justify-center gap-1 transition-colors",
                      activo ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-900 border-zinc-200 hover:border-zinc-400",
                    )}
                  >
                    <span className={cn("text-[11px] leading-none", f === hoy && "font-semibold")}>{f === hoy ? "Hoy" : DIA_SEMANA[d.getUTCDay()]}</span>
                    <span className="text-lg font-serif leading-none">{d.getUTCDate()}</span>
                    <span className={cn("w-1.5 h-1.5 rounded-full", punto)} aria-hidden="true" />
                  </button>
                )
              })}
            </div>
          )}

          {/* Deslizar a los lados cambia de día; pan-y deja el scroll vertical al navegador. */}
          <motion.div
            key={dia}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            style={{ touchAction: "pan-y" }}
            onPanEnd={(_, { offset }) => {
              if (Math.abs(offset.x) > 70 && Math.abs(offset.x) > Math.abs(offset.y) * 2) irA(i + (offset.x < 0 ? 1 : -1))
            }}
            className="flex flex-col gap-4"
          >
            {fechas.length > 1 && (
              <p className="text-xs text-zinc-500 first-letter:uppercase">{fechaCorta(dia)} · día {i + 1} de {fechas.length}</p>
            )}
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
          </motion.div>

          {fechas.length > 1 && (
            <nav aria-label="Cambiar de día" className="grid grid-cols-2 gap-2">
              <button type="button" disabled={i <= 0} onClick={() => irA(i - 1, true)} className={cn(botonDia, "justify-start")}>
                <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="first-letter:uppercase">{i > 0 ? fechaCorta(fechas[i - 1]) : "Primer día"}</span>
              </button>
              <button type="button" disabled={i >= fechas.length - 1} onClick={() => irA(i + 1, true)} className={cn(botonDia, "justify-end")}>
                <span className="first-letter:uppercase">{i < fechas.length - 1 ? fechaCorta(fechas[i + 1]) : "Último día"}</span>
                <ChevronRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
            </nav>
          )}
        </section>

        {esViaje && (
          <div className={cn("lg:col-span-4 lg:block min-w-0", pestana === "maleta" ? "block" : "hidden")}>
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
