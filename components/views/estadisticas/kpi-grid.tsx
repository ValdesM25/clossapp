import { AnimatedNumber } from "@/components/shared/animated-number"

export interface Kpi {
  value: number
  label: string
  /** Una línea de contexto debajo del número. */
  hint?: string
  format?: (n: number) => string
}

interface KpiGridProps {
  kpis: Kpi[]
}

export function KpiGrid({ kpis }: KpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-px bg-zinc-100 border border-zinc-100 mx-4">
      {kpis.map((stat) => (
        <div key={stat.label} className="bg-white p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{stat.label}</p>
          <p className="font-serif text-3xl text-zinc-900 mt-1.5 leading-none">
            <AnimatedNumber target={stat.value} format={stat.format} />
          </p>
          {stat.hint && <p className="text-[11px] text-zinc-500 mt-1.5 leading-snug">{stat.hint}</p>}
        </div>
      ))}
    </div>
  )
}
