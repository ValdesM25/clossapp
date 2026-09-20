"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { Prenda } from "@/types"
import type { CartItem, TipoItemCarrito } from "@/types/escrow"

interface CartContextValue {
  cart: CartItem[]
  addToCart: (prenda: Prenda, tipo?: TipoItemCarrito, fechaRenta?: string) => void
  removeFromCart: (cartItemId: string) => void
  clearCart: () => void
  isCartOpen: boolean
  setIsCartOpen: (open: boolean) => void
  itemCount: number
  totalPrice: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  // Cargar carrito desde localStorage al iniciar
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("clossapp_cart_items_v1")
        if (stored) {
          setCart(JSON.parse(stored))
        }
      } catch {}
    }
  }, [])

  // Guardar en localStorage cuando cambie el carrito
  const saveCart = useCallback((newCart: CartItem[]) => {
    setCart(newCart)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("clossapp_cart_items_v1", JSON.stringify(newCart))
      } catch {}
    }
  }, [])

  const addToCart = useCallback(
    (prenda: Prenda, tipo: TipoItemCarrito = "compra", fechaRenta?: string) => {
      setCart((prev) => {
        // Evitar duplicados de la misma prenda en el carrito
        if (prev.some((item) => item.prenda.id === prenda.id)) {
          return prev
        }

        const price = tipo === "renta" ? (prenda.precio_renta || 250) : (prenda.precio || 450)
        const newItem: CartItem = {
          id: `cart_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          prenda,
          tipo,
          precio: price,
          fechaRenta,
          sellerName: "Vendedor ClossApp",
        }

        const updated = [...prev, newItem]
        saveCart(updated)
        return updated
      })

      setIsCartOpen(true)
    },
    [saveCart]
  )

  const removeFromCart = useCallback(
    (cartItemId: string) => {
      setCart((prev) => {
        const updated = prev.filter((item) => item.id !== cartItemId && item.prenda.id !== cartItemId)
        saveCart(updated)
        return updated
      })
    },
    [saveCart]
  )

  const clearCart = useCallback(() => {
    saveCart([])
  }, [saveCart])

  const itemCount = cart.length
  const totalPrice = cart.reduce((sum, item) => sum + item.precio, 0)

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        itemCount,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCartContext() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCartContext must be used within CartProvider")
  return ctx
}
