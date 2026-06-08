import type { ReactNode } from "react"

export function PageHeader({ subtitle, title, rightSlot }: { subtitle: string; title: string; rightSlot?: ReactNode }) {
  return (
    <div className="px-4 flex items-center justify-between">
      <div>
        <p className="text-xs text-zinc-400 uppercase tracking-widest">{subtitle}</p>
        <h1 className="font-serif text-2xl text-zinc-900 mt-0.5">{title}</h1>
      </div>
      {rightSlot}
    </div>
  )
}
