"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, MapPin, Truck, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { PUNTOS_ACOPIO, CAUSAS, IMPACTO_DEMO, type ModoEntrega } from "@/constants/donaciones"
import type { Prenda } from "@/types"

type Paso = "intro" | "seleccion" | "entrega" | "gracias"

interface DonacionPanelProps {
  prendas: Prenda[]
  isGuest: boolean
}

/**
 * Módulo de donaciones — SIMULADO.
 *
 * No persiste nada ni coordina logística: todo el estado vive en este componente.
 * Su propósito es evidenciar la vocación social del producto dentro del recorrido
 * de la aplicación.
 */
export function DonacionPanel({ prendas, isGuest }: DonacionPanelProps) {
  const [paso, setPaso] = useState<Paso>("intro")
  const [prenda, setPrenda] = useState<Prenda | null>(null)
  const [modo, setModo] = useState<ModoEntrega>("acopio")
  const [punto, setPunto] = useState(PUNTOS_ACOPIO[0].id)
  const [direccion, setDireccion] = useState("")

  const disponibles = prendas.filter((p) => !p.en_venta && !p.en_renta)
  const puedeConfirmar = modo === "acopio" || direccion.trim().length > 0

  function reiniciar() {
    setPaso("intro")
    setPrenda(null)
    setModo("acopio")
    setPunto(PUNTOS_ACOPIO[0].id)
    setDireccion("")
  }

  return (
    <div className="px-4 flex flex-col gap-5">
      <p className="text-[10px] text-zinc-400 border border-dashed border-zinc-300 px-3 py-2 tracking-wide">
        Módulo demostrativo · La donación es simulada y no genera un registro real
      </p>

      <AnimatePresence mode="wait">
        {paso === "intro" && (
          <motion.div key="intro" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="flex flex-col gap-5">
            <div className="border border-zinc-200 p-5 flex flex-col gap-3">
              <Heart className="w-5 h-5 text-zinc-900" />
              <p className="font-serif text-xl text-zinc-900 leading-snug">
                La ropa que ya no usas puede abrigar a alguien más
              </p>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Donar no genera ingresos para ti ni comisión para Clossapp. Es la parte del
                proyecto que existe porque creemos que un clóset también puede ser una
                herramienta social.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-zinc-200 p-4">
                <p className="font-serif text-2xl text-zinc-900">{IMPACTO_DEMO.prendasDonadas}</p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Prendas donadas</p>
              </div>
              <div className="border border-zinc-200 p-4">
                <p className="font-serif text-2xl text-zinc-900">{IMPACTO_DEMO.familiasApoyadas}</p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Familias apoyadas</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Causas activas</p>
              {CAUSAS.map((causa) => (
                <div key={causa} className="border border-zinc-100 px-3 py-2.5 text-sm text-zinc-600">
                  {causa}
                </div>
              ))}
            </div>

            {isGuest ? (
              <p className="text-xs text-zinc-400 border border-zinc-100 p-4 text-center">
                Crea una cuenta para donar una prenda.
              </p>
            ) : (
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => setPaso("seleccion")}
                className="w-full py-3 bg-zinc-900 text-white text-sm font-medium tracking-wide">
                Donar una prenda
              </motion.button>
            )}
          </motion.div>
        )}

        {paso === "seleccion" && (
          <motion.div key="seleccion" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="flex flex-col gap-4">
            <button onClick={() => setPaso("intro")} className="text-xs text-zinc-400 underline w-fit">
              ← Volver
            </button>
            <p className="font-serif text-lg text-zinc-900">¿Qué prenda quieres donar?</p>
            {disponibles.length === 0 ? (
              <p className="text-xs text-zinc-400 border border-zinc-100 p-4 text-center">
                No tienes prendas disponibles para donar.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {disponibles.map((p) => (
                  <button key={p.id} onClick={() => { setPrenda(p); setPaso("entrega") }}
                    className="relative overflow-hidden border-2 border-transparent hover:border-zinc-900 transition-all">
                    <img src={p.image_url} alt={p.name} className="w-full h-20 object-cover" />
                    <p className="text-[10px] text-zinc-600 truncate px-1 py-1 bg-white">{p.name}</p>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {paso === "entrega" && (
          <motion.div key="entrega" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="flex flex-col gap-4">
            <button onClick={() => setPaso("seleccion")} className="text-xs text-zinc-400 underline w-fit">
              ← Volver
            </button>

            {prenda && (
              <div className="flex items-center gap-3 border border-zinc-100 p-3">
                <img src={prenda.image_url} alt={prenda.name} className="w-14 h-14 object-cover" />
                <p className="text-sm text-zinc-700">{prenda.name}</p>
              </div>
            )}

            <p className="font-serif text-lg text-zinc-900">¿Cómo la entregamos?</p>

            <div className="flex flex-col gap-2">
              <button onClick={() => setModo("acopio")}
                className={cn("border p-4 text-left flex gap-3 transition-colors",
                  modo === "acopio" ? "border-zinc-900" : "border-zinc-200")}>
                <MapPin className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-zinc-900">La llevo a un punto de acopio</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Elige el más cercano a ti</p>
                </div>
              </button>

              <button onClick={() => setModo("recoleccion")}
                className={cn("border p-4 text-left flex gap-3 transition-colors",
                  modo === "recoleccion" ? "border-zinc-900" : "border-zinc-200")}>
                <Truck className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-zinc-900">Pasen por ella</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Coordinamos la recolección contigo</p>
                </div>
              </button>
            </div>

            {modo === "acopio" ? (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Punto de acopio</p>
                {PUNTOS_ACOPIO.map((p) => (
                  <button key={p.id} onClick={() => setPunto(p.id)}
                    className={cn("border px-3 py-2.5 text-left transition-colors",
                      punto === p.id ? "border-zinc-900" : "border-zinc-200")}>
                    <p className="text-sm text-zinc-900">{p.nombre}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{p.zona} · {p.horario}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-zinc-400 uppercase tracking-widest">
                  Dirección de recolección
                </label>
                <Input value={direccion} onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle, número y colonia"
                  className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900" />
                <p className="text-[10px] text-zinc-400">
                  Te contactaríamos para acordar día y hora.
                </p>
              </div>
            )}

            <motion.button whileTap={{ scale: 0.98 }} disabled={!puedeConfirmar}
              onClick={() => setPaso("gracias")}
              className="w-full py-3 bg-zinc-900 text-white text-sm font-medium tracking-wide disabled:opacity-50">
              Confirmar donación
            </motion.button>
          </motion.div>
        )}

        {paso === "gracias" && (
          <motion.div key="gracias" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            className="border border-zinc-200 p-6 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 border border-zinc-900 flex items-center justify-center">
              <Check className="w-5 h-5 text-zinc-900" />
            </div>
            <p className="font-serif text-xl text-zinc-900 leading-snug">Gracias por donar</p>
            <p className="text-sm text-zinc-600 leading-relaxed">
              {modo === "acopio"
                ? `Puedes dejar ${prenda?.name ?? "tu prenda"} en ${PUNTOS_ACOPIO.find((p) => p.id === punto)?.nombre}.`
                : `Registramos la recolección de ${prenda?.name ?? "tu prenda"} en la dirección indicada.`}
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Cada prenda que circula es una prenda que no se produce de nuevo.
            </p>
            <button onClick={reiniciar} className="text-xs text-zinc-500 underline underline-offset-2">
              Donar otra prenda
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
