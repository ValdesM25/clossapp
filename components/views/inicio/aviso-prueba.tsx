"use client"

import Link from "next/link"
import { Crown } from "lucide-react"
import { NOMBRE_PLAN, type Plan } from "@/constants/planes"
import { estadoPrueba, fechaCorta } from "@/lib/prueba"

interface AvisoPruebaProps {
  vence: string | null
  plan: Plan | null
}

/** Banner en Inicio cuando la prueba beta está por terminar o ya terminó. */
export function AvisoPrueba({ vence, plan }: AvisoPruebaProps) {
  const estado = estadoPrueba(vence, plan)
  if (!estado || !vence) return null
  return (
    <section role="status" className="flex items-start gap-3 border border-zinc-900 px-4 py-3">
      <Crown className="w-4 h-4 text-zinc-900 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <p className="text-sm text-zinc-900">
          {estado.tipo === "termina"
            ? `Tu prueba de ${plan ? NOMBRE_PLAN[plan] : "Clossapp"} termina el ${fechaCorta(vence)}.`
            : `Tu prueba terminó el ${fechaCorta(vence)}.`}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">Si no quieres perder tus funciones, elige tu plan. Cancela cuando quieras.</p>
        <Link href="/planes" className="mt-2 inline-block text-xs text-zinc-900 underline underline-offset-2">Ver planes</Link>
      </div>
    </section>
  )
}
