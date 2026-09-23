"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { fetchUserEscrowOrders } from "@/services/escrow.service"

interface RentDatePickerProps {
  prendaId?: string
  onConfirm: (fecha: string) => void
  onCancel: () => void
  aparting: boolean
}

export function RentDatePicker({ prendaId, onConfirm, onCancel, aparting }: RentDatePickerProps) {
  const supabase = createBrowserSupabaseClient()

  // Mes y año actual para el calendario
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDateStr, setSelectedDateStr] = useState<string>("")
  const [bookedDates, setBookedDates] = useState<string[]>([])
  const [loadingDates, setLoadingDates] = useState(false)

  // Cargar fechas rentadas reales y sembrar fechas demo si es necesario
  useEffect(() => {
    async function loadBooked() {
      setLoadingDates(true)
      const datesSet = new Set<string>()

      try {
        const orders = await fetchUserEscrowOrders(supabase)
        orders.forEach((o) => {
          o.items.forEach((item) => {
            if (!prendaId || item.prenda.id === prendaId) {
              if (item.fechaRenta) {
                datesSet.add(item.fechaRenta)
              }
            }
          })
        })
      } catch (err) {
        console.warn("Error loading booked dates:", err)
      }

      // Si no hay fechas ocupadas registradas aún para esta prenda, simular un par de fechas futuras para demostración visual
      if (datesSet.size === 0) {
        const today = new Date()
        const demoDate1 = new Date(today)
        demoDate1.setDate(today.getDate() + 4)
        const demoDate2 = new Date(today)
        demoDate2.setDate(today.getDate() + 10)

        datesSet.add(demoDate1.toISOString().split("T")[0])
        datesSet.add(demoDate2.toISOString().split("T")[0])
      }

      setBookedDates(Array.from(datesSet))
      setLoadingDates(false)
    }

    loadBooked()
  }, [supabase, prendaId])

  // Calcular días de lavado (el día posterior a cada fecha rentada)
  const washingDates = useMemo(() => {
    const washSet = new Set<string>()
    bookedDates.forEach((bStr) => {
      try {
        const parts = bStr.split("-").map(Number)
        if (parts.length === 3) {
          const d = new Date(parts[0], parts[1] - 1, parts[2])
          d.setDate(d.getDate() + 1)
          const washStr = d.toISOString().split("T")[0]
          washSet.add(washStr)
        }
      } catch {}
    })
    return Array.from(washSet)
  }, [bookedDates])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Nombres de los meses y días de la semana
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ]
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

  // Generar la cuadrícula del mes
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayIndex = new Date(year, month, 1).getDay()

  const todayStr = useMemo(() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`
  }, [])

  function handlePrevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  function handleNextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  function formatDisplayDate(dateStr: string) {
    if (!dateStr) return ""
    const parts = dateStr.split("-").map(Number)
    if (parts.length !== 3) return dateStr
    const d = new Date(parts[0], parts[1] - 1, parts[2])
    return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  }

  // Fecha de entrega/lavado estimada (día siguiente)
  const returnDateStr = useMemo(() => {
    if (!selectedDateStr) return ""
    const parts = selectedDateStr.split("-").map(Number)
    if (parts.length !== 3) return ""
    const d = new Date(parts[0], parts[1] - 1, parts[2])
    d.setDate(d.getDate() + 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }, [selectedDateStr])

  return (
    <div className="flex flex-col gap-3 bg-zinc-50/70 p-3 sm:p-4 rounded-xl border border-zinc-200">
      {/* Header del Calendario */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-emerald-600" />
          <h4 className="font-serif text-sm font-semibold text-zinc-900">
            {monthNames[month]} {year}
          </h4>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 hover:bg-zinc-200 rounded text-zinc-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 hover:bg-zinc-200 rounded text-zinc-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Leyenda de Estados */}
      <div className="flex flex-wrap items-center gap-2 py-1 text-[10px] text-zinc-600 border-y border-zinc-200/80 my-0.5">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Disponible
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Rentado (Tachado)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span> Día de Lavado (Desactivado)
        </span>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
        {weekDays.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Cuadrícula de Días */}
      <div className="grid grid-cols-7 gap-1 text-xs">
        {/* Espacios vacíos del primer día del mes */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="h-9" />
        ))}

        {/* Días del Mes */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1
          const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`

          const isPast = dayStr < todayStr
          const isBooked = bookedDates.includes(dayStr)
          const isWashing = washingDates.includes(dayStr)
          const isSelected = selectedDateStr === dayStr
          const isDisabled = isPast || isBooked || isWashing

          return (
            <button
              key={dayStr}
              type="button"
              disabled={isDisabled}
              onClick={() => setSelectedDateStr(dayStr)}
              className={cn(
                "h-9.5 rounded-lg flex flex-col items-center justify-center relative transition-all text-xs font-medium border",
                isSelected && "bg-emerald-600 border-emerald-700 text-white font-bold shadow-sm scale-105 z-10",
                !isSelected && !isDisabled && "bg-white border-zinc-200 text-zinc-800 hover:border-emerald-400 hover:bg-emerald-50/50",
                isPast && "bg-zinc-100 border-transparent text-zinc-300 cursor-not-allowed",
                isBooked && "bg-rose-50 border-rose-200 text-rose-700 line-through font-semibold cursor-not-allowed opacity-90",
                isWashing && "bg-purple-50 border-purple-200 text-purple-700 line-through font-semibold cursor-not-allowed opacity-90"
              )}
            >
              <span>{dayNum}</span>

              {/* Indicador visual de estado */}
              {isBooked && (
                <span className="text-[7.5px] font-bold text-rose-600 no-underline leading-none mt-0.5">
                  Rentado
                </span>
              )}
              {isWashing && (
                <span className="text-[7.5px] font-bold text-purple-600 no-underline leading-none mt-0.5">
                  Lavado
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Resumen de Fecha Seleccionada */}
      {selectedDateStr ? (
        <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg space-y-1 text-xs text-emerald-900 mt-1">
          <p className="font-semibold flex items-center gap-1.5 capitalize text-emerald-950">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Renta para el {formatDisplayDate(selectedDateStr)}
          </p>
          {returnDateStr && (
            <p className="text-[11px] text-emerald-700 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-purple-600 shrink-0" />
              Devolución y lavado obligatorio: {formatDisplayDate(returnDateStr)} (Tachado para otros clientes)
            </p>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-zinc-500 text-center py-1 italic">
          Selecciona un día libre disponible en verde para rentar tu prenda.
        </p>
      )}

      {/* Botones de Acción */}
      <div className="flex gap-2 pt-1">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onCancel}
          type="button"
          className="flex-1 py-2.5 border border-zinc-200 text-zinc-600 text-xs font-medium rounded-lg hover:bg-zinc-100 transition-colors"
        >
          Cancelar
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onConfirm(selectedDateStr)}
          disabled={!selectedDateStr || aparting}
          type="button"
          className="flex-1 py-2.5 bg-zinc-900 text-white text-xs font-medium tracking-wide rounded-lg flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors disabled:opacity-40"
        >
          {aparting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Confirmar Renta
        </motion.button>
      </div>
    </div>
  )
}
