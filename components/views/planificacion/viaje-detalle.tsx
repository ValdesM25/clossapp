"use client"

import { useMemo, useRef, useState } from "react"
import { ArrowRight, Check, Luggage, RotateCw, Sparkles, Trash2 } from "lucide-react"
import type { Prenda } from "@/types"
import { cn } from "@/lib/utils"
import { diasDe, fechaCorta, maletaDe, ordenMomento, type MomentoPlan, type PlanOutfit } from "@/lib/planificacion"
import { rangoFechasEditorial } from "@/constants/viajes-lugares"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Maleta } from "./maleta"
import { SugerenciasShop } from "./sugerencias-shop"
import { ViajeStepper } from "./viaje-stepper"
import type { AccionesPlan } from "./plan-detalle"

function FlatLayCollage({ prendas, compacto = false }: { prendas: Prenda[]; compacto?: boolean }) {
  if (prendas.length === 0) {
    return (
      <div className={cn("bg-[#E3DDD3] flex items-center justify-center text-xs text-zinc-500", compacto ? "h-40" : "min-h-[240px]")}>
        Sin prendas visibles
      </div>
    )
  }

  const visibles = prendas.slice(0, compacto ? 4 : 6)
  return (
    <div
      className={cn(
        "bg-[#E3DDD3] grid gap-2.5 sm:gap-3 place-items-center",
        compacto ? "p-3.5 grid-cols-2" : "p-4 sm:p-5 grid-cols-2 sm:grid-cols-3"
      )}
    >
      {visibles.map((p) => (
        <div
          key={p.id}
          className={cn(
            "w-full aspect-square bg-[#F4F0E9] overflow-hidden flex items-center justify-center border border-zinc-200/70",
            visibles.length === 2 && !compacto && "sm:col-span-1"
          )}
        >
          {p.image_url ? (
            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[11px] text-zinc-500 text-center px-2 leading-tight">{p.name}</span>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Vista editorial de Paso 3 (Outfits) para planes de tipo "viaje".
 * Replica el diseño de las 3 pantallas de referencia y mantiene toda la funcionalidad
 * real: regenerar outfit, marcar como usado, completar con IA, sugerencias del Shop y Maleta.
 */
export function ViajeDetalle({
  plan,
  prendas,
  hoy,
  soloLectura,
  generando,
  regenerando,
  cuota,
  avisoCuota,
  itemsShop,
  userId,
  acciones,
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
  const momentosOrdenados = useMemo(() => [...plan.momentos].sort(ordenMomento), [plan.momentos])
  const [indice, setIndice] = useState(0)
  const [guardandoUso, setGuardandoUso] = useState(false)
  const [guardadoLocal, setGuardadoLocal] = useState<Record<string, boolean>>({})
  const [borrando, setBorrando] = useState(false)
  const refOutfits = useRef<HTMLDivElement>(null)
  const refMaleta = useRef<HTMLDivElement>(null)

  const idxSeguro = Math.min(indice, Math.max(0, momentosOrdenados.length - 1))
  const activo: MomentoPlan | undefined = momentosOrdenados[idxSeguro]
  const sigIdx = momentosOrdenados.length > 1 ? (idxSeguro + 1) % momentosOrdenados.length : -1
  const siguiente: MomentoPlan | undefined = sigIdx >= 0 ? momentosOrdenados[sigIdx] : undefined

  const armando = generando === plan.id
  const ocupado = generando !== null
  const listos = plan.momentos.filter((m) => m.estado === "listo").length
  const total = plan.momentos.length
  const sinListo = plan.momentos.filter((m) => m.estado !== "listo")
  const diasFaltan = diasDe(sinListo)
  const quedaHoy = cuota ? Math.min(cuota.hoy, cuota.mes) : 0
  const cuotaHoy = cuota ? Math.min(cuota.hoy, cuota.mes) : null
  const maleta = maletaDe(plan, prendas)

  const prendasDe = (m: MomentoPlan | undefined): Prenda[] => {
    const ids = m?.outfit?.prenda_ids ?? []
    return ids.map((id) => prendas.find((p) => p.id === id)).filter((p): p is Prenda => !!p)
  }

  const delActivo = prendasDe(activo)
  const delSiguiente = prendasDe(siguiente)
  const faltanPrendas = (activo?.outfit?.prenda_ids.length ?? 0) - delActivo.length
  const motivoSinOtro = ocupado
    ? "Espera a que terminemos de armar."
    : cuotaHoy === 0
      ? "Ya usaste los días de planificación de hoy."
      : null

  const irAMomento = (nuevoIdx: number, subir = false) => {
    setIndice(nuevoIdx)
    if (subir) refOutfits.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div ref={refOutfits} className="flex flex-col gap-6 sm:gap-7 w-full max-w-full min-w-0 overflow-x-hidden">
      <ViajeStepper pasoActual={3} />

      {/* Encabezado editorial */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-terracota font-medium truncate">
            {(plan.lugar?.nombre ?? plan.nombre).toUpperCase()} / {rangoFechasEditorial(plan.fecha_inicio, plan.fecha_fin)}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-zinc-900 font-normal leading-tight">
            Un look para cada lugar.
          </h1>
          <p className="text-sm text-zinc-600">
            Tus planes, tu estilo y prendas que ya tienes. Así de fácil.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refMaleta.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="self-start sm:self-auto h-10 px-4 border border-zinc-300 hover:border-zinc-900 bg-[#F4F0E9] text-xs font-medium text-zinc-900 flex items-center gap-2 transition-colors shrink-0"
        >
          <Luggage className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Tu maleta ({maleta.empacadas}/{maleta.total})</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Estado de generación o completar pendientes */}
      {armando && !regenerando && (
        <p aria-live="polite" className="text-xs text-zinc-700 flex items-center gap-1.5 border border-zinc-200 bg-[#F4F0E9] px-4 py-3">
          <Sparkles className="w-3.5 h-3.5 text-terracota animate-pulse" aria-hidden="true" />
          Armando tus outfits… {listos} de {total}
        </p>
      )}

      {!soloLectura && !ocupado && sinListo.length > 0 && (
        <div className="border border-zinc-200 bg-[#F4F0E9] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {quedaHoy > 0 ? (
            <>
              <p className="text-xs text-zinc-700">
                Te faltan {diasFaltan} {diasFaltan === 1 ? "día" : "días"} por armar en este viaje.
              </p>
              <button
                type="button"
                onClick={acciones.onArmar}
                className="self-start sm:self-auto h-10 px-4 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium flex items-center gap-2 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Completar outfits
              </button>
            </>
          ) : (
            <p className="text-xs text-zinc-700">
              Te faltan {diasFaltan} {diasFaltan === 1 ? "día" : "días"} por armar. {avisoCuota ?? "Mañana puedes completarlos."}
            </p>
          )}
        </div>
      )}

      {/* Pestañas por DÍA + clima de referencia */}
      {momentosOrdenados.length > 0 && (
        <div className="w-full max-w-full flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] overscroll-x-contain">
          {momentosOrdenados.map((m, i) => {
            const esActivo = i === idxSeguro
            const punto = m.estado === "listo" ? "bg-emerald-500" : m.estado === "error" ? "bg-red-500" : "bg-zinc-400"
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={esActivo}
                onClick={() => irAMomento(i)}
                className={cn(
                  "shrink-0 h-11 px-4 border text-xs font-medium flex items-center gap-2 transition-colors",
                  esActivo
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-[#F4F0E9] text-zinc-700 border-zinc-300 hover:border-zinc-900"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", punto)} aria-hidden="true" />
                <span className="font-mono text-[11px] uppercase">Día {i + 1}</span>
                <span className={cn("text-[11px]", esActivo ? "text-zinc-300" : "text-zinc-500")}>
                  · {fechaCorta(m.fecha)}
                </span>
              </button>
            )
          })}
          {activo?.clima && (
            <span className="text-xs text-zinc-500 pl-2 shrink-0">
              Clima de referencia · {activo.clima.min}–{activo.clima.max} °C
              {activo.clima.lluvia ? " · Lluvia" : ""}
            </span>
          )}
        </div>
      )}

      {/* Grid principal: Look destacado (izquierda) + También en tu viaje (derecha) */}
      {activo && (
        <div className={cn("grid grid-cols-1 gap-6 items-start", siguiente && "lg:grid-cols-[1.65fr_1fr]")}>
          {/* Tarjeta principal del outfit */}
          <article className="bg-[#F4F0E9] border border-zinc-200 p-5 sm:p-7 flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-terracota font-semibold truncate">
                Día {idxSeguro + 1} · {activo.actividad.trim() || "Paseo casual"}
              </p>
              <span className="text-xs font-mono text-zinc-500 shrink-0">
                {String(idxSeguro + 1).padStart(2, "0")} / {String(momentosOrdenados.length).padStart(2, "0")}
              </span>
            </div>

            {activo.estado === "pendiente" && (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                <p className="font-serif text-2xl text-zinc-900 font-normal">
                  {armando || regenerando === activo.id ? "Armando tu look…" : `Outfit del Día ${idxSeguro + 1} pendiente`}
                </p>
                <p className="text-xs text-zinc-500 max-w-sm">
                  Seleccionaremos prendas reales de tu armario según el clima y los lugares que elegiste para este día ({activo.actividad.trim() || "paseo casual"}).
                </p>
                {!soloLectura && !ocupado && quedaHoy > 0 && (
                  <button
                    type="button"
                    onClick={() => acciones.onOtro(activo.id)}
                    className="mt-2 h-11 px-5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium flex items-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    Armar outfit del Día {idxSeguro + 1}
                  </button>
                )}
              </div>
            )}

            {activo.estado === "error" && (
              <div className="py-8 flex flex-col gap-3">
                <p className="font-serif text-xl text-zinc-900">No pudimos armar este outfit.</p>
                {!soloLectura && (
                  <button
                    type="button"
                    onClick={acciones.onArmar}
                    disabled={ocupado}
                    className="self-start h-10 px-4 border border-zinc-900 bg-white text-zinc-900 text-xs font-medium flex items-center gap-2 disabled:opacity-45"
                  >
                    <RotateCw className={cn("w-3.5 h-3.5", ocupado && "animate-spin")} aria-hidden="true" />
                    Reintentar
                  </button>
                )}
              </div>
            )}

            {activo.estado === "listo" && activo.outfit && (
              <>
                <h2 className="font-serif text-2xl sm:text-3xl text-zinc-900 font-normal leading-tight">
                  {activo.outfit.titulo}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr] gap-5 sm:gap-6 items-start">
                  <FlatLayCollage prendas={delActivo} />

                  {/* Lista numerada DE TU ARMARIO */}
                  <div className="flex flex-col">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-semibold pb-2">
                      De tu armario
                    </p>
                    <ol className="divide-y divide-zinc-200/80 border-t border-b border-zinc-200/80">
                      {delActivo.map((p, idx) => (
                        <li key={p.id} className="py-2.5 flex items-baseline gap-3 text-sm text-zinc-900">
                          <span className="font-mono text-[11px] text-terracota font-medium shrink-0">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span className="leading-snug">{p.name}</span>
                        </li>
                      ))}
                    </ol>
                    <p className="text-xs text-zinc-500 mt-3">
                      {delActivo.length} {delActivo.length === 1 ? "prenda" : "prendas"} · 1 combinación
                    </p>
                    {faltanPrendas > 0 && (
                      <p className="text-xs text-zinc-600 mt-1">
                        Una prenda de este outfit ya no está en tu armario.
                      </p>
                    )}
                  </div>
                </div>

                {/* Justificación estilista */}
                <div className="flex items-start gap-3 pt-1">
                  <Sparkles className="w-4 h-4 text-terracota shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                    {activo.outfit.justificacion || activo.outfit.descripcion}
                  </p>
                </div>

                {activo.faltante && (
                  <SugerenciasShop faltante={activo.faltante} items={itemsShop} userId={userId} />
                )}

                {/* Botones de acción */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  {activo.usado_en || guardadoLocal[activo.id] ? (
                    <div className="h-12 px-5 bg-zinc-900 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2">
                      <Check className="w-4 h-4 text-terracota" aria-hidden="true" />
                      <span>{activo.usado_en ? "Usado en tu viaje" : "Guardado para mi viaje"}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={guardandoUso || soloLectura}
                      onClick={async () => {
                        if (activo.fecha <= hoy) {
                          setGuardandoUso(true)
                          try { await acciones.onMeLoPuse(activo) } finally { setGuardandoUso(false) }
                        } else {
                          setGuardadoLocal((prev) => ({ ...prev, [activo.id]: true }))
                        }
                      }}
                      className="h-12 px-5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm font-medium flex items-center justify-between sm:justify-center gap-4 transition-colors disabled:opacity-50"
                    >
                      <span>{guardandoUso ? "Guardando…" : activo.fecha <= hoy ? "Me lo puse" : "Guardar para mi viaje"}</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}

                  {!soloLectura && (
                    <button
                      type="button"
                      disabled={!!motivoSinOtro}
                      onClick={() => acciones.onOtro(activo.id)}
                      className="h-12 px-5 border border-zinc-300 hover:border-zinc-900 bg-[#F4F0E9] text-zinc-900 text-xs sm:text-sm font-medium flex items-center justify-between sm:justify-center gap-4 transition-colors disabled:opacity-45"
                    >
                      <span>{regenerando === activo.id ? "Buscando otra combinación…" : "Ver otra combinación"}</span>
                      {regenerando === activo.id ? (
                        <RotateCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  )}
                </div>
                {motivoSinOtro && !ocupado && !soloLectura && (
                  <p className="text-xs text-zinc-500">{motivoSinOtro}</p>
                )}
              </>
            )}
          </article>

          {/* Tarjeta secundaria: También en tu viaje */}
          {siguiente && (
            <aside className="bg-[#EFECE6] border border-zinc-200 p-5 sm:p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-terracota font-semibold">
                  Día {sigIdx + 1} · {fechaCorta(siguiente.fecha)}
                </p>
                <span className="text-xs font-mono text-zinc-500">
                  {String(sigIdx + 1).padStart(2, "0")}
                </span>
              </div>

              <h3 className="font-serif text-xl sm:text-2xl text-zinc-900 font-normal leading-snug">
                {siguiente.outfit?.titulo || siguiente.actividad || `Día ${sigIdx + 1}`}
              </h3>

              <FlatLayCollage prendas={delSiguiente} compacto />

              {delSiguiente.length > 0 && (
                <p className="text-xs font-medium text-zinc-900">
                  {delSiguiente.slice(0, 3).map((p) => p.name).join(" + ")}
                </p>
              )}

              <p className="text-xs text-zinc-600 leading-relaxed line-clamp-3">
                {siguiente.outfit?.justificacion || siguiente.outfit?.descripcion || `Lugares del día: ${siguiente.actividad || "paseo casual"}.`}
              </p>

              <button
                type="button"
                onClick={() => irAMomento(sigIdx, true)}
                className="mt-1 h-11 w-full border border-zinc-300 hover:border-zinc-900 bg-[#F4F0E9] text-zinc-900 text-xs font-medium px-4 flex items-center justify-between transition-colors"
              >
                <span>Ver outfit del Día {sigIdx + 1}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </aside>
          )}
        </div>
      )}

      {/* Maleta del viaje */}
      <div ref={refMaleta} className="pt-2 scroll-mt-4">
        <Maleta plan={plan} prendas={prendas} onEmpacar={acciones.onEmpacar} />
      </div>

      {/* Borrar plan */}
      {!soloLectura && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              disabled={ocupado}
              className="self-start h-10 px-2 text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              Borrar viaje
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-none">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif font-normal">¿Borrar este viaje?</AlertDialogTitle>
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
      )}
    </div>
  )
}
