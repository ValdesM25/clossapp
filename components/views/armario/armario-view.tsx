"use client"

import { useState, useRef } from "react"
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
import { usePrendasContext } from "@/context/prendas-context"
import { useReparaciones } from "@/hooks/use-reparaciones"
import { useImageUpload } from "@/hooks/use-image-upload"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { insertPrenda, registrarCompraReciente, type LugarCompra } from "@/services/prendas.service"
import { NOMBRE_PLAN, TOPE_PRENDAS, mensajeTopePrendas } from "@/constants/planes"
import type { Prenda, ReparacionDB } from "@/types"
import { UploadModal } from "./upload-modal"
import { PrendaDetailModal } from "./prenda-detail-modal"
import { RepairFormModal } from "./repair-form-modal"
import { RepairList } from "./repair-list"

export function ArmarioView() {
  const { userId, isGuest, plan } = useAuthContext()
  // Del contexto: entrar a Armario no vuelve a pedir ni a mostrar el esqueleto.
  const { prendas, loading, refresh: refreshPrendas, deletePrenda } = usePrendasContext()
  const { reparaciones, loading: loadingRep, add: addRep, complete: completeRep } = useReparaciones(userId, isGuest)
  const {
    preview, previewForm, analyzing, analyzeError, uploading, clientIdRef,
    fileInputRef, selectFile, updateForm, upload, cancel: cancelUpload,
  } = useImageUpload(userId, isGuest)

  const [showRepForm, setShowRepForm] = useState(false)
  const [repForm, setRepForm] = useState({ prenda_id: null as string | null, tarea: "", prioridad: "Media" as ReparacionDB["prioridad"] })
  const [savingRep, setSavingRep] = useState(false)
  const [selectedPrenda, setSelectedPrenda] = useState<Prenda | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const guardandoRef = useRef(false)
  const limiteAlcanzado = !!plan && prendas.length >= TOPE_PRENDAS[plan]

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

  // Se revisa antes de abrir la cámara para no subir una foto que la base va a rechazar.
  function abrirSubida() {
    if (isGuest) return
    if (limiteAlcanzado) { setAviso(mensajeTopePrendas(plan)); return }
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    selectFile(file)
  }

  async function handleConfirmUpload() {
    if (!preview || guardandoRef.current) return
    guardandoRef.current = true
    setSaveError(null)
    try {
      const publicUrl = await upload()
      if (!publicUrl) return
      const supabaseClient = createBrowserSupabaseClient()
      const prendaId = await insertPrenda(supabaseClient, {
        user_id: userId,
        name: previewForm.nombre || preview.file.name.replace(/\.[^/.]+$/, ""),
        category: previewForm.categoria || "Sin categoría",
        image_url: publicUrl,
        talla: previewForm.talla || null,
        estado_uso: previewForm.estado_uso || null,
        description: previewForm.descripcion || null,
        color: previewForm.color_principal || null,
        style: previewForm.estilo || null,
        client_id: clientIdRef.current,
        metadata: {
          nombre: previewForm.nombre,
          categoria: previewForm.categoria,
          color_principal: previewForm.color_principal,
          estilo: previewForm.estilo,
          descripcion: previewForm.descripcion,
        },
      })
      // La prenda ya quedó guardada; si falla la parte de compra solo se avisa.
      if (previewForm.comprada_reciente === "si" && previewForm.compra_lugar && previewForm.compra_precio !== "") {
        try {
          const puntos = await registrarCompraReciente(supabaseClient, {
            prendaId,
            lugar: previewForm.compra_lugar as LugarCompra,
            tienda: previewForm.compra_tienda,
            precio: Number(previewForm.compra_precio),
            fecha: previewForm.compra_fecha,
          })
          setAviso(puntos > 0
            ? `Tus ${puntos} puntos quedan pendientes: se acreditan en 14 días si la prenda sigue en tu armario y la usas en un outfit.`
            : "Guardamos tu compra. Este mes ya llegaste al tope de 100 puntos por compras.")
        } catch (err) {
          setAviso(err instanceof Error ? err.message : "No se pudieron guardar los datos de compra.")
        }
      }
      refreshPrendas()
      cancelUpload()
    } catch (err) {
      console.error("Error subiendo prenda:", err)
      const msg = err instanceof Object && "message" in err ? String(err.message) : ""
      // El trigger prendas_limite_plan rechaza la 51 aunque la UI no lo haya visto venir.
      if (msg.includes("LIMITE_PRENDAS")) {
        setAviso(mensajeTopePrendas(plan ?? "gratis"))
        cancelUpload()
      } else {
        setSaveError("No se pudo guardar la prenda. Revisa tu conexión y vuelve a intentarlo.")
      }
    } finally {
      guardandoRef.current = false
    }
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

  async function handleDeletePrenda(id: string) {
    setSelectedPrenda(null)
    setAviso(null)
    try {
      await deletePrenda(id)
    } catch (err) {
      const msg = err instanceof Object && "message" in err ? String(err.message) : ""
      // El trigger prendas_pedido_activo (migración 22) no deja borrar una prenda que alguien ya compró o rentó.
      setAviso(msg.includes("PRENDA_EN_PEDIDO")
        ? "Esta prenda está en un pedido en curso. Podrás eliminarla cuando se entregue o se cancele."
        : "No se pudo eliminar la prenda. Revisa tu conexión y vuelve a intentarlo.")
    }
  }

  return (
    <motion.div {...pageProps} className="flex flex-col gap-8 pb-40 pt-8">
      <div className="px-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-zinc-900">Armario Digital</h1>
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
          saveError={saveError}
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

      <section data-tour="armario-prendas" className="px-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Mis Prendas</p>
          {plan && (
            <p className="text-[11px] text-zinc-500 tabular-nums">{prendas.length}/{TOPE_PRENDAS[plan]} · Plan {NOMBRE_PLAN[plan]}</p>
          )}
        </div>
        {aviso && (
          <p role="status" className="text-xs text-zinc-600 border border-zinc-200 px-4 py-3 mb-3">{aviso}</p>
        )}
        {loading ? <PrendaSkeleton /> : prendas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 border border-zinc-100">
            <Shirt className="w-8 h-8 text-zinc-300" />
            <div className="text-center">
              <p className="text-sm text-zinc-900">Tu armario está vacío</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-60 leading-relaxed">Tómale foto a una prenda y la IA llena nombre, categoría y color.</p>
            </div>
            <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={abrirSubida}
              className="h-11 px-5 bg-zinc-900 text-white text-sm font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" /> Agregar prenda
            </motion.button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-3">
            {prendasFiltradas.map((item, i) => {
              const tieneRep = prendasConRep.has(item.id)
              return (
                <button type="button" key={item.id} onClick={() => setSelectedPrenda(item)}
                  className={cn(
                    "relative overflow-hidden text-left active:opacity-80 transition-opacity",
                    item.en_renta ? "bg-zinc-200 opacity-60" : "bg-zinc-50"
                  )}>
                  <img src={item.image_url || fashionImages[i % fashionImages.length]} alt={item.name} loading={i < 6 ? "eager" : "lazy"} decoding="async"
                    className={cn("w-full object-cover", item.en_renta && "grayscale")}
                    style={{ height: i % 3 === 0 ? "180px" : i % 3 === 1 ? "140px" : "160px" }} />
                  {tieneRep && (
                    <div className="absolute top-2 right-2 bg-white border border-zinc-200 text-zinc-600 text-[11px] font-medium px-2 py-0.5 flex items-center gap-1">Rep.</div>
                  )}
                  {item.en_renta && (
                    <div className="absolute top-2 left-2 bg-zinc-500 text-white text-[11px] font-medium px-2 py-0.5">En renta</div>
                  )}
                  {item.en_venta && !item.en_renta && (
                    <div className="absolute top-2 left-2 bg-zinc-900 text-white text-[11px] font-medium px-2 py-0.5">En venta</div>
                  )}
                  <div className="p-2.5">
                    <p className={cn("text-xs font-medium truncate", item.en_renta ? "text-zinc-500" : "text-zinc-900")}>{item.name}</p>
                    <p className="text-[11px] text-zinc-500">{item.category}{item.talla ? ` · ${item.talla}` : ""}</p>
                    {item.en_renta && item.fecha_renta && (
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Renta: {new Date(item.fecha_renta).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <CenteredModal open={!!selectedPrenda} onClose={() => setSelectedPrenda(null)}>
        {selectedPrenda && (
          <PrendaDetailModal prenda={selectedPrenda}
            onDelete={isGuest ? undefined : () => handleDeletePrenda(selectedPrenda.id)} />
        )}
      </CenteredModal>

      <section className="px-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Reparaciones</p>
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

      <motion.button data-tour="armario-agregar" aria-label="Agregar prenda" whileTap={{ scale: 0.94 }} onClick={abrirSubida} disabled={uploading}
        className={cn("fixed bottom-28 z-40 shadow-lg w-12 h-12 flex items-center justify-center fab-right",
          isGuest ? "bg-zinc-200 cursor-default" : "bg-zinc-900 text-white disabled:opacity-50")}>
        {uploading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : isGuest ? <Lock className="w-4 h-4 text-zinc-400" /> : <Plus className="w-5 h-5 text-white" />}
      </motion.button>
    </motion.div>
  )
}
