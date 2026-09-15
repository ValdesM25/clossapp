"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Check, Sparkles, Crown, Zap, ShieldCheck, Gift, Tag, Copy, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { pageProps } from "@/constants/animation"
import { CenteredModal } from "@/components/shared/centered-modal"
import { OPCIONES_CANJE_SUSCRIPCION } from "@/constants/donaciones"
import type { OpcionCanjeSuscripcion, CanjeRealizado } from "@/types/donaciones"

const STORAGE_PUNTOS_KEY = "clossapp_user_puntos_v1"
const STORAGE_CANJES_KEY = "clossapp_user_canjes_v1"

export function PlanesView() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [activePlan, setActivePlan] = useState<string>("Plus")
  const [modalOpen, setModalOpen] = useState(false)

  // Points & Rewards state
  const [puntos, setPuntos] = useState<number>(150)
  const [canjes, setCanjes] = useState<CanjeRealizado[]>([])
  const [canjeModalOpen, setCanjeModalOpen] = useState(false)
  const [selectedCanje, setSelectedCanje] = useState<OpcionCanjeSuscripcion | null>(null)
  const [canjeExitoso, setCanjeExitoso] = useState<CanjeRealizado | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)

  useEffect(() => {
    try {
      const savedPuntos = localStorage.getItem(STORAGE_PUNTOS_KEY)
      if (savedPuntos !== null) setPuntos(parseInt(savedPuntos, 10))

      const savedCanjes = localStorage.getItem(STORAGE_CANJES_KEY)
      if (savedCanjes) setCanjes(JSON.parse(savedCanjes))
    } catch {}
  }, [])

  const planes = [
    {
      id: "esencial",
      name: "Esencial",
      price: "$0",
      period: "para siempre",
      desc: "Perfecto para probar la experiencia básica de tu armario digital.",
      features: [
        "Digitalización básica de armario",
        "Hasta 50 prendas registradas",
        "Recomendaciones básicas de outfit",
        "Soporte por comunidad",
      ],
      highlight: false,
      badge: "Gratuito",
    },
    {
      id: "plus",
      name: "Plus",
      price: "$59",
      period: "MXN / mes",
      desc: "El plan ideal para potenciar tu estilo diario con Inteligencia Artificial.",
      features: [
        "Prendas e inventario ilimitado",
        "Estilista IA ilimitada (Claude Haiku & Sonnet)",
        "Estadísticas avanzadas y uso de prendas",
        "Acceso completo a comprar, rentar y donar en Marketplace",
        "Atención preferencial",
      ],
      highlight: true,
      badge: "Más Popular",
    },
    {
      id: "elite",
      name: "Elite",
      price: "$99",
      period: "MXN / mes",
      desc: "Máxima personalización para amantes de la moda y creadoras de tendencia.",
      features: [
        "Todo lo incluido en el Plan Plus",
        "IA Sonnet 5 de alta precisión en análisis",
        "Informe mensual de tendencias personalizadas",
        "Publicaciones destacadas en Marketplace",
        "Soporte prioritario 24/7",
      ],
      highlight: false,
      badge: "Completo",
    },
  ]

  function handleSelect(name: string) {
    setSelectedPlan(name)
    setModalOpen(true)
  }

  function confirmSubscription() {
    if (selectedPlan) {
      setActivePlan(selectedPlan)
      setModalOpen(false)
    }
  }

  function handleConfirmCanje() {
    if (!selectedCanje || puntos < selectedCanje.puntosCoste) return

    const nuevoTotal = puntos - selectedCanje.puntosCoste
    setPuntos(nuevoTotal)
    try {
      localStorage.setItem(STORAGE_PUNTOS_KEY, nuevoTotal.toString())
    } catch {}

    const nuevoCanje: CanjeRealizado = {
      id: `canje_${Date.now()}`,
      opcionId: selectedCanje.id,
      titulo: selectedCanje.titulo,
      codigo: `${selectedCanje.codigo}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      puntosUsados: selectedCanje.puntosCoste,
      fecha: new Date().toISOString(),
    }

    const updated = [nuevoCanje, ...canjes]
    setCanjes(updated)
    try {
      localStorage.setItem(STORAGE_CANJES_KEY, JSON.stringify(updated))
    } catch {}

    setCanjeExitoso(nuevoCanje)
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <motion.div {...pageProps} className="flex flex-col gap-8 pb-36 pt-8 px-4">
      {/* Encabezado */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-zinc-900" />
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Membresías & Recompensas</p>
        </div>
        <h1 className="font-serif text-3xl text-zinc-900">Planes de Suscripción</h1>
        <p className="text-xs text-zinc-500 max-w-lg leading-relaxed mt-1">
          Elige la experiencia que mejor se adapte a tu guardarropa. Dona prendas en desuso para ganar <strong>Puntos ClossApp</strong> y canjearlos por descuentos en tu mensualidad.
        </p>
      </div>

      {/* Banner de Puntos por Donaciones */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white p-5 border border-zinc-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-400/50 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-300">Programa de Donaciones</span>
            </div>
            <p className="font-serif text-2xl text-amber-300 font-medium mt-0.5">{puntos} Puntos ClossApp</p>
            <p className="text-xs text-zinc-400 mt-1">
              Ganas +100 pts por cada donación de 3+ prendas verificada con Código QR.
            </p>
          </div>
        </div>

        <button
          onClick={() => setCanjeModalOpen(true)}
          className="w-full md:w-auto px-4 py-2.5 bg-amber-400 text-zinc-950 font-semibold text-xs tracking-wide hover:bg-amber-300 transition-colors flex items-center justify-center gap-2"
        >
          <Gift className="w-4 h-4" />
          Canjear Puntos por Descuentos
        </button>
      </div>

      {/* Grid de Planes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planes.map((plan) => {
          const isCurrent = activePlan === plan.name
          return (
            <motion.div
              key={plan.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "relative flex flex-col justify-between border p-6 transition-all shadow-xs",
                plan.highlight
                  ? "border-zinc-900 bg-zinc-900 text-white shadow-xl"
                  : "border-zinc-200 bg-white text-zinc-900"
              )}
            >
              {plan.badge && (
                <span
                  className={cn(
                    "absolute top-4 right-4 text-[9px] uppercase tracking-widest px-2.5 py-1 font-semibold",
                    plan.highlight
                      ? "bg-white text-zinc-900"
                      : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                  )}
                >
                  {plan.badge}
                </span>
              )}

              <div>
                <div className="mb-4">
                  <h3
                    className={cn(
                      "font-serif text-xl",
                      plan.highlight ? "text-white" : "text-zinc-900"
                    )}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={cn(
                      "text-xs mt-1 leading-relaxed",
                      plan.highlight ? "text-zinc-400" : "text-zinc-500"
                    )}
                  >
                    {plan.desc}
                  </p>
                </div>

                <div className="my-6 border-y py-4 border-zinc-100/10">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={cn(
                        "font-serif text-3xl font-bold",
                        plan.highlight ? "text-white" : "text-zinc-900"
                      )}
                    >
                      {plan.price}
                    </span>
                    <span
                      className={cn(
                        "text-xs",
                        plan.highlight ? "text-zinc-400" : "text-zinc-500"
                      )}
                    >
                      {plan.period}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 mb-6">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Check
                        className={cn(
                          "w-4 h-4 shrink-0 mt-0.5",
                          plan.highlight ? "text-emerald-400" : "text-zinc-900"
                        )}
                      />
                      <span
                        className={cn(
                          "text-xs leading-relaxed",
                          plan.highlight ? "text-zinc-300" : "text-zinc-600"
                        )}
                      >
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(plan.name)}
                disabled={isCurrent}
                className={cn(
                  "w-full py-3 text-xs font-medium tracking-wider uppercase transition-colors flex items-center justify-center gap-2",
                  isCurrent
                    ? "bg-emerald-600 text-white cursor-default"
                    : plan.highlight
                    ? "bg-white text-zinc-900 hover:bg-zinc-100"
                    : "border border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white"
                )}
              >
                {isCurrent ? (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Plan Actual
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" /> Seleccionar {plan.name}
                  </>
                )}
              </motion.button>
            </motion.div>
          )
        })}
      </div>

      {/* Historial de cupones canjeados */}
      {canjes.length > 0 && (
        <div className="border border-zinc-200 bg-white p-5 flex flex-col gap-3">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-zinc-700" /> Mis Códigos de Descuento Canjeados
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {canjes.map((c) => (
              <div key={c.id} className="border border-amber-200 bg-amber-50/60 p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-900">{c.titulo}</p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Usó {c.puntosUsados} pts</p>
                </div>
                <button
                  onClick={() => copyCode(c.codigo)}
                  className="px-2.5 py-1 bg-zinc-900 text-white font-mono text-xs flex items-center gap-1 hover:bg-zinc-800"
                >
                  <Copy className="w-3 h-3 text-amber-300" />
                  {c.codigo}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de confirmación de plan */}
      <CenteredModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Confirmar Membresía">
        <div className="p-2 flex flex-col gap-4 text-center max-w-sm w-full">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-900">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Suscripción Clossapp</p>
            <h3 className="font-serif text-xl text-zinc-900 mt-0.5">Plan {selectedPlan}</h3>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            ¿Deseas activar el plan <strong>{selectedPlan}</strong> para tu cuenta? Podrás cambiar o cancelar en cualquier momento.
          </p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="flex-1 py-2.5 border border-zinc-200 text-zinc-600 text-xs tracking-wide hover:border-zinc-400 transition-colors"
            >
              Cancelar
            </button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={confirmSubscription}
              className="flex-1 py-2.5 bg-zinc-900 text-white text-xs font-medium tracking-wide"
            >
              Confirmar
            </motion.button>
          </div>
        </div>
      </CenteredModal>

      {/* Modal de Canje de Puntos */}
      <CenteredModal isOpen={canjeModalOpen} onClose={() => setCanjeModalOpen(false)} title="Canjear Puntos ClossApp">
        <div className="p-1 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {!canjeExitoso ? (
            <>
              <div className="bg-amber-50 border border-amber-200 p-3 flex items-center justify-between">
                <span className="text-xs text-amber-900 font-medium">Saldo disponible:</span>
                <span className="font-serif font-semibold text-amber-900 text-base">{puntos} Puntos</span>
              </div>

              <p className="text-xs text-zinc-600">
                Selecciona la recompensa que deseas desbloquear con tus puntos acumulados por donaciones:
              </p>

              <div className="flex flex-col gap-3">
                {OPCIONES_CANJE_SUSCRIPCION.map((opcion) => {
                  const alcanza = puntos >= opcion.puntosCoste
                  const isSelected = selectedCanje?.id === opcion.id

                  return (
                    <div
                      key={opcion.id}
                      onClick={() => alcanza && setSelectedCanje(opcion)}
                      className={cn(
                        "border p-4 transition-all flex flex-col gap-2 bg-white cursor-pointer",
                        isSelected ? "border-amber-500 ring-2 ring-amber-500/20" : "border-zinc-200",
                        !alcanza && "opacity-50 cursor-not-allowed bg-zinc-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-sm font-semibold text-zinc-900">{opcion.titulo}</span>
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-amber-100 text-amber-900">
                          {opcion.puntosCoste} pts
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">{opcion.descripcion}</p>

                      {!alcanza && (
                        <p className="text-[10px] text-red-500 font-medium">
                          Te faltan {opcion.puntosCoste - puntos} puntos para este cupón.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setCanjeModalOpen(false)}
                  className="flex-1 py-3 border border-zinc-200 text-zinc-600 text-xs tracking-wide hover:border-zinc-400"
                >
                  Cerrar
                </button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  disabled={!selectedCanje || puntos < (selectedCanje?.puntosCoste ?? 0)}
                  onClick={handleConfirmCanje}
                  className="flex-1 py-3 bg-zinc-900 text-white text-xs font-medium tracking-wide disabled:opacity-40"
                >
                  Canjear Cupon
                </motion.button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center py-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-xl text-zinc-900">¡Canje Exitoso!</h3>
              <p className="text-xs text-zinc-600">
                Has canjeado <strong>{canjeExitoso.puntosUsados} puntos</strong> por:
                <br />
                <strong className="text-zinc-900">{canjeExitoso.titulo}</strong>
              </p>

              <div className="w-full bg-zinc-900 text-white p-4 flex flex-col items-center gap-2 border border-zinc-800">
                <span className="text-[10px] uppercase font-mono text-amber-400">Código de Descuento Generado</span>
                <span className="font-mono text-lg font-bold text-amber-300 tracking-wider">
                  {canjeExitoso.codigo}
                </span>
                <button
                  onClick={() => copyCode(canjeExitoso.codigo)}
                  className="text-xs text-zinc-300 underline hover:text-white flex items-center gap-1 mt-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedCode ? "¡Copiado al portapapeles!" : "Copiar código"}
                </button>
              </div>

              <button
                onClick={() => {
                  setCanjeExitoso(null)
                  setSelectedCanje(null)
                  setCanjeModalOpen(false)
                }}
                className="w-full py-2.5 bg-zinc-100 text-zinc-800 text-xs font-medium hover:bg-zinc-200 mt-2"
              >
                Entendido
              </button>
            </div>
          )}
        </div>
      </CenteredModal>
    </motion.div>
  )
}
