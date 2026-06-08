import { PrendaSkeleton } from "./prenda-skeleton"
import { PrendaCard } from "./prenda-card"
import type { Prenda } from "@/types"

interface PrendaGridProps {
  prendas: Prenda[]
  loading: boolean
  onSelect: (p: Prenda) => void
  emptyMessage?: string
  getBadge?: (p: Prenda) => React.ReactNode
  getCaption?: (p: Prenda) => React.ReactNode
}

export function PrendaGrid({ prendas, loading, onSelect, emptyMessage, getBadge, getCaption }: PrendaGridProps) {
  if (loading) return <PrendaSkeleton />

  if (prendas.length === 0) {
    return (
      <div className="mx-4 flex flex-col items-center justify-center py-12 gap-2 border border-zinc-100">
        <p className="text-xs text-zinc-400 uppercase tracking-widest">{emptyMessage ?? "Sin prendas"}</p>
      </div>
    )
  }

  return (
    <div className="columns-2 gap-3 space-y-3">
      {prendas.map((item, i) => (
        <PrendaCard
          key={item.id}
          pren={item}
          i={i}
          onClick={() => onSelect(item)}
          badge={getBadge?.(item)}
          caption={getCaption?.(item)}
        />
      ))}
    </div>
  )
}
