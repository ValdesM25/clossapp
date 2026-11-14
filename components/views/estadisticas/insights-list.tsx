"use client"

import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"

export function InsightsList({ insights }: { insights: string[] }) {
  if (insights.length === 0) return null
  return (
    <section className="px-4" aria-label="Lo que dicen tus datos">
      <ul className="flex flex-col gap-2">
        {insights.map((texto, i) => (
          <motion.li key={texto} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 + i * 0.08 }}
            className="flex items-start gap-3 bg-zinc-900 text-white px-4 py-3">
            <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-zinc-400" aria-hidden />
            <p className="text-[13px] leading-snug">{texto}</p>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}
