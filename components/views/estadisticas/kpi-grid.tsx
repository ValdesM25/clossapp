import { AnimatedNumber } from "@/components/shared/animated-number"

interface KpiGridProps {
  kpis: { value: number; label: string }[]
}

export function KpiGrid({ kpis }: KpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {kpis.map((stat) => (
        <div key={stat.label} className="border border-zinc-100 p-5">
          <p className="font-serif text-3xl text-zinc-900"><AnimatedNumber target={stat.value} /></p>
          <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest">{stat.label}</p>
        </div>
      ))}
    </div>
  )
}
