import type { PrendaExt } from "@/types"
import { AnimatedNumber } from "@/components/shared/animated-number"

interface TopPrendasListProps {
  prendas: PrendaExt[]
  isGuest: boolean
  formatDate: (iso?: string | null) => string
}

export function TopPrendasList({ prendas, isGuest, formatDate }: TopPrendasListProps) {
  return (
    <section className="px-4">
      <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Más Usadas</p>
      <div className="flex flex-col gap-2">
        {prendas.map((item, index) => (
          <div key={item.id} className="flex items-center gap-3 border border-zinc-100 p-4">
            <span className="font-mono text-xs text-zinc-400 w-5 shrink-0">{index + 1}</span>
            {item.image_url && <img src={item.image_url} alt={item.name} className="w-10 h-10 object-cover shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-900 truncate">{item.name}</p>
              <p className="text-[10px] text-zinc-400">{isGuest ? "—" : formatDate(item.ultimo_uso)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-serif text-lg text-zinc-900"><AnimatedNumber target={item.usos ?? 0} /></p>
              <p className="text-[10px] text-zinc-400">usos</p>
            </div>
          </div>
        ))}
        {!isGuest && prendas.length === 0 && <p className="text-xs text-zinc-400 text-center py-4">Sin datos de uso aún</p>}
      </div>
    </section>
  )
}
