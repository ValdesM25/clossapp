"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, MapPin, Truck, Check, Sparkles, QrCode, Scan, ArrowRight, ShieldCheck, CheckSquare, Square } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { PUNTOS_ACOPIO, CAUSAS, IMPACTO_DEMO, MIN_PRENDAS_PUNTOS, calcularPuntosDonacion, type ModoEntrega } from "@/constants/donaciones"
import type { Prenda, DonacionTicket } from "@/types"
import { QRDonacionModal } from "./qr-donacion-modal"
import { CentroScannerModal } from "./centro-scanner-modal"

type Paso = "intro" | "seleccion" | "entrega" | "ticket"

interface DonacionPanelProps {
  prendas: Prenda[]
  isGuest: boolean
}

const STORAGE_PUNTOS_KEY = "clossapp_user_puntos_v1"
const STORAGE_TICKETS_KEY = "clossapp_donacion_tickets_v1"

export function DonacionPanel({ prendas, isGuest }: DonacionPanelProps) {
  const [paso, setPaso] = useState<Paso>("intro")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [modo, setModo] = useState<ModoEntrega>("acopio")
  const [puntoId, setPuntoId] = useState(PUNTOS_ACOPIO[0].id)
  const [direccion, setDireccion] = useState("")

  // State for Tickets and Points
  const [puntos, setPuntos] = useState<number>(150) // demo initial balance
  const [tickets, setTickets] = useState<DonacionTicket[]>([])
  const [activeTicket, setActiveTicket] = useState<DonacionTicket | null>(null)
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)
  const [scannerTicket, setScannerTicket] = useState<DonacionTicket | null>(null)
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  // Load persisted state
  useEffect(() => {
    try {
      const savedPuntos = localStorage.getItem(STORAGE_PUNTOS_KEY)
      if (savedPuntos !== null) setPuntos(parseInt(savedPuntos, 10))

      const savedTickets = localStorage.getItem(STORAGE_TICKETS_KEY)
      if (savedTickets) setTickets(JSON.parse(savedTickets))
    } catch {
      // fallback to initial state
    }
  }, [])

  // Save state
  function updatePuntos(newPuntos: number) {
    setPuntos(newPuntos)
    try {
      localStorage.setItem(STORAGE_PUNTOS_KEY, newPuntos.toString())
    } catch {}
  }

  function saveTickets(newTickets: DonacionTicket[]) {
    setTickets(newTickets)
    try {
      localStorage.setItem(STORAGE_TICKETS_KEY, JSON.stringify(newTickets))
    } catch {}
  }

  const disponibles = prendas.filter((p) => !p.en_venta && !p.en_renta)
  const cantidadSeleccionada = selectedIds.length
  const puntosEstimados = calcularPuntosDonacion(cantidadSeleccionada)
  const puntoSeleccionado = PUNTOS_ACOPIO.find((p) => p.id === puntoId) ?? PUNTOS_ACOPIO[0]
  const puedeConfirmar = modo === "acopio" || direccion.trim().length > 0

  function togglePrenda(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  function handleCrearTicket() {
    if (selectedIds.length === 0) return

    const prendasSeleccionadas = disponibles.filter((p) => selectedIds.includes(p.id))
    const token = `TKT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`

    const nuevoTicket: DonacionTicket = {
      id: `don_${Date.now()}`,
      qrToken: token,
      userId: isGuest ? "guest" : "user_active",
      puntoAcopioId: puntoId,
      puntoAcopioNombre: puntoSeleccionado.nombre,
      status: "pendiente",
      prendas: prendasSeleccionadas,
      cantidadPrendas: prendasSeleccionadas.length,
      puntosOtorgados: puntosEstimados,
      createdAt: new Date().toISOString(),
    }

    const updated = [nuevoTicket, ...tickets]
    saveTickets(updated)
    setActiveTicket(nuevoTicket)
    setIsQRModalOpen(true)
    setPaso("intro")
    setSelectedIds([])
  }

  function handleVerifyTicket(ticketId: string) {
    const target = tickets.find((t) => t.id === ticketId)
    if (!target || target.status === "completado") return

    // Add points
    const newTotalPuntos = puntos + target.puntosOtorgados
    updatePuntos(newTotalPuntos)

    // Mark ticket completed
    const updatedTickets = tickets.map((t) =>
      t.id === ticketId
        ? {
            ...t,
            status: "completado" as const,
            validatedAt: new Date().toISOString(),
            validatedBy: t.puntoAcopioNombre,
          }
        : t
    )
    saveTickets(updatedTickets)

    if (activeTicket?.id === ticketId) {
      setActiveTicket({
        ...activeTicket,
        status: "completado",
        validatedAt: new Date().toISOString(),
      })
    }
  }

  function reiniciar() {
    setPaso("intro")
    setSelectedIds([])
    setModo("acopio")
    setPuntoId(PUNTOS_ACOPIO[0].id)
    setDireccion("")
  }

  return (
    <div className="px-4 flex flex-col gap-5 pb-8">
      {/* Top Banner: User Puntos ClossApp Balance */}
      <div className="bg-zinc-900 text-white p-4 border border-zinc-800 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">Tus Puntos ClossApp</p>
            <p className="font-serif text-xl text-amber-300 font-medium">{puntos} pts</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] bg-zinc-800 text-amber-300 border border-amber-400/30 px-2.5 py-1 font-mono uppercase tracking-wide">
            Canjeables en Suscripciones
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {paso === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-5"
          >
            {/* Header Message */}
            <div className="border border-zinc-200 p-5 flex flex-col gap-3 bg-white">
              <div className="flex items-center justify-between">
                <Heart className="w-5 h-5 text-zinc-900" />
                <span className="text-[10px] font-mono uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verificación por QR
                </span>
              </div>
              <p className="font-serif text-xl text-zinc-900 leading-snug">
                Dona ropa, gana puntos y obtén descuentos en ClossApp
              </p>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Por cada donación de <strong>3 o más prendas</strong> en nuestros puntos de acopio aliados,
                recibes un código QR. Al ser escaneado por el centro, obtienes <strong>Puntos ClossApp</strong> canjeables por meses gratis o descuentos en tu suscripción.
              </p>
            </div>

            {/* Impact Metric Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-zinc-200 p-4 bg-zinc-50">
                <p className="font-serif text-2xl text-zinc-900">{IMPACTO_DEMO.prendasDonadas}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Prendas donadas</p>
              </div>
              <div className="border border-zinc-200 p-4 bg-zinc-50">
                <p className="font-serif text-2xl text-zinc-900">{IMPACTO_DEMO.familiasApoyadas}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Familias apoyadas</p>
              </div>
            </div>

            {/* Rules Banner */}
            <div className="bg-amber-50/70 border border-amber-200 p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-900 text-xs font-semibold">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>¿Cómo funciona la recompensa?</span>
              </div>
              <ul className="text-xs text-amber-800/90 list-disc list-inside space-y-1">
                <li><strong>Donación básica (3 prendas):</strong> 100 Puntos base</li>
                <li><strong>Prenda extra (&gt;3):</strong> +20 Puntos adicionales por cada una</li>
                <li><strong>Canje:</strong> Usa tus puntos en la pestaña "Planes" para tus mensualidades.</li>
              </ul>
            </div>

            {/* Action button */}
            {isGuest ? (
              <p className="text-xs text-zinc-400 border border-zinc-100 p-4 text-center">
                Crea una cuenta para registrar tus donaciones y ganar puntos.
              </p>
            ) : (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setPaso("seleccion")}
                className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <span>Donar prendas y generar Código QR</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            )}

            {/* Active Tickets Section */}
            {tickets.length > 0 && (
              <div className="flex flex-col gap-3 mt-2 border-t border-zinc-200 pt-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">Mis Tickets de Donación</p>
                  <span className="text-xs font-mono text-zinc-400">{tickets.length} total</span>
                </div>

                <div className="flex flex-col gap-2">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setActiveTicket(t)
                        setIsQRModalOpen(true)
                      }}
                      className="border border-zinc-200 p-3 bg-white hover:border-zinc-900 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-100 rounded-sm">
                          <QrCode className="w-5 h-5 text-zinc-800" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-zinc-900">
                            {t.cantidadPrendas} prendas · {t.puntoAcopioNombre}
                          </p>
                          <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                            ID: {t.qrToken.slice(0, 10)}...
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[10px] px-2 py-0.5 font-medium rounded-full ${
                            t.status === "completado"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {t.status === "completado" ? "✓ Entregado" : "Pendiente"}
                        </span>
                        <span className="text-[10px] text-amber-700 font-semibold">
                          +{t.puntosOtorgados} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {paso === "seleccion" && (
          <motion.div
            key="seleccion"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            <button onClick={() => setPaso("intro")} className="text-xs text-zinc-400 underline w-fit">
              ← Volver
            </button>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-serif text-lg text-zinc-900">Selecciona las prendas a donar</p>
                <p className="text-xs text-zinc-500">Puedes seleccionar múltiples prendas</p>
              </div>

              {cantidadSeleccionada > 0 && (
                <span className="text-xs font-mono font-semibold bg-zinc-900 text-white px-2.5 py-1">
                  {cantidadSeleccionada} seleccionadas
                </span>
              )}
            </div>

            {/* Live points badge */}
            <div className={`p-3 border text-xs flex items-center justify-between transition-all ${
              cantidadSeleccionada >= MIN_PRENDAS_PUNTOS
                ? "bg-amber-50 border-amber-300 text-amber-900"
                : "bg-zinc-50 border-zinc-200 text-zinc-600"
            }`}>
              <div className="flex items-center gap-2">
                <Sparkles className={`w-4 h-4 ${cantidadSeleccionada >= MIN_PRENDAS_PUNTOS ? "text-amber-600" : "text-zinc-400"}`} />
                <span>
                  {cantidadSeleccionada >= MIN_PRENDAS_PUNTOS
                    ? `¡Calificas para ganar +${puntosEstimados} Puntos ClossApp!`
                    : `Selecciona al menos ${MIN_PRENDAS_PUNTOS} prendas para ganar Puntos (llevas ${cantidadSeleccionada})`}
                </span>
              </div>
            </div>

            {disponibles.length === 0 ? (
              <p className="text-xs text-zinc-400 border border-zinc-100 p-6 text-center">
                No tienes prendas disponibles en tu armario para donar.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto p-0.5">
                {disponibles.map((p) => {
                  const isSelected = selectedIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePrenda(p.id)}
                      className={cn(
                        "relative overflow-hidden border-2 text-left transition-all bg-white",
                        isSelected ? "border-zinc-900 ring-2 ring-zinc-900/10" : "border-zinc-200 hover:border-zinc-400"
                      )}
                    >
                      <div className="absolute top-1.5 right-1.5 z-10 bg-white/90 p-0.5 rounded-sm">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-zinc-900 fill-zinc-900" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>
                      <img src={p.image_url} alt={p.name} className="w-full h-24 object-cover" />
                      <p className="text-[10px] text-zinc-700 font-medium truncate px-1.5 py-1">{p.name}</p>
                    </button>
                  )
                })}
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={selectedIds.length === 0}
              onClick={() => setPaso("entrega")}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold tracking-wide disabled:opacity-40 transition-colors shadow-sm"
            >
              Continuar ({cantidadSeleccionada} {cantidadSeleccionada === 1 ? "prenda" : "prendas"})
            </motion.button>
          </motion.div>
        )}

        {paso === "entrega" && (
          <motion.div
            key="entrega"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            <button onClick={() => setPaso("seleccion")} className="text-xs text-zinc-400 underline w-fit">
              ← Volver
            </button>

            {/* Selected garments preview summary */}
            <div className="flex items-center justify-between border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-center gap-2 text-xs text-zinc-700">
                <span className="font-semibold">{selectedIds.length} prendas elegidas</span>
                {puntosEstimados > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 font-semibold">
                    +{puntosEstimados} pts
                  </span>
                )}
              </div>
            </div>

            <p className="font-serif text-lg text-zinc-900">¿En qué punto de acopio entregarás?</p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setModo("acopio")}
                className={cn(
                  "border p-4 text-left flex gap-3 transition-colors bg-white",
                  modo === "acopio" ? "border-zinc-900 ring-1 ring-zinc-900" : "border-zinc-200"
                )}
              >
                <MapPin className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-zinc-900">Punto de acopio (Genera QR y Puntos)</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Lleva tu paquete y muestra tu QR para acreditar puntos</p>
                </div>
              </button>

              <button
                onClick={() => setModo("recoleccion")}
                className={cn(
                  "border p-4 text-left flex gap-3 transition-colors bg-white",
                  modo === "recoleccion" ? "border-zinc-900 ring-1 ring-zinc-900" : "border-zinc-200"
                )}
              >
                <Truck className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-zinc-900">Recolección a domicilio</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Coordinamos recolección con chofer aliado</p>
                </div>
              </button>
            </div>

            {modo === "acopio" ? (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">Selecciona el Punto de Acopio</p>
                {PUNTOS_ACOPIO.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPuntoId(p.id)}
                    className={cn(
                      "border px-3 py-3 text-left transition-colors bg-white",
                      puntoId === p.id ? "border-zinc-900 font-medium" : "border-zinc-200 text-zinc-700"
                    )}
                  >
                    <p className="text-xs text-zinc-900">{p.nombre}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{p.zona} · {p.horario}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">
                  Dirección de recolección
                </label>
                <Input
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle, número y colonia"
                  className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-xs"
                />
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={!puedeConfirmar}
              onClick={handleCrearTicket}
              className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold tracking-wide disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2 mt-2"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>Generar Código QR de Donación</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Ticket Modal */}
      <QRDonacionModal
        ticket={activeTicket}
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        onOpenScanner={(t) => {
          setIsQRModalOpen(false)
          setScannerTicket(t)
          setIsScannerOpen(true)
        }}
      />

      {/* Center Scanner Verification Simulator Modal */}
      <CentroScannerModal
        ticket={scannerTicket}
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onVerifyTicket={(tId) => handleVerifyTicket(tId)}
      />
    </div>
  )
}
