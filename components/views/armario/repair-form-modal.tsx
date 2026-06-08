"use client"

import { motion } from "framer-motion"
import { Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Prenda, ReparacionDB } from "@/types"

interface RepairFormModalProps {
  prendas: Prenda[]
  repForm: { prenda_id: string | null; tarea: string; prioridad: ReparacionDB["prioridad"] }
  savingRep: boolean
  onPrendaSelect: (id: string) => void
  onTareaChange: (tarea: string) => void
  onPrioridadChange: (prioridad: string) => void
  onSave: () => void
}

export function RepairFormModal({
  prendas, repForm, savingRep,
  onPrendaSelect, onTareaChange, onPrioridadChange, onSave,
}: RepairFormModalProps) {
  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between pr-8">
        <p className="font-serif text-zinc-900 text-lg">Nueva reparación</p>
        <motion.button whileTap={{ scale: 0.96 }} onClick={onSave} disabled={savingRep || !repForm.prenda_id}
          className="px-4 py-1.5 bg-zinc-900 text-white text-xs font-medium tracking-wide disabled:opacity-40 flex items-center gap-1.5">
          {savingRep ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Guardar
        </motion.button>
      </div>
      <div>
        <label className="text-xs text-zinc-500 uppercase tracking-widest mb-2 block">Selecciona la prenda</label>
        {prendas.length === 0 ? (
          <p className="text-xs text-zinc-400 border border-zinc-100 p-4 text-center">Sube prendas primero.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {prendas.map((p) => (
              <button key={p.id} onClick={() => onPrendaSelect(p.id)}
                className={cn("relative overflow-hidden border-2 transition-all", repForm.prenda_id === p.id ? "border-zinc-900" : "border-transparent")}>
                <img src={p.image_url} alt={p.name} className="w-full h-20 object-cover" />
                {repForm.prenda_id === p.id && (
                  <div className="absolute inset-0 bg-zinc-900/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}
                <p className="text-[10px] text-zinc-600 truncate px-1 py-1 bg-white">{p.name}</p>
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="text-xs text-zinc-500 uppercase tracking-widest mb-1 block">Tarea</label>
        <Input value={repForm.tarea} onChange={(e) => onTareaChange(e.target.value)}
          placeholder="Ej. Cambiar botón, ajustar dobladillo..."
          className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900" />
      </div>
      <div>
        <label className="text-xs text-zinc-500 uppercase tracking-widest mb-1 block">Prioridad</label>
        <Select value={repForm.prioridad} onValueChange={onPrioridadChange}>
          <SelectTrigger className="rounded-none border-zinc-300 focus:ring-0"><SelectValue /></SelectTrigger>
          <SelectContent className="z-[110]">
            <SelectItem value="Baja">Baja</SelectItem>
            <SelectItem value="Media">Media</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
