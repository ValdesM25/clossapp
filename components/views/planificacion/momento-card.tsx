"use client"

import { useState } from "react"
import { Check, CloudRain, RotateCw, Sun, Moon, Sparkles } from "lucide-react"
import type { Prenda } from "@/types"
import { cn } from "@/lib/utils"
import type { MomentoPlan } from "@/lib/planificacion"
import { OutfitVisual } from "@/components/views/simulador/outfit-visual"
import { SugerenciasShop } from "./sugerencias-shop"

const boton = "h-10 px-3 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"

/** Un outfit planeado: encabezado con actividad y clima, y su estado. */
export function MomentoCard({
  momento, prendas, hoy, armando, regenerando, soloLectura, cuotaHoy, itemsShop, userId, onOtro, onReintentar, onMeLoPuse,
}: {
  momento: MomentoPlan
  prendas: Prenda[]
  hoy: string
  /** El plan se está armando o regenerando: nada que gaste IA se puede pulsar. */
  armando: boolean
  regenerando: boolean
  soloLectura: boolean
  /** Días que quedan hoy; null si no se sabe. */
  cuotaHoy: number | null
  itemsShop: Prenda[] | null
  userId: string
  onOtro: () => void
  onReintentar: () => void
  onMeLoPuse: () => Promise<void>
}) {
  const [guardando, setGuardando] = useState(false)
  const { clima, outfit } = momento
  const esNoche = momento.momento === "noche"

  const ids = outfit?.prenda_ids ?? []
  const delOutfit = ids.map((id) => prendas.find((p) => p.id === id)).filter((p): p is Prenda => !!p)
  const faltanPrendas = ids.length - delOutfit.length

  const motivoSinOtro = armando ? "Espera a que terminemos de armar." : cuotaHoy === 0 ? "Ya usaste los días de planificación de hoy." : null

  return (
    <article className="border border-zinc-200 bg-white flex flex-col">
      <header className="px-4 py-3 border-b border-zinc-100 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold flex items-center gap-1.5">
            {esNoche ? <Moon className="w-3.5 h-3.5" aria-hidden="true" /> : <Sun className="w-3.5 h-3.5" aria-hidden="true" />}
            {esNoche ? "Noche" : "Día"}
          </p>
          <p className="text-sm text-zinc-900 mt-0.5">{momento.actividad.trim() || "Día casual"}</p>
        </div>
        {clima && (
          <p className="text-xs text-zinc-500 text-right shrink-0 flex items-center gap-1">
            {clima.lluvia && <CloudRain className="w-3.5 h-3.5" aria-label="Lluvia" />}
            <span>
              {clima.min}-{clima.max} °C · {clima.texto}
              {clima.fuente === "historico" && <span className="block">(clima típico)</span>}
            </span>
          </p>
        )}
      </header>

      <div className="p-4 flex flex-col gap-3">
        {momento.estado === "pendiente" && (
          armando
            ? <div className="flex flex-col gap-2" aria-hidden="true">
                <div className="h-4 w-2/3 bg-zinc-100 animate-pulse" />
                <div className="h-12 w-full bg-zinc-100 animate-pulse" />
                <p className="text-xs text-zinc-500">Armando…</p>
              </div>
            : <p className="text-xs text-zinc-500">Pendiente</p>
        )}

        {momento.estado === "error" && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-zinc-700">No pudimos armar este outfit.</p>
            {!soloLectura && (
              <button type="button" onClick={onReintentar} disabled={armando} className={cn(boton, "self-start border border-zinc-300 hover:border-zinc-900 bg-white text-zinc-800")}>
                <RotateCw className={cn("w-3.5 h-3.5", armando && "animate-spin")} aria-hidden="true" />
                Reintentar
              </button>
            )}
          </div>
        )}

        {momento.estado === "listo" && outfit && (
          <>
            <h4 className="font-serif text-xl text-zinc-900 font-normal leading-snug">{outfit.titulo}</h4>
            <p className="text-xs text-zinc-600">{outfit.descripcion}</p>
            {faltanPrendas > 0 && <p className="text-xs text-zinc-700">Una prenda de este outfit ya no está en tu armario.</p>}
            {delOutfit.length >= 2 && (
              <>
                <OutfitVisual outfitPrendas={delOutfit} />
                <p className="text-xs text-zinc-500">{delOutfit.map((p) => p.name).join(" · ")}</p>
              </>
            )}
            {outfit.justificacion && (
              <div className="bg-zinc-50 border border-zinc-200/80 p-3 sm:p-3.5 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-[11px] font-semibold text-zinc-900 uppercase tracking-wider">
                    ¿Por qué este outfit?
                  </p>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {outfit.justificacion}
                  </p>
                </div>
              </div>
            )}
            {momento.faltante && <SugerenciasShop faltante={momento.faltante} items={itemsShop} userId={userId} />}

            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-100">
              {!soloLectura && (
                <button type="button" onClick={onOtro} disabled={!!motivoSinOtro} className={cn(boton, "border border-zinc-300 hover:border-zinc-900 bg-white text-zinc-800")}>
                  <RotateCw className={cn("w-3.5 h-3.5", regenerando && "animate-spin")} aria-hidden="true" />
                  {regenerando ? "Armando otro…" : "Otro outfit"}
                </button>
              )}
              {momento.usado_en ? (
                <span className="h-10 px-1 text-xs font-medium text-zinc-700 flex items-center gap-1">
                  Usado <Check className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
              ) : momento.fecha <= hoy && (
                <button
                  type="button"
                  disabled={guardando}
                  onClick={async () => { setGuardando(true); await onMeLoPuse(); setGuardando(false) }}
                  className={cn(boton, "bg-zinc-900 hover:bg-zinc-800 text-white")}
                >
                  {guardando ? "Guardando…" : "Me lo puse"}
                </button>
              )}
              {!soloLectura && motivoSinOtro && !regenerando && <p className="text-xs text-zinc-500 w-full">{motivoSinOtro}</p>}
            </div>
          </>
        )}
      </div>
    </article>
  )
}
