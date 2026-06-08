"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { CenteredModal } from "@/components/shared/centered-modal"
import { categoriaPermiteRenta } from "@/constants/categories"
import type { Prenda } from "@/types"

interface SellFormModalProps {
  open: boolean
  onClose: () => void
  prendas: Prenda[]
  sellMode: "venta" | "renta"
  setSellMode: (m: "venta" | "renta") => void
  selling: boolean
  rentaError: string | null
  onPublish: (prenda: Prenda, precio: string, talla: string, estado: string) => void
}

export function SellFormModal({ open, onClose, prendas, sellMode, setSellMode, selling, rentaError, onPublish }: SellFormModalProps) {
  const [step, setStep] = useState<"select" | "details">("select")
  const [sellPrenda, setSellPrenda] = useState<Prenda | null>(null)
  const [form, setForm] = useState({ precio: "", talla: "", estado_uso: "" })

  function handleClose() {
    setStep("select")
    setSellPrenda(null)
    setForm({ precio: "", talla: "", estado_uso: "" })
    onClose()
  }

  function handleSelect(p: Prenda) {
    setSellPrenda(p)
    setForm({ precio: "", talla: p.talla ?? "", estado_uso: p.estado_uso ?? "" })
    setStep("details")
  }

  function handlePublish() {
    if (!sellPrenda || !form.precio) return
    onPublish(sellPrenda, form.precio, form.talla, form.estado_uso)
    handleClose()
  }

  const available = prendas.filter((p) => !p.en_venta && !p.en_renta)

  return (
    <CenteredModal open={open} onClose={handleClose}>
      <div className="p-6 flex flex-col gap-4">
        {step === "select" ? (
          <>
            <div className="flex border border-zinc-200 pr-8">
              {(["venta", "renta"] as const).map((m) => (
                <button key={m} onClick={() => setSellMode(m)}
                  className={cn("flex-1 py-2 text-xs font-medium tracking-widest uppercase transition-colors",
                    sellMode === m ? "bg-zinc-900 text-white" : "text-zinc-500")}>
                  {m === "venta" ? "Vender" : "Rentar"}
                </button>
              ))}
            </div>
            {sellMode === "renta" && (
              <p className="text-[10px] text-zinc-400 border border-zinc-100 px-3 py-2">
                Solo vestidos y accesorios aplican para renta
              </p>
            )}
            <p className="font-serif text-zinc-900 text-lg">¿Qué prenda?</p>
            {available.length === 0 ? (
              <p className="text-xs text-zinc-400 border border-zinc-100 p-4 text-center">No tienes prendas disponibles.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {available.map((p) => {
                  const bloqueada = sellMode === "renta" && !categoriaPermiteRenta(p.category)
                  return (
                    <button key={p.id} onClick={() => !bloqueada && handleSelect(p)}
                      disabled={bloqueada} title={bloqueada ? "Solo vestidos y accesorios aplican para renta" : undefined}
                      className={cn("relative overflow-hidden border-2 transition-all",
                        bloqueada ? "opacity-30 cursor-not-allowed border-transparent" :
                        sellPrenda?.id === p.id ? "border-zinc-900" : "border-transparent")}>
                      <img src={p.image_url} alt={p.name} className="w-full h-20 object-cover" />
                      <p className="text-[10px] text-zinc-600 truncate px-1 py-1 bg-white">{p.name}</p>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 pr-8">
              <button onClick={() => setStep("select")} className="text-xs text-zinc-400 underline">← Volver</button>
              <p className="font-serif text-zinc-900 text-lg">{sellPrenda?.name}</p>
            </div>
            {sellPrenda && <img src={sellPrenda.image_url} alt={sellPrenda.name} className="w-full h-40 object-cover" />}
            <div className="flex gap-4">
              {form.talla && (
                <div className="flex-1">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Talla</p>
                  <p className="text-sm text-zinc-700 border border-zinc-100 px-3 py-2 bg-zinc-50">{form.talla}</p>
                </div>
              )}
              {form.estado_uso && (
                <div className="flex-1">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Estado</p>
                  <p className="text-sm text-zinc-700 border border-zinc-100 px-3 py-2 bg-zinc-50">{form.estado_uso}</p>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-widest mb-1 block">
                {sellMode === "renta" ? "Precio por día (MXN) *" : "Precio (MXN) *"}
              </label>
              <Input value={form.precio} onChange={(e) => setForm(f => ({ ...f, precio: e.target.value }))}
                placeholder="Ej. 350" type="number"
                className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900" />
            </div>
            {rentaError && <p className="text-xs text-zinc-500 border border-zinc-200 px-3 py-2">{rentaError}</p>}
            <motion.button whileTap={{ scale: 0.98 }} onClick={handlePublish} disabled={selling || !form.precio}
              className="w-full py-3 bg-zinc-900 text-white text-sm font-medium tracking-wide flex items-center justify-center gap-2 disabled:opacity-50">
              {selling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {selling ? "Publicando..." : sellMode === "renta" ? "Publicar para Renta" : "Publicar en Marketplace"}
            </motion.button>
          </>
        )}
      </div>
    </CenteredModal>
  )
}
