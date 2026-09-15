import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Scan, CheckCircle2, Building2, Shirt, Sparkles, AlertCircle, Camera, CameraOff } from "lucide-react"
import { CenteredModal } from "@/components/shared/centered-modal"
import type { DonacionTicket } from "@/types/donaciones"

interface CentroScannerModalProps {
  ticket: DonacionTicket | null
  isOpen: boolean
  onClose: () => void
  onVerifyTicket: (ticketId: string) => void
}

export function CentroScannerModal({ ticket, isOpen, onClose, onVerifyTicket }: CentroScannerModalProps) {
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

  function handleScanSimulation() {
    if (!ticket) return
    setIsVerifying(true)
    setTimeout(() => {
      onVerifyTicket(ticket.id)
      setIsVerifying(false)
      setScanned(true)
    }, 600)
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
          <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 bg-zinc-800 px-2 py-0.5">
            Portal Verificador
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
                <span className={`w-2 h-2 rounded-full ${cameraActive ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`} />
                <span>{cameraActive ? "CÁMARA EN VIVO ACTIVA" : "BUSCANDO CÁMARA"}</span>
              </div>

              {!cameraActive && (
                <div className="relative z-10 flex flex-col items-center justify-center p-4 text-center space-y-1 bg-black/40 backdrop-blur-xs w-full h-full">
                  {cameraError ? (
                    <CameraOff className="w-10 h-10 text-amber-400 mb-1" />
                  ) : (
                    <Camera className="w-10 h-10 text-emerald-400/80 animate-pulse mb-1" />
                  )}
                  <p className="text-xs text-zinc-300 font-mono">
                    {cameraError ? "Sin acceso a cámara en vivo" : "Iniciando cámara del dispositivo..."}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">
                    Token: {ticket.qrToken.slice(0, 16)}...
                  </p>
                </div>
              )}
            </div>

            {/* Ticket Information preview */}
            <div className="border border-zinc-200 bg-zinc-50 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span className="text-xs text-zinc-500">Ticket ID:</span>
                <span className="text-xs font-mono font-medium text-zinc-900">#{ticket.id.slice(0, 8)}</span>
              </div>

              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span className="text-xs text-zinc-500">Prendas registradas:</span>
                <span className="text-xs font-medium text-zinc-900 flex items-center gap-1">
                  <Shirt className="w-3.5 h-3.5 text-zinc-700" />
                  {ticket.cantidadPrendas} prendas
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

            {ticket.cantidadPrendas < 3 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Nota: Esta donación tiene menos de 3 prendas, por lo que no otorga puntos.</span>
              </div>
            )}

            {/* Action button to trigger scan/verification */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={isVerifying}
              onClick={handleScanSimulation}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors"
            >
              {isVerifying ? (
                <span>Validando QR en servidor...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar Recepción de Paquete y Entregar Puntos
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

            <p className="font-serif text-xl text-zinc-900">¡Donación Verificada!</p>

            <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">
              Has verificado la recepción de <strong>{ticket.cantidadPrendas} prendas</strong> en {ticket.puntoAcopioNombre}.
            </p>

            <div className="bg-white border border-emerald-200 px-4 py-2.5 flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>+{ticket.puntosOtorgados} Puntos acreditados al donante</span>
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
