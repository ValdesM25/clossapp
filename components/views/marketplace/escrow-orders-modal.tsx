"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ShieldCheck, QrCode, Clock, CheckCircle2, Store, Package, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { QRCodeSVG } from "qrcode.react"
import { useAuthContext } from "@/context/auth-context"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { fetchUserEscrowOrders, clearAllEscrowOrders } from "@/services/escrow.service"
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

  const loadOrders = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    try {
      const res = await fetchUserEscrowOrders(supabase, userId, userEmail)
      setOrders(res)
    } catch (err) {
      console.error(err)
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [supabase, userId, userEmail])

  const handleClearAll = async () => {
    if (!confirm("¿Deseas eliminar todas las órdenes del área de venta?")) return
    setLoading(true)
    await clearAllEscrowOrders(supabase)
    await loadOrders(true)
  }

  useEffect(() => {
    if (!open) return

    loadOrders(true)

    // Intervalo de sondeo cada 3 segundos para actualización inmediata
    const interval = setInterval(() => {
      loadOrders(false)
    }, 3000)

    // Event listeners para sincronización entre pestañas y componentes
    const handleSync = () => loadOrders(false)
    window.addEventListener("storage", handleSync)
    window.addEventListener("clossapp_escrow_updated", handleSync)

    // Suscripción Realtime en Supabase
    const channel = supabase
      .channel("realtime:escrow_ordenes_modal")
      .on("postgres_changes", { event: "*", schema: "public", table: "escrow_ordenes" }, () => {
        loadOrders(false)
      })
      .subscribe()

    return () => {
      clearInterval(interval)
      window.removeEventListener("storage", handleSync)
      window.removeEventListener("clossapp_escrow_updated", handleSync)
      supabase.removeChannel(channel)
    }
  }, [open, loadOrders, supabase])

  if (!open) return null

  const filteredOrders = orders.filter((o) => {
    if (filter === "custodia") return o.status === "pago_en_custodia"
    if (filter === "liberado") return o.status === "entregado_y_liberado"
    return true
  })

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white max-w-lg w-full rounded-xl overflow-hidden shadow-2xl border border-zinc-200 max-h-[90dvh] flex flex-col my-auto"
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-zinc-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-400" />
            <h3 className="font-serif text-sm sm:text-base text-white">Mis Pedidos</h3>
          </div>
          <div className="flex items-center gap-2">
            {orders.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/60 hover:bg-rose-900/80 px-2 py-1 rounded border border-rose-800/50 transition-colors"
                title="Vaciar todas las órdenes"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vaciar</span>
              </button>
            )}
            <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white transition-colors" aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs Filter */}
        <div className="px-3 sm:px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex gap-2 shrink-0">
          {(["todos", "custodia", "liberado"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded transition-colors uppercase tracking-wider",
                filter === t ? "bg-zinc-900 text-white" : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
              )}
            >
              {t === "todos" ? "Todas" : t === "custodia" ? "En Custodia" : "Liberados"}
            </button>
          ))}
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5">
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
              const isEnRenta = order.status === "en_renta_cliente"
              const isLiberado = order.status === "entregado_y_liberado"
              const isRentaOrder = order.items.some((i) => i.tipo === "renta" || !!i.fechaRenta)

              return (
                <div
                  key={order.id}
                  className="border border-zinc-200 rounded-lg p-3 sm:p-4 bg-white shadow-xs space-y-2.5 relative"
                >
                  <div className="flex items-start justify-between border-b border-zinc-100 pb-2">
                    <div>
                      <span className="text-[9px] sm:text-[10px] text-zinc-400 font-mono block">
                        Folio #{order.orderCode} {isRentaOrder ? "• Renta" : "• Compra"}
                      </span>
                      <h4 className="font-serif text-xs sm:text-sm font-semibold text-zinc-900 mt-0.5">
                        ${order.totalPagado} MXN
                      </h4>
                    </div>

                    <span
                      className={cn(
                        "text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full flex items-center gap-1 border",
                        isCustodia && "bg-amber-50 text-amber-800 border-amber-200",
                        isEnRenta && "bg-purple-50 text-purple-800 border-purple-200",
                        isLiberado && "bg-emerald-50 text-emerald-800 border-emerald-200"
                      )}
                    >
                      {isCustodia ? (
                        <>
                          <Clock className="w-3 h-3 text-amber-600 animate-pulse" />{" "}
                          {isRentaOrder ? "Paso 1: Recolección" : "En Custodia"}
                        </>
                      ) : isEnRenta ? (
                        <>
                          <Clock className="w-3 h-3 text-purple-600 animate-pulse" /> Paso 2: Devolución
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Fondos Liberados
                        </>
                      )}
                    </span>
                  </div>

                  {/* Items detail */}
                  <div className="space-y-1 text-xs text-zinc-700">
                    <p className="text-[10px] sm:text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Artículos:
                    </p>
                    {order.items.map((it) => (
                      <div key={it.id} className="flex flex-col text-zinc-800 text-[11px] sm:text-xs">
                        <div className="flex items-center justify-between">
                          <span className="truncate pr-2 font-medium">• {it.prenda.name}</span>
                          <span className="font-mono text-zinc-600 shrink-0">${it.precio} MXN</span>
                        </div>
                        {it.fechaRenta && (
                          <span className="text-[10px] text-purple-700 font-medium pl-3">
                            📅 Fecha evento: {it.fechaRenta}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[10px] sm:text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1 truncate pr-2">
                      <Store className="w-3.5 h-3.5 text-zinc-400 shrink-0" />{" "}
                      <span className="truncate">{order.puntoAcopioNombre}</span>
                    </span>

                    {isCustodia ? (
                      <button
                        onClick={() => setSelectedQR(order)}
                        className="bg-zinc-900 text-white font-medium px-2.5 py-1.5 rounded text-[11px] sm:text-xs flex items-center gap-1 hover:bg-zinc-800 transition-colors shrink-0"
                      >
                        <QrCode className="w-3.5 h-3.5 text-amber-400" />{" "}
                        {isRentaOrder ? "Ver QR #1 Recolección" : "Ver QR Custodia"}
                      </button>
                    ) : isEnRenta ? (
                      <button
                        onClick={() => setSelectedQR(order)}
                        className="bg-purple-950 text-white font-medium px-2.5 py-1.5 rounded text-[11px] sm:text-xs flex items-center gap-1 hover:bg-purple-900 transition-colors shrink-0"
                      >
                        <QrCode className="w-3.5 h-3.5 text-purple-300" /> Ver QR #2 Devolución
                      </button>
                    ) : (
                      <span className="text-emerald-700 font-medium shrink-0">✓ Completado y Liberado</span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* QR Viewer Modal inside */}
        {selectedQR && (
          <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-4 sm:p-6 rounded-xl max-w-sm w-full text-center space-y-3 sm:space-y-4 z-[130]"
            >
              <div className="flex justify-between items-center border-b pb-2">
                <div>
                  <span className="font-mono text-xs font-bold text-zinc-900">Orden {selectedQR.orderCode}</span>
                  <span className="text-[10px] text-zinc-500 block">
                    {selectedQR.status === "pago_en_custodia"
                      ? "Paso 1: Recolección de Renta"
                      : "Paso 2: Devolución y Lavado"}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedQR(null)}
                  className="p-1 text-zinc-400 hover:text-zinc-900"
                  aria-label="Cerrar QR"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 sm:p-4 bg-zinc-50 border border-zinc-200 rounded-lg flex flex-col items-center">
                <div className="bg-white p-3 rounded-lg border border-zinc-200 shadow-sm flex items-center justify-center">
                  <QRCodeSVG
                    value={JSON.stringify({
                      esc: selectedQR.orderCode,
                      token: selectedQR.qrToken,
                      buyer: selectedQR.buyerName,
                      status: selectedQR.status,
                      total: selectedQR.totalPagado,
                      items: selectedQR.items.map((i) => i.prenda.name),
                    })}
                    size={165}
                    level="M"
                    includeMargin={true}
                  />
                </div>
                <p className="font-mono text-xs text-zinc-900 mt-2.5 font-bold tracking-wider">{selectedQR.qrToken}</p>
                <p className="text-[10px] sm:text-[11px] text-zinc-700 font-medium mt-1">
                  {selectedQR.status === "pago_en_custodia"
                    ? "Muestra este QR #1 en el Punto de Recolección para RECOGER tu prenda rentada (Paso 1/2)."
                    : "Muestra este QR #2 al DEVOLVER tu prenda para mandarla a lavandería y liberar los fondos al vendedor (Paso 2/2)."}
                </p>
              </div>

              <button
                onClick={() => setSelectedQR(null)}
                className="w-full bg-zinc-900 text-white py-2.5 rounded text-xs font-medium"
              >
                Cerrar QR
              </button>
            </motion.div>
          </div>
        )}

        <div className="p-3 bg-zinc-50 border-t border-zinc-200 text-center shrink-0">
          <button onClick={onClose} className="text-xs text-zinc-600 font-medium hover:text-zinc-900">
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  )
}
