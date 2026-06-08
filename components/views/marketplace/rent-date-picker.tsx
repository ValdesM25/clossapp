"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import type { Prenda } from "@/types"

interface RentDatePickerProps {
  onConfirm: (fecha: string) => void
  onCancel: () => void
  aparting: boolean
}

export function RentDatePicker({ onConfirm, onCancel, aparting }: RentDatePickerProps) {
  const [fecha, setFecha] = useState("")

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Fecha de renta</label>
        <Input type="date" value={fecha} min={new Date().toISOString().split("T")[0]}
          onChange={(e) => setFecha(e.target.value)}
          className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
      </div>
      <div className="flex gap-2">
        <motion.button whileTap={{ scale: 0.98 }} onClick={onCancel}
          className="flex-1 py-2.5 border border-zinc-200 text-zinc-500 text-xs tracking-wide">
          Cancelar
        </motion.button>
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => onConfirm(fecha)}
          disabled={!fecha || aparting}
          className="flex-1 py-2.5 bg-zinc-900 text-white text-xs font-medium tracking-wide flex items-center justify-center gap-2 disabled:opacity-40">
          {aparting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Confirmar Renta
        </motion.button>
      </div>
    </div>
  )
}
