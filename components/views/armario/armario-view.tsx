"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Shirt, Plus, Lock, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CenteredModal } from "@/components/shared/centered-modal"
import { PrendaSkeleton } from "@/components/shared/prenda-skeleton"
import { pageProps } from "@/constants/animation"
import { fashionImages } from "@/constants/images"
import { FIXED_CATS } from "@/constants/categories"
import { useAuthContext } from "@/context/auth-context"
import { usePrendas } from "@/hooks/use-prendas"
import { useReparaciones } from "@/hooks/use-reparaciones"
import { useImageUpload } from "@/hooks/use-image-upload"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { insertPrenda } from "@/services/prendas.service"
import type { Prenda, ReparacionDB } from "@/types"
import { UploadModal } from "./upload-modal"
import { PrendaDetailModal } from "./prenda-detail-modal"
import { RepairFormModal } from "./repair-form-modal"
import { RepairList } from "./repair-list"

export function ArmarioView() {
  const { userId, isGuest } = useAuthContext()
  const { prendas, loading, refresh: refreshPrendas } = usePrendas(userId, isGuest)
  const { reparaciones, loading: loadingRep, add: addRep, complete: completeRep } = useReparaciones(userId, isGuest)
  const {
    preview, previewForm, analyzing, analyzeError, uploading,
    fileInputRef, selectFile, updateForm, upload, cancel: cancelUpload,
  } = useImageUpload(userId, isGuest)

  const [showRepForm, setShowRepForm] = useState(false)
  const [repForm, setRepForm] = useState({ prenda_id: null as string | null, tarea: "", prioridad: "Media" as ReparacionDB["prioridad"] })
  const [savingRep, setSavingRep] = useState(false)
  const [selectedPrenda, setSelectedPrenda] = useState<Prenda | null>(null)

  const [activeCategory, setActiveCategory] = useState("Todas")
  const prendasConRep = new Set(reparaciones.map((r) => r.prenda_id).filter(Boolean))

  const dynamicCats = Array.from(new Set(prendas.map((p) => p.category).filter(Boolean)))
  const allCats = Array.from(new Set([...FIXED_CATS, ...dynamicCats]))

  const prendasFiltradas = activeCategory === "Todas"
    ? prendas
    : prendas.filter((p) =>
        p.category?.toLowerCase().includes(activeCategory.toLowerCase()) ||
        (p.metadata as Record<string, string> | null)?.categoria?.toLowerCase().includes(activeCategory.toLowerCase())
      )

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    selectFile(file)
  }

  async function handleConfirmUpload() {
    if (!preview) return
    const publicUrl = await upload()
    if (!publicUrl) return
    try {
      const supabaseClient = createBrowserSupabaseClient()
      await insertPrenda(supabaseClient, {
        user_id: userId,
        name: previewForm.nombre || preview.file.name.replace(/\.[^/.]+$/, ""),
        category: previewForm.categoria || "Sin categoría",
        image_url: publicUrl,
        talla: previewForm.talla || null,
        estado_uso: previewForm.estado_uso || null,
        description: previewForm.descripcion || null,
        color: previewForm.color_principal || null,
        style: previewForm.estilo || null,
        metadata: {
          nombre: previewForm.nombre,
          categoria: previewForm.categoria,
          color_principal: previewForm.color_principal,
          estilo: previewForm.estilo,
          descripcion: previewForm.descripcion,
        },
      })
      refreshPrendas()
      cancelUpload()
    } catch (err) { console.error("Error subiendo prenda:", err) }
  }

  async function handleSaveRep() {
    if (isGuest || !repForm.prenda_id) return
    setSavingRep(true)
    const selected = prendas.find((p) => p.id === repForm.prenda_id)
    try {
      await addRep({
        user_id: userId, prenda_id: repForm.prenda_id,
        prenda: selected?.name ?? "", tarea: repForm.tarea,
        prioridad: repForm.prioridad, completado: false,
      })
    } catch (err) { console.error("[handleSaveRep] error →", err) }
    setRepForm({ prenda_id: null, tarea: "", prioridad: "Media" })
    setShowRepForm(false)
    setSavingRep(false)
  }

  async function handleCompleteRep(id: string) {
    if (isGuest) return
    await completeRep(id)
  }

  return (
    <motion.div {...pageProps} className="flex flex-col gap-8 pb-40 pt-8">
      <div className="px-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Mi Colección</p>
          <h1 className="font-serif text-2xl text-zinc-900 mt-0.5">Armario Digital</h1>
        </div>
        <Select value={activeCategory} onValueChange={setActiveCategory}>
          <SelectTrigger className="w-auto h-8 rounded-none border-zinc-300 text-xs text-zinc-600 focus:ring-0 gap-1 pr-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[60]">
            {allCats.map((cat) => (
              <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CenteredModal open={!!preview} onClose={cancelUpload}>
        <UploadModal
          preview={preview} previewForm={previewForm}
          analyzing={analyzing} analyzeError={analyzeError}
          uploading={uploading} updateForm={updateForm}
          onConfirm={handleConfirmUpload} onCancel={cancelUpload}
        />
      </CenteredModal>

      <CenteredModal open={showRepForm} onClose={() => setShowRepForm(false)}>
        <RepairFormModal
          prendas={prendas} repForm={repForm} savingRep={savingRep}
          onPrendaSelect={(id) => setRepForm(f => ({ ...f, prenda_id: id }))}
          onTareaChange={(tarea) => setRepForm(f => ({ ...f, tarea }))}
          onPrioridadChange={(v) => setRepForm(f => ({ ...f, prioridad: v as ReparacionDB["prioridad"] }))}
          onSave={handleSaveRep}
        />
      </CenteredModal>

      <section className="px-4">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Mis Prendas</p>
        {loading ? <PrendaSkeleton /> : prendas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 border border-zinc-100">
            <Shirt className="w-8 h-8 text-zinc-300" />
            <div className="text-center">
              <p className="text-sm text-zinc-700">Tu clóset está vacío</p>
              <p className="text-xs text-zinc-400 mt-1">Sube tu primer look</p>
            </div>
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => fileInputRef.current?.click()}
              className="border border-zinc-900 text-zinc-900 text-xs px-5 py-2 tracking-wide">
              + Agregar prenda
            </motion.button>
          </div>
        ) : (
          <div className="columns-2 gap-3 space-y-3">
            {prendasFiltradas.map((item, i) => {
              const tieneRep = prendasConRep.has(item.id)
              return (
                <div key={item.id} onClick={() => setSelectedPrenda(item)}
                  className={cn(
                    "break-inside-avoid relative overflow-hidden mb-3 cursor-pointer active:opacity-80 transition-opacity",
                    item.en_renta ? "bg-zinc-200 opacity-60" : "bg-zinc-50"
                  )}>
                  <img src={item.image_url || fashionImages[i % fashionImages.length]} alt={item.name}
                    className={cn("w-full object-cover", item.en_renta && "grayscale")}
                    style={{ height: i % 3 === 0 ? "180px" : i % 3 === 1 ? "140px" : "160px" }} />
                  {tieneRep && (
                    <div className="absolute top-2 right-2 bg-white border border-zinc-200 text-zinc-600 text-[10px] font-medium px-2 py-0.5 flex items-center gap-1">Rep.</div>
                  )}
                  {item.en_renta && (
                    <div className="absolute top-2 left-2 bg-zinc-500 text-white text-[10px] font-medium px-2 py-0.5">En renta</div>
                  )}
                  {item.en_venta && !item.en_renta && (
                    <div className="absolute top-2 left-2 bg-zinc-900 text-white text-[10px] font-medium px-2 py-0.5">En venta</div>
                  )}
                  <div className="p-2.5">
                    <p className={cn("text-xs font-medium truncate", item.en_renta ? "text-zinc-400" : "text-zinc-900")}>{item.name}</p>
                    <p className="text-[10px] text-zinc-400">{item.category}{item.talla ? ` · ${item.talla}` : ""}</p>
                    {item.en_renta && item.fecha_renta && (
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        Renta: {new Date(item.fecha_renta).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <CenteredModal open={!!selectedPrenda} onClose={() => setSelectedPrenda(null)}>
        {selectedPrenda && <PrendaDetailModal prenda={selectedPrenda} />}
      </CenteredModal>

      <section className="px-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Reparaciones</p>
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => !isGuest && setShowRepForm(true)}
            className={cn("text-xs px-3 py-1.5 flex items-center gap-1 tracking-wide",
              isGuest ? "border border-zinc-200 text-zinc-300 cursor-default" : "border border-zinc-900 text-zinc-900")}>
            {isGuest ? <Lock className="w-3 h-3" /> : <Plus className="w-3 h-3" />} Nueva
          </motion.button>
        </div>
        <div className="flex flex-col gap-2">
          <RepairList reparaciones={reparaciones} prendas={prendas} loading={loadingRep} onComplete={handleCompleteRep} />
        </div>
      </section>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

      <motion.button whileTap={{ scale: 0.94 }} onClick={() => !isGuest && fileInputRef.current?.click()} disabled={uploading}
        className={cn("fixed bottom-28 z-40 shadow-lg w-12 h-12 flex items-center justify-center fab-right",
          isGuest ? "bg-zinc-200 cursor-default" : "bg-zinc-900 text-white disabled:opacity-50")}>
        {uploading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : isGuest ? <Lock className="w-4 h-4 text-zinc-400" /> : <Plus className="w-5 h-5 text-white" />}
      </motion.button>
    </motion.div>
  )
}
