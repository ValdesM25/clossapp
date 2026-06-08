"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Shirt, Sparkles, Plus, Search, AlertCircle, TrendingUp, Clock, Check, Loader2, X, Lock, Tag,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Prenda, PrendaExt, ReparacionDB, View } from "@/types"
import { DEMO_OUTFITS, GUEST_PRENDAS, GUEST_REPARACIONES, STATIC_MARKET, STATIC_RENTA } from "@/constants/demo-data"
import { navItems, filterChips } from "@/constants/navigation"
import { FIXED_CATS, LAYER_ORDER } from "@/constants/categories"
import { fashionImages, outfitImages } from "@/constants/images"
import { pageVariants, pageProps } from "@/constants/animation"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { insertPrenda } from "@/services/prendas.service"
import { useKeyboard } from "@/hooks/use-keyboard"
import { usePrendas } from "@/hooks/use-prendas"
import { useReparaciones } from "@/hooks/use-reparaciones"
import { useImageUpload } from "@/hooks/use-image-upload"
import { useOutfits } from "@/hooks/use-outfits"
import { useMarketplace } from "@/hooks/use-marketplace"
import { useStats } from "@/hooks/use-stats"
import { AuthProvider, useAuthContext } from "@/context/auth-context"
import { PrendasProvider, usePrendasContext } from "@/context/prendas-context"
import { CenteredModal } from "@/components/shared/centered-modal"
import { PrendaSkeleton } from "@/components/shared/prenda-skeleton"
import { AnimatedNumber } from "@/components/shared/animated-number"
import { BottomNav } from "@/components/shared/bottom-nav"
import { PageHeader } from "@/components/shared/page-header"
import { PrendaCard } from "@/components/shared/prenda-card"
import { PrendaGrid } from "@/components/shared/prenda-grid"
import { LoginView } from "@/components/views/login-view"
import { InicioView } from "@/components/views/inicio/inicio-view"
import { EstadisticasView } from "@/components/views/estadisticas/estadisticas-view"
import { SimuladorView } from "@/components/views/simulador/simulador-view"

// ─── DEMO TOGGLE ──────────────────────────────────────────────────────────────
const IS_OFFLINE_DEMO = false

// ─── VIEW: ARMARIO ────────────────────────────────────────────────────────────
function ArmarioView({ userId, isGuest }: { userId: string; isGuest: boolean }) {
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

  // Derive unique categories from loaded prendas + fixed defaults
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
        {/* Category filter — right side */}
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

      {/* Upload preview modal — AI auto-fill */}
      <CenteredModal open={!!preview} onClose={() => { if (preview) URL.revokeObjectURL(preview.url); setPreview(null) }}>
        <div className="p-6 flex flex-col gap-4">
          <p className="font-serif text-zinc-900 text-lg pr-8">Nueva prenda</p>

          {preview && <img src={preview.url} alt="preview" className="w-full object-cover max-h-52" />}

          {/* Step 2: analyzing state */}
          {analyzing && (
            <div className="flex items-center gap-3 border border-zinc-100 px-4 py-3">
              <Loader2 className="w-4 h-4 text-zinc-400 animate-spin shrink-0" />
              <p className="text-xs text-zinc-500 tracking-wide">Analizando prenda...</p>
            </div>
          )}

          {analyzeError && (
            <p className="text-xs text-zinc-400 border border-zinc-100 px-4 py-3">{analyzeError}</p>
          )}

          {/* Step 3: AI-filled fields (editable) */}
          {!analyzing && (
            <>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Nombre</label>
                <Input value={previewForm.nombre}
                  onChange={(e) => setPreviewForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej. Blazer de Lino Negro"
                  className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Categoría</label>
                  <Input value={previewForm.categoria}
                    onChange={(e) => setPreviewForm(f => ({ ...f, categoria: e.target.value }))}
                    placeholder="Top, Bottom..."
                    className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Color</label>
                  <Input value={previewForm.color_principal}
                    onChange={(e) => setPreviewForm(f => ({ ...f, color_principal: e.target.value }))}
                    placeholder="Negro, Beige..."
                    className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Estilo</label>
                <Input value={previewForm.estilo}
                  onChange={(e) => setPreviewForm(f => ({ ...f, estilo: e.target.value }))}
                  placeholder="Minimalista, Casual..."
                  className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
              </div>

              {/* Step 4: manual fields */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-zinc-100">
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Talla</label>
                  <Input value={previewForm.talla}
                    onChange={(e) => setPreviewForm(f => ({ ...f, talla: e.target.value }))}
                    placeholder="XS, S, M, 38..."
                    className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Estado</label>
                  <Select value={previewForm.estado_uso} onValueChange={(v) => setPreviewForm(f => ({ ...f, estado_uso: v }))}>
                    <SelectTrigger className="rounded-none border-zinc-300 focus:ring-0 text-sm h-10"><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent className="z-[110]">
                      <SelectItem value="Nuevo con etiqueta">Nuevo con etiqueta</SelectItem>
                      <SelectItem value="Como nuevo">Como nuevo</SelectItem>
                      <SelectItem value="Poco uso">Poco uso</SelectItem>
                      <SelectItem value="Buen estado">Buen estado</SelectItem>
                      <SelectItem value="Usado">Usado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          <motion.button whileTap={{ scale: 0.98 }} onClick={handleConfirmUpload}
            disabled={uploading || analyzing}
            className="w-full py-3 bg-zinc-900 text-white text-sm font-medium tracking-wide flex items-center justify-center gap-2 disabled:opacity-50">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {uploading ? "Guardando..." : "Confirmar y Guardar"}
          </motion.button>
        </div>
      </CenteredModal>

      {/* Repair form modal */}
      <CenteredModal open={showRepForm} onClose={() => setShowRepForm(false)}>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pr-8">
            <p className="font-serif text-zinc-900 text-lg">Nueva reparación</p>
            <motion.button whileTap={{ scale: 0.96 }} onClick={handleSaveRep} disabled={savingRep || !repForm.prenda_id}
              className="px-4 py-1.5 bg-zinc-900 text-white text-xs font-medium tracking-wide disabled:opacity-40 flex items-center gap-1.5">
              {savingRep ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Guardar
            </motion.button>
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-widest mb-2 block">Selecciona la prenda</label>
            {prendas.length === 0 ? (
              <p className="text-xs text-zinc-400 border border-zinc-100 p-4 text-center">Sube prendas primero.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {prendas.map((p) => (
                  <button key={p.id} onClick={() => setRepForm(f => ({ ...f, prenda_id: p.id }))}
                    className={cn("relative overflow-hidden border-2 transition-all", repForm.prenda_id === p.id ? "border-zinc-900" : "border-transparent")}>
                    <img src={p.image_url} alt={p.name} className="w-full h-20 object-cover" />
                    {repForm.prenda_id === p.id && (
                      <div className="absolute inset-0 bg-zinc-900/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <p className="text-[10px] text-zinc-600 truncate px-1 py-1 bg-white">{p.name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-widest mb-1 block">Tarea</label>
            <Input value={repForm.tarea} onChange={(e) => setRepForm(f => ({ ...f, tarea: e.target.value }))}
              placeholder="Ej. Cambiar botón, ajustar dobladillo..."
              className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-widest mb-1 block">Prioridad</label>
            <Select value={repForm.prioridad} onValueChange={(v) => setRepForm(f => ({ ...f, prioridad: v as ReparacionDB["prioridad"] }))}>
              <SelectTrigger className="rounded-none border-zinc-300 focus:ring-0"><SelectValue /></SelectTrigger>
              <SelectContent className="z-[110]">
                <SelectItem value="Baja">Baja</SelectItem>
                <SelectItem value="Media">Media</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CenteredModal>

      {/* Prendas grid */}
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
                    <div className="absolute top-2 right-2 bg-white border border-zinc-200 text-zinc-600 text-[10px] font-medium px-2 py-0.5 flex items-center gap-1">
                      Rep.
                    </div>
                  )}
                  {item.en_renta && (
                    <div className="absolute top-2 left-2 bg-zinc-500 text-white text-[10px] font-medium px-2 py-0.5">
                      En renta
                    </div>
                  )}
                  {item.en_venta && !item.en_renta && (
                    <div className="absolute top-2 left-2 bg-zinc-900 text-white text-[10px] font-medium px-2 py-0.5">
                      En venta
                    </div>
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

      {/* Prenda Detail Modal */}
      <CenteredModal open={!!selectedPrenda} onClose={() => setSelectedPrenda(null)}>
        {selectedPrenda && (() => {
          const m = selectedPrenda.metadata ?? {}
          const chips = [m.estilo, m.material, m.color_principal].filter(Boolean)
          return (
            <div className="flex flex-col">
              <img
                src={selectedPrenda.image_url}
                alt={selectedPrenda.name}
                className="w-full object-cover"
                style={{ maxHeight: "320px" }}
              />
              <div className="p-5 flex flex-col gap-4">
                {/* Nombre con tipografía serif */}
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">{selectedPrenda.category}</p>
                  <h2 className="font-serif text-xl text-zinc-900 leading-tight">
                    {m.nombre || selectedPrenda.name}
                  </h2>
                </div>

                {/* Chips de atributos */}
                {chips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {chips.map((chip) => (
                      <span key={chip} className="bg-zinc-900 text-white text-[10px] font-medium px-2.5 py-1 tracking-wide uppercase">
                        {chip}
                      </span>
                    ))}
                  </div>
                )}

                {/* Ficha técnica */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-zinc-100 pt-4">
                  {m.descripcion && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-0.5">Descripción</p>
                      <p className="text-xs text-zinc-700 leading-relaxed">{m.descripcion}</p>
                    </div>
                  )}
                  {selectedPrenda.talla && (
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-0.5">Talla</p>
                      <p className="text-sm font-medium text-zinc-900">{selectedPrenda.talla}</p>
                    </div>
                  )}
                  {selectedPrenda.estado_uso && (
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-0.5">Estado</p>
                      <p className="text-sm font-medium text-zinc-900">{selectedPrenda.estado_uso}</p>
                    </div>
                  )}
                  {selectedPrenda.en_venta && selectedPrenda.precio && (
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-0.5">Precio</p>
                      <p className="font-serif text-lg text-zinc-900">${selectedPrenda.precio}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}
      </CenteredModal>

      {/* Reparaciones */}
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
          {loadingRep ? (
            <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 text-zinc-400 animate-spin" /></div>
          ) : (
            <AnimatePresence>
              {reparaciones.length === 0 ? (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-zinc-400 text-center py-4">
                  Sin reparaciones pendientes
                </motion.p>
              ) : reparaciones.map((rep) => {
                const prenda = prendas.find((p) => p.id === rep.prenda_id)
                return (
                  <motion.div key={rep.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                    className="flex items-center gap-3 border border-zinc-100 p-3">
                    {prenda?.image_url
                      ? <img src={prenda.image_url} alt={prenda.name} className="w-10 h-10 object-cover shrink-0" />
                      : <div className="w-10 h-10 bg-zinc-100 flex items-center justify-center shrink-0"><Shirt className="w-4 h-4 text-zinc-300" /></div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-900 truncate">{rep.prenda}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{rep.tarea}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-[10px] px-2 py-0.5 border",
                        rep.prioridad === "Alta" ? "border-zinc-900 text-zinc-900" :
                          rep.prioridad === "Media" ? "border-zinc-400 text-zinc-500" : "border-zinc-200 text-zinc-400")}>
                        {rep.prioridad}
                      </span>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleCompleteRep(rep.id)}
                        className="w-7 h-7 border border-zinc-200 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-zinc-500" />
                      </motion.button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
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

// ─── VIEW: MARKETPLACE ────────────────────────────────────────────────────────

function MarketplaceView({ userId, isGuest, userPrendas, onApartar }: { userId: string; isGuest: boolean; userPrendas: Prenda[]; onApartar: () => void }) {
  const {
    marketTab, setMarketTab, activeFilter, setActiveFilter,
    items, rentaItems, loading, aparting, apartSuccess,
    sellMode, setSellMode, selling, rentaError,
    apartar, publish,
  } = useMarketplace(userId, isGuest)

  const [selectedItem, setSelectedItem] = useState<Prenda | null>(null)
  const [showSellForm, setShowSellForm] = useState(false)
  const [sellStep, setSellStep] = useState<"select" | "details">("select")
  const [sellPrenda, setSellPrenda] = useState<Prenda | null>(null)
  const [sellForm, setSellForm] = useState({ precio: "", talla: "", estado_uso: "" })
  const [showFechaRenta, setShowFechaRenta] = useState(false)
  const [fechaRenta, setFechaRenta] = useState("")

  function handleSelectSellPrenda(p: Prenda) {
    setSellPrenda(p)
    setSellForm({ precio: "", talla: p.talla ?? "", estado_uso: p.estado_uso ?? "" })
    setSellStep("details")
  }

  const currentItems = marketTab === "comprar" ? items : rentaItems
  const filtered = activeFilter === "Todos" ? currentItems : currentItems.filter((i) => i.category === activeFilter)

  async function handleApartar() {
    if (!selectedItem || isGuest) return
    if (marketTab === "rentar") {
      if (!fechaRenta) { setShowFechaRenta(true); return }
      const ok = await apartar(selectedItem, "rentar", fechaRenta)
      if (ok) {
        setShowFechaRenta(false)
        setFechaRenta("")
        setTimeout(() => setSelectedItem(null), 2000)
        onApartar()
      }
      return
    }
    const ok = await apartar(selectedItem, "comprar")
    if (ok) {
      setTimeout(() => setSelectedItem(null), 2000)
      onApartar()
    }
  }

  async function handleSell() {
    if (!sellPrenda || !sellForm.precio) return
    const ok = await publish(sellPrenda, sellMode, sellForm.precio, sellForm.talla, sellForm.estado_uso)
    if (ok) {
      setShowSellForm(false); setSellStep("select"); setSellPrenda(null)
      setSellForm({ precio: "", talla: "", estado_uso: "" })
    }
  }

  const myPrendasAvailable = userPrendas.filter((p) => !p.en_venta && !p.en_renta)

  return (
    <motion.div {...pageProps} className="flex flex-col gap-6 pb-32 pt-8">
      <div className="px-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Descubre</p>
          <h1 className="font-serif text-2xl text-zinc-900 mt-0.5">Marketplace</h1>
        </div>
        {!isGuest && (
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setShowSellForm(true); setSellStep("select"); setSellMode("venta") }}
            className="border border-zinc-900 text-zinc-900 text-xs px-3 py-1.5 flex items-center gap-1 tracking-wide">
            <Tag className="w-3 h-3" /> Publicar
          </motion.button>
        )}
      </div>

      <div className="px-4 flex border-b border-zinc-200">
        {(["comprar", "rentar"] as const).map((tab) => (
          <button key={tab} onClick={() => { setMarketTab(tab); setActiveFilter("Todos") }}
            className={cn("flex-1 py-2.5 text-xs font-medium tracking-widest uppercase transition-colors border-b-2 -mb-px",
              marketTab === tab ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400")}>
            {tab === "comprar" ? "Comprar" : "Rentar"}
          </button>
        ))}
      </div>

      <div className="px-4 relative">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input placeholder="Buscar prendas..." className="pl-10 rounded-none border-zinc-200 focus-visible:ring-0 focus-visible:border-zinc-900 text-zinc-700 placeholder:text-zinc-400" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 px-4">
        {filterChips.map((f) => (
          <motion.button key={f} whileTap={{ scale: 0.96 }} onClick={() => setActiveFilter(f)}
            className={cn("shrink-0 px-4 py-1.5 text-xs tracking-wide border transition-colors",
              activeFilter === f ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-200 text-zinc-600")}>
            {f}
          </motion.button>
        ))}
      </div>

      {loading ? <PrendaSkeleton /> : filtered.length === 0 ? (
        <div className="mx-4 flex flex-col items-center justify-center py-12 gap-2 border border-zinc-100">
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Sin prendas disponibles</p>
        </div>
      ) : (
        <div className="columns-2 gap-3 px-4 space-y-3">
          {filtered.map((item, i) => (
            <motion.div key={item.id} whileTap={{ scale: 0.98 }} onClick={() => setSelectedItem(item)}
              className="break-inside-avoid overflow-hidden bg-zinc-50 mb-3 cursor-pointer">
              <img src={item.image_url || fashionImages[i % fashionImages.length]} alt={item.name}
                className="w-full object-cover" style={{ height: i % 2 === 0 ? "180px" : "140px" }} />
              <div className="p-2.5">
                <p className="text-xs font-medium text-zinc-900 truncate">{item.name}</p>
                <p className="text-[10px] text-zinc-400">{item.estado_uso ?? item.category}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs font-semibold text-zinc-900">
                    ${marketTab === "rentar" ? (item.precio_renta ?? "—") : (item.precio ?? "—")}
                    {marketTab === "rentar" && <span className="text-[9px] text-zinc-400 font-normal ml-0.5">/día</span>}
                  </p>
                  {marketTab === "rentar" && (
                    <span className="text-[9px] border border-zinc-300 text-zinc-500 px-1.5 py-0.5 uppercase tracking-wide">Renta</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <CenteredModal open={!!selectedItem} onClose={() => { setSelectedItem(null); setApartSuccess(false); setShowFechaRenta(false); setFechaRenta("") }}>
        {selectedItem && (
          <div className="flex flex-col">
            <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-64 object-cover" />
            <div className="p-6 flex flex-col gap-4">
              <div>
                <h2 className="font-serif text-xl text-zinc-900">{selectedItem.name}</h2>
                <p className="text-xs text-zinc-400 uppercase tracking-widest mt-1">{selectedItem.category}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                    {marketTab === "rentar" ? "Precio / día" : "Precio"}
                  </p>
                  <p className="font-serif text-2xl text-zinc-900">
                    ${marketTab === "rentar" ? (selectedItem.precio_renta ?? "—") : (selectedItem.precio ?? "—")}
                  </p>
                </div>
                {selectedItem.talla && (
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Talla</p>
                    <p className="text-sm font-medium text-zinc-900">{selectedItem.talla}</p>
                  </div>
                )}
                {selectedItem.estado_uso && (
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Estado</p>
                    <p className="text-sm font-medium text-zinc-900">{selectedItem.estado_uso}</p>
                  </div>
                )}
              </div>
              {apartSuccess ? (
                <div className="w-full py-3 border border-zinc-200 text-zinc-600 text-sm text-center tracking-wide">
                  {marketTab === "rentar" ? "Solicitud enviada" : "Apartado correctamente"}
                </div>
              ) : marketTab === "rentar" && showFechaRenta ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">
                      Fecha de renta
                    </label>
                    <Input type="date" value={fechaRenta}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setFechaRenta(e.target.value)}
                      className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <motion.button whileTap={{ scale: 0.98 }}
                      onClick={() => { setShowFechaRenta(false); setFechaRenta("") }}
                      className="flex-1 py-2.5 border border-zinc-200 text-zinc-500 text-xs tracking-wide">
                      Cancelar
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.98 }} onClick={handleApartar}
                      disabled={!fechaRenta || aparting}
                      className="flex-1 py-2.5 bg-zinc-900 text-white text-xs font-medium tracking-wide flex items-center justify-center gap-2 disabled:opacity-40">
                      {aparting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Confirmar Renta
                    </motion.button>
                  </div>
                </div>
              ) : (
                <motion.button whileTap={{ scale: 0.98 }} onClick={handleApartar} disabled={aparting || isGuest}
                  className={cn("w-full py-3 text-sm font-medium tracking-wide flex items-center justify-center gap-2",
                    isGuest ? "bg-zinc-100 text-zinc-400 cursor-default" : "bg-zinc-900 text-white disabled:opacity-50")}>
                  {aparting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isGuest ? "Solo lectura" : aparting ? "Procesando..." : marketTab === "rentar" ? "Solicitar Renta" : "Apartar"}
                </motion.button>
              )}
            </div>
          </div>
        )}
      </CenteredModal>

      <CenteredModal open={showSellForm} onClose={() => { setShowSellForm(false); setSellStep("select"); setSellPrenda(null); setRentaError(null) }}>
        <div className="p-6 flex flex-col gap-4">
          {sellStep === "select" ? (
            <>
              <div className="flex border border-zinc-200 pr-8">
                {(["venta", "renta"] as const).map((m) => (
                  <button key={m} onClick={() => { setSellMode(m); setRentaError(null) }}
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
              {myPrendasAvailable.length === 0 ? (
                <p className="text-xs text-zinc-400 border border-zinc-100 p-4 text-center">No tienes prendas disponibles.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {myPrendasAvailable.map((p) => {
                    const bloqueada = sellMode === "renta" && !categoriaPermiteRenta(p.category)
                    return (
                      <button key={p.id} onClick={() => !bloqueada && handleSelectSellPrenda(p)}
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
                <button onClick={() => setSellStep("select")} className="text-xs text-zinc-400 underline">← Volver</button>
                <p className="font-serif text-zinc-900 text-lg">{sellPrenda?.name}</p>
              </div>
              {sellPrenda && <img src={sellPrenda.image_url} alt={sellPrenda.name} className="w-full h-40 object-cover" />}
              <div className="flex gap-4">
                {sellForm.talla && (
                  <div className="flex-1">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Talla</p>
                    <p className="text-sm text-zinc-700 border border-zinc-100 px-3 py-2 bg-zinc-50">{sellForm.talla}</p>
                  </div>
                )}
                {sellForm.estado_uso && (
                  <div className="flex-1">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Estado</p>
                    <p className="text-sm text-zinc-700 border border-zinc-100 px-3 py-2 bg-zinc-50">{sellForm.estado_uso}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-widest mb-1 block">
                  {sellMode === "renta" ? "Precio por día (MXN) *" : "Precio (MXN) *"}
                </label>
                <Input value={sellForm.precio} onChange={(e) => setSellForm(f => ({ ...f, precio: e.target.value }))}
                  placeholder="Ej. 350" type="number"
                  className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900" />
              </div>
              {rentaError && <p className="text-xs text-zinc-500 border border-zinc-200 px-3 py-2">{rentaError}</p>}
              <motion.button whileTap={{ scale: 0.98 }} onClick={handleSell} disabled={selling || !sellForm.precio}
                className="w-full py-3 bg-zinc-900 text-white text-sm font-medium tracking-wide flex items-center justify-center gap-2 disabled:opacity-50">
                {selling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {selling ? "Publicando..." : sellMode === "renta" ? "Publicar para Renta" : "Publicar en Marketplace"}
              </motion.button>
            </>
          )}
        </div>
      </CenteredModal>
    </motion.div>
  )
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
function AppShell() {
  const { userMode, userId, userName, isGuest } = useAuthContext()
  const { prendas, refresh: refreshPrendas } = usePrendasContext()
  const [activeView, setActiveView] = useState<View>("inicio")
  const [marketFlash, setMarketFlash] = useState(false)
  const keyboardOpen = useKeyboard()

  function handleSellItem() {
    setMarketFlash(true)
    setTimeout(() => { setActiveView("marketplace"); setMarketFlash(false) }, 600)
  }

  const renderView = () => {
    switch (activeView) {
      case "inicio": return <InicioView />
      case "armario": return <ArmarioView userId={userId} isGuest={isGuest} />
      case "simulador": return <SimuladorView onElegir={() => setActiveView("armario")} />
      case "marketplace": return <MarketplaceView userId={userId} isGuest={isGuest} userPrendas={prendas} onApartar={refreshPrendas} />
      case "estadisticas": return <EstadisticasView onSellPrenda={() => setActiveView("marketplace")} />
      default: return <InicioView />
    }
  }

  return (
    <div className="flex items-start justify-center min-h-screen bg-white">
      <div className="w-full max-w-2xl mx-auto min-h-screen bg-white relative">
        <AnimatePresence mode="wait">
          {!userMode ? (
            <LoginView key="login" />
          ) : (
            <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
              className="relative min-h-screen">
              <div className="overflow-y-auto h-screen pb-36">
                <AnimatePresence mode="wait">
                  <div key={activeView}>{renderView()}</div>
                </AnimatePresence>
              </div>

              {/* Bottom Nav */}
              <BottomNav activeView={activeView} onNavigate={setActiveView} open={!keyboardOpen} flash={marketFlash ? "marketplace" : undefined} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function ClossappDashboard() {
  return (
    <div className="flex items-start justify-center min-h-screen bg-white">
      <div className="w-full max-w-2xl mx-auto min-h-screen bg-white relative">
        <AuthProvider>
          <PrendasProvider>
            <AppShell />
          </PrendasProvider>
        </AuthProvider>
      </div>
    </div>
  )
}
