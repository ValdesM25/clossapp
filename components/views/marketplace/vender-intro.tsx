"use client"

import { useAtras } from "@/hooks/use-atras"
import { useEffect, useRef, useState } from "react"
import { useCapa } from "@/hooks/use-capa"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, X, Camera, CreditCard, ShieldCheck, Wallet } from "lucide-react"
import { abrirCuentaCobro } from "@/services/marketplace.service"
import type { EstadoCobros } from "@/lib/marketplace"

/** Lo que dice el último paso: plan gratis, el estado de la cuenta de cobro o un error al volver de Stripe. */
export type CasoVender = "gratis" | EstadoCobros | "error"

const PASOS_INFO = [
  { icono: Camera, texto: "Publicas tu prenda con fotos y precio" },
  { icono: CreditCard, texto: "Alguien la compra o la renta y paga con tarjeta" },
  { icono: ShieldCheck, texto: "Clossapp guarda el pago mientras la llevas al centro de acopio" },
  { icono: Wallet, texto: "Cuando se entrega, te depositamos tu dinero" },
]

const TOTAL = 3

/** Lo que dice y hace el paso 3 en cada caso. */
const FINAL: Record<CasoVender, { titulo: string; texto: string; boton: string; accion: "plus" | "stripe" | "cerrar" | "publicar" }> = {
  gratis: { titulo: "Vender es parte de Plus", texto: "Con Plus vendes, rentas y compras en el Shop.", boton: "Activa Plus", accion: "plus" },
  sin_cuenta: {
    titulo: "Conecta tu cuenta de cobro",
    texto: "Stripe, nuestro procesador de pagos, te pedirá una identificación oficial y tu CLABE. Toma unos 5 minutos y solo se hace una vez. Clossapp no ve esos datos.",
    boton: "Conectar con Stripe", accion: "stripe",
  },
  en_revision: { titulo: "Stripe está revisando tus datos", texto: "Suele tardar unos minutos. Te avisamos con una notificación cuando esté lista.", boton: "Entendido", accion: "cerrar" },
  requiere_datos: { titulo: "Stripe necesita más datos", texto: "Falta información para poder pagarte.", boton: "Completar en Stripe", accion: "stripe" },
  activa: { titulo: "¡Listo! Ya puedes vender", texto: "Tu cuenta de cobro está activa. Publica tu primera prenda.", boton: "Publicar mi primera prenda", accion: "publicar" },
  error: { titulo: "No se pudo revisar tu cuenta de cobro", texto: "Algo falló al volver de Stripe. Intenta de nuevo.", boton: "Intentar de nuevo", accion: "stripe" },
}

interface VenderIntroProps {
  caso: CasoVender
  /** 3 al volver de Stripe: ya vio los pasos anteriores. */
  pasoInicial?: 1 | 3
  onCerrar: () => void
  onPublicar: () => void
}

/** "Vende en Clossapp": tres pasos a pantalla completa antes de mandar a Stripe (o a Plus, en el plan gratis). */
export function VenderIntro({ caso, pasoInicial = 1, onCerrar, onPublicar }: VenderIntroProps) {
  const [paso, setPaso] = useState<number>(pasoInicial)
  const [abriendo, setAbriendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  const capa = useRef<HTMLDivElement>(null)
  const final = FINAL[caso]

  // Foco al título de cada paso: el lector de pantalla lo anuncia y Escape funciona sin tocar nada.
  useEffect(() => { titulo.current?.focus() }, [paso])
  useCapa(capa, onCerrar)
  useAtras(true, onCerrar)

  async function conectar() {
    setAbriendo(true)
    setError(null)
    try {
      const r = await abrirCuentaCobro()
      if (r.url) return window.location.assign(r.url)
      // Stripe ya había terminado de verificar: se recarga para leer la cuenta activa.
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir tu cuenta de cobro.")
      setAbriendo(false)
    }
  }

  function accionFinal() {
    if (final.accion === "plus") window.location.assign("/planes?plan=plus")
    else if (final.accion === "stripe") void conectar()
    else if (final.accion === "publicar") onPublicar()
    else onCerrar()
  }

  const esUltimo = paso === TOTAL
  const progreso = (paso / TOTAL) * 100
  const clasesTitulo = "font-serif text-2xl text-zinc-900 outline-none"

  if (typeof document === "undefined") return null

  // En body: la vista del Shop anima con transform, y un fixed dentro se mediría contra ella y no contra la pantalla.
  return createPortal(
    <div ref={capa} role="dialog" aria-modal="true" aria-label="Vende en Clossapp" className="fixed inset-0 z-[90] bg-white flex flex-col overflow-y-auto">
      <header className="px-6 pt-6 pb-4 max-w-xl w-full mx-auto">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setPaso((p) => p - 1)} disabled={paso === 1 || abriendo}
            aria-label="Paso anterior"
            className="w-11 h-11 -ml-3 flex items-center justify-center text-zinc-500 hover:text-zinc-900 disabled:invisible">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <p className="text-[11px] text-zinc-500 uppercase tracking-widest tabular-nums">Paso {paso} de {TOTAL}</p>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="w-11 h-11 -mr-3 flex items-center justify-center text-zinc-500 hover:text-zinc-900">
            <X className="w-4 h-4" />
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
            {paso === 1 && (
              <>
                <h1 ref={titulo} tabIndex={-1} className={clasesTitulo}>Así funciona vender</h1>
                <ol className="flex flex-col gap-5">
                  {PASOS_INFO.map(({ icono: Icono, texto }) => (
                    <li key={texto} className="flex items-start gap-4">
                      <span className="w-10 h-10 shrink-0 border border-zinc-200 flex items-center justify-center">
                        <Icono className="w-4 h-4 text-zinc-700" aria-hidden="true" />
                      </span>
                      <p className="text-sm text-zinc-700 leading-relaxed pt-2">{texto}</p>
                    </li>
                  ))}
                </ol>
              </>
            )}
            {paso === 2 && (
              <>
                <h1 ref={titulo} tabIndex={-1} className={clasesTitulo}>Cuánto ganas</h1>
                <p className="font-serif text-3xl text-zinc-900 leading-snug">
                  Vendes en $200 <span aria-hidden="true">→</span><span className="sr-only">,</span> te llegan $170
                </p>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  Te quedas con el 85% de cada venta o renta. Clossapp cobra 15% y paga la comisión de Stripe por ti.
                </p>
              </>
            )}
            {paso === 3 && (
              <>
                <h1 ref={titulo} tabIndex={-1} className={clasesTitulo}>{final.titulo}</h1>
                <p className="text-sm text-zinc-600 leading-relaxed">{final.texto}</p>
                {error && <p role="status" className="border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-700">{error}</p>}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-zinc-100 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-xl mx-auto">
          <motion.button type="button" whileTap={{ scale: 0.98 }} disabled={abriendo}
            onClick={esUltimo ? accionFinal : () => setPaso((p) => p + 1)}
            className="w-full h-12 bg-zinc-900 text-white text-sm font-medium disabled:opacity-50">
            {esUltimo ? (abriendo ? "Abriendo…" : final.boton) : "Siguiente"}
          </motion.button>
        </div>
      </footer>
    </div>,
    document.body,
  )
}
