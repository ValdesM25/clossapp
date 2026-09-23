"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Tag, ShoppingBag, ShieldCheck, PackageCheck } from "lucide-react"
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
import type { Prenda } from "@/types"
import { MarketItemCard } from "./market-item-card"
import { ItemDetailModal } from "./item-detail-modal"
import { SellFormModal } from "./sell-form-modal"
import { DonacionPanel } from "./donacion-panel"
import { CartDrawer } from "./cart-drawer"
import { EscrowCheckoutModal } from "./escrow-checkout-modal"
import { EscrowOrdersModal } from "./escrow-orders-modal"

interface MarketplaceViewProps {
  onApartar: () => void
}

export function MarketplaceView({ onApartar }: MarketplaceViewProps) {
  const { userId, userEmail, isGuest } = useAuthContext()
  const { prendas } = usePrendasContext()
  const { itemCount, setIsCartOpen, addToCart } = useCartContext()
  const supabase = createBrowserSupabaseClient()

  const {
    marketTab, setMarketTab, activeFilter, setActiveFilter,
    items, rentaItems, loading, aparting, apartSuccess,
    sellMode, setSellMode, selling, rentaError,
    apartar, publish,
  } = useMarketplace(userId, isGuest)

  const [selectedItem, setSelectedItem] = useState<Prenda | null>(null)
  const [showSellForm, setShowSellForm] = useState(false)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [showOrdersModal, setShowOrdersModal] = useState(false)
  const [escrowOrdersCount, setEscrowOrdersCount] = useState(0)

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
  const filtered = activeFilter === "Todos" ? currentItems : currentItems.filter((i) => i.category === activeFilter)
  const isRenta = marketTab === "rentar"
  const isDonar = marketTab === "donar"

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
      } else {
        const ok = await apartar(selectedItem, "comprar", fechaRenta)
        if (ok) {
          setTimeout(() => setSelectedItem(null), 2000)
          onApartar()
        }
      }
    }
  }

  async function handlePublish(prenda: Prenda, precio: string, talla: string, estado: string) {
    await publish(prenda, sellMode, precio, talla, estado)
  }

  return (
    <motion.div {...pageProps} className="flex flex-col gap-6 pb-32 pt-8">
      <div className="px-4 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Descubre</p>
          <h1 className="font-serif text-2xl text-zinc-900 mt-0.5">Marketplace</h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Botón Mis Pedidos (para Comprar y Rentar) */}
          {(marketTab === "comprar" || marketTab === "rentar") && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowOrdersModal(true)}
              className="border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs px-2 sm:px-2.5 py-1.5 flex items-center gap-1 font-medium rounded shrink-0 relative"
              title="Ver mis pedidos"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[11px] sm:text-xs">Mis Pedidos</span>
              {escrowOrdersCount > 0 && (
                <span className="bg-emerald-500 text-zinc-950 font-bold text-[10px] px-1.5 py-0.2 rounded-full min-w-[16px] text-center">
                  {escrowOrdersCount}
                </span>
              )}
            </motion.button>
          )}

          {/* Botón Carrito de Compras/Rentas (para Comprar y Rentar) */}
          {(marketTab === "comprar" || marketTab === "rentar") && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsCartOpen(true)}
              className="bg-zinc-900 text-white text-xs px-2.5 sm:px-3 py-1.5 flex items-center gap-1.5 font-medium rounded shadow-xs relative shrink-0"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Carrito</span>
              {itemCount > 0 && (
                <span className="bg-emerald-500 text-zinc-950 font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center -mr-1">
                  {itemCount}
                </span>
              )}
            </motion.button>
          )}

          {!isGuest && !isDonar && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { setShowSellForm(true); setSellMode("venta") }}
              className="border border-zinc-900 text-zinc-900 text-xs px-2.5 sm:px-3 py-1.5 flex items-center gap-1 tracking-wide rounded shrink-0"
            >
              <Tag className="w-3 h-3" /> <span className="hidden xs:inline">Publicar</span>
            </motion.button>
          )}
        </div>
      </div>

      <div className="px-4 flex border-b border-zinc-200">
        {(["comprar", "rentar", "donar"] as const).map((tab) => (
          <button key={tab} onClick={() => { setMarketTab(tab); setActiveFilter("Todos") }}
            className={cn("flex-1 py-2.5 text-xs font-medium tracking-widest uppercase transition-colors border-b-2 -mb-px",
              marketTab === tab ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400")}>
            {tab === "comprar" ? "Comprar" : tab === "rentar" ? "Rentar" : "Donar"}
          </button>
        ))}
      </div>

      {isDonar ? (
        <DonacionPanel prendas={prendas} isGuest={isGuest} />
      ) : (
        <>
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
        onClose={() => setShowSellForm(false)}
        prendas={prendas}
        sellMode={sellMode}
        setSellMode={setSellMode}
        selling={selling}
        rentaError={rentaError}
        onPublish={handlePublish}
      />

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

