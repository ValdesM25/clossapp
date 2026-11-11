"use client"

import { ShoppingBag } from "lucide-react"
import type { Prenda } from "@/types"
import { grupoDe, type Faltante } from "@/lib/planificacion"
import { pesos } from "@/lib/ventas"
import { navegarA } from "@/lib/navegar"

/**
 * Lo que la IA dijo que falta, con hasta 3 prendas del Shop del mismo grupo.
 * `items` en null: la cuenta no puede comprar (Esencial), solo se muestra el texto.
 */
export function SugerenciasShop({ faltante, items, userId }: {
  faltante: Faltante
  items: Prenda[] | null
  userId: string
}) {
  const grupo = grupoDe(faltante.categoria)
  // "otro" juntaría cosas sin relación (un impermeable con un sombrero): mejor solo el enlace.
  const sugeridas = grupo === "otro" ? [] :
    (items ?? []).filter((i) => i.user_id !== userId && grupoDe(i.category) === grupo).slice(0, 3)

  return (
    <div className="border border-zinc-200 bg-zinc-50 p-3 flex flex-col gap-3">
      <p className="text-xs text-zinc-700">
        <span className="font-semibold text-zinc-900">Te falta: {faltante.categoria}.</span> {faltante.motivo}
      </p>
      {items && sugeridas.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {sugeridas.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navegarA("marketplace", { verPrendaId: item.id })}
              className="flex flex-col text-left bg-white border border-zinc-200 hover:border-zinc-900 transition-colors"
            >
              {item.image_url
                ? <img src={item.image_url} alt="" className="w-full aspect-square object-cover" />
                : <div className="w-full aspect-square bg-zinc-100" />}
              <span className="px-1.5 pt-1.5 text-xs text-zinc-800 line-clamp-1">{item.name}</span>
              {item.precio != null && (
                <span className="px-1.5 pb-1.5 text-xs font-medium text-zinc-900">{pesos(Math.round(Number(item.precio) * 100))}</span>
              )}
            </button>
          ))}
        </div>
      )}
      {items && sugeridas.length === 0 && (
        <button
          type="button"
          onClick={() => navegarA("marketplace")}
          className="self-start h-10 px-3 border border-zinc-300 hover:border-zinc-900 bg-white text-xs font-medium text-zinc-800 flex items-center gap-1.5 transition-colors"
        >
          <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
          Búscalo en el Shop
        </button>
      )}
    </div>
  )
}
