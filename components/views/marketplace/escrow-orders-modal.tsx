"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ShieldCheck, QrCode, Clock, CheckCircle2, Store, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthContext } from "@/context/auth-context"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { fetchUserEscrowOrders } from "@/services/escrow.service"
import type { EscrowOrder } from "@/types/escrow"

interface EscrowOrdersModalProps {
  open: boolean
  onClose: () => void
}

export function EscrowOrdersModal({ open, onClose }: EscrowOrdersModalProps) {
  const { userId, userEmail } = useAuthContext()
  const supabase = createBrowserSupabaseClient()

  const [orders, setOrders] = useState<EscrowOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQR, setSelectedQR] = useState<EscrowOrder | null>(null)
  const [filter, setFilter] = useState<"todos" | "custodia" | "liberado">("todos")

  useEffect(() => {
    if (open) {
      setLoading(true)
      fetchUserEscrowOrders(supabase, userId, userEmail)
        .then((res) => setOrders(res))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false))
    }
  }, [open, supabase, userId, userEmail])

  if (!open) return null

  const filteredOrders = orders.filter((o) => {
    if (filter === "custodia") return o.status === "pago_en_custodia"
    if (filter === "liberado") return o.status === "entregado_y_liberado"
    return true
  })

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white max-w-lg w-full rounded-xl overflow-hidden shadow-2xl border border-zinc-200 max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 bg-zinc-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-serif text-base text-white">Mis Compras en Custodia (Escrow)</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Filter */}
        <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex gap-2">
          {(["todos", "custodia", "liberado"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded transition-colors uppercase tracking-wider",
                filter === t ? "bg-zinc-900 text-white" : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
              )}
            >
              {t === "todos" ? "Todas" : t === "custodia" ? "En Custodia" : "Liberados"}
            </button>
          ))}
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-400">Cargando tus órdenes en custodia...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center">
              <Package className="w-10 h-10 text-zinc-300 mb-2" />
              <p className="text-xs font-semibold text-zinc-700">Sin órdenes registradas</p>
              <p className="text-[11px] text-zinc-400 max-w-xs mt-0.5">
                Las prendas que separes y pagues en el marketplace aparecerán aquí con su código QR de liberación.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isCustodia = order.status === "pago_en_custodia"
              return (
                <div
                  key={order.id}
                  className="border border-zinc-200 rounded-lg p-4 bg-white shadow-xs space-y-3 relative"
                >
                  <div className="flex items-start justify-between border-b border-zinc-100 pb-2">
                    <div>
                      <span className="text-[10px] text-zinc-400 font-mono block">Folio #{order.orderCode}</span>
                      <h4 className="font-serif text-sm font-semibold text-zinc-900 mt-0.5">
                        ${order.totalPagado} MXN
                      </h4>
                    </div>

                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 border",
                        isCustodia
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      )}
                    >
                      {isCustodia ? (
                        <>
                          <Clock className="w-3 h-3 text-amber-600 animate-pulse" /> Fondos en Custodia
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Fondos Liberados
                        </>
                      )}
                    </span>
                  </div>

                  {/* Items detail */}
                  <div className="space-y-1.5 text-xs text-zinc-700">
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Artículos:</p>
                    {order.items.map((it) => (
                      <div key={it.id} className="flex items-center justify-between text-zinc-800">
                        <span className="truncate pr-2">• {it.prenda.name}</span>
                        <span className="font-mono text-zinc-600 shrink-0">${it.precio} MXN</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-zinc-400" /> {order.puntoAcopioNombre}
                    </span>

                    {isCustodia ? (
                      <button
                        onClick={() => setSelectedQR(order)}
                        className="bg-zinc-900 text-white font-medium px-3 py-1.5 rounded text-xs flex items-center gap-1 hover:bg-zinc-800 transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5 text-emerald-400" /> Ver Código QR
                      </button>
                    ) : (
                      <span className="text-emerald-700 font-medium">✓ Entregado y Pagado</span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* QR Viewer Modal inside */}
        {selectedQR && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-6 rounded-xl max-w-sm w-full text-center space-y-4"
            >
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-mono text-xs font-bold text-zinc-900">Orden {selectedQR.orderCode}</span>
                <button onClick={() => setSelectedQR(null)} className="p-1 text-zinc-400 hover:text-zinc-900">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-zinc-50 border rounded-lg flex flex-col items-center">
                <QrCode className="w-36 h-36 text-zinc-900" />
                <p className="font-mono text-xs text-zinc-600 mt-2 font-bold">{selectedQR.qrToken}</p>
                <p className="text-[11px] text-emerald-800 font-medium mt-1">
                  Muestra este QR en el Punto de Recolección para verificar tu entrega y liberar los fondos al vendedor.
                </p>
              </div>

              <button
                onClick={() => setSelectedQR(null)}
                className="w-full bg-zinc-900 text-white py-2 rounded text-xs font-medium"
              >
                Cerrar QR
              </button>
            </motion.div>
          </div>
        )}

        <div className="p-3 bg-zinc-50 border-t border-zinc-200 text-center">
          <button onClick={onClose} className="text-xs text-zinc-600 font-medium hover:text-zinc-900">
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  )
}
