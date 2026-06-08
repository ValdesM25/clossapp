export function PrendaSkeleton() {
  return (
    <div className="columns-2 gap-3 space-y-3">
      {[180, 140, 160, 180, 140, 160].map((h, i) => (
        <div key={i} className="break-inside-avoid overflow-hidden bg-zinc-100 mb-3 animate-pulse">
          <div className="bg-zinc-200" style={{ height: h }} />
          <div className="p-3 space-y-1.5">
            <div className="h-3 bg-zinc-200 rounded w-3/4" />
            <div className="h-2.5 bg-zinc-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
