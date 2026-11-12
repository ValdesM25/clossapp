"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { ChevronLeft } from "lucide-react"
import type { Prenda, View } from "@/types"
import { pageProps } from "@/constants/animation"
import { esDePago } from "@/constants/planes"
import { useAuthContext } from "@/context/auth-context"
import { usePrendasContext } from "@/context/prendas-context"
import { usePlanificacion } from "@/hooks/use-planificacion"
import { hoyMexico, type TipoPlan } from "@/lib/planificacion"
import { navegarA } from "@/lib/navegar"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { fetchVentaItems } from "@/services/marketplace.service"
import { VistaPrevia } from "./vista-previa"
import { ListaPlanes } from "./lista-planes"
import { CrearPlan } from "./crear-plan"
import { PlanDetalle } from "./plan-detalle"

interface PlanificacionViewProps {
  onNavigate?: (view: View) => void
  onBack?: () => void
  /** Plan que abrir al entrar (Inicio, avisos); se avisa con onPlanAbierto para no repetirlo. Si no existe, queda la lista. */
  planInicial?: string | null
  onPlanAbierto?: () => void
}

type Pantalla = { tipo: "lista" } | { tipo: "crear"; inicial: TipoPlan | null } | { tipo: "detalle"; id: string }

/**
 * Planificación de outfits (Elite). Invitado y demo ven el ejemplo; sin Elite y sin planes,
 * el ejemplo bloqueado; sin Elite pero con planes (dejó Elite), sus planes en solo lectura.
 */
export function PlanificacionView({ onNavigate, onBack, planInicial, onPlanAbierto }: PlanificacionViewProps) {
  const { userId, plan, demo, isGuest } = useAuthContext()
  const { prendas: crudas } = usePrendasContext()
  // prendas.id es bigint y llega como número; los planes guardan los ids como texto.
  const prendas = useMemo(() => crudas.map((p) => ({ ...p, id: String(p.id) })), [crudas])
  const pl = usePlanificacion()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const hoy = hoyMexico()
  const [pantalla, setPantalla] = useState<Pantalla>({ tipo: "lista" })
  useEffect(() => {
    if (!planInicial) return
    setPantalla({ tipo: "detalle", id: planInicial })
    onPlanAbierto?.()
  }, [planInicial, onPlanAbierto])
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const previa = isGuest || !!demo
  const esElite = plan === "elite"
  const soloLectura = !esElite

  // Prendas del Shop para "lo que falta": una vez por pantalla y solo si la cuenta puede comprar.
  const puedeComprar = !previa && esDePago(plan)
  const [itemsShop, setItemsShop] = useState<Prenda[] | null>(null)
  useEffect(() => {
    if (!puedeComprar) return
    fetchVentaItems(supabase).then(setItemsShop).catch((e) => { console.error("[planificacion] shop", e); setItemsShop([]) })
  }, [puedeComprar, supabase])

  const detalle = pantalla.tipo === "detalle" ? pl.planes.find((p) => p.id === pantalla.id) ?? null : null
  const enLista = pantalla.tipo === "lista" || (pantalla.tipo === "detalle" && !detalle)
  const volver = () => (enLista ? (onBack ?? (() => onNavigate?.("inicio")))() : setPantalla({ tipo: "lista" }))
  const error = errorLocal ?? pl.error

  let contenido
  if (previa) {
    contenido = <VistaPrevia hoy={hoy} conPago={false} />
  } else if (pl.cargando) {
    contenido = (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando tus planes">
        <div className="h-9 w-48 bg-zinc-100 animate-pulse" />
        <div className="h-20 bg-zinc-100 animate-pulse" />
        <div className="h-20 bg-zinc-100 animate-pulse" />
      </div>
    )
  } else if (soloLectura && pl.planes.length === 0) {
    contenido = <VistaPrevia hoy={hoy} conPago />
  } else if (pantalla.tipo === "crear" && esElite) {
    contenido = (
      <CrearPlan
        hoy={hoy}
        tipoInicial={pantalla.inicial}
        cuota={pl.cuota}
        onCancelar={() => setPantalla({ tipo: "lista" })}
        onCrear={async (datos) => setPantalla({ tipo: "detalle", id: await pl.crear(datos) })}
      />
    )
  } else if (detalle) {
    contenido = (
      <PlanDetalle
        key={detalle.id}
        plan={detalle}
        prendas={prendas}
        hoy={hoy}
        soloLectura={soloLectura}
        generando={pl.generando}
        regenerando={pl.regenerando}
        cuota={pl.cuota}
        avisoCuota={pl.avisoCuota}
        itemsShop={itemsShop}
        userId={userId}
        acciones={{
          onArmar: () => pl.armar(detalle.id),
          onOtro: (momentoId) => pl.otroOutfit(detalle.id, momentoId),
          onBorrar: async () => {
            try {
              await pl.borrar(detalle.id)
              setPantalla({ tipo: "lista" })
            } catch (e) {
              console.error("[planificacion] borrar", e)
              setErrorLocal("No pudimos borrar el plan. Intenta de nuevo.")
            }
          },
          onEmpacar: (prendaId, valor) => pl.empacar(detalle.id, prendaId, valor),
          onMeLoPuse: pl.meLoPuse,
        }}
      />
    )
  } else {
    contenido = (
      <div className="flex flex-col gap-8">
        <ListaPlanes
          planes={pl.planes}
          hoy={hoy}
          cuota={pl.cuota}
          puedeCrear={esElite}
          onAbrir={(id) => { setErrorLocal(null); setPantalla({ tipo: "detalle", id }) }}
          onNuevo={(inicial) => { setErrorLocal(null); setPantalla({ tipo: "crear", inicial }) }}
        />
        {soloLectura && <VistaPrevia hoy={hoy} conPago />}
      </div>
    )
  }

  return (
    <motion.div {...pageProps} className="flex flex-col gap-6 pb-36 px-4 pt-6 sm:pt-8 max-w-6xl mx-auto w-full">
      {pantalla.tipo !== "crear" && (
        <button type="button" onClick={volver} className="self-start h-10 pr-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          {enLista ? "Inicio" : "Mis planes"}
        </button>
      )}

      {!previa && soloLectura && pl.planes.length > 0 && (
        <div className="border border-zinc-900 bg-zinc-50 p-4 flex flex-col gap-3">
          <p className="text-xs text-zinc-800">
            Tu plan ya no incluye Planificación. Puedes ver tus planes y tu maleta; para crear o cambiar outfits, vuelve a Elite.
          </p>
          <button type="button" onClick={() => navegarA("planes")} className="self-start h-10 px-4 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors">
            Ver Elite
          </button>
        </div>
      )}

      {error && <p role="alert" className="text-xs text-red-700 border border-red-200 bg-red-50 p-3">{error}</p>}

      {contenido}
    </motion.div>
  )
}
