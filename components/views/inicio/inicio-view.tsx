"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Sparkles, Sun, Clock, Tag, HeartHandshake, Check, ArrowRight, RefreshCw, Shirt } from "lucide-react"
import { cn } from "@/lib/utils"
import { pageProps } from "@/constants/animation"
import { useAuthContext } from "@/context/auth-context"
import { usePrendasContext } from "@/context/prendas-context"
import { UserAvatarMenu } from "@/components/shared/user-avatar-menu"
import { GUEST_PRENDAS } from "@/constants/demo-data"
import type { View, Prenda } from "@/types"

interface InicioViewProps {
  onNavigate?: (v: View) => void
}

export function InicioView({ onNavigate }: InicioViewProps) {
  const { userName, isGuest } = useAuthContext()
  const { prendas } = usePrendasContext()
  const [wornToday, setWornToday] = useState(false)

  // Usar prendas del contexto o las prendas de prueba (filtrando duplicados por nombre)
  const rawPrendas = prendas.length > 0 ? prendas : GUEST_PRENDAS
  const seenNames = new Set<string>()
  const userPrendas: Prenda[] = rawPrendas.filter((p) => {
    const key = (p.name || "").trim().toLowerCase()
    if (!key) return true
    if (seenNames.has(key)) return false
    seenNames.add(key)
    return true
  })

  // 1. Outfit recomendado del día
  const dailyOutfitPrendas = userPrendas.slice(0, 3)

  // 2. Prendas que no se han utilizado en un tiempo (baja frecuencia o 0 usos)
  const olvidadasPrendas = userPrendas.length > 3 ? userPrendas.slice(3, 12) : userPrendas.slice(0, 9)

  // 3. Prendas utilizadas seguido (recomendadas para venta o donación)
  const frecuentesPrendas = userPrendas.slice(0, 4)

  function handleUsarOutfit() {
    setWornToday(true)
    setTimeout(() => setWornToday(false), 3000)
  }

  return (
    <motion.div {...pageProps} className="flex flex-col gap-9 pb-36 px-4 pt-8">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Bienvenida</p>
          <h1 className="font-serif text-2xl text-zinc-900 mt-0.5">{userName}</h1>
          {isGuest && (
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest border border-zinc-200 px-2 py-0.5 mt-1 inline-block">
              Modo Invitado
            </span>
          )}
        </div>
        <UserAvatarMenu />
      </div>

      {/* SECCIÓN 1: RECOMENDACIÓN DE OUTFIT PARA EL DÍA DE HOY */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-widest">Soleado 24°C · Outfit del Día</p>
          </div>
          <button
            onClick={() => onNavigate?.("simulador")}
            className="text-xs text-zinc-600 hover:text-zinc-900 underline flex items-center gap-1"
          >
            Ver en Outfit <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="border border-zinc-900 bg-zinc-900 text-white p-6 relative overflow-hidden shadow-lg">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 bg-white/10 text-zinc-300 border border-white/10">
                Sugerencia IA de Hoy
              </span>
              <h2 className="font-serif text-xl text-white mt-2">Casual Chic Contemporáneo</h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-md leading-relaxed">
                Combinación ligera y cómoda ideal para el clima templado de hoy.
              </p>
            </div>
            <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
          </div>

          {/* Prendas que componen el outfit */}
          <div className="grid grid-cols-3 gap-3 my-4 relative z-10">
            {dailyOutfitPrendas.map((p) => (
              <div key={p.id} className="group relative bg-white/5 border border-white/10 overflow-hidden">
                <img src={p.image_url} alt={p.name} className="w-full h-24 object-cover group-hover:scale-105 transition-transform" />
                <div className="p-2 bg-zinc-900/90">
                  <p className="text-[11px] font-medium text-white truncate">{p.name}</p>
                  <p className="text-[9px] text-zinc-400 truncate">{p.category}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2 relative z-10">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleUsarOutfit}
              className={cn(
                "flex-1 py-2.5 text-xs font-medium tracking-wide flex items-center justify-center gap-2 transition-colors",
                wornToday ? "bg-emerald-600 text-white" : "bg-white text-zinc-900 hover:bg-zinc-100"
              )}
            >
              {wornToday ? <Check className="w-4 h-4" /> : <Shirt className="w-4 h-4" />}
              {wornToday ? "¡Registrado como usado hoy!" : "Vestir este outfit hoy"}
            </motion.button>
          </div>
        </div>
      </section>

      {/* SECCIÓN 2: PRENDAS QUE NO SE HAN UTILIZADO EN UN TIEMPO */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-500" />
            <h2 className="font-serif text-lg text-zinc-900">Prendas Olvidadas</h2>
          </div>
          <button
            onClick={() => onNavigate?.("armario")}
            className="text-xs text-zinc-500 hover:text-zinc-900 underline"
          >
            Ver armario
          </button>
        </div>
        <p className="text-xs text-zinc-500 -mt-2">
          Llevan tiempo en el guardarropa sin utilizar. ¡Es buen momento para darles una nueva oportunidad!
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
          {olvidadasPrendas.map((p, idx) => {
            const diasOlvidados = (idx + 1) * 18 + 12
            return (
              <div key={p.id} className="border border-zinc-200 bg-white p-3 flex flex-col justify-between relative group">
                <span className="absolute top-2 right-2 text-[9px] uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 font-mono">
                  {diasOlvidados} días sin usar
                </span>
                <div>
                  <div className="w-full h-32 overflow-hidden mb-2 bg-zinc-100">
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <p className="text-xs font-serif text-zinc-900 truncate">{p.name}</p>
                  <p className="text-[10px] text-zinc-400">{p.category}</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onNavigate?.("simulador")}
                  className="w-full mt-3 py-1.5 border border-zinc-900 text-zinc-900 text-[11px] font-medium tracking-wide flex items-center justify-center gap-1 hover:bg-zinc-900 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Usar hoy
                </motion.button>
              </div>
            )
          })}
        </div>
      </section>

      {/* SECCIÓN 3: PRENDAS USADAS SEGUIDO (RECOMENDADAS PARA DONACIÓN O VENTA) */}
      <section className="flex flex-col gap-3 border-t border-zinc-100 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-zinc-900" />
            <h2 className="font-serif text-lg text-zinc-900">Prendas Frecuentes</h2>
          </div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-widest border border-zinc-200 px-2 py-0.5">
            Renovación Recomendada
          </span>
        </div>
        <p className="text-xs text-zinc-500 -mt-2 leading-relaxed">
          Prendas que has utilizado con alta frecuencia. Te sugerimos ponerlas a la venta o donarlas para renovar tu armario.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          {frecuentesPrendas.map((p, i) => {
            const usosCount = 8 + i * 3
            return (
              <div key={p.id} className="border border-zinc-200 bg-zinc-50/50 p-4 flex gap-3 items-center">
                <img src={p.image_url} alt={p.name} className="w-20 h-24 object-cover border border-zinc-200 shrink-0" />
                <div className="flex flex-col justify-between h-full min-w-0 flex-1">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 bg-zinc-900 text-white font-mono">
                        {usosCount} usos
                      </span>
                      <span className="text-[9px] uppercase tracking-widest text-zinc-500 border border-zinc-200 px-1 py-0.5">
                        Alta rotación
                      </span>
                    </div>
                    <h3 className="font-serif text-sm text-zinc-900 truncate">{p.name}</h3>
                    <p className="text-[11px] text-zinc-500 truncate">{p.category}</p>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => onNavigate?.("marketplace")}
                      className="flex-1 py-1.5 bg-zinc-900 text-white text-[10px] font-medium tracking-wide flex items-center justify-center gap-1"
                    >
                      <Tag className="w-3 h-3" /> Vender
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => onNavigate?.("marketplace")}
                      className="flex-1 py-1.5 border border-zinc-300 text-zinc-700 text-[10px] font-medium tracking-wide flex items-center justify-center gap-1 hover:border-zinc-900 transition-colors"
                    >
                      <HeartHandshake className="w-3 h-3" /> Donar
                    </motion.button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </motion.div>
  )
}
