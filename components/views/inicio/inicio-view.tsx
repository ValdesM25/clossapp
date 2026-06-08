"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { pageProps } from "@/constants/animation"
import { useAuthContext } from "@/context/auth-context"

export function InicioView() {
  const { userName, isGuest } = useAuthContext()

  return (
    <motion.div {...pageProps} className="flex flex-col gap-8 pb-32 px-4 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Bienvenida</p>
          <h1 className="font-serif text-2xl text-zinc-900 mt-0.5">{userName}</h1>
          {isGuest && <span className="text-[10px] text-zinc-400 uppercase tracking-widest border border-zinc-200 px-2 py-0.5">Solo lectura</span>}
        </div>
        <div className="w-10 h-10 overflow-hidden">
          <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80" alt="avatar" className="w-full h-full object-cover" />
        </div>
      </div>

      <div className="relative h-56 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80" alt="hero" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 p-5">
          <p className="text-white/70 text-xs uppercase tracking-widest mb-1">Tu armario inteligente</p>
          <h2 className="font-serif text-white text-xl">Estilo personalizado con IA</h2>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-serif text-lg text-zinc-900">Cómo funciona</h2>
        {[
          { n: "01", title: "Digitaliza", desc: "Fotografía tus prendas y organiza tu guardarropa." },
          { n: "02", title: "Organiza", desc: "Categoriza por ocasión, temporada y estado." },
          { n: "03", title: "Descubre", desc: "La IA sugiere outfits según el clima y tu agenda." },
        ].map((s) => (
          <div key={s.n} className="flex gap-4 border-b border-zinc-100 pb-3">
            <span className="text-xs text-zinc-400 font-mono pt-0.5 w-6 shrink-0">{s.n}</span>
            <div>
              <p className="text-sm font-medium text-zinc-900">{s.title}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-serif text-lg text-zinc-900">Planes</h2>
        {[
          { name: "Esencial", price: "$0", desc: "Para empezar", features: ["Outfits básicos", "Hasta 50 prendas"] },
          { name: "Plus", price: "$59 MXN/mes", desc: "Para entusiastas", features: ["IA ilimitada", "Prendas ilimitadas", "Estadísticas", "Marketplace"], highlight: true },
          { name: "Elite", price: "$99 MXN/mes", desc: "Para profesionales", features: ["IA avanzada", "Tendencias", "Soporte prioritario", "Marketplace"] },
        ].map((plan) => (
          <div key={plan.name} className={cn("border p-5", plan.highlight ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200")}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className={cn("font-serif text-base", plan.highlight ? "text-white" : "text-zinc-900")}>{plan.name}</p>
                <p className={cn("text-xs", plan.highlight ? "text-zinc-400" : "text-zinc-500")}>{plan.desc}</p>
              </div>
              <p className={cn("font-serif text-lg", plan.highlight ? "text-white" : "text-zinc-900")}>{plan.price}</p>
            </div>
            {plan.features.map((f) => (
              <div key={f} className="flex items-center gap-2 mb-1">
                <Check className={cn("w-3 h-3", plan.highlight ? "text-zinc-400" : "text-zinc-400")} />
                <span className={cn("text-xs", plan.highlight ? "text-zinc-300" : "text-zinc-600")}>{f}</span>
              </div>
            ))}
            <motion.button whileTap={{ scale: 0.98 }}
              className={cn("w-full mt-4 py-2.5 text-sm font-medium tracking-wide", plan.highlight ? "bg-white text-zinc-900" : "border border-zinc-900 text-zinc-900")}>
              {plan.name === "Esencial" ? "Comenzar gratis" : `Elegir ${plan.name}`}
            </motion.button>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
