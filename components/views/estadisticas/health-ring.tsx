"use client"

import { motion } from "framer-motion"
import { AnimatedNumber } from "@/components/shared/animated-number"

interface HealthRingProps {
  /** 0–100, o null si aún no hay historial suficiente. */
  salud: number | null
  total: number
}

const TAMANO = 132
const GROSOR = 10
const RADIO = (TAMANO - GROSOR) / 2
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

function veredicto(salud: number) {
  if (salud >= 80) return "Tu armario trabaja para ti."
  if (salud >= 55) return "Buen ritmo, con espacio para rotar más."
  if (salud >= 30) return "Hay prendas esperando su turno."
  return "La mayoría de tu ropa está guardada."
}

export function HealthRing({ salud, total }: HealthRingProps) {
  const valor = salud ?? 0
  const deCada10 = Math.round(valor / 10)

  return (
    <section className="px-4">
      <div className="border border-zinc-100 bg-zinc-50/60 p-5 flex items-center gap-5">
        <div className="relative shrink-0" style={{ width: TAMANO, height: TAMANO }}
          role="img" aria-label={salud === null ? "Sin datos de uso todavía" : `Salud del armario: ${valor} de 100`}>
          <svg width={TAMANO} height={TAMANO} viewBox={`0 0 ${TAMANO} ${TAMANO}`} className="-rotate-90">
            <circle cx={TAMANO / 2} cy={TAMANO / 2} r={RADIO} fill="none" stroke="#e4e4e7" strokeWidth={GROSOR} />
            <motion.circle cx={TAMANO / 2} cy={TAMANO / 2} r={RADIO} fill="none" stroke="#18181b"
              strokeWidth={GROSOR} strokeLinecap="round" strokeDasharray={CIRCUNFERENCIA}
              initial={{ strokeDashoffset: CIRCUNFERENCIA }}
              animate={{ strokeDashoffset: CIRCUNFERENCIA * (1 - valor / 100) }}
              transition={{ duration: 1.1, ease: [0.23, 1, 0.32, 1], delay: 0.15 }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-serif text-4xl text-zinc-900 leading-none">
              {salud === null ? "—" : <AnimatedNumber target={valor} />}
            </p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">de 100</p>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Salud de tu armario</p>
          {salud === null ? (
            <>
              <p className="font-serif text-lg text-zinc-900 leading-snug mt-1">
                {total === 0 ? "Sube tu primera prenda" : "Aún estamos conociendo tu armario"}
              </p>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                Registra lo que te pones en tus outfits y aquí verás qué tanto aprovechas tu ropa.
              </p>
            </>
          ) : (
            <>
              <p className="font-serif text-lg text-zinc-900 leading-snug mt-1">
                Usas {deCada10} de cada 10 prendas
              </p>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                {veredicto(valor)} Cuenta lo que usaste en los últimos 6 meses.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
