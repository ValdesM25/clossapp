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
          className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-safe pointer-events-none">
          <nav data-tour="nav" className="w-[92%] max-w-5xl bg-white/85 backdrop-blur-xl border border-zinc-200 px-1 sm:px-4 py-1.5 flex items-stretch shadow-lg pointer-events-auto lg:w-[calc(100%-2rem)]">
            {navItems.map((item) => {
              const isActive = activeView === item.id
              const isFlashing = flash != null && flash === item.id
              return (
                <motion.button key={item.id} type="button" data-tour={`nav-${item.id}`} whileTap={{ scale: 0.95 }} onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className="flex-1 min-h-12 flex flex-col items-center justify-center gap-1 relative">
                  {isActive && !item.destacado && (
                    <motion.span layoutId="nav-activo" aria-hidden="true" className="absolute top-0 h-0.5 w-6 bg-zinc-900"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }} />
                  )}
                  {isFlashing && (
                    <motion.span initial={{ scale: 0.5, opacity: 1 }} animate={{ scale: 2.5, opacity: 0 }}
                      transition={{ duration: 0.6 }} className="absolute inset-0 rounded-full bg-zinc-300" />
                  )}
                  {item.destacado ? (
                    <span className="w-12 h-12 -mt-6 bg-zinc-900 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
                      <item.icon aria-hidden="true" className="w-5 h-5" />
                    </span>
                  ) : (
                    <item.icon aria-hidden="true" className={cn("w-5 h-5 transition-colors", isActive ? "text-zinc-900" : "text-zinc-500")} />
                  )}
                  <span className={cn("text-[11px] font-medium transition-colors", isActive || item.destacado ? "text-zinc-900" : "text-zinc-500")}>
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
