import type { Prenda } from "@/types"

interface PrendaDetailModalProps {
  prenda: Prenda
}

export function PrendaDetailModal({ prenda }: PrendaDetailModalProps) {
  const m = (prenda.metadata ?? {}) as Record<string, string>
  const chips = [m.estilo, m.material, m.color_principal].filter(Boolean)

  return (
    <div className="flex flex-col">
      <img src={prenda.image_url} alt={prenda.name} className="w-full object-cover" style={{ maxHeight: "320px" }} />
      <div className="p-5 flex flex-col gap-4">
        <div>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">{prenda.category}</p>
          <h2 className="font-serif text-xl text-zinc-900 leading-tight">
            {m.nombre || prenda.name}
          </h2>
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span key={chip} className="bg-zinc-900 text-white text-[10px] font-medium px-2.5 py-1 tracking-wide uppercase">
                {chip}
              </span>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-zinc-100 pt-4">
          {m.descripcion && (
            <div className="col-span-2">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-0.5">Descripción</p>
              <p className="text-xs text-zinc-700 leading-relaxed">{m.descripcion}</p>
            </div>
          )}
          {prenda.talla && (
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-0.5">Talla</p>
              <p className="text-sm font-medium text-zinc-900">{prenda.talla}</p>
            </div>
          )}
          {prenda.estado_uso && (
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-0.5">Estado</p>
              <p className="text-sm font-medium text-zinc-900">{prenda.estado_uso}</p>
            </div>
          )}
          {prenda.en_venta && prenda.precio && (
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-0.5">Precio</p>
              <p className="font-serif text-lg text-zinc-900">${prenda.precio}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
