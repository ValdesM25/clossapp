"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles } from "lucide-react"
import { pageProps } from "@/constants/animation"
import { useAuthContext } from "@/context/auth-context"
import { usePrendasContext } from "@/context/prendas-context"
import { useOutfits } from "@/hooks/use-outfits"
import type { Prenda } from "@/types"
import { OutfitForm } from "./outfit-form"
import { OutfitCard } from "./outfit-card"

export function SimuladorView({ onElegir }: { onElegir: () => void }) {
  const { userId, userName, isGuest } = useAuthContext()
  const { prendas } = usePrendasContext()

  const [ocasion, setOcasion] = useState("")
  const [clima, setClima] = useState("")
  const [destacada, setDestacada] = useState("")
  const [destacadaQuery, setDestacadaQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const { outfits, generating, error: errorMsg, eligiendoIdx, elegidoIdx, generate, elegir, setElegidoIdx } = useOutfits(prendas, userId, userName, isGuest)

  const suggestions = destacadaQuery.length > 0
    ? prendas.filter((p) => p.name.toLowerCase().includes(destacadaQuery.toLowerCase())).slice(0, 5)
    : []

  async function handleGenerate() {
    await generate({ ocasion, clima, destacada })
  }

  async function handleElegir(outfit: { titulo: string; prenda_ids: string[] }, idx: number) {
    await elegir(outfit, idx)
    setTimeout(() => { setElegidoIdx(null); onElegir() }, 2000)
  }

  return (
    <motion.div {...pageProps} className="flex flex-col gap-8 pb-32 pt-8">
      <div className="px-4">
        <p className="text-xs text-zinc-400 uppercase tracking-widest">IA Stylist</p>
        <h1 className="font-serif text-2xl text-zinc-900 mt-0.5">Simulador de Outfit</h1>
      </div>

      <OutfitForm
        prendas={prendas}
        isGuest={isGuest}
        generating={generating}
        ocasion={ocasion}
        setOcasion={setOcasion}
        clima={clima}
        setClima={setClima}
        destacada={destacada}
        destacadaQuery={destacadaQuery}
        setDestacadaQuery={setDestacadaQuery}
        setDestacada={setDestacada}
        showSuggestions={showSuggestions}
        setShowSuggestions={setShowSuggestions}
        suggestions={suggestions}
        errorMsg={errorMsg}
        onGenerate={handleGenerate}
      />

      <AnimatePresence>
        {outfits.length > 0 && (
          <section className="px-4 flex flex-col gap-6">
            <p className="text-xs text-zinc-400 uppercase tracking-widest">Propuestas</p>
            {outfits.map((outfit, i) => {
              const normalizedIds = outfit.prenda_ids.map((id) => String(id).trim())
              const outfitPrendas = prendas.filter((p) => normalizedIds.includes(String(p.id).trim()))
              const isElegido = elegidoIdx === i
              const isEligiendo = eligiendoIdx === i

              return (
                <OutfitCard
                  key={i}
                  index={i}
                  outfit={outfit}
                  outfitPrendas={outfitPrendas}
                  isElegido={isElegido}
                  isEligiendo={isEligiendo}
                  isGuest={isGuest}
                  onElegir={() => handleElegir(outfit, i)}
                />
              )
            })}
          </section>
        )}
      </AnimatePresence>

      {outfits.length === 0 && !generating && (
        <div className="mx-4 flex flex-col items-center justify-center py-12 gap-2 border border-zinc-100">
          <Sparkles className="w-5 h-5 text-zinc-300" />
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Configura y genera propuestas</p>
        </div>
      )}
    </motion.div>
  )
}
