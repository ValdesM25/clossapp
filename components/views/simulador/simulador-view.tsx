"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Luggage } from "lucide-react"
import { pageProps } from "@/constants/animation"
import { useAuthContext } from "@/context/auth-context"
import { usePrendasContext } from "@/context/prendas-context"
import { useOutfits } from "@/hooks/use-outfits"
import { useCuotaIA } from "@/hooks/use-cuota-ia"
import { navegarA } from "@/lib/navegar"
import { OutfitForm } from "./outfit-form"
import { OutfitCard } from "./outfit-card"

export function SimuladorView({ onElegir }: { onElegir: () => void }) {
  const { userName, isGuest, plan } = useAuthContext()
  const { prendas } = usePrendasContext()

  const [ocasion, setOcasion] = useState("")
  const [clima, setClima] = useState("")
  const [destacada, setDestacada] = useState("")
  const [destacadaQuery, setDestacadaQuery] = useState("")
  const { outfits, generating, error: errorMsg, eligiendoIdx, elegidoIdx, generate, elegir, setElegidoIdx } = useOutfits(prendas, userName, isGuest)
  const { cuota, refrescar, esGratis } = useCuotaIA()
  const resultadosRef = useRef<HTMLElement>(null)

  // Al empezar a generar, la pantalla baja a donde van a aparecer los looks.
  useEffect(() => {
    if (generating) resultadosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [generating])

  async function handleGenerate() {
    await generate({ ocasion, clima, destacada })
    refrescar()
  }

  async function handleElegir(outfit: { titulo: string; prenda_ids: string[] }, idx: number) {
    await elegir(outfit, idx)
    setTimeout(() => { setElegidoIdx(null); onElegir() }, 2000)
  }

  return (
    <motion.div {...pageProps} className="flex flex-col gap-9 pb-36 pt-8">
      <header className="px-4">
        <h1 className="font-serif text-4xl text-zinc-900 leading-[1.05]">¿A dónde vas hoy?</h1>
        <p className="text-sm text-zinc-500 mt-3 leading-relaxed max-w-md">
          Dinos la ocasión y el clima. La IA arma 3 looks solo con ropa que ya tienes, pensando en tu estilo.
        </p>
      </header>

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
        errorMsg={errorMsg}
        onGenerate={handleGenerate}
        // Premium tiene un tope oculto de uso justo: solo el plan gratis ve contador.
        usoIA={esGratis && cuota ? `Outfits con IA hoy: ${cuota.outfitsHoy}/${cuota.outfitsDia} · Plan gratis` : null}
        agotado={esGratis && !!cuota && cuota.outfitsHoy >= cuota.outfitsDia}
        onVerPlanes={esGratis ? () => navegarA("planes") : undefined}
      />

      <button type="button" onClick={() => navegarA("planificacion")}
        className="mx-4 -my-4 self-start min-h-10 text-sm text-zinc-700 hover:text-zinc-900 flex items-center gap-2">
        <Luggage className="w-4 h-4" aria-hidden="true" />
        <span className="underline underline-offset-4">Planear varios días</span>
        {plan !== "elite" && (
          <span className="text-[11px] uppercase tracking-widest px-1.5 py-0.5 border border-zinc-300 text-zinc-600 no-underline">Elite</span>
        )}
      </button>

      <section ref={resultadosRef} aria-labelledby="looks-titulo" aria-busy={generating} className="flex flex-col gap-4 scroll-mt-6">
        <div className="px-4 flex items-baseline justify-between gap-3">
          <h2 id="looks-titulo" className="font-serif text-2xl text-zinc-900">Tus looks</h2>
          {outfits.length > 1 && <p className="text-xs text-zinc-500">Desliza para ver los {outfits.length}</p>}
        </div>

        {generating ? (
          <div className="flex gap-3 overflow-hidden px-4" aria-label="Armando tus looks">
            {[0, 1].map((i) => (
              <div key={i} className="shrink-0 w-[86%] sm:w-[23rem] border border-zinc-200 animate-pulse">
                <div className="aspect-[4/5] bg-zinc-100" />
                <div className="p-5 flex flex-col gap-3">
                  <div className="h-3 w-12 bg-zinc-100" />
                  <div className="h-6 w-2/3 bg-zinc-100" />
                  <div className="h-3 w-full bg-zinc-100" />
                  <div className="h-3 w-4/5 bg-zinc-100" />
                </div>
              </div>
            ))}
          </div>
        ) : outfits.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-2 scroll-px-4 [scrollbar-width:none] overscroll-x-contain">
            {outfits.map((outfit, i) => {
              const normalizedIds = outfit.prenda_ids.map((id) => String(id).trim())
              const outfitPrendas = prendas.filter((p) => normalizedIds.includes(String(p.id).trim()))
              return (
                <OutfitCard
                  key={i}
                  index={i}
                  total={outfits.length}
                  outfit={outfit}
                  outfitPrendas={outfitPrendas}
                  isElegido={elegidoIdx === i}
                  isEligiendo={eligiendoIdx === i}
                  onElegir={() => handleElegir(outfit, i)}
                />
              )
            })}
          </div>
        ) : (
          <div className="mx-4 border border-dashed border-zinc-300 p-5 flex flex-col gap-4">
            {prendas.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                {prendas.slice(0, 4).map((p) => (
                  <img key={p.id} src={p.image_url} alt="" loading="lazy" decoding="async" className="w-full aspect-[3/4] object-cover bg-zinc-100" />
                ))}
              </div>
            )}
            <p className="text-sm text-zinc-600 leading-relaxed">
              Aquí aparecen tus 3 looks, armados con estas prendas y el resto de tu armario.
            </p>
          </div>
        )}
      </section>
    </motion.div>
  )
}
