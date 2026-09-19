import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Scan, CheckCircle2, Building2, Shirt, Sparkles, AlertCircle, Camera, CameraOff, Database, History } from "lucide-react"
import { CenteredModal } from "@/components/shared/centered-modal"
import type { DonacionTicket, AcopioRegistroDB } from "@/types/donaciones"

interface CentroScannerModalProps {
  ticket: DonacionTicket | null
  isOpen: boolean
  onClose: () => void
  onVerifyTicket: (ticketId: string) => void
  acopioRegistros?: AcopioRegistroDB[]
}

export function CentroScannerModal({
  ticket,
  isOpen,
  onClose,
  onVerifyTicket,
  acopioRegistros = [],
}: CentroScannerModalProps) {
  const [scanned, setScanned] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  // Camera video stream state & ref
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || scanned) {
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
        console.warn("[CentroScanner Camera] Could not activate stream:", err)
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
  }, [isOpen, scanned])

  if (!ticket) return null

  async function handleScanSimulation() {
    if (!ticket) return
    setIsVerifying(true)
    try {
      await onVerifyTicket(ticket.id)
      setScanned(true)
    } catch (err) {
      console.error("Verification failed:", err)
    } finally {
      setIsVerifying(false)
    }
  }

  function handleCloseModal() {
    setScanned(false)
    onClose()
  }

  return (
    <CenteredModal open={isOpen} onClose={handleCloseModal}>
      <div className="flex flex-col gap-5 p-1 max-h-[80vh] overflow-y-auto">
        {/* Banner de ROL */}
        <div className="bg-zinc-900 text-white p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">{ticket.puntoAcopioNombre}</span>
          </div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 bg-zinc-800 px-2 py-0.5 border border-emerald-500/30 flex items-center gap-1">
            <Database className="w-3 h-3" /> Verificador DB
          </span>
        </div>

        {!scanned ? (
          <div className="flex flex-col gap-4">
            {/* Live Camera Stream Viewfinder */}
            <div className="relative h-48 bg-zinc-950 flex flex-col items-center justify-center overflow-hidden border-2 border-emerald-500/60">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  cameraActive ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* Scanning laser animation */}
              <motion.div
                animate={{ y: [-45, 45, -45] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-full h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] z-10 pointer-events-none"
              />

              {/* Camera Badges */}
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 text-[10px] font-mono text-emerald-400 border border-emerald-500/40">
                <span
                  className={`w-2 h-2 rounded-full ${
                    cameraActive ? "bg-emerald-400 animate-ping" : "bg-amber-400"
                  }`}
                />
                <span>{cameraActive ? "CÁMARA EN VIVO ACTIVA" : "MODO ESCÁNER EN VIVO"}</span>
              </div>

              {!cameraActive && (
                <div className="relative z-10 flex flex-col items-center justify-center p-4 text-center space-y-1 bg-black/40 backdrop-blur-xs w-full h-full">
                  {cameraError ? (
                    <CameraOff className="w-10 h-10 text-amber-400 mb-1" />
                  ) : (
                    <Camera className="w-10 h-10 text-emerald-400/80 animate-pulse mb-1" />
                  )}
                  <p className="text-xs text-zinc-300 font-mono">
                    {cameraError ? "Sin acceso a cámara física" : "Iniciando visor del escáner..."}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">
                    QR Token: {ticket.qrToken}
                  </p>
                </div>
              )}
            </div>

            {/* Ticket Information preview */}
            <div className="border border-zinc-200 bg-zinc-50 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span className="text-xs text-zinc-500">Donante:</span>
                <span className="text-xs font-semibold text-zinc-900">
                  {ticket.donorName || "Donante ClossApp"} {ticket.donorEmail ? `(${ticket.donorEmail})` : ""}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span className="text-xs text-zinc-500">QR Token:</span>
                <span className="text-xs font-mono font-bold text-zinc-900 bg-zinc-200 px-2 py-0.5">
                  {ticket.qrToken}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span className="text-xs text-zinc-500">Prendas registradas:</span>
                <span className="text-xs font-medium text-zinc-900 flex items-center gap-1">
                  <Shirt className="w-3.5 h-3.5 text-zinc-700" />
                  {ticket.cantidadPrendas} {ticket.cantidadPrendas === 1 ? "prenda" : "prendas"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Puntos a otorgar al donante:</span>
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-100 px-2 py-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  +{ticket.puntosOtorgados} Puntos ClossApp
                </span>
              </div>
            </div>

            {/* List of prendas included for physical check */}
            {ticket.prendas && ticket.prendas.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 font-semibold flex items-center gap-1">
                  <Shirt className="w-3.5 h-3.5 text-emerald-600" />
                  Inspección de prendas ({ticket.prendas.length}):
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 bg-zinc-100 border border-zinc-200">
                  {ticket.prendas.map((p: any, idx: number) => (
                    <div key={p.id || idx} className="bg-white border border-zinc-200 p-2 flex items-center gap-2 text-left">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-9 h-9 object-cover shrink-0 border border-zinc-200" />
                      ) : (
                        <div className="w-9 h-9 bg-zinc-200 flex items-center justify-center shrink-0">
                          <Shirt className="w-4 h-4 text-zinc-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-zinc-900 truncate">{p.name || p.categoria || "Prenda"}</p>
                        <p className="text-[10px] text-zinc-500 truncate">
                          {p.category || "General"} {p.talla ? `· Talla ${p.talla}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ticket.cantidadPrendas < 3 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Nota: Esta donación tiene menos de 3 prendas (no genera puntos extra).</span>
              </div>
            )}

            {/* Action button to trigger scan/verification */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={isVerifying}
              onClick={handleScanSimulation}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isVerifying ? (
                <span>Procesando recepción y acreditando puntos...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Recibir Ropa y Agregar {ticket.puntosOtorgados} Puntos a {ticket.donorName || "Donante ClossApp"}</span>
                </>
              )}
            </motion.button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-6 text-center border border-emerald-200 bg-emerald-50/50 p-6"
          >
            <div className="w-14 h-14 bg-emerald-600 text-white flex items-center justify-center rounded-full shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <p className="font-serif text-xl font-bold text-zinc-900">
              ¡Ropa Recibida y {ticket.puntosOtorgados} Puntos Acreditados!
            </p>

            <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">
              Donante: <strong>{ticket.donorName || "Donante ClossApp"}</strong> · Entregó <strong>{ticket.cantidadPrendas} prendas</strong> en {ticket.puntoAcopioNombre}.
            </p>

            <div className="bg-white border border-emerald-300 px-4 py-2.5 flex items-center gap-2 text-xs font-semibold text-emerald-800 shadow-xs">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>+{ticket.puntosOtorgados} Puntos sumados a {ticket.donorName || "la cuenta del donante"}</span>
            </div>

            <div className="w-full text-left bg-white border border-zinc-200 p-3 mt-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2">
                <History className="w-3.5 h-3.5 text-emerald-600" />
                Bitácora de Registros Recientes en BD
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1.5 text-xs font-mono">
                {acopioRegistros.slice(0, 3).map((r) => (
                  <div key={r.id} className="p-1.5 bg-zinc-50 border border-zinc-100 flex justify-between items-center text-[11px]">
                    <span className="truncate max-w-[140px]">{r.punto_acopio_nombre}</span>
                    <span className="text-emerald-700 font-bold">+{r.puntos_otorgados} pts</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleCloseModal}
              className="mt-2 text-xs text-zinc-600 underline font-medium hover:text-zinc-900"
            >
              Cerrar escáner
            </button>
          </motion.div>
        )}
      </div>
    </CenteredModal>
  )
}
