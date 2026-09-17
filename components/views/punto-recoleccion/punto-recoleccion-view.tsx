"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Building2,
  MapPin,
  Target,
  Shirt,
  Sparkles,
  QrCode,
  Scan,
  CheckCircle2,
  LogOut,
  TrendingUp,
  PackageCheck,
  Users,
  Calendar,
  Plus,
  Search,
  ShieldCheck,
  Clock,
  Camera,
  CameraOff,
  RefreshCw
} from "lucide-react"
import { useAuthContext } from "@/context/auth-context"
import { Input } from "@/components/ui/input"
import { CenteredModal } from "@/components/shared/centered-modal"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import {
  fetchAcopioRegistros,
  validarTicketQR,
  registrarDonacionPresencial,
} from "@/services/donaciones.service"
import type { AcopioRegistroDB } from "@/types/donaciones"

interface CategoriaMeta {
  categoria: string
  meta: number
  actual: number
  icono: string
  prioridad: "alta" | "media" | "normal"
}

const METAS_CATEGORIAS_INICIALES: CategoriaMeta[] = [
  { categoria: "Abrigos e Invierno", meta: 150, actual: 0, icono: "🧥", prioridad: "alta" },
  { categoria: "Ropa Infantil y Bebé", meta: 120, actual: 0, icono: "👶", prioridad: "alta" },
  { categoria: "Calzado y Zapatos", meta: 130, actual: 0, icono: "👟", prioridad: "media" },
  { categoria: "Ropa Casual / Pantalones", meta: 100, actual: 0, icono: "👕", prioridad: "normal" },
]

export function PuntoRecoleccionView() {
  const { userName, userEmail, logout } = useAuthContext()
  const supabase = createBrowserSupabaseClient()

  // Real DB state
  const [acopioRegistros, setAcopioRegistros] = useState<AcopioRegistroDB[]>([])
  const [loadingDB, setLoadingDB] = useState(true)

  // Goal state
  const targetMonthlyGoal = 500
  const [categoriasMetas, setCategoriasMetas] = useState<CategoriaMeta[]>(METAS_CATEGORIAS_INICIALES)

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [manualTicketInput, setManualTicketInput] = useState("")
  const [scannerStatus, setScannerStatus] = useState<"idle" | "scanning" | "success" | "error">("idle")
  const [scannerErrorMsg, setScannerErrorMsg] = useState<string | null>(null)
  const [verifiedPackage, setVerifiedPackage] = useState<{ name: string; count: number; points: number; prendasResumen?: string } | null>(null)

  // Camera video stream state & ref
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Manual donation form state
  const [donorNameInput, setDonorNameInput] = useState("")
  const [donorPrendasCount, setDonorPrendasCount] = useState<number>(3)
  const [donorCategoriaInput, setDonorCategoriaInput] = useState("Abrigos e Invierno")
  const [manualSuccessMsg, setManualSuccessMsg] = useState(false)

  // Fetch real database records from Supabase `acopio_registros`
  const loadDBRecords = useCallback(async () => {
    setLoadingDB(true)
    try {
      const data = await fetchAcopioRegistros(supabase)
      setAcopioRegistros(data)

      // Calculate category breakdown from real DB data
      let abrigos = 0
      let infantil = 0
      let calzado = 0
      let casual = 0

      data.forEach((r) => {
        const obs = (r.observaciones || "").toLowerCase()
        if (obs.includes("abrigo") || obs.includes("invierno")) abrigos += r.cantidad_prendas
        else if (obs.includes("infantil") || obs.includes("bebé") || obs.includes("niño")) infantil += r.cantidad_prendas
        else if (obs.includes("calzado") || obs.includes("zapato")) calzado += r.cantidad_prendas
        else casual += r.cantidad_prendas
      })

      setCategoriasMetas([
        { categoria: "Abrigos e Invierno", meta: 150, actual: abrigos, icono: "🧥", prioridad: "alta" },
        { categoria: "Ropa Infantil y Bebé", meta: 120, actual: infantil, icono: "👶", prioridad: "alta" },
        { categoria: "Calzado y Zapatos", meta: 130, actual: calzado, icono: "👟", prioridad: "media" },
        { categoria: "Ropa Casual / Pantalones", meta: 100, actual: casual, icono: "👕", prioridad: "normal" },
      ])
    } catch (err) {
      console.error("Error loading acopio_registros:", err)
    } finally {
      setLoadingDB(false)
    }
  }, [supabase])

  useEffect(() => {
    loadDBRecords()
  }, [loadDBRecords])

  // Camera handling
  useEffect(() => {
    if (!isScannerOpen || scannerStatus === "success") {
      setCameraActive(false)
      return
    }

    let activeStream: MediaStream | null = null

    async function startCamera() {
      setCameraError(null)
      try {
        if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
          throw new Error("El navegador no soporta o bloquea la cámara en vivo.")
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        })

        activeStream = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
          setCameraActive(true)
        }
      } catch (err) {
        console.warn("[PuntoRecoleccion Camera] Could not activate stream:", err)
        setCameraError(
          err instanceof Error ? err.message : "Cámara no disponible o permiso denegado"
        )
        setCameraActive(false)
      }
    }

    startCamera()

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isScannerOpen, scannerStatus])

  // Compute metrics dynamically from Supabase database rows
  const garmentsCollectedMonth = acopioRegistros.reduce((sum, r) => sum + (r.cantidad_prendas || 0), 0)
  const ticketsValidatedCount = acopioRegistros.length
  const pointsDistributed = acopioRegistros.reduce((sum, r) => sum + (r.puntos_otorgados || 0), 0)
  const familiasBeneficiadas = Math.ceil(garmentsCollectedMonth / 4)

  const percentGoal = Math.min(100, Math.round((garmentsCollectedMonth / targetMonthlyGoal) * 100))
  const remainingPrendas = Math.max(0, targetMonthlyGoal - garmentsCollectedMonth)

  // Handle QR scanning or ticket verification automatically
  async function handleConfirmTicketValidation(token: string) {
    if (!token.trim()) return
    setScannerStatus("scanning")
    setScannerErrorMsg(null)

    try {
      const res = await validarTicketQR(
        supabase,
        token.trim(),
        "norte",
        userName || "Centro de Acopio Norte"
      )

      if (res.success) {
        setVerifiedPackage({
          name: res.donorName || "Donante ClossApp",
          count: res.cantidadPrendas,
          points: res.puntos,
          prendasResumen: res.prendasResumen,
        })

        // Sincronizar en localStorage el saldo local de puntos para pruebas inmediatas
        try {
          const currentStr = localStorage.getItem("clossapp_user_puntos_v1")
          const current = currentStr ? parseInt(currentStr, 10) : 150
          localStorage.setItem("clossapp_user_puntos_v1", (current + res.puntos).toString())
        } catch {}

        setScannerStatus("success")
        await loadDBRecords()
      } else {
        setScannerErrorMsg("Ticket no válido o ya procesado.")
        setScannerStatus("error")
      }
    } catch (err) {
      console.error("Verification error:", err)
      setScannerErrorMsg(err instanceof Error ? err.message : "Error al validar el ticket.")
      setScannerStatus("error")
    }
  }

  // Handle direct walk-in donation registration
  async function handleRegisterWalkInDonation() {
    if (donorPrendasCount <= 0) return

    const points = donorPrendasCount >= 3 ? 100 + (donorPrendasCount - 3) * 20 : 0
    const name = donorNameInput.trim() || "Donante Presencial"

    const created = await registrarDonacionPresencial(supabase, {
      puntoAcopioId: "norte",
      puntoAcopioNombre: userName || "Centro de Acopio Norte",
      donorName: name,
      cantidadPrendas: donorPrendasCount,
      puntos: points,
      categoria: donorCategoriaInput,
    })

    if (created) {
      setManualSuccessMsg(true)
      await loadDBRecords()
      setTimeout(() => {
        setManualSuccessMsg(false)
        setIsManualModalOpen(false)
        setDonorNameInput("")
        setDonorPrendasCount(3)
      }, 1200)
    }
  }

  const filteredRegistros = acopioRegistros.filter(
    (r) =>
      (r.donor_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.punto_acopio_nombre || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.observaciones || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-20">
      {/* Top Header Bar for Collection Point Operator */}
      <header className="sticky top-0 z-30 bg-zinc-900 text-white border-b border-zinc-800 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-base sm:text-lg font-medium text-white">
                  {userName || "Centro de Acopio Norte"}
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-full font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Punto Operativo
                </span>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Saltillo - Zona San Patricio · ID: #CP-8840</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadDBRecords()}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDB ? "animate-spin text-emerald-400" : ""}`} />
            </button>

            <div className="hidden sm:flex flex-col items-end text-xs text-zinc-300">
              <span className="font-medium text-white">{userEmail || "recoleccion@clossapp.com"}</span>
              <span className="text-[10px] text-zinc-400">Operador Autorizado</span>
            </div>

            <button
              onClick={logout}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors rounded-none"
              title="Cerrar sesión de operador"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* Banner: Operación de Donaciones e Identificación */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white p-5 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-1 border border-emerald-800/50 inline-block mb-1">
              Portal Exclusivo Puntos de Recolección
            </span>
            <h2 className="font-serif text-xl sm:text-2xl text-white">
              Panel de Control y Metas Mensuales de Recolección
            </h2>
            <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
              Registra y verifica paquetes de ropa donada, acredita Puntos ClossApp a los donantes y da seguimiento en tiempo real al cumplimiento de las metas comunitarias del mes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setScannerStatus("idle")
                setVerifiedPackage(null)
                setScannerErrorMsg(null)
                setIsScannerOpen(true)
              }}
              className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Scan className="w-4 h-4 text-zinc-950" />
              <span>Escanear QR de Donante</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsManualModalOpen(true)}
              className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Registrar Donación Presencial</span>
            </motion.button>
          </div>
        </div>

        {/* SECTION 1: METAS DE ROPA DONADA DEL MES */}
        <section className="bg-white border border-zinc-200 p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-zinc-900">
                  Meta de Ropa Donada del Mes
                </h3>
                <p className="text-xs text-zinc-500">
                  Objetivo comunitario — Septiembre 2026
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-zinc-100 border border-zinc-200 px-3 py-1 text-zinc-700 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                15 días restantes
              </span>
            </div>
          </div>

          {/* Big Progress Bar Card */}
          <div className="bg-zinc-50 border border-zinc-200 p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Progreso Global del Mes</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-serif text-3xl sm:text-4xl text-zinc-900 font-semibold">
                    {garmentsCollectedMonth}
                  </span>
                  <span className="text-sm font-medium text-zinc-500">
                    / {targetMonthlyGoal} prendas meta
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-2xl font-mono font-bold text-emerald-700">
                  {percentGoal}%
                </span>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  Faltan <strong className="text-zinc-900">{remainingPrendas} prendas</strong> para alcanzar el 100%
                </p>
              </div>
            </div>

            {/* Custom Progress Bar */}
            <div className="w-full bg-zinc-200 h-4 rounded-full overflow-hidden relative border border-zinc-300/60">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentGoal}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full relative"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono pt-1">
              <span>0 prendas</span>
              <span>250 prendas (50%)</span>
              <span className="font-bold text-zinc-800">500 prendas (Meta Final)</span>
            </div>
          </div>

          {/* Breakdown by Priority Categories */}
          <div>
            <h4 className="text-xs uppercase font-mono tracking-wider text-zinc-500 mb-3 font-semibold">
              Metas por Categoria Prioritaria
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {categoriasMetas.map((cat) => {
                const pct = cat.meta > 0 ? Math.min(100, Math.round((cat.actual / cat.meta) * 100)) : 0
                return (
                  <div key={cat.categoria} className="border border-zinc-200 p-3.5 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg">{cat.icono}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 uppercase font-medium ${
                          cat.prioridad === "alta"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {cat.prioridad === "alta" ? "Alta demanda" : "Normal"}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-zinc-900 truncate">{cat.categoria}</p>
                      <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        {cat.actual} / {cat.meta} prendas ({pct}%)
                      </p>
                    </div>

                    <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden border border-zinc-200">
                      <div className="bg-zinc-800 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* SECTION 2: MÉTRICAS DE RECOLECCIÓN DE ESTE MES */}
        <section className="space-y-3">
          <h3 className="font-serif text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Métricas de Recolección de este Mes
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-zinc-200 p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-zinc-400">
                <Shirt className="w-4 h-4 text-emerald-600" />
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5">
                  Registradas
                </span>
              </div>
              <p className="font-serif text-2xl sm:text-3xl text-zinc-900 font-bold">{garmentsCollectedMonth}</p>
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Prendas donadas en mes</p>
            </div>

            <div className="bg-white border border-zinc-200 p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-zinc-400">
                <PackageCheck className="w-4 h-4 text-zinc-700" />
                <span className="text-[10px] font-mono text-zinc-500">Verificados</span>
              </div>
              <p className="font-serif text-2xl sm:text-3xl text-zinc-900 font-bold">{ticketsValidatedCount}</p>
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Tickets / Paquetes</p>
            </div>

            <div className="bg-white border border-zinc-200 p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-zinc-400">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5">Entregados</span>
              </div>
              <p className="font-serif text-2xl sm:text-3xl text-amber-600 font-bold">{pointsDistributed.toLocaleString()}</p>
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Puntos ClossApp creados</p>
            </div>

            <div className="bg-white border border-zinc-200 p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-zinc-400">
                <Users className="w-4 h-4 text-indigo-600" />
                <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5">Comunidad</span>
              </div>
              <p className="font-serif text-2xl sm:text-3xl text-zinc-900 font-bold">{familiasBeneficiadas}</p>
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Familias beneficiadas</p>
            </div>
          </div>
        </section>

        {/* SECTION 3: RECEPTION TOOL & RECENT ACTIVITY LOG */}
        <section className="bg-white border border-zinc-200 p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
            <div>
              <h3 className="font-serif text-lg font-semibold text-zinc-900">
                Historial de Donaciones Recibidas en este Punto
              </h3>
              <p className="text-xs text-zinc-500">
                Registro de tickets escaneados y confirmados en el centro de acopio
              </p>
            </div>

            {/* Quick manual lookup bar */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por donante o detalle..."
                className="pl-9 h-9 text-xs rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900"
              />
            </div>
          </div>

          {filteredRegistros.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-zinc-200 text-zinc-400">
              <QrCode className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No hay registros de donación aún.</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Usa el escáner o el botón de registro presencial para recibir prendas.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 border border-zinc-200">
              {filteredRegistros.map((item) => (
                <div
                  key={item.id}
                  className="p-4 hover:bg-zinc-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900">{item.donor_name}</span>
                        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 px-2 py-0.5 border border-zinc-200">
                          {item.punto_acopio_nombre}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-600 mt-0.5">{item.observaciones || "Verificado"}</p>
                      <p className="text-[10px] text-zinc-400 font-mono mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.fecha_registro).toLocaleString("es-MX", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100">
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 border border-emerald-200 font-mono flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      +{item.puntos_otorgados} Puntos acreditados
                    </span>
                    <span className="text-[11px] text-zinc-700 font-medium mt-1">
                      {item.cantidad_prendas} prendas verificadas
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* MODAL 1: LIVE QR SCANNER FOR OPERATOR */}
      <CenteredModal open={isScannerOpen} onClose={() => setIsScannerOpen(false)}>
        <div className="p-1 space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="bg-zinc-900 text-white p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Scan className="w-4 h-4 text-emerald-400" />
              <span className="font-medium">Escáner Oficial de Punto de Recolección</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase">San Patricio</span>
          </div>

          {scannerStatus !== "success" ? (
            <div className="space-y-4">
              {/* Live Camera Stream Viewfinder */}
              <div className="relative h-56 bg-zinc-950 border-2 border-emerald-500/60 overflow-hidden flex flex-col items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                    cameraActive ? "opacity-100" : "opacity-0"
                  }`}
                />

                {/* Overlaid scanning laser animation */}
                <motion.div
                  animate={{ y: [-65, 65, -65] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute w-full h-0.5 bg-emerald-400 shadow-[0_0_14px_#34d399] z-10 pointer-events-none"
                />

                {/* Status Badges */}
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 text-[10px] font-mono text-emerald-400 border border-emerald-500/40">
                  <span
                    className={`w-2 h-2 rounded-full ${cameraActive ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`}
                  />
                  <span>{cameraActive ? "CÁMARA EN VIVO ACTIVA" : "VISOR DE ESCÁNER"}</span>
                </div>

                {!cameraActive && (
                  <div className="relative z-10 flex flex-col items-center justify-center p-4 text-center space-y-1 bg-black/40 backdrop-blur-xs w-full h-full">
                    {cameraError ? (
                      <CameraOff className="w-10 h-10 text-amber-400 mb-1" />
                    ) : (
                      <Camera className="w-10 h-10 text-emerald-400/80 animate-pulse mb-1" />
                    )}
                    <p className="text-xs text-zinc-200 font-mono">
                      {cameraError ? "Sin acceso a cámara física" : "Iniciando visor del escáner..."}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-mono max-w-xs mt-0.5">
                      Apunte la cámara al código QR del donante para registrar las prendas
                    </p>
                  </div>
                )}
              </div>

              {scannerErrorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {scannerErrorMsg}
                </div>
              )}

              {/* Token Input */}
              <div className="space-y-2 border-t border-zinc-200 pt-3">
                <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-semibold">
                  Ingrese o pegue el código del ticket QR:
                </label>
                <div className="flex gap-2">
                  <Input
                    value={manualTicketInput}
                    onChange={(e) => setManualTicketInput(e.target.value)}
                    placeholder="Ej. TKT-SR8829X"
                    className="h-10 text-xs rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 font-mono uppercase"
                  />
                  <button
                    disabled={scannerStatus === "scanning"}
                    onClick={() => {
                      const token = manualTicketInput.trim()
                      handleConfirmTicketValidation(token)
                    }}
                    className="px-4 bg-zinc-900 text-white text-xs font-semibold shrink-0 disabled:opacity-50"
                  >
                    {scannerStatus === "scanning" ? "Procesando..." : "Validar Ticket"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 flex flex-col items-center text-center space-y-3 bg-emerald-50/60 border border-emerald-200 p-6"
            >
              <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h4 className="font-serif text-xl font-semibold text-zinc-900">
                ¡Recepción y Puntos Acreditados!
              </h4>

              <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">
                Donación de <strong>{verifiedPackage?.count} prendas</strong> entregadas por <strong>{verifiedPackage?.name}</strong>.
              </p>
              {verifiedPackage?.prendasResumen && (
                <p className="text-[11px] text-zinc-600 font-mono bg-white border border-emerald-200 px-3 py-1.5 text-center max-w-xs">
                  📦 {verifiedPackage.prendasResumen}
                </p>
              )}

              <div className="bg-white border border-emerald-300 px-4 py-2 font-mono text-xs text-emerald-800 font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>+{verifiedPackage?.points} Puntos ClossApp cargados al usuario</span>
              </div>

              <button
                onClick={() => {
                  setScannerStatus("idle")
                  setIsScannerOpen(false)
                }}
                className="mt-3 text-xs text-zinc-700 underline font-medium hover:text-zinc-900"
              >
                Cerrar Escáner
              </button>
            </motion.div>
          )}
        </div>
      </CenteredModal>

      {/* MODAL 2: MANUAL WALK-IN DONATION FORM */}
      <CenteredModal open={isManualModalOpen} onClose={() => setIsManualModalOpen(false)}>
        <div className="p-1 space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="bg-zinc-900 text-white p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Plus className="w-4 h-4 text-amber-400" />
              <span className="font-medium">Registrar Donación Física Presencial</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">Sin QR previo</span>
          </div>

          {!manualSuccessMsg ? (
            <div className="space-y-4">
              <p className="text-xs text-zinc-600">
                Usa este formulario para registrar prendas entregadas directamente en el punto de acopio por un donante presencial.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">
                    Nombre del donante (opcional)
                  </label>
                  <Input
                    value={donorNameInput}
                    onChange={(e) => setDonorNameInput(e.target.value)}
                    placeholder="Ej. Gabriel Morales"
                    className="mt-1 h-10 text-xs rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">
                    Cantidad de prendas recibidas
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={donorPrendasCount}
                    onChange={(e) => setDonorPrendasCount(parseInt(e.target.value, 10) || 1)}
                    className="mt-1 h-10 text-xs rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">
                    Categoría principal
                  </label>
                  <select
                    value={donorCategoriaInput}
                    onChange={(e) => setDonorCategoriaInput(e.target.value)}
                    className="mt-1 w-full h-10 text-xs rounded-none border border-zinc-300 bg-white px-3 focus:outline-none focus:border-zinc-900"
                  >
                    <option value="Abrigos e Invierno">Abrigos e Invierno</option>
                    <option value="Ropa Infantil y Bebé">Ropa Infantil y Bebé</option>
                    <option value="Calzado y Zapatos">Calzado y Zapatos</option>
                    <option value="Ropa Casual / Pantalones">Ropa Casual / Pantalones</option>
                  </select>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <p className="font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Puntos estimados: +{donorPrendasCount >= 3 ? 100 + (donorPrendasCount - 3) * 20 : 0} Puntos
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Se sumarán automáticamente a la meta mensual del centro de acopio.
                  </p>
                </div>
              </div>

              <button
                onClick={handleRegisterWalkInDonation}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold tracking-wide transition-colors"
              >
                Confirmar e Ingresar Donación
              </button>
            </div>
          ) : (
            <div className="py-6 text-center space-y-2 bg-emerald-50 border border-emerald-200 p-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="font-serif text-lg font-semibold text-zinc-900">¡Donación Presencial Registrada!</p>
              <p className="text-xs text-zinc-600">Sumada exitosamente al historial de recolección.</p>
            </div>
          )}
        </div>
      </CenteredModal>
    </div>
  )
}
