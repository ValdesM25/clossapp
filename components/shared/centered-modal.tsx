"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { useSyncExternalStore, type ReactNode } from "react"
import { createPortal } from "react-dom"

const sinSuscripcion = () => () => {}

export function CenteredModal({ open, isOpen, onClose, children }: { open?: boolean; isOpen?: boolean; onClose: () => void; children: ReactNode }) {
  const isVisible = open ?? isOpen ?? false
  // En el servidor no hay document: el portal se monta ya en el navegador.
  const enCliente = useSyncExternalStore(sinSuscripcion, () => true, () => false)
  if (!enCliente) return null

  // En body: las vistas animan con transform, y un fixed dentro se mediría contra la vista y no contra la pantalla.
  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.94, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }} transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="w-full max-w-lg bg-white rounded-none shadow-2xl relative max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <button onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center border border-zinc-200 hover:bg-zinc-50 z-10">
              <X className="w-4 h-4 text-zinc-600" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
