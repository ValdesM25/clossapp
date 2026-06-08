import type { Prenda } from "@/types"

interface OutfitFormProps {
  prendas: Prenda[]
  isGuest: boolean
  generating: boolean
  ocasion: string
  setOcasion: (v: string) => void
  clima: string
  setClima: (v: string) => void
  destacada: string
  destacadaQuery: string
  setDestacadaQuery: (v: string) => void
  setDestacada: (v: string) => void
  showSuggestions: boolean
  setShowSuggestions: (v: boolean) => void
  suggestions: Prenda[]
  errorMsg: string | null
  onGenerate: () => void
}

export function OutfitForm({
  prendas, isGuest, generating, ocasion, setOcasion, clima, setClima,
  destacada, destacadaQuery, setDestacadaQuery, setDestacada,
  showSuggestions, setShowSuggestions, suggestions, errorMsg, onGenerate,
}: OutfitFormProps) {
  return (
    <div className="mx-4 border border-zinc-200 p-5 flex flex-col gap-4">
      {/* Ocasión */}
      <div>
        <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1.5 block">Ocasión</label>
        <div className="flex flex-wrap gap-2">
          {["Casual", "Oficina", "Cena", "Formal", "Deporte"].map((o) => (
            <button key={o} onClick={() => setOcasion(o === ocasion ? "" : o)}
              className={`text-xs px-3 py-1.5 border tracking-wide transition-colors ${
                ocasion === o ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-200 text-zinc-600"
              }`}>
              {o}
            </button>
          ))}
        </div>
      </div>

      {/* Clima */}
      <div>
        <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1.5 block">Clima</label>
        <div className="flex flex-wrap gap-2">
          {["Frío", "Templado", "Calor", "Lluvia"].map((c) => (
            <button key={c} onClick={() => setClima(c === clima ? "" : c)}
              className={`text-xs px-3 py-1.5 border tracking-wide transition-colors ${
                clima === c ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-200 text-zinc-600"
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Prenda destacada — autocomplete */}
      <div className="relative">
        <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1.5 block">
          Prenda a destacar (opcional)
        </label>
        <input
          value={destacadaQuery}
          onChange={(e) => { setDestacadaQuery(e.target.value); setDestacada(e.target.value); setShowSuggestions(true) }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Busca una prenda..."
          className="w-full h-9 rounded-none border border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm px-3"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-zinc-200 border-t-0 z-20 shadow-sm">
            {suggestions.map((p) => (
              <button key={p.id} onMouseDown={() => { setDestacada(p.name); setDestacadaQuery(p.name); setShowSuggestions(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 text-left">
                {p.image_url && <img src={p.image_url} alt={p.name} className="w-7 h-7 object-cover shrink-0" />}
                <span className="text-xs text-zinc-700">{p.name}</span>
                <span className="text-[10px] text-zinc-400 ml-auto">{p.category}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {errorMsg && <p className="text-xs text-zinc-500">{errorMsg}</p>}

      <button onClick={onGenerate}
        disabled={generating || isGuest || (!isGuest && prendas.length === 0)}
        className={`w-full py-3 text-sm font-medium tracking-widest uppercase flex items-center justify-center gap-2 ${
          isGuest
            ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
            : "bg-zinc-900 text-white disabled:opacity-40"
        }`}>
        {generating
          ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Diseñando propuestas...</>
          : isGuest
            ? <><span className="text-lg">🔒</span>Inicia sesión para usar IA</>
            : "Generar Propuestas"}
      </button>

      {!isGuest && prendas.length === 0 && (
        <p className="text-[10px] text-zinc-400 text-center">Sube prendas a tu armario primero</p>
      )}
    </div>
  )
}
