import type { Prenda } from "@/types"
import { LAYER_ORDER } from "@/constants/categories"

export function OutfitVisual({ outfitPrendas }: { outfitPrendas: Prenda[] }) {
  const layers = LAYER_ORDER.map((cat) => ({
    cat,
    items: outfitPrendas.filter((p) =>
      p.category?.toLowerCase().includes(cat.toLowerCase()) ||
      (p.metadata as Record<string, string> | null | undefined)?.categoria?.toLowerCase().includes(cat.toLowerCase())
    ),
  })).filter((l) => l.items.length > 0)

  const display = layers.length > 0 ? layers : [{ cat: "Prendas", items: outfitPrendas }]

  return (
    <div className="flex flex-col gap-2">
      {display.map(({ cat, items }) => (
        <div key={cat}>
          <p className="text-[9px] text-zinc-400 uppercase tracking-widest mb-1">{cat}</p>
          <div className="flex gap-2 flex-wrap">
            {items.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5 border border-zinc-100 px-2 py-1">
                {p.image_url && (
                  <img src={p.image_url} alt={p.name} className="w-8 h-8 object-cover shrink-0" />
                )}
                <span className="text-[10px] text-zinc-700 leading-tight max-w-[80px]">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
