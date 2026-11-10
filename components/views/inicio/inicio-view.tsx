"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Sparkles, Sun, Clock, Tag, HeartHandshake, Check, ArrowRight, RefreshCw, Shirt, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { pageProps } from "@/constants/animation"
import { useAuthContext } from "@/context/auth-context"
import { usePrendasContext } from "@/context/prendas-context"
import { navegarA } from "@/lib/navegar"
import { esDePago } from "@/constants/planes"
import { RecordatorioArmario } from "./recordatorio-armario"
import { PrimerosPasos } from "./primeros-pasos"
import { CompletarPerfil } from "./completar-perfil"
import { faltanPreguntasDespues } from "@/constants/onboarding"
import { useOutfitDelDia } from "@/hooks/use-outfit-del-dia"
import { registrarUso, incrementarOutfits } from "@/services/outfits.service"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { InstalarBanner } from "@/components/shared/instalar-banner"
import type { View, Prenda } from "@/types"

interface InicioViewProps {
  onNavigate?: (v: View) => void
}

// Umbrales de las secciones de Inicio. Las prendas sin uso registrado cuentan desde que se subieron.
const DIAS_OLVIDADA = 30
const USOS_FRECUENTE = 8
const MIN_PRENDAS_OUTFIT = 2

function diasSinUsar(p: Prenda): number {
  return Math.floor((Date.now() - new Date(p.ultimo_uso || p.created_at).getTime()) / 86_400_000)
}

export function InicioView({ onNavigate }: InicioViewProps) {
  const { userName, userAvatarUrl, isGuest, userId, plan, estilo, abrirOnboarding } = useAuthContext()
  const { prendas, loading } = usePrendasContext()
  const [wornToday, setWornToday] = useState(false)
  const { clima, outfit, cargando } = useOutfitDelDia(prendas, userId, plan, !isGuest)

  // Todo sale de las prendas reales (o de las de la demo): nada de relleno en cuentas nuevas.
  const sinOutfit = prendas.length < MIN_PRENDAS_OUTFIT
  const dailyOutfitPrendas = outfit?.prendas ?? (cargando ? [] : prendas.slice(0, 3))
  const olvidadasPrendas = prendas
    .map((p) => ({ p, dias: diasSinUsar(p) }))
    .filter((x) => x.dias >= DIAS_OLVIDADA)
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 6)
  const frecuentesPrendas = prendas
    .filter((p) => (p.usos ?? 0) >= USOS_FRECUENTE)
    .sort((a, b) => (b.usos ?? 0) - (a.usos ?? 0))
    .slice(0, 4)
  const irArmario = () => onNavigate?.("armario")
  const tieneEstilo = !!estilo && Object.keys(estilo).length > 0

  // Una vez por dia: la marca vive en localStorage para que recargar no permita contar el mismo outfit dos veces.
  const claveUsado = `outfit-dia-usado:${userId}:${new Date().toLocaleDateString("en-CA")}`
  const [usadoHoy, setUsadoHoy] = useState(false)
  useEffect(() => { setUsadoHoy(!isGuest && localStorage.getItem(claveUsado) === "1") }, [isGuest, claveUsado])

  async function handleUsarOutfit() {
    if (usadoHoy || wornToday) return
    setWornToday(true)
    if (isGuest || !outfit) { setTimeout(() => setWornToday(false), 3000); return }
    try {
      const supabase = createBrowserSupabaseClient()
      await Promise.all([
        registrarUso(supabase, outfit.prendas.map((p) => p.id)),
        incrementarOutfits(supabase, userName),
      ])
      localStorage.setItem(claveUsado, "1")
      setUsadoHoy(true)
    } catch (err) {
      console.error("[outfit-del-dia] no se registró el uso", err instanceof Error ? err.message : err)
    } finally {
      setWornToday(false)
    }
  }

  return (
    <motion.div {...pageProps} className="flex flex-col gap-9 pb-36 px-4 pt-8">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-zinc-900">Hola, {userName}</h1>
          {isGuest && (
            <span className="text-[11px] text-zinc-500 uppercase tracking-widest border border-zinc-200 px-2 py-0.5 mt-1 inline-block">
              Modo demo
            </span>
          )}
        </div>
        <button type="button" onClick={() => navegarA("perfil")} aria-label="Abrir tu perfil"
          className="w-11 h-11 rounded-full overflow-hidden border border-zinc-200 shrink-0">
          <img src={userAvatarUrl} alt="" className="w-full h-full object-cover" />
        </button>
      </div>

      {!isGuest && !loading && (
        <PrimerosPasos userId={userId} pasos={[
          { titulo: "Sube tu primera prenda", texto: "Tómale foto y la IA llena los datos por ti.", hecho: prendas.length >= 1, accion: irArmario },
          { titulo: "Completa lo básico", texto: "Algo de arriba, algo de abajo y calzado: con eso armamos tu outfit del día.", hecho: prendas.length >= 3, accion: irArmario },
          { titulo: "Cuéntanos tu estilo", texto: "Colores, ocasiones y clima, para que los outfits se parezcan a ti.", hecho: tieneEstilo, accion: () => abrirOnboarding("inicial") },
        ]} />
      )}

      {/* Las preguntas que se sacaron del registro, una vez terminados los primeros pasos. */}
      {!isGuest && !loading && prendas.length >= 3 && tieneEstilo && faltanPreguntasDespues(estilo) && (
        <CompletarPerfil userId={userId} onAbrir={() => abrirOnboarding("despues")} />
      )}

      {!isGuest && <InstalarBanner />}

      {/* Recordatorio: solo con prendas reales, no con las de demo. */}
      {!isGuest && !loading && prendas.length > 0 && (
        <RecordatorioArmario prendas={prendas} onAgregar={irArmario} />
      )}

      {/* SECCIÓN 1: RECOMENDACIÓN DE OUTFIT PARA EL DÍA DE HOY */}
      <section data-tour="inicio-outfit" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-zinc-500" aria-hidden="true" />
            <p className="text-xs text-zinc-500 uppercase tracking-widest">
              {clima ? `${clima.texto} ${clima.temp}°C · ` : ""}Outfit del día
            </p>
          </div>
          {!sinOutfit && (
            <button type="button" onClick={() => onNavigate?.("simulador")}
              className="min-h-10 -my-2 text-xs text-zinc-600 hover:text-zinc-900 flex items-center gap-1">
              Más opciones <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="bg-zinc-100 h-72 animate-pulse" aria-label="Cargando outfit del día" />
        ) : sinOutfit && !isGuest ? (
          <div className="border border-zinc-200 p-6 flex flex-col items-start gap-4">
            <div>
              <h2 className="font-serif text-xl text-zinc-900">Tu outfit del día aparece aquí</h2>
              <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
                Sube al menos {MIN_PRENDAS_OUTFIT} prendas y cada mañana te proponemos qué ponerte según el clima.
              </p>
            </div>
            <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={irArmario}
              className="h-11 px-5 bg-zinc-900 text-white text-sm font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" /> Agregar prenda
            </motion.button>
          </div>
        ) : (
        <div className="bg-zinc-900 text-white p-5 sm:p-6">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <span className="text-[11px] uppercase tracking-widest px-2 py-0.5 bg-white/10 text-zinc-300">
                {outfit && !esDePago(plan) ? "Sugerencia de Hoy" : "Sugerencia IA de Hoy"}
              </span>
              <h2 className="font-serif text-xl text-white mt-2">
                {cargando ? "Preparando tu outfit…" : outfit?.titulo ?? "Look del día"}
              </h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-md leading-relaxed">
                {outfit?.descripcion ?? "Una combinación cómoda con lo que ya tienes."}
              </p>
            </div>
            <Sparkles className="w-5 h-5 text-zinc-400 shrink-0" aria-hidden="true" />
          </div>

          {/* Prendas que componen el outfit */}
          <div className="grid grid-cols-3 gap-2 my-4 relative z-10">
            {cargando
              ? [0, 1, 2].map((i) => <div key={i} className="aspect-[3/4] bg-white/10 animate-pulse" />)
              : dailyOutfitPrendas.map((p) => (
                <div key={p.id} className="min-w-0">
                  <img src={p.image_url} alt={p.name} className="w-full aspect-[3/4] object-cover bg-white/5" />
                  <p className="text-xs text-white truncate mt-2">{p.name}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{p.category}</p>
                </div>
              ))}
          </div>

          <div className="flex gap-3 pt-2 relative z-10">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={handleUsarOutfit}
              disabled={cargando}
              className={cn(
                "flex-1 h-11 text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60",
                wornToday || usadoHoy ? "bg-emerald-600 text-white" : "bg-white text-zinc-900 hover:bg-zinc-100"
              )}
            >
              {wornToday || usadoHoy ? <Check className="w-4 h-4" /> : <Shirt className="w-4 h-4" />}
              {usadoHoy ? "Registrado como usado hoy" : wornToday ? "Registrando…" : "Me lo pongo hoy"}
            </motion.button>
          </div>
        </div>
        )}
      </section>

      {/* SECCIÓN 2: PRENDAS QUE NO SE HAN UTILIZADO EN UN TIEMPO */}
      {olvidadasPrendas.length > 0 && (
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-500" aria-hidden="true" />
            <h2 className="font-serif text-lg text-zinc-900">Prendas olvidadas</h2>
          </div>
          <button type="button" onClick={irArmario}
            className="min-h-10 -my-2 text-xs text-zinc-600 hover:text-zinc-900">
            Ver armario
          </button>
        </div>
        <p className="text-xs text-zinc-500 -mt-2 leading-relaxed">
          Llevan tiempo sin salir del clóset. Combínalas hoy o búscales nuevo dueño.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
          {olvidadasPrendas.map(({ p, dias }) => (
            <div key={p.id} className="flex flex-col">
              <div className="relative aspect-[4/5] overflow-hidden bg-zinc-100">
                <img src={p.image_url} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 text-[11px] tabular-nums bg-white/90 text-zinc-700 px-1.5 py-0.5">
                  {dias} días
                </span>
              </div>
              <p className="text-sm text-zinc-900 truncate mt-2">{p.name}</p>
              <p className="text-xs text-zinc-500">{p.category}</p>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate?.("simulador")}
                className="w-full mt-2 h-10 border border-zinc-300 text-zinc-900 text-xs font-medium flex items-center justify-center gap-1.5 hover:border-zinc-900 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Combinar
              </motion.button>
              <div className={cn("grid", plan === "gratis" ? "grid-cols-1" : "grid-cols-2")}>
                {plan !== "gratis" && (
                  <button type="button" onClick={() => onNavigate?.("marketplace")}
                    className="h-10 text-xs text-zinc-600 hover:text-zinc-900 flex items-center justify-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" aria-hidden="true" /> Vender
                  </button>
                )}
                <button type="button" onClick={() => onNavigate?.("marketplace")}
                  className="h-10 text-xs text-zinc-600 hover:text-zinc-900 flex items-center justify-center gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5" aria-hidden="true" /> Donar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* SECCIÓN 3: LAS MÁS USADAS (solo informativa: lo que se vende o dona son las olvidadas) */}
      {frecuentesPrendas.length > 0 && (
      <section className="flex flex-col gap-3 border-t border-zinc-100 pt-8">
        <h2 className="font-serif text-lg text-zinc-900">Las que más usas</h2>
        <div className="grid grid-cols-4 gap-3">
          {frecuentesPrendas.map((p) => (
            <div key={p.id} className="min-w-0">
              <img src={p.image_url} alt={p.name} loading="lazy" decoding="async" className="w-full aspect-[3/4] object-cover bg-zinc-100" />
              <p className="text-xs text-zinc-900 truncate mt-1.5">{p.name}</p>
              <p className="text-[11px] text-zinc-500 tabular-nums">{p.usos} usos</p>
            </div>
          ))}
        </div>
      </section>
      )}
    </motion.div>
  )
}
