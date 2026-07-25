"use client"

import { useRef, useState } from "react"
import { motion } from "framer-motion"
import { Loader2, Camera, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { CenteredModal } from "@/components/shared/centered-modal"
import { categoriaPermiteRenta } from "@/constants/categories"
import { analyzePrendaVenta } from "@/services/analyze.service"
import { MAX_IMAGENES, type PrendaVentaAnalysis } from "@/app/api/analyze-prenda/route"
import { useAuthContext } from "@/context/auth-context"
import type { Prenda } from "@/types"

const SEVERIDAD_LABEL: Record<string, string> = {
  leve: "Leve",
  moderado: "Moderado",
  notorio: "Notorio",
}

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
  const { userId } = useAuthContext()
  const [step, setStep] = useState<"select" | "details">("select")
  const [sellPrenda, setSellPrenda] = useState<Prenda | null>(null)
  const [form, setForm] = useState({ precio: "", talla: "", estado_uso: "" })

  const [fotos, setFotos] = useState<{ file: File; url: string }[]>([])
  const [tasando, setTasando] = useState(false)
  const [tasacion, setTasacion] = useState<PrendaVentaAnalysis | null>(null)
  const [tasacionError, setTasacionError] = useState<string | null>(null)
  const fotoInputRef = useRef<HTMLInputElement>(null)

  function limpiarFotos() {
    fotos.forEach((f) => URL.revokeObjectURL(f.url))
    setFotos([])
    setTasacion(null)
    setTasacionError(null)
  }

  function handleClose() {
    limpiarFotos()
    setStep("select")
    setSellPrenda(null)
    setForm({ precio: "", talla: "", estado_uso: "" })
    onClose()
  }

  function handleSelect(p: Prenda) {
    limpiarFotos()
    setSellPrenda(p)
    setForm({ precio: "", talla: p.talla ?? "", estado_uso: p.estado_uso ?? "" })
    setStep("details")
  }

  function agregarFotos(files: FileList | null) {
    if (!files?.length) return
    const espacio = MAX_IMAGENES - fotos.length
    const nuevas = Array.from(files)
      .slice(0, espacio)
      .map((file) => ({ file, url: URL.createObjectURL(file) }))
    setFotos((prev) => [...prev, ...nuevas])
    setTasacion(null)
    setTasacionError(null)
  }

  function quitarFoto(i: number) {
    setFotos((prev) => {
      URL.revokeObjectURL(prev[i].url)
      return prev.filter((_, idx) => idx !== i)
    })
    setTasacion(null)
  }

  async function tasar() {
    if (!fotos.length) return
    setTasando(true)
    setTasacionError(null)
    try {
      const data = await analyzePrendaVenta(fotos.map((f) => f.file), userId)
      setTasacion(data)
      setForm((f) => ({ ...f, precio: String(data.precio_estimado_mxn.sugerido) }))
    } catch (err) {
      console.error("[analyzePrendaVenta]", err instanceof Error ? err.message : JSON.stringify(err))
      setTasacionError("No se pudo tasar la prenda. Puedes poner el precio manualmente.")
    } finally {
      setTasando(false)
    }
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

            {sellMode === "venta" && (
              <div className="flex flex-col gap-3 border border-zinc-200 p-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                    Fotos para tasar
                  </p>
                  <p className="text-[10px] text-zinc-400">{fotos.length}/{MAX_IMAGENES}</p>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Agrega fotos desde distintos ángulos, incluyendo etiquetas y cualquier
                  desperfecto. Mientras más muestres, mejor la estimación.
                </p>

                <div className="grid grid-cols-4 gap-2">
                  {fotos.map((f, i) => (
                    <div key={f.url} className="relative">
                      <img src={f.url} alt={`Foto ${i + 1}`} className="w-full h-16 object-cover" />
                      <button onClick={() => quitarFoto(i)} aria-label={`Quitar foto ${i + 1}`}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-white/90 border border-zinc-200 flex items-center justify-center">
                        <X className="w-3 h-3 text-zinc-700" />
                      </button>
                    </div>
                  ))}
                  {fotos.length < MAX_IMAGENES && (
                    <button onClick={() => fotoInputRef.current?.click()}
                      className="h-16 border border-dashed border-zinc-300 flex items-center justify-center hover:border-zinc-900 transition-colors">
                      <Camera className="w-4 h-4 text-zinc-400" />
                    </button>
                  )}
                </div>
                <input ref={fotoInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => { agregarFotos(e.target.files); e.target.value = "" }} />

                <motion.button whileTap={{ scale: 0.98 }} onClick={tasar}
                  disabled={tasando || fotos.length === 0}
                  className="w-full py-2.5 border border-zinc-900 text-zinc-900 text-xs font-medium tracking-wide flex items-center justify-center gap-2 disabled:opacity-40">
                  {tasando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {tasando ? "Analizando..." : "Estimar precio con IA"}
                </motion.button>

                {tasacionError && (
                  <p className="text-[11px] text-zinc-500 border border-zinc-200 px-3 py-2">{tasacionError}</p>
                )}

                {tasacion && (
                  <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3">
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Rango estimado</p>
                      <p className="font-serif text-lg text-zinc-900 mt-0.5">
                        ${tasacion.precio_estimado_mxn.min.toLocaleString("es-MX")} – ${tasacion.precio_estimado_mxn.max.toLocaleString("es-MX")} MXN
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Es una sugerencia orientativa, no un avalúo. El precio final lo decides tú.
                      </p>
                    </div>

                    {tasacion.descripcion_venta && (
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Descripción sugerida</p>
                        <p className="text-[13px] text-zinc-600 leading-relaxed">{tasacion.descripcion_venta}</p>
                      </div>
                    )}

                    {tasacion.defectos.length > 0 && (
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">
                          Desperfectos detectados
                        </p>
                        <ul className="flex flex-col gap-1">
                          {tasacion.defectos.map((d, i) => (
                            <li key={i} className="text-[13px] text-zinc-600 flex gap-2">
                              <span className="text-[10px] text-zinc-400 uppercase tracking-wide shrink-0 mt-0.5">
                                {SEVERIDAD_LABEL[d.severidad] ?? d.severidad}
                              </span>
                              <span>{d.descripcion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {tasacion.etiquetas_originalidad.length > 0 && (
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">
                          Etiquetas leídas
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {tasacion.etiquetas_originalidad.map((e, i) => (
                            <span key={i} className="text-[11px] text-zinc-600 border border-zinc-200 px-2 py-0.5">
                              {e}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
