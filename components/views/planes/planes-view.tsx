"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Check, Sparkles, Crown, Zap, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { pageProps } from "@/constants/animation"
import { CenteredModal } from "@/components/shared/centered-modal"

export function PlanesView() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [activePlan, setActivePlan] = useState<string>("Plus")
  const [modalOpen, setModalOpen] = useState(false)

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

  return (
    <motion.div {...pageProps} className="flex flex-col gap-8 pb-36 pt-8 px-4">
      {/* Encabezado */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-zinc-900" />
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Membresías</p>
        </div>
        <h1 className="font-serif text-3xl text-zinc-900">Planes de Suscripción</h1>
        <p className="text-xs text-zinc-500 max-w-lg leading-relaxed mt-1">
          Elige la experiencia que mejor se adapte a tu guardarropa. Desbloquea la IA inteligente para crear outfits y aprovecha el Marketplace.
        </p>
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

      {/* Modal de confirmación de plan */}
      <CenteredModal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="p-6 flex flex-col gap-4 text-center max-w-sm w-full">
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
    </motion.div>
  )
}
