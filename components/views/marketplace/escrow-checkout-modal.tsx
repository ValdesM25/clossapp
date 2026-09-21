"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ShieldCheck, CreditCard, Lock, CheckCircle2, QrCode, ArrowRight, Store } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useCartContext } from "@/context/cart-context"
import { useAuthContext } from "@/context/auth-context"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { createEscrowOrder } from "@/services/escrow.service"
import type { EscrowOrder, MetodoPagoEscrow } from "@/types/escrow"

interface EscrowCheckoutModalProps {
  open: boolean
  onClose: () => void
  onOrderCreated: (order: EscrowOrder) => void
}

export function EscrowCheckoutModal({ open, onClose, onOrderCreated }: EscrowCheckoutModalProps) {
  const { cart, totalPrice, clearCart } = useCartContext()
  const { userId, userEmail, userName } = useAuthContext()
  const supabase = createBrowserSupabaseClient()

  const [metodoPago, setMetodoPago] = useState<MetodoPagoEscrow>("tarjeta")
  const [nombreTarjeta, setNombreTarjeta] = useState("Mariela Morales")
  const [numeroTarjeta, setNumeroTarjeta] = useState("•••• •••• •••• 4242")
  const [expiracion, setExpiracion] = useState("12/28")
  const [cvc, setCvc] = useState("123")
  const [processing, setProcessing] = useState(false)
  const [completedOrder, setCompletedOrder] = useState<EscrowOrder | null>(null)

  if (!open) return null

  async function handleConfirmPayment() {
    if (cart.length === 0) return
    setProcessing(true)

    try {
      const order = await createEscrowOrder(supabase, {
        buyerUserId: userId || "guest",
        buyerName: nombreTarjeta || userName || "Comprador ClossApp",
        buyerEmail: userEmail || "comprador@clossapp.com",
        items: cart,
        subtotal: totalPrice,
        metodoPago,
        puntoAcopioId: "norte",
        puntoAcopioNombre: "Centro de Acopio Norte",
      })

      setCompletedOrder(order)
      clearCart()
      onOrderCreated(order)
    } catch (err) {
      console.error("Error creating escrow order:", err)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white max-w-md w-full max-h-[90dvh] rounded-xl overflow-hidden shadow-2xl border border-zinc-200 flex flex-col my-auto"
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 bg-zinc-900 text-white flex items-center justify-between border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-400" />
            <h3 className="font-serif text-sm sm:text-base text-white">Pago Seguro en Custodia (Escrow)</h3>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white transition-colors" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {completedOrder ? (
          /* Success Screen */
          <div className="p-4 sm:p-6 text-center space-y-3.5 sm:space-y-4 overflow-y-auto max-h-[calc(90dvh-4rem)]">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Pago Retenido en Custodia Exitosamente
              </span>
              <h2 className="font-serif text-lg sm:text-xl text-zinc-900 mt-2">¡Fondos Protegidos!</h2>
              <p className="text-xs text-zinc-600 mt-1 max-w-sm mx-auto">
                Tu pago de <strong className="font-mono text-zinc-900">${completedOrder.totalPagado} MXN</strong> está retenido por ClossApp. El vendedor <strong>NO</strong> recibirá el dinero hasta que recojas y verifiques tus artículos en el Punto de Recolección.
              </p>
            </div>

            {/* QR Order Ticket Card */}
            <div className="p-3.5 sm:p-4 bg-zinc-50 border border-zinc-200 rounded-lg text-left space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <div>
                  <p className="text-[9px] sm:text-[10px] text-zinc-400 uppercase tracking-widest">Folio Escrow</p>
                  <p className="font-mono text-sm sm:text-base font-bold text-zinc-900">{completedOrder.orderCode}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] sm:text-[10px] text-zinc-400 uppercase tracking-widest">Punto de Entrega</p>
                  <p className="text-xs font-semibold text-zinc-800 flex items-center justify-end gap-1">
                    <Store className="w-3.5 h-3.5 text-emerald-600" /> {completedOrder.puntoAcopioNombre}
                  </p>
                </div>
              </div>

              {/* QR Code Graphical Token */}
              <div className="flex flex-col items-center justify-center bg-white p-3.5 sm:p-4 border border-zinc-200 rounded-lg shadow-xs">
                <div className="bg-white p-2.5 rounded border border-zinc-200 shadow-sm flex items-center justify-center">
                  <QRCodeSVG
                    value={JSON.stringify({
                      esc: completedOrder.orderCode,
                      token: completedOrder.qrToken,
                      buyer: completedOrder.buyerName,
                      total: completedOrder.totalPagado,
                      items: completedOrder.items.map((i) => i.prenda.name),
                    })}
                    size={150}
                    level="M"
                    includeMargin={true}
                  />
                </div>
                <p className="font-mono text-xs font-bold text-zinc-900 mt-2.5 tracking-wider">{completedOrder.qrToken}</p>
                <p className="text-[10px] text-emerald-700 font-medium mt-1 text-center">
                  Presenta este QR al operador en el punto de acopio
                </p>
              </div>

              <div className="text-[10px] sm:text-[11px] text-zinc-600 space-y-1">
                <p className="font-medium text-zinc-800">Prendas en Custodia ({completedOrder.items.length}):</p>
                {completedOrder.items.map((it) => (
                  <p key={it.id} className="text-zinc-600 truncate">
                    • {it.prenda.name} ({it.tipo === "renta" ? "Renta" : "Compra"}) — ${it.precio} MXN
                  </p>
                ))}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-zinc-900 text-white font-medium text-xs py-3 rounded hover:bg-zinc-800 transition-colors"
            >
              Cerrar y Ver Mis Custodias
            </button>
          </div>
        ) : (
          /* Payment Form Screen */
          <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 overflow-y-auto max-h-[calc(90dvh-4rem)]">
            {/* Banner info */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-[11px] sm:text-xs text-emerald-900 flex items-start gap-2.5">
              <ShieldCheck className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-emerald-950 font-bold">Intermediario Custodio ClossApp</strong>
                Al pagar, tus fondos quedan en custodia segura. Solo liberaremos el pago al vendedor cuando escanees el código QR al recoger tus prendas.
              </div>
            </div>

            {/* Total Summary */}
            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 flex justify-between items-center text-xs">
              <div>
                <p className="text-zinc-500">Artículos ({cart.length})</p>
                <p className="font-semibold text-zinc-800">Total retenido en custodia</p>
              </div>
              <span className="font-mono text-base sm:text-lg font-bold text-zinc-900">${totalPrice} MXN</span>
            </div>

            {/* Metodo de Pago Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] sm:text-xs font-semibold text-zinc-700 uppercase tracking-wider block">
                Método de Pago
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMetodoPago("tarjeta")}
                  className={`p-2.5 border rounded-lg text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    metodoPago === "tarjeta"
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-xs"
                      : "border-zinc-200 text-zinc-700 hover:border-zinc-300"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">Tarjeta Crédito / Débito</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoPago("puntos")}
                  className={`p-2.5 border rounded-lg text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    metodoPago === "puntos"
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-xs"
                      : "border-zinc-200 text-zinc-700 hover:border-zinc-300"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">Puntos ClossApp (Demo)</span>
                </button>
              </div>
            </div>

            {/* Card Form */}
            {metodoPago === "tarjeta" && (
              <div className="space-y-2.5 bg-zinc-50/70 p-3 rounded-lg border border-zinc-200">
                <div>
                  <label className="text-[10px] sm:text-[11px] text-zinc-600 font-medium block mb-1">Nombre en la tarjeta</label>
                  <input
                    type="text"
                    value={nombreTarjeta}
                    onChange={(e) => setNombreTarjeta(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] sm:text-[11px] text-zinc-600 font-medium block mb-1">Número de Tarjeta</label>
                  <input
                    type="text"
                    value={numeroTarjeta}
                    onChange={(e) => setNumeroTarjeta(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-xs font-mono text-zinc-800 focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] sm:text-[11px] text-zinc-600 font-medium block mb-1">Vencimiento</label>
                    <input
                      type="text"
                      value={expiracion}
                      onChange={(e) => setExpiracion(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-xs font-mono text-zinc-800 focus:outline-none focus:border-zinc-900 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] sm:text-[11px] text-zinc-600 font-medium block mb-1">CVC</label>
                    <input
                      type="text"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-xs font-mono text-zinc-800 focus:outline-none focus:border-zinc-900 text-center"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 border-t border-zinc-100 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2.5 border border-zinc-200 text-zinc-700 text-xs rounded hover:bg-zinc-50 transition-colors"
              >
                Cancelar
              </button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={processing}
                onClick={handleConfirmPayment}
                className="flex-1 bg-zinc-900 text-white text-xs font-medium py-2.5 rounded hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? (
                  <span>Reteniendo fondos en custodia...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Pagar y Retener ${totalPrice} MXN</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
