"use client"

import { Lock } from "lucide-react"
import { PLANES } from "@/constants/planes"
import { GUEST_PRENDAS, STATIC_MARKET } from "@/constants/demo-data"
import { PLAN_EJEMPLO } from "@/constants/planificacion-ejemplo"
import { navegarA } from "@/lib/navegar"
import { PlanDetalle } from "./plan-detalle"

const nada = () => {}
const nadaAsync = async () => {}
const ACCIONES = { onArmar: nada, onOtro: nada, onBorrar: nadaAsync, onEmpacar: nada, onMeLoPuse: nadaAsync }

/** Plan de ejemplo bloqueado. No gasta IA ni toca la base. Sin `conPago` (demo, invitado) no ofrece pagar. */
export function VistaPrevia({ hoy, conPago }: { hoy: string; conPago: boolean }) {
  const precio = PLANES.find((p) => p.id === "elite")!.precio
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border border-zinc-900 p-5 flex flex-col gap-3">
        <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          {conPago ? "Elite" : "Así se ve con Elite"}
        </p>
        <h2 className="font-serif text-2xl text-zinc-900 font-normal leading-snug">Planifica tu semana, tus fechas importantes y tus viajes</h2>
        <p className="text-xs text-zinc-600">Outfits para cada día según lo que harás y el clima, y tu maleta lista para empacar.</p>
        {conPago && (
          <>
            <button type="button" onClick={() => navegarA("planes")} className="h-11 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium transition-colors">
              Desbloquear con Elite
            </button>
            <p className="text-xs text-zinc-500 text-center">Elite · ${precio} al mes</p>
          </>
        )}
      </div>

      <div aria-hidden="true" inert className="relative pointer-events-none select-none max-h-[1400px] overflow-hidden">
        <PlanDetalle
          plan={PLAN_EJEMPLO}
          prendas={GUEST_PRENDAS}
          hoy={hoy}
          soloLectura
          generando={null}
          regenerando={null}
          cuota={null}
          avisoCuota={null}
          itemsShop={STATIC_MARKET}
          userId="ejemplo"
          acciones={ACCIONES}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-white" />
      </div>
    </div>
  )
}
