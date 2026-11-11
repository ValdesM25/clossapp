"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import type { Prenda } from "@/types"

interface PrendaDetailModalProps {
  prenda: Prenda
  /** Sin esto no se muestra el botón de eliminar (modo demo). */
  onDelete?: () => void
}

export function PrendaDetailModal({ prenda, onDelete }: PrendaDetailModalProps) {
  const m = (prenda.metadata ?? {}) as Record<string, string>
  const chips = [m.estilo, m.material, m.color_principal].filter(Boolean)
  const [confirmando, setConfirmando] = useState(false)

  return (
    <div className="flex flex-col">
      <img src={prenda.image_url} alt={prenda.name} className="w-full object-cover" style={{ maxHeight: "320px" }} />
      <div className="p-5 flex flex-col gap-4">
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{prenda.category}</p>
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
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Descripción</p>
              <p className="text-xs text-zinc-700 leading-relaxed">{m.descripcion}</p>
            </div>
          )}
          {prenda.talla && (
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Talla</p>
              <p className="text-sm font-medium text-zinc-900">{prenda.talla}</p>
            </div>
          )}
          {prenda.estado_uso && (
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Estado</p>
              <p className="text-sm font-medium text-zinc-900">{prenda.estado_uso}</p>
            </div>
          )}
          {prenda.en_venta && prenda.precio && (
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Precio</p>
              <p className="font-serif text-lg text-zinc-900">${prenda.precio}</p>
            </div>
          )}
        </div>
        {onDelete && (
          <div className="border-t border-zinc-100 pt-4">
            {confirmando ? (
              <div role="alert" className="flex flex-col gap-3">
                <p className="text-xs text-zinc-700">
                  ¿Eliminar esta prenda de tu armario? No se puede deshacer
                  {prenda.en_venta || prenda.en_renta ? " y también sale del Shop" : ""}.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setConfirmando(false)}
                    className="min-h-11 border border-zinc-300 text-xs font-medium text-zinc-900 hover:bg-zinc-50">
                    Cancelar
                  </button>
                  <button type="button" onClick={onDelete}
                    className="min-h-11 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold">
                    Sí, eliminar
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmando(true)}
                className="min-h-11 w-full flex items-center justify-center gap-2 border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" aria-hidden="true" /> Eliminar prenda
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
