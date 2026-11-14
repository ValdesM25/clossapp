interface SectionTitleProps {
  title: string
  subtitle?: string
  aside?: React.ReactNode
}

export function SectionTitle({ title, subtitle, aside }: SectionTitleProps) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h2 className="text-xs text-zinc-500 uppercase tracking-widest">{title}</h2>
        {subtitle && <p className="text-[13px] text-zinc-600 mt-1 leading-snug">{subtitle}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  )
}
