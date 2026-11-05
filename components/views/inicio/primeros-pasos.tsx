"use client"

import { useEffect, useState } from "react"
import { Check, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Paso {
  titulo: string
  texto: string
  hecho: boolean
  accion: () => void
}

interface PrimerosPasosProps {
  userId: string
  pasos: Paso[]
}

const COMO_FUNCIONA = [
  ["Armario", "Tómale foto a una prenda y la IA llena nombre, categoría y color."],
  ["Inicio", "Cada día te propone un outfit con tu ropa y el clima de tu ciudad."],
  ["Outfit", "Dile a dónde vas y arma 3 combinaciones con lo que ya tienes."],
  ["Shop", "Vende, renta o dona lo que ya no usas. Donar te da puntos."],
  ["Stats", "Ve qué usas más y qué llevas meses sin ponerte."],
]

/** Lista de primeros pasos para cuentas nuevas. Se marca sola con datos reales y se va al completarla. */
export function PrimerosPasos({ userId, pasos }: PrimerosPasosProps) {
  const clave = `primeros-pasos-oculto:${userId}`
  // Arranca oculto: localStorage solo existe en el cliente.
  const [oculto, setOculto] = useState(true)
  useEffect(() => { setOculto(localStorage.getItem(clave) === "1") }, [clave])

  const hechos = pasos.filter((p) => p.hecho).length
  if (oculto || hechos === pasos.length) return null

  function ocultar() {
    localStorage.setItem(clave, "1")
    setOculto(true)
  }

  return (
    <section aria-labelledby="primeros-pasos" className="border border-zinc-200 bg-white">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <p className="text-[11px] text-zinc-500 uppercase tracking-widest tabular-nums">{hechos} de {pasos.length} listos</p>
          <h2 id="primeros-pasos" className="font-serif text-xl text-zinc-900 mt-1">Empieza aquí</h2>
          <p className="text-sm text-zinc-500 mt-1 leading-relaxed">Mientras más de tu ropa conozca Clossapp, mejores outfits te arma.</p>
        </div>
        <button type="button" onClick={ocultar} aria-label="Ocultar primeros pasos"
          className="w-10 h-10 -mr-3 -mt-2 shrink-0 flex items-center justify-center text-zinc-400 hover:text-zinc-900">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mx-5 mt-4 h-0.5 bg-zinc-100" aria-hidden="true">
        <div className="h-full bg-zinc-900 transition-[width] duration-500" style={{ width: `${(hechos / pasos.length) * 100}%` }} />
      </div>

      <ol className="mt-2">
        {pasos.map((p, i) => (
          <li key={p.titulo}>
            <button type="button" onClick={p.accion} disabled={p.hecho}
              className="w-full min-h-16 px-5 py-3 flex items-center gap-4 text-left hover:bg-zinc-50 disabled:hover:bg-transparent transition-colors">
              <span aria-hidden="true" className={cn(
                "w-7 h-7 shrink-0 flex items-center justify-center text-xs tabular-nums border",
                p.hecho ? "bg-zinc-900 border-zinc-900 text-white" : "border-zinc-300 text-zinc-500",
              )}>
                {p.hecho ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <span className="flex-1 min-w-0">
                <span className={cn("block text-sm", p.hecho ? "text-zinc-400 line-through" : "text-zinc-900")}>{p.titulo}</span>
                {!p.hecho && <span className="block text-xs text-zinc-500 mt-0.5 leading-relaxed">{p.texto}</span>}
              </span>
              {!p.hecho && <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" aria-hidden="true" />}
              <span className="sr-only">{p.hecho ? "Hecho" : "Pendiente"}</span>
            </button>
          </li>
        ))}
      </ol>

      <details className="group border-t border-zinc-100">
        <summary className="min-h-12 px-5 flex items-center justify-between text-xs text-zinc-600 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          Cómo funciona Clossapp
          <ChevronRight className="w-4 h-4 text-zinc-400 transition-transform group-open:rotate-90" aria-hidden="true" />
        </summary>
        <dl className="px-5 pb-5 flex flex-col gap-3">
          {COMO_FUNCIONA.map(([seccion, texto]) => (
            <div key={seccion} className="flex gap-3">
              <dt className="w-14 shrink-0 text-[11px] text-zinc-900 uppercase tracking-widest pt-px">{seccion}</dt>
              <dd className="text-xs text-zinc-500 leading-relaxed">{texto}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  )
}
