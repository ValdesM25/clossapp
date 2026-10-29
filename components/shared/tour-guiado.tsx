"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ArrowLeft, ArrowRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PasoTour } from "@/constants/tour"

interface TourGuiadoProps {
  pasos: PasoTour[]
  onCerrar: () => void
  /** Botón extra en la última diapositiva (ej. "Crear mi cuenta"). */
  accionFinal?: { texto: string; onClick: () => void }
}

type Rect = { top: number; left: number; width: number; height: number }

const MARGEN = 8
const sel = (ancla: string) => `[data-tour="${ancla}"]`

/**
 * Recorrido tipo presentación sobre la interfaz real. Cada paso puede abrir
 * una sección (clickAntes) y resaltar un elemento (ancla, por data-tour).
 * Sin ancla es una diapositiva centrada.
 */
export function TourGuiado({ pasos, onCerrar, accionFinal }: TourGuiadoProps) {
  const [indice, setIndice] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  // En pasos interactivos el elemento puede desaparecer al tocarlo (ej. el
  // botón de QR que se convierte en resultado): entonces se quita el oscurecido.
  const [anclaPerdida, setAnclaPerdida] = useState(false)
  const tarjetaRef = useRef<HTMLDivElement>(null)
  const paso = pasos[indice]
  const esUltimo = indice === pasos.length - 1

  const ir = useCallback((n: number) => setIndice(Math.min(Math.max(n, 0), pasos.length - 1)), [pasos.length])

  // Prepara el paso: abre lo que haga falta y espera a que aparezca el ancla.
  useEffect(() => {
    let cancelado = false
    setRect(null)
    setAnclaPerdida(false)
    let encontrada = false
    paso.clickAntes?.forEach((a) => document.querySelector<HTMLElement>(sel(a))?.click())
    if (!paso.ancla) return
    let intentos = 0
    const buscar = () => {
      if (cancelado) return
      const el = document.querySelector<HTMLElement>(sel(paso.ancla!))
      if (el) {
        encontrada = true
        el.scrollIntoView({ block: "center", behavior: "smooth" })
        // Medir después del scroll suave.
        setTimeout(() => { if (!cancelado) medir() }, 350)
      } else if (intentos++ < 30) {
        setTimeout(buscar, 100)
      }
    }
    const medir = () => {
      const el = document.querySelector<HTMLElement>(sel(paso.ancla!))
      if (!el) {
        setRect(null)
        if (encontrada) setAnclaPerdida(true)
        return
      }
      setAnclaPerdida(false)
      const r = el.getBoundingClientRect()
      setRect({ top: r.top - MARGEN, left: r.left - MARGEN, width: r.width + MARGEN * 2, height: r.height + MARGEN * 2 })
    }
    buscar()
    // Lo interactivo cambia la pantalla sin scroll ni resize: se vuelve a medir.
    const intervalo = paso.interactivo ? setInterval(() => { if (encontrada) medir() }, 400) : undefined
    window.addEventListener("resize", medir)
    window.addEventListener("scroll", medir, true)
    return () => {
      cancelado = true
      clearInterval(intervalo)
      window.removeEventListener("resize", medir)
      window.removeEventListener("scroll", medir, true)
    }
  }, [paso])

  useLayoutEffect(() => { tarjetaRef.current?.focus() }, [indice])

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar()
      else if (e.key === "ArrowRight" && !esUltimo) ir(indice + 1)
      else if (e.key === "ArrowLeft") ir(indice - 1)
    }
    window.addEventListener("keydown", tecla)
    return () => window.removeEventListener("keydown", tecla)
  }, [indice, esUltimo, ir, onCerrar])

  if (typeof document === "undefined") return null

  const libre = anclaPerdida && !!paso.interactivo
  const centrada = !libre && (!paso.ancla || !rect)
  // La tarjeta va abajo, salvo que el elemento resaltado esté en la mitad de abajo.
  const tarjetaArriba = !!rect && rect.top + rect.height / 2 > window.innerHeight / 2

  return createPortal(
    <div className={cn("fixed inset-0 z-[300]", libre && "pointer-events-none")} role="dialog" aria-modal="true" aria-label="Guía de Clossapp">
      {libre ? null : centrada ? (
        <div className="absolute inset-0 bg-zinc-950/70" />
      ) : (
        <>
          {/* Foco: todo oscuro menos el elemento. */}
          <div className="absolute pointer-events-none transition-all duration-300 motion-reduce:transition-none ring-2 ring-white"
            style={{ ...rect, boxShadow: "0 0 0 9999px rgba(9, 9, 11, 0.7)" }} />
          {/* Bloquea clics fuera del foco; dentro solo si el paso es interactivo. */}
          <Bloqueo rect={rect!} interactivo={!!paso.interactivo} />
        </>
      )}

      <div ref={tarjetaRef} tabIndex={-1} aria-live="polite"
        className={cn(
          "absolute left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] bg-white outline-none shadow-2xl pointer-events-auto",
          centrada ? "top-1/2 -translate-y-1/2 max-w-lg p-7" : "max-w-md p-5",
          !centrada && (libre ? "bottom-4 border border-zinc-200" : tarjetaArriba ? "top-4" : "bottom-4"),
        )}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest tabular-nums">
            {paso.etiqueta ?? "Guía"} · {indice + 1} de {pasos.length}
          </p>
          <button type="button" onClick={onCerrar} aria-label="Salir de la guía"
            className="w-8 h-8 -mr-2 -mt-1 flex items-center justify-center text-zinc-400 hover:text-zinc-900">
            <X className="w-4 h-4" />
          </button>
        </div>

        <h2 className={cn("font-serif text-zinc-900", centrada ? "text-2xl" : "text-lg")}>{paso.titulo}</h2>
        <p className={cn("text-zinc-600 mt-2 leading-relaxed", centrada ? "text-sm" : "text-[13px]")}>{paso.texto}</p>
        {paso.interactivo && <p className="text-[11px] text-emerald-700 mt-2">Puedes tocar lo resaltado para probarlo.</p>}

        <div className="mt-5 h-0.5 bg-zinc-100" aria-hidden="true">
          <div className="h-full bg-zinc-900 transition-[width] duration-300" style={{ width: `${((indice + 1) / pasos.length) * 100}%` }} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={() => ir(indice - 1)} disabled={indice === 0}
            className="h-10 px-3 text-xs text-zinc-600 flex items-center gap-1.5 disabled:invisible">
            <ArrowLeft className="w-3.5 h-3.5" /> Atrás
          </button>
          <div className="flex gap-2">
            {esUltimo && accionFinal && (
              <button type="button" onClick={accionFinal.onClick}
                className="h-10 px-4 border border-zinc-900 text-zinc-900 text-xs font-medium tracking-wide">
                {accionFinal.texto}
              </button>
            )}
            <button type="button" onClick={() => (esUltimo ? onCerrar() : ir(indice + 1))}
              className="h-10 px-5 bg-zinc-900 text-white text-xs font-medium tracking-wide flex items-center gap-1.5">
              {esUltimo ? "Explorar por mi cuenta" : <>Siguiente <ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Cuatro paneles alrededor del foco; el centro queda libre solo si el paso es interactivo. */
function Bloqueo({ rect, interactivo }: { rect: Rect; interactivo: boolean }) {
  if (!interactivo) return <div className="absolute inset-0" />
  const { top, left, width, height } = rect
  return (
    <>
      <div className="absolute inset-x-0 top-0" style={{ height: Math.max(top, 0) }} />
      <div className="absolute inset-x-0 bottom-0" style={{ top: top + height }} />
      <div className="absolute left-0" style={{ top, height, width: Math.max(left, 0) }} />
      <div className="absolute right-0" style={{ top, height, left: left + width }} />
    </>
  )
}
