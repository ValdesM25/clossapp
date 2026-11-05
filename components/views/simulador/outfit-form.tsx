import { motion } from "framer-motion"
import { Briefcase, Check, CloudRain, CloudSun, Dumbbell, Gem, Search, Shirt, Snowflake, Sparkles, Sun, Wine, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { MENSAJES_LIMITE } from "@/constants/planes"
import { esAvisoLimite } from "@/hooks/use-cuota-ia"
import type { Prenda } from "@/types"

interface OutfitFormProps {
  prendas: Prenda[]
  isGuest: boolean
  generating: boolean
  ocasion: string
  setOcasion: (v: string) => void
  clima: string
  setClima: (v: string) => void
  destacada: string
  destacadaQuery: string
  setDestacadaQuery: (v: string) => void
  setDestacada: (v: string) => void
  errorMsg: string | null
  onGenerate: () => void
  /** Contador de outfits con IA del plan gratis, p. ej. "Outfits con IA hoy: 0/1". */
  usoIA?: string | null
  /** Ya no quedan outfits con IA hoy: se avisa antes de pulsar. */
  agotado?: boolean
  /** Solo en plan gratis: lleva a Planes desde un aviso de límite. */
  onVerPlanes?: () => void
}

const OCASIONES: [string, LucideIcon][] = [
  ["Casual", Shirt], ["Oficina", Briefcase], ["Cena", Wine], ["Formal", Gem], ["Deporte", Dumbbell],
]
const CLIMAS: [string, LucideIcon][] = [
  ["Frío", Snowflake], ["Templado", CloudSun], ["Calor", Sun], ["Lluvia", CloudRain],
]
const MAX_TIRA = 24

export function OutfitForm({
  prendas, isGuest, generating, ocasion, setOcasion, clima, setClima,
  destacada, destacadaQuery, setDestacadaQuery, setDestacada, errorMsg, onGenerate,
  usoIA, agotado, onVerPlanes,
}: OutfitFormProps) {
  const busqueda = destacadaQuery.trim().toLowerCase()
  const tira = (busqueda ? prendas.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(busqueda)) : prendas).slice(0, MAX_TIRA)
  const sinPrendas = !isGuest && prendas.length === 0
  const aviso = errorMsg ?? (agotado ? MENSAJES_LIMITE.outfit_dia : null)

  function elegirDestacada(p: Prenda) {
    const quitar = destacada === p.name
    setDestacada(quitar ? "" : p.name)
  }

  return (
    <div data-tour="simulador-form" className="flex flex-col gap-7">
      <fieldset className="px-4 min-w-0">
        <legend className="text-sm font-medium text-zinc-900 mb-3">Ocasión</legend>
        <div className="grid grid-cols-5 gap-2">
          {OCASIONES.map(([nombre, Icono]) => {
            const activo = ocasion === nombre
            return (
              <motion.button key={nombre} type="button" whileTap={{ scale: 0.96 }} aria-pressed={activo}
                onClick={() => setOcasion(activo ? "" : nombre)}
                className={cn(
                  "h-[4.5rem] flex flex-col items-center justify-center gap-1.5 border transition-colors",
                  activo ? "bg-zinc-900 border-zinc-900 text-white" : "border-zinc-200 text-zinc-700 hover:border-zinc-400",
                )}>
                <Icono className="w-5 h-5" aria-hidden="true" />
                <span className="text-[11px]">{nombre}</span>
              </motion.button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="px-4 min-w-0">
        <legend className="text-sm font-medium text-zinc-900 mb-3">Clima</legend>
        <div className="grid grid-cols-4 border border-zinc-200 divide-x divide-zinc-200">
          {CLIMAS.map(([nombre, Icono]) => {
            const activo = clima === nombre
            return (
              <button key={nombre} type="button" aria-pressed={activo} onClick={() => setClima(activo ? "" : nombre)}
                className={cn(
                  "h-11 flex items-center justify-center gap-1.5 text-xs transition-colors",
                  activo ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50",
                )}>
                <Icono className="w-4 h-4" aria-hidden="true" /> {nombre}
              </button>
            )
          })}
        </div>
      </fieldset>

      {prendas.length > 0 && (
        <fieldset className="min-w-0">
          <div className="px-4 flex items-baseline justify-between gap-3 mb-3">
            <legend className="text-sm font-medium text-zinc-900">Lleva sí o sí <span className="font-normal text-zinc-500">(opcional)</span></legend>
            {destacada && (
              <button type="button" onClick={() => setDestacada("")} className="min-h-10 -my-3 text-xs text-zinc-600 hover:text-zinc-900">
                Quitar
              </button>
            )}
          </div>
          <div className="px-4 relative mb-3">
            <Search className="w-4 h-4 text-zinc-500 absolute left-7 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input value={destacadaQuery} onChange={(e) => { setDestacadaQuery(e.target.value); setDestacada(e.target.value) }}
              placeholder="Busca en tu armario…" aria-label="Buscar prenda a destacar"
              className="w-full h-10 border border-zinc-200 pl-9 pr-3 text-sm focus:border-zinc-900 outline-none" />
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 pb-1 snap-x [scrollbar-width:none] overscroll-x-contain">
            {tira.map((p) => {
              const activo = destacada === p.name
              return (
                <button key={p.id} type="button" onClick={() => elegirDestacada(p)} aria-pressed={activo}
                  className="shrink-0 w-[4.5rem] snap-start text-left">
                  <span className="relative block">
                    <img src={p.image_url} alt="" loading="lazy" decoding="async"
                      className={cn("w-full aspect-[4/5] object-cover bg-zinc-100 transition-opacity", destacada && !activo && "opacity-50")} />
                    {activo && (
                      <span className="absolute inset-0 ring-2 ring-inset ring-zinc-900 flex items-start justify-end p-1">
                        <span className="w-5 h-5 bg-zinc-900 text-white flex items-center justify-center"><Check className="w-3 h-3" /></span>
                      </span>
                    )}
                  </span>
                  <span className="block text-[11px] text-zinc-700 truncate mt-1">{p.name}</span>
                </button>
              )
            })}
            {tira.length === 0 && <p className="text-xs text-zinc-500 py-6">Nada con “{destacadaQuery}” en tu armario.</p>}
          </div>
        </fieldset>
      )}

      <div className="px-4 flex flex-col gap-3">
        {aviso && (
          <div role="alert" className="text-sm text-zinc-700 border border-zinc-200 bg-zinc-50 px-4 py-3 flex flex-col gap-2">
            <p>{aviso}</p>
            {onVerPlanes && esAvisoLimite(aviso) && (
              <button type="button" onClick={onVerPlanes} className="self-start min-h-10 -my-2 text-sm font-medium text-zinc-900 underline underline-offset-4">
                Ver planes
              </button>
            )}
          </div>
        )}
        <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={onGenerate}
          disabled={generating || sinPrendas || agotado}
          className="w-full h-14 bg-zinc-900 text-white text-base font-medium flex items-center justify-center gap-2.5 transition-colors hover:bg-zinc-800 disabled:opacity-60">
          {generating ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" /> Armando tus looks…</>
          ) : (
            <><Sparkles className="w-5 h-5" aria-hidden="true" /> Armar mis 3 looks</>
          )}
        </motion.button>
        {sinPrendas && <p className="text-xs text-zinc-500 text-center">Sube prendas a tu armario primero.</p>}
        {usoIA && !sinPrendas && <p className="text-xs text-zinc-500 text-center tabular-nums">{usoIA}</p>}
        {/* La demo muestra looks de ejemplo al instante, sin gastar IA (use-outfits). */}
        {isGuest && <p className="text-xs text-zinc-500 text-center">En la demo verás looks de ejemplo.</p>}
      </div>
    </div>
  )
}
