"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Check, Shirt } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Prenda } from "@/types"

interface OutfitCardProps {
  index: number
  total: number
  outfit: { titulo: string; descripcion: string; prenda_ids: string[] }
  outfitPrendas: Prenda[]
  isElegido: boolean
  isEligiendo: boolean
  onElegir: () => void
}

/** Un look como página de lookbook: collage de las prendas, por qué funciona y botón para usarlo. */
export function OutfitCard({ index, total, outfit, outfitPrendas, isElegido, isEligiendo, onElegir }: OutfitCardProps) {
  const reducir = useReducedMotion()
  const [principal, ...resto] = outfitPrendas
  const visibles = resto.slice(0, 2)
  const extra = resto.length - visibles.length

  return (
    <motion.article
      initial={reducir ? false : { opacity: 0, transform: "translateY(16px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: [0.23, 1, 0.32, 1] }}
      aria-label={`Look ${index + 1} de ${total}: ${outfit.titulo}`}
      className="shrink-0 w-[86%] sm:w-[23rem] snap-center flex flex-col bg-white border border-zinc-200">

      {principal ? (
        <div className={cn("grid gap-0.5 bg-zinc-100 aspect-[4/5]", visibles.length ? "grid-cols-3 grid-rows-2" : "grid-cols-1")}>
          <img src={principal.image_url} alt={principal.name} loading={index ? "lazy" : "eager"} decoding="async"
            className={cn("w-full h-full object-cover", visibles.length && "col-span-2 row-span-2")} />
          {visibles.map((p, i) => (
            <div key={p.id} className={cn("relative", visibles.length === 1 && "row-span-2")}>
              <img src={p.image_url} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              {extra > 0 && i === visibles.length - 1 && (
                <span className="absolute inset-0 bg-zinc-900/60 text-white text-sm flex items-center justify-center tabular-nums">+{extra}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="aspect-[4/5] bg-zinc-50 flex items-center justify-center">
          <Shirt className="w-8 h-8 text-zinc-300" aria-hidden="true" />
        </div>
      )}

      <div className="p-5 flex flex-col gap-3 flex-1">
        <p className="text-xs text-zinc-500 tabular-nums">{index + 1} de {total}</p>
        <h3 className="font-serif text-2xl text-zinc-900 leading-tight -mt-1">{outfit.titulo}</h3>
        <p className="text-sm text-zinc-600 leading-relaxed">{outfit.descripcion}</p>
        {outfitPrendas.length > 0 && (
          <p className="text-xs text-zinc-500 leading-relaxed">{outfitPrendas.map((p) => p.name).join(" · ")}</p>
        )}

        <div className="mt-auto pt-2">
          {isElegido ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="status"
              className="w-full h-12 bg-emerald-600 text-white text-sm font-medium flex items-center justify-center gap-2">
              <Check className="w-4 h-4" aria-hidden="true" /> Listo, registrado
            </motion.p>
          ) : (
            <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={onElegir} disabled={isEligiendo}
              className="w-full h-12 bg-zinc-900 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
              {isEligiendo && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />}
              {isEligiendo ? "Registrando…" : "Me lo pongo hoy"}
            </motion.button>
          )}
        </div>
      </div>
    </motion.article>
  )
}
