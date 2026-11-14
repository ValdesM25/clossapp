"use client"

import { motion } from "framer-motion"
import { pageProps } from "@/constants/animation"
import { useAuthContext } from "@/context/auth-context"
import { useStats } from "@/hooks/use-stats"
import type { StatsResult } from "@/services/stats.service"
import type { PrendaExt } from "@/types"
import { HealthRing } from "./health-ring"
import { KpiGrid, type Kpi } from "./kpi-grid"
import { InsightsList } from "./insights-list"
import { RotationBar } from "./rotation-bar"
import { CategoryBars } from "./category-bars"
import { ColorPalette } from "./color-palette"
import { TopPrendasList } from "./top-prendas-list"
import { ForgottenPrendasList } from "./forgotten-prendas-list"
import { formatoMoneda } from "./formato"

interface EstadisticasViewProps {
  onSellPrenda: (p: PrendaExt) => void
}

function armarKpis(s: StatsResult): Kpi[] {
  const promedio = s.total ? s.usos / s.total : 0
  const kpis: Kpi[] = [
    { value: s.total, label: "Prendas", hint: s.rotacion.nueva ? `${s.rotacion.nueva} nuevas este mes` : "En tu armario" },
    { value: s.usos, label: "Usos registrados", hint: s.total ? `${promedio.toFixed(1)} por prenda en promedio` : undefined },
    { value: s.outfits, label: "Outfits creados", hint: "Con el simulador" },
  ]
  // Costo por uso solo existe si alguna prenda tiene precio de compra; si no, lo que está a la venta.
  if (s.costoPorUso !== null) {
    kpis.push({ value: s.costoPorUso, label: "Costo por uso", format: formatoMoneda,
      hint: `Promedio de ${s.conCompra} ${s.conCompra === 1 ? "prenda" : "prendas"} con precio` })
  } else {
    kpis.push({ value: s.valorEnVenta, label: "Valor en venta", format: formatoMoneda,
      hint: s.enVenta ? `${s.enVenta} ${s.enVenta === 1 ? "prenda publicada" : "prendas publicadas"}` : "Nada publicado aún" })
  }
  return kpis
}

function Esqueleto() {
  return (
    <div className="flex flex-col gap-8 px-4 animate-pulse" aria-label="Cargando estadísticas">
      <div className="h-[172px] bg-zinc-100" />
      <div className="grid grid-cols-2 gap-px">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-[96px] bg-zinc-100" />)}
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-3 w-24 bg-zinc-100" />
        <div className="h-11 bg-zinc-100" />
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-6 bg-zinc-100" style={{ width: `${90 - i * 15}%` }} />)}
      </div>
    </div>
  )
}

export function EstadisticasView({ onSellPrenda }: EstadisticasViewProps) {
  const { userId, userName, isGuest } = useAuthContext()
  const { stats, loading, error, refresh } = useStats(userId, userName, isGuest)

  return (
    <motion.div {...pageProps} className="flex flex-col gap-10 pb-32 pt-8">
      <div className="px-4">
        <h1 className="font-serif text-2xl text-zinc-900">Estadísticas</h1>
        <p className="text-xs text-zinc-500 mt-1">Cómo usas tu armario y qué puedes hacer con lo que no.</p>
      </div>

      {loading && !stats ? (
        <Esqueleto />
      ) : error && !stats ? (
        <div className="mx-4 border border-zinc-100 p-6 text-center">
          <p className="text-sm text-zinc-900">No pudimos cargar tus estadísticas.</p>
          <button onClick={refresh} className="mt-3 text-xs border border-zinc-900 px-4 py-2 tracking-wide">Reintentar</button>
        </div>
      ) : stats ? (
        <>
          <div data-tour="estadisticas" className="flex flex-col gap-4">
            <HealthRing salud={stats.salud} total={stats.total} />
            <KpiGrid kpis={armarKpis(stats)} />
          </div>
          <InsightsList insights={stats.insights} />
          <RotationBar rotacion={stats.rotacion} prendas={stats.prendas} />
          <TopPrendasList prendas={stats.topPrendas} />
          <CategoryBars categorias={stats.categorias} />
          <ColorPalette colores={stats.colores} sinColor={stats.sinColor} />
          <ForgottenPrendasList prendas={stats.olvidadas} totalDormidas={stats.totalOlvidadas}
            isGuest={isGuest} onSell={onSellPrenda} />
        </>
      ) : null}
    </motion.div>
  )
}
