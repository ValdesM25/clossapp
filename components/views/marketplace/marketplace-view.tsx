"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Tag, ShoppingBag, ShieldCheck, SlidersHorizontal, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { PrendaSkeleton } from "@/components/shared/prenda-skeleton"
import { pageProps } from "@/constants/animation"
import { filterChips } from "@/constants/navigation"
import { useAuthContext } from "@/context/auth-context"
import { usePrendasContext } from "@/context/prendas-context"
import { useCartContext } from "@/context/cart-context"
import { useMarketplace } from "@/hooks/use-marketplace"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { fetchUserEscrowOrders } from "@/services/escrow.service"
import { esDePago } from "@/constants/planes"
import { EVENTO_PUBLICADA } from "@/hooks/use-ventas"
import type { PeticionVender } from "@/lib/navegar"
import type { Prenda } from "@/types"
import { MarketItemCard } from "./market-item-card"
import { ItemDetailModal } from "./item-detail-modal"
import { SellFormModal } from "./sell-form-modal"
import { VenderIntro } from "./vender-intro"
import { VenderView } from "./vender-view"
import { DonacionPanel } from "./donacion-panel"
import { CartDrawer } from "./cart-drawer"
import { EscrowCheckoutModal } from "./escrow-checkout-modal"
import { EscrowOrdersModal } from "./escrow-orders-modal"

/** Sin acentos ni mayúsculas: "Suéter" se encuentra escribiendo "sueter". */
const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

interface MarketplaceViewProps {
  onApartar: () => void
  /** Qué abrir al llegar (regreso de Stripe, push o prenda olvidada); se avisa con onAtendida para no repetirlo. */
  peticion?: PeticionVender | null
  onAtendida?: () => void
}

const CASO_RETORNO = { ok: "activa", revision: "en_revision", datos: "requiere_datos", error: "error" } as const

export function MarketplaceView({ onApartar, peticion, onAtendida }: MarketplaceViewProps) {
  const { userId, userEmail, isGuest, plan, cobrosEstado } = useAuthContext()
  // Esencial solo dona: comprar, vender y rentar es de Plus y Elite (la base también lo bloquea).
  const soloDonar = plan === "gratis"
  // Vender pide plan de pago y cuenta de cobro activa; si falta algo, el intro lo explica.
  const puedeVender = esDePago(plan) && cobrosEstado === "activa"
  const { prendas } = usePrendasContext()
  const { itemCount, setIsCartOpen, addToCart, clearCart } = useCartContext()
  const supabase = createBrowserSupabaseClient()

  const {
    marketTab, setMarketTab, activeFilter, setActiveFilter,
    items, rentaItems, loading, aparting, apartSuccess,
    sellMode, setSellMode, selling, rentaError,
    publish,
  } = useMarketplace(userId, isGuest)

  // Qué abrir al entrar al Shop; se decide una sola vez. Con una prenda elegida se va directo al
  // formulario; con "?vender=1" (push) al espacio del vendedor. Sin poder vender, al intro.
  const [inicio] = useState(() => {
    const ninguno = { capa: null, prenda: null, form: false }
    if (!peticion || peticion.verPrendaId) return ninguno
    if (peticion.retorno || !puedeVender) return { ...ninguno, capa: "intro" as const }
    if (peticion.prendaId) return { ...ninguno, prenda: prendas.find((p) => p.id === peticion.prendaId) ?? null, form: true }
    return { ...ninguno, capa: "vender" as const }
  })
  const [capa, setCapa] = useState<"intro" | "vender" | null>(inicio.capa)
  const [retorno, setRetorno] = useState(peticion?.retorno)
  const [prendaInicial, setPrendaInicial] = useState<Prenda | null>(inicio.prenda)
  const [selectedItem, setSelectedItem] = useState<Prenda | null>(null)
  const [showSellForm, setShowSellForm] = useState(inicio.form)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [showOrdersModal, setShowOrdersModal] = useState(false)
  const [escrowOrdersCount, setEscrowOrdersCount] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [verFiltros, setVerFiltros] = useState(false)

  useEffect(() => { if (peticion) onAtendida?.() }, [peticion, onAtendida])

  // Prenda publicada que se pidió ver (sugerencias de Planificación): se abre al llegar los items.
  const [verPrendaId, setVerPrendaId] = useState(peticion?.verPrendaId)
  useEffect(() => {
    if (!verPrendaId || loading) return
    const item = items.find((i) => i.id === verPrendaId)
    if (item) setSelectedItem(item)
    setVerPrendaId(undefined)
  }, [verPrendaId, loading, items])

  // Regreso de Stripe del pago de una compra (?pedido). El alta de cobros (?vender) la lee el dashboard.
  useEffect(() => {
    const pedido = new URLSearchParams(window.location.search).get("pedido")
    if (!pedido) return
    window.history.replaceState(window.history.state, "", window.location.pathname)
    if (pedido === "ok") {
      clearCart()
      setShowOrdersModal(true)
    }
    setAviso(
      pedido === "ok" ? "Listo, tu pago quedó en custodia. Recoge tus prendas con el QR de Mis Pedidos."
        : "No se completó el pago. Tus prendas siguen en el carrito.",
    )
  }, [clearCart])

  const loadEscrowOrdersCount = useCallback(async () => {
    try {
      const orders = await fetchUserEscrowOrders(supabase, userId, userEmail)
      const active = orders.filter((o) => o.status === "pago_en_custodia")
      setEscrowOrdersCount(active.length)
    } catch (err) {
      console.error(err)
    }
  }, [supabase, userId, userEmail])

  useEffect(() => {
    loadEscrowOrdersCount()

    const handleSync = () => loadEscrowOrdersCount()
    window.addEventListener("storage", handleSync)
    window.addEventListener("clossapp_escrow_updated", handleSync)

    const channel = supabase
      .channel("realtime:marketplace_escrow_count")
      .on("postgres_changes", { event: "*", schema: "public", table: "escrow_ordenes" }, () => {
        loadEscrowOrdersCount()
      })
      .subscribe()

    return () => {
      window.removeEventListener("storage", handleSync)
      window.removeEventListener("clossapp_escrow_updated", handleSync)
      supabase.removeChannel(channel)
    }
  }, [loadEscrowOrdersCount, supabase, showOrdersModal, showCheckoutModal])

  const currentItems = marketTab === "comprar" ? items : rentaItems
  const consulta = normalizar(busqueda.trim())
  const filtered = currentItems.filter((i) =>
    (activeFilter === "Todos" || i.category === activeFilter) &&
    (!consulta || normalizar(`${i.name} ${i.category} ${i.talla ?? ""}`).includes(consulta)))
  const isRenta = marketTab === "rentar"
  const isDonar = soloDonar || marketTab === "donar"
  const hayAcciones = !isDonar || (soloDonar && !isGuest)

  function cerrarBusqueda() {
    setBusqueda("")
    setBuscando(false)
  }
  const alternarBusqueda = () => (buscando ? cerrarBusqueda() : setBuscando(true))

  async function handleApartar(fechaRenta?: string) {
    if (selectedItem) {
      if (isRenta && fechaRenta) {
        addToCart(selectedItem, "renta", fechaRenta)
        setSelectedItem(null)
        setShowCheckoutModal(true)
      } else if (!isRenta) {
        addToCart(selectedItem, "compra")
        setSelectedItem(null)
        setShowCheckoutModal(true)
      }
    }
  }

  async function handlePublish(prenda: Prenda, precio: string, talla: string, estado: string) {
    const r = await publish(prenda, sellMode, precio, talla, estado)
    if (!r.error) {
      setAviso("Publicada. Ya aparece en el Shop")
      window.dispatchEvent(new Event(EVENTO_PUBLICADA))
    }
    return r
  }

  function abrirVender() {
    setRetorno(undefined)
    setCapa(puedeVender ? "vender" : "intro")
  }

  function abrirFormulario() {
    setSellMode("venta")
    setShowSellForm(true)
  }

  return (
    <motion.div {...pageProps} className="flex flex-col gap-6 pb-32 pt-8">
      <div className="flex flex-col gap-3">
        {/* "Shop" ya se lee en la barra de abajo: el título queda solo para lectores de pantalla. */}
        <h1 className="sr-only">{soloDonar ? "Donar" : "Marketplace"}</h1>

        {hayAcciones && (
          // flex-wrap: en celulares angostos los botones (con sus contadores) bajan a otra línea en vez de desbordar.
          <div className="px-4 flex flex-wrap items-center gap-2">
            {!isDonar && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowOrdersModal(true)}
                className="h-10 border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs px-3 flex items-center gap-1.5 font-medium shrink-0"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-600 shrink-0" aria-hidden="true" />
                <span>Pedidos</span>
                {escrowOrdersCount > 0 && (
                  <span className="bg-zinc-900 text-white font-bold text-[10px] px-1.5 rounded-full min-w-[16px] text-center">
                    {escrowOrdersCount}
                  </span>
                )}
              </motion.button>
            )}

            {!isDonar && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setIsCartOpen(true)}
                className="h-10 border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs px-3 flex items-center gap-1.5 font-medium shrink-0"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-zinc-600 shrink-0" aria-hidden="true" />
                <span>Carrito</span>
                {itemCount > 0 && (
                  <span className="bg-zinc-900 text-white font-bold text-[10px] px-1.5 rounded-full min-w-[16px] text-center">
                    {itemCount}
                  </span>
                )}
              </motion.button>
            )}

            {/* Acción principal. En el plan gratis también se ve: el intro le explica qué es vender y lo manda a Plus. */}
            {!isGuest && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={abrirVender}
                className="ml-auto h-10 bg-zinc-900 hover:bg-zinc-800 text-white text-xs px-4 flex items-center gap-1.5 font-medium tracking-wide shrink-0"
              >
                <Tag className="w-3.5 h-3.5" aria-hidden="true" /> Vender
              </motion.button>
            )}
          </div>
        )}

        {aviso && (
          <p role="status" className="mx-4 border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-700">{aviso}</p>
        )}

        {soloDonar ? (
          <div className="mx-4 border border-zinc-200 bg-zinc-50 px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-600 leading-relaxed">Comprar, vender y rentar prendas es parte de Plus. Con tu plan puedes donar y ganar puntos.</p>
            <button type="button" onClick={() => window.location.assign("/planes?plan=plus")}
              className="shrink-0 h-10 px-3 border border-zinc-900 text-zinc-900 text-xs font-medium">Ver Plus</button>
          </div>
        ) : (
          <div data-tour="marketplace" className="px-4 flex items-stretch border-b border-zinc-200">
            {(["comprar", "rentar", "donar"] as const).map((tab) => (
              <button key={tab} onClick={() => { setMarketTab(tab); setActiveFilter("Todos") }}
                className={cn("flex-1 py-2.5 text-xs font-medium tracking-widest uppercase transition-colors border-b-2 -mb-px",
                  marketTab === tab ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500")}>
                {tab === "comprar" ? "Comprar" : tab === "rentar" ? "Rentar" : "Donar"}
              </button>
            ))}
            {!isDonar && (
              <div className="flex items-center -mr-2">
                <button type="button" onClick={alternarBusqueda} aria-label="Buscar" aria-expanded={buscando} aria-controls="shop-busqueda"
                  className={cn("w-10 h-10 flex items-center justify-center", buscando || busqueda ? "text-zinc-900" : "text-zinc-500")}>
                  <Search className="w-4 h-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setVerFiltros((v) => !v)} aria-label="Filtros" aria-expanded={verFiltros} aria-controls="shop-filtros"
                  className={cn("relative w-10 h-10 flex items-center justify-center", verFiltros || activeFilter !== "Todos" ? "text-zinc-900" : "text-zinc-500")}>
                  <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                  {/* Con el panel cerrado, el punto avisa que hay una categoría elegida. */}
                  {activeFilter !== "Todos" && <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-zinc-900" aria-hidden="true" />}
                </button>
              </div>
            )}
          </div>
        )}

        {!isDonar && buscando && (
          <div id="shop-busqueda" className="px-4 relative">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" aria-hidden="true" />
            <Input autoFocus value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") cerrarBusqueda() }}
              enterKeyHint="search" aria-label="Buscar prendas" placeholder="Nombre, categoría o talla"
              className="pl-10 pr-11 rounded-none border-zinc-200 focus-visible:ring-0 focus-visible:border-zinc-900 text-zinc-700 placeholder:text-zinc-500" />
            <button type="button" onClick={cerrarBusqueda} aria-label="Cerrar búsqueda"
              className="absolute right-4 top-0 w-10 h-full flex items-center justify-center text-zinc-500 hover:text-zinc-900">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {!isDonar && verFiltros && (
          <div id="shop-filtros" className="flex gap-2 overflow-x-auto pb-1 px-4">
            {filterChips.map((f) => (
              <motion.button key={f} whileTap={{ scale: 0.96 }} onClick={() => setActiveFilter(f)}
                className={cn("shrink-0 px-4 py-1.5 text-xs tracking-wide border transition-colors",
                  activeFilter === f ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-200 text-zinc-600")}>
                {f}
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {isDonar ? (
        <DonacionPanel prendas={prendas} isGuest={isGuest} />
      ) : (
        <>
          {loading ? <PrendaSkeleton /> : filtered.length === 0 ? (
            <div className="mx-4 flex flex-col items-center justify-center py-12 gap-2 border border-zinc-100">
              <p className="text-xs text-zinc-500 uppercase tracking-widest">{consulta ? "Nada coincide con tu búsqueda" : "Sin prendas disponibles"}</p>
            </div>
          ) : (
            <div className="columns-2 gap-3 px-4 space-y-3">
              {filtered.map((item, i) => (
                <MarketItemCard key={item.id} item={item} i={i} isRenta={isRenta} onClick={() => setSelectedItem(item)} />
              ))}
            </div>
          )}
        </>
      )}

      <ItemDetailModal
        item={selectedItem}
        isRenta={isRenta}
        apartSuccess={apartSuccess}
        aparting={aparting}
        isGuest={isGuest}
        onClose={() => { setSelectedItem(null) }}
        onApartar={handleApartar}
      />

      <SellFormModal
        open={showSellForm}
        onClose={() => { setShowSellForm(false); setPrendaInicial(null) }}
        prendas={prendas}
        prendaInicial={prendaInicial}
        sellMode={sellMode}
        setSellMode={setSellMode}
        selling={selling}
        rentaError={rentaError}
        onPublish={handlePublish}
      />

      {capa === "intro" && (
        <VenderIntro
          caso={soloDonar ? "gratis" : retorno ? CASO_RETORNO[retorno] : cobrosEstado}
          pasoInicial={retorno ? 3 : 1}
          onCerrar={() => setCapa(null)}
          onPublicar={() => { setCapa(null); abrirFormulario() }}
        />
      )}

      {capa === "vender" && (
        <VenderView onPublicar={abrirFormulario} onCerrar={() => setCapa(null)} aviso={aviso} bloqueada={showSellForm} />
      )}

      <CartDrawer
        onCheckout={() => setShowCheckoutModal(true)}
        onOpenOrders={() => setShowOrdersModal(true)}
      />

      <EscrowCheckoutModal
        open={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        onOrderCreated={() => {
          setShowCheckoutModal(false)
          setShowOrdersModal(true)
        }}
      />

      <EscrowOrdersModal
        open={showOrdersModal}
        onClose={() => setShowOrdersModal(false)}
      />
    </motion.div>
  )
}

