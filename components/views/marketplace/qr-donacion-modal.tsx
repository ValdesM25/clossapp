"use client"

import { QRCodeSVG } from "qrcode.react"
import { motion } from "framer-motion"
import { QrCode, MapPin, CheckCircle2, Clock, Sparkles, X, Scan, Shirt } from "lucide-react"
import { CenteredModal } from "@/components/shared/centered-modal"
import type { DonacionTicket } from "@/types/donaciones"

interface QRDonacionModalProps {
  ticket: DonacionTicket | null
  isOpen: boolean
  onClose: () => void
  onOpenScanner?: (ticket: DonacionTicket) => void
}

export function QRDonacionModal({ ticket, isOpen, onClose }: QRDonacionModalProps) {
  if (!ticket) return null

  const isCompletado = ticket.status === "completado"

  return (
    <CenteredModal open={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {/* Header Badge */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-zinc-900" />
            <span className="font-mono text-xs text-zinc-500 uppercase tracking-wider">
              ID: {ticket.qrToken.slice(0, 8)}...
            </span>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${
              isCompletado
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {isCompletado ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Verificado
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5" /> Pendiente
              </>
            )}
          </span>
        </div>

        {/* QR Display Card */}
        <div className="bg-zinc-900 text-white p-4 sm:p-5 rounded-sm flex flex-col items-center justify-center gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <QrCode className="w-36 h-36 text-white" />
          </div>

          <p className="text-[11px] text-zinc-300 uppercase tracking-widest font-medium">
            Presenta este QR al entregar tu paquete
          </p>

          <div className="bg-white p-3 shadow-md border-2 border-zinc-800 rounded-sm flex items-center justify-center">
            <QRCodeSVG
              value={JSON.stringify({
                tkt: ticket.qrToken,
                id: ticket.id,
                qrToken: ticket.qrToken,
                userId: ticket.userId,
                donorName: ticket.donorName || "Donante ClossApp",
                donorEmail: ticket.donorEmail || "",
                cantidadPrendas: ticket.cantidadPrendas,
                puntos: ticket.puntosOtorgados,
                prendas: ticket.prendas.map((p) => ({
                  id: p.id,
                  name: p.name,
                  category: p.category,
                  talla: p.talla || null,
                })),
              })}
              size={165}
              level="M"
              includeMargin={true}
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/60 px-3 py-1 border border-amber-800/40">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              Recompensa: <strong>+{ticket.puntosOtorgados} Puntos ClossApp</strong>
            </span>
          </div>
        </div>

        {/* Ticket Metadata */}
        <div className="flex flex-col gap-2.5 text-xs text-zinc-600 bg-zinc-50 p-3.5 border border-zinc-200">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5">
            <span className="text-zinc-500">Donante:</span>
            <span className="font-medium text-zinc-900">
              {ticket.donorName || "Donante ClossApp"} {ticket.donorEmail ? `(${ticket.donorEmail})` : ""}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5">
            <span className="text-zinc-500">Punto de acopio:</span>
            <span className="font-medium text-zinc-900 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-zinc-700" />
              {ticket.puntoAcopioNombre}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5">
            <span className="text-zinc-500">Prendas registradas:</span>
            <span className="font-medium text-zinc-900 flex items-center gap-1">
              <Shirt className="w-3.5 h-3.5 text-zinc-700" />
              {ticket.cantidadPrendas} prendas
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Fecha de creación:</span>
            <span className="font-mono text-zinc-700">
              {new Date(ticket.createdAt).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* List of prendas included */}
        {ticket.prendas.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Prendas incluidas en este ticket</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {ticket.prendas.map((p) => (
                <div key={p.id} className="border border-zinc-200 overflow-hidden bg-white rounded-xs">
                  <div className="aspect-[3/4] w-full overflow-hidden bg-zinc-100">
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                  </div>
                  <p className="text-[10px] text-zinc-700 truncate px-1.5 py-1 font-medium">{p.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isCompletado && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ¡Donación entregada y verified! +{ticket.puntosOtorgados} Puntos agregados a tu cuenta.
          </div>
        )}
      </div>
    </CenteredModal>
  )
}
