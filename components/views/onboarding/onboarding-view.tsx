"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { PASOS_ONBOARDING, type CampoOnboarding, type EstiloPerfil } from "@/constants/onboarding"

interface OnboardingViewProps {
  inicial: EstiloPerfil | null
  onTerminar: (estilo?: EstiloPerfil) => void
}

/** Recorrido de estilo: un paso por pantalla, "Saltar" siempre a mano. */
export function OnboardingView({ inicial, onTerminar }: OnboardingViewProps) {
  const [paso, setPaso] = useState(0)
  const [respuestas, setRespuestas] = useState<EstiloPerfil>(inicial ?? {})
  const actual = PASOS_ONBOARDING[paso]
  const esUltimo = paso === PASOS_ONBOARDING.length - 1
  const progreso = ((paso + 1) / PASOS_ONBOARDING.length) * 100

  function elegir(campo: CampoOnboarding, opcion: string) {
    setRespuestas((r) => {
      if (campo.tipo === "uno") {
        // Tocar la opción elegida la deselecciona.
        return { ...r, [campo.key]: r[campo.key] === opcion ? undefined : opcion }
      }
      const prev = (r[campo.key] as string[] | undefined) ?? []
      return { ...r, [campo.key]: prev.includes(opcion) ? prev.filter((o) => o !== opcion) : [...prev, opcion] }
    })
  }

  function siguiente() {
    if (esUltimo) onTerminar(respuestas)
    else setPaso((p) => p + 1)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-6 pt-6 pb-4 max-w-xl w-full mx-auto">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setPaso((p) => p - 1)} disabled={paso === 0}
            aria-label="Paso anterior"
            className="w-9 h-9 -ml-2 flex items-center justify-center text-zinc-500 hover:text-zinc-900 disabled:invisible">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest tabular-nums">
            Paso {paso + 1} de {PASOS_ONBOARDING.length}
          </p>
          <button type="button" onClick={() => onTerminar(Object.keys(respuestas).length ? respuestas : undefined)}
            className="text-xs text-zinc-500 hover:text-zinc-900 underline underline-offset-2">
            Saltar
          </button>
        </div>
        <div className="mt-4 h-0.5 bg-zinc-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progreso)}>
          <div className="h-full bg-zinc-900 transition-[width] duration-300" style={{ width: `${progreso}%` }} />
        </div>
      </header>

      <main className="flex-1 px-6 pb-32 max-w-xl w-full mx-auto">
        <AnimatePresence mode="wait">
          <motion.div key={paso}
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-8 pt-4">
            <div>
              <h1 className="font-serif text-2xl text-zinc-900">{actual.titulo}</h1>
              <p className="text-sm text-zinc-500 mt-1">{actual.subtitulo}</p>
            </div>

            {actual.campos.map((campo) => (
              <fieldset key={campo.key} className="flex flex-col gap-3">
                <legend className="text-xs text-zinc-500 uppercase tracking-widest mb-3">{campo.label}</legend>
                {campo.tipo === "texto" ? (
                  <Input value={(respuestas[campo.key] as string | undefined) ?? ""} placeholder={campo.placeholder}
                    maxLength={120} aria-label={campo.label}
                    onChange={(e) => setRespuestas((r) => ({ ...r, [campo.key]: e.target.value }))}
                    className="h-11 rounded-none border border-zinc-900 text-sm text-zinc-900 focus-visible:ring-0 focus-visible:border-zinc-900" />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {campo.opciones?.map((opcion) => {
                      const v = respuestas[campo.key]
                      const activo = Array.isArray(v) ? v.includes(opcion) : v === opcion
                      return (
                        <button key={opcion} type="button" aria-pressed={activo} onClick={() => elegir(campo, opcion)}
                          className={cn(
                            "min-h-10 px-4 text-xs tracking-wide border transition-colors flex items-center gap-1.5",
                            activo ? "bg-zinc-900 border-zinc-900 text-white" : "border-zinc-300 text-zinc-700 hover:border-zinc-500",
                          )}>
                          {activo && <Check className="w-3 h-3" aria-hidden="true" />}
                          {opcion}
                        </button>
                      )
                    })}
                  </div>
                )}
              </fieldset>
            ))}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-zinc-100 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-xl mx-auto">
          <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={siguiente}
            className="w-full h-11 bg-zinc-900 text-white text-sm font-medium tracking-wide">
            {esUltimo ? "Listo, ver mi armario" : "Siguiente"}
          </motion.button>
        </div>
      </footer>
    </div>
  )
}
