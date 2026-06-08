"use client"

import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { pageProps } from "@/constants/animation"
import { GUEST_PRENDAS } from "@/constants/demo-data"
import { useAuthContext } from "@/context/auth-context"
import { useStats } from "@/hooks/use-stats"
import type { PrendaExt } from "@/types"
import { KpiGrid } from "./kpi-grid"
import { TopPrendasList } from "./top-prendas-list"
import { ForgottenPrendasList } from "./forgotten-prendas-list"

interface EstadisticasViewProps {
  onSellPrenda: (p: PrendaExt) => void
}

export function EstadisticasView({ onSellPrenda }: EstadisticasViewProps) {
  const { userId, userName, isGuest } = useAuthContext()
  const { stats, topPrendas, olvidadas, loading } = useStats(userId, userName, isGuest)

  function fmt(iso?: string | null) {
    if (!iso) return "Nunca usado"
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
    if (d === 0) return "Hoy"
    if (d === 1) return "Ayer"
    if (d < 30) return `hace ${d} días`
    if (d < 365) return `hace ${Math.floor(d / 30)} meses`
    return `hace ${Math.floor(d / 365)} años`
  }

  const kpis = isGuest
    ? [{ value: 6, label: "Total Prendas" }, { value: 14, label: "Usos este mes" }, { value: 3, label: "Outfits creados" }, { value: 1, label: "Sin usar (6m)" }]
    : [{ value: stats.total, label: "Total Prendas" }, { value: stats.usos, label: "Usos este mes" }, { value: stats.outfits, label: "Outfits creados" }, { value: stats.sinUsar, label: "Sin usar (6m)" }]

  return (
    <motion.div {...pageProps} className="flex flex-col gap-8 pb-32 pt-8">
      <div className="px-4">
        <p className="text-xs text-zinc-400 uppercase tracking-widest">Insights</p>
        <h1 className="font-serif text-2xl text-zinc-900 mt-0.5">Estadísticas</h1>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-zinc-400 animate-spin" /></div>
      ) : (
        <>
          <KpiGrid kpis={kpis} />
          <TopPrendasList prendas={(isGuest ? GUEST_PRENDAS.slice(0, 3) : topPrendas) as PrendaExt[]} isGuest={isGuest} formatDate={fmt} />
          <ForgottenPrendasList prendas={(isGuest ? [] : olvidadas) as PrendaExt[]} isGuest={isGuest} onSell={onSellPrenda} formatDate={fmt} />
        </>
      )}
    </motion.div>
  )
}
