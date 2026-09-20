"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ShoppingBag, ShieldCheck, Trash2, ArrowRight, Calendar, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCartContext } from "@/context/cart-context"

interface CartDrawerProps {
  onCheckout: () => void
}

export function CartDrawer({ onCheckout }: CartDrawerProps) {
  const { cart, isCartOpen, setIsCartOpen, removeFromCart, clearCart, itemCount, totalPrice } = useCartContext()

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:max-w-md bg-white z-[110] flex flex-col shadow-2xl border-l border-zinc-200"
          >
            {/* Header */}
            <div className="p-3.5 sm:p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-900 text-white shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <h2 className="font-serif text-base sm:text-lg text-white">Tu Carrito de Compras</h2>
                {itemCount > 0 && (
                  <span className="bg-emerald-500 text-zinc-950 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {itemCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                aria-label="Cerrar Carrito"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner Anti-Estafas / Escrow */}
            <div className="bg-emerald-50 border-b border-emerald-100 p-3 sm:p-3.5 flex items-start gap-2.5 sm:gap-3 shrink-0">
              <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-800 shrink-0 mt-0.5">
                <ShieldCheck className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h4 className="text-[11px] sm:text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Protección Anti-Estafas ClossApp
                </h4>
                <p className="text-[10px] sm:text-[11px] text-emerald-800 mt-0.5 leading-snug">
                  Tus fondos quedan retenidos de forma segura en custodia. El vendedor <strong>NO</strong> recibe el dinero hasta que tú acudas al Punto de Recolección a revisar y confirmar la prenda.
                </p>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="py-12 sm:py-16 text-center flex flex-col items-center justify-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-3 text-zinc-400">
                    <ShoppingBag className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <h3 className="font-serif text-base text-zinc-800">Tu carrito está vacío</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                    Explora el marketplace y añade prendas para comprar o rentar de forma segura.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex gap-3 p-2.5 sm:p-3 border border-zinc-200 rounded-lg bg-zinc-50/50 relative group"
                  >
                    <div className="w-16 h-20 sm:w-20 sm:h-24 rounded bg-zinc-200 overflow-hidden shrink-0 border border-zinc-200">
                      <img
                        src={item.prenda.image_url || "/placeholder.svg"}
                        alt={item.prenda.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between min-w-0 pr-6">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={cn(
                              "text-[9px] sm:text-[10px] uppercase tracking-wider px-2 py-0.5 font-semibold rounded",
                              item.tipo === "renta"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            )}
                          >
                            {item.tipo === "renta" ? "Renta" : "Compra"}
                          </span>
                          {item.prenda.talla && (
                            <span className="text-[9px] sm:text-[10px] text-zinc-500 bg-zinc-200 px-1.5 py-0.5 rounded">
                              Talla {item.prenda.talla}
                            </span>
                          )}
                        </div>
                        <h4 className="font-serif text-xs sm:text-sm text-zinc-900 truncate">{item.prenda.name}</h4>
                        {item.tipo === "renta" && item.fechaRenta && (
                          <p className="text-[10px] sm:text-[11px] text-amber-700 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" /> {item.fechaRenta}
                          </p>
                        )}
                        <p className="text-[10px] sm:text-xs text-zinc-500 mt-0.5 truncate">
                          Vendedor: {item.sellerName || "Verificado"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-zinc-200/60">
                        <span className="font-mono text-xs sm:text-sm font-bold text-zinc-900">${item.precio} MXN</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="absolute right-2 top-2 p-1.5 text-zinc-400 hover:text-red-600 transition-colors"
                      title="Eliminar del carrito"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer Breakdown & Action */}
            {cart.length > 0 && (
              <div className="p-4 sm:p-4 border-t border-zinc-200 bg-zinc-50 space-y-3 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-zinc-600">
                    <span>Subtotal Prendas</span>
                    <span className="font-mono">${totalPrice} MXN</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Custodia & Escrow ClossApp
                    </span>
                    <span>$0.00 (Gratis)</span>
                  </div>
                  <div className="flex justify-between text-sm font-serif font-bold text-zinc-900 pt-2 border-t border-zinc-200">
                    <span>Total a Pagar</span>
                    <span className="font-mono text-base">${totalPrice} MXN</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={clearCart}
                    className="px-3 py-2.5 text-xs text-zinc-500 hover:text-zinc-800 border border-zinc-300 rounded transition-colors shrink-0"
                  >
                    Vaciar
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setIsCartOpen(false)
                      onCheckout()
                    }}
                    className="flex-1 bg-zinc-900 text-white font-medium text-xs px-4 py-3 rounded flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-900/10"
                  >
                    <span>Pagar con Custodia Segura</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
