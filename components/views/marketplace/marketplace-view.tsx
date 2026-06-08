"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { PrendaSkeleton } from "@/components/shared/prenda-skeleton"
import { pageProps } from "@/constants/animation"
import { filterChips } from "@/constants/navigation"
import { useAuthContext } from "@/context/auth-context"
import { usePrendasContext } from "@/context/prendas-context"
import { useMarketplace } from "@/hooks/use-marketplace"
import type { Prenda } from "@/types"
import { MarketItemCard } from "./market-item-card"
import { ItemDetailModal } from "./item-detail-modal"
import { SellFormModal } from "./sell-form-modal"

interface MarketplaceViewProps {
  onApartar: () => void
}

export function MarketplaceView({ onApartar }: MarketplaceViewProps) {
  const { userId, isGuest } = useAuthContext()
  const { prendas } = usePrendasContext()
  const {
    marketTab, setMarketTab, activeFilter, setActiveFilter,
    items, rentaItems, loading, aparting, apartSuccess,
    sellMode, setSellMode, selling, rentaError,
    apartar, publish,
  } = useMarketplace(userId, isGuest)

  const [selectedItem, setSelectedItem] = useState<Prenda | null>(null)
  const [showSellForm, setShowSellForm] = useState(false)

  const currentItems = marketTab === "comprar" ? items : rentaItems
  const filtered = activeFilter === "Todos" ? currentItems : currentItems.filter((i) => i.category === activeFilter)
  const isRenta = marketTab === "rentar"

  async function handleApartar(fechaRenta?: string) {
    const ok = await apartar(selectedItem!, isRenta ? "rentar" : "comprar", fechaRenta)
    if (ok) {
      setTimeout(() => setSelectedItem(null), 2000)
      onApartar()
    }
  }

  async function handlePublish(prenda: Prenda, precio: string, talla: string, estado: string) {
    await publish(prenda, sellMode, precio, talla, estado)
  }

  return (
    <motion.div {...pageProps} className="flex flex-col gap-6 pb-32 pt-8">
      <div className="px-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Descubre</p>
          <h1 className="font-serif text-2xl text-zinc-900 mt-0.5">Marketplace</h1>
        </div>
        {!isGuest && (
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setShowSellForm(true); setSellMode("venta") }}
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
            <MarketItemCard key={item.id} item={item} i={i} isRenta={isRenta} onClick={() => setSelectedItem(item)} />
          ))}
        </div>
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
    </motion.div>
  )
}
