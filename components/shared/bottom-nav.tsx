"use client"

import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { navItems } from "@/constants/navigation"
import type { View } from "@/types"

interface BottomNavProps {
  activeView: View
  onNavigate: (v: View) => void
  open: boolean
  flash?: View
}

export function BottomNav({ activeView, onNavigate, open, flash }: BottomNavProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }} transition={{ duration: 0.2 }}
          className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-safe pb-6 pointer-events-none">
          <nav className="w-[92%] max-w-2xl bg-white/80 backdrop-blur-xl border border-zinc-200 px-6 py-3 flex justify-between items-center shadow-lg pointer-events-auto">
            {navItems.map((item) => {
              const isActive = activeView === item.id
              const isFlashing = flash != null && flash === item.id
              return (
                <motion.button key={item.id} whileTap={{ scale: 0.82 }} onClick={() => onNavigate(item.id)}
                  className="flex flex-col items-center gap-0.5 relative">
                  {isFlashing && (
                    <motion.span initial={{ scale: 0.5, opacity: 1 }} animate={{ scale: 2.5, opacity: 0 }}
                      transition={{ duration: 0.6 }} className="absolute inset-0 rounded-full bg-zinc-300" />
                  )}
                  <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-zinc-900" : "text-zinc-400")} />
                  <span className={cn("text-[10px] font-medium transition-colors", isActive ? "text-zinc-900" : "text-zinc-400")}>
                    {item.label}
                  </span>
                </motion.button>
              )
            })}
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
