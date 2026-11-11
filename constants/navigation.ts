import type { View } from "@/types"
import { Home, Shirt, Sparkles, ShoppingBag, UserRound, Luggage } from "lucide-react"

// Outfit va destacado. Estadísticas y Planes se abren desde Perfil (`incluye`).
export const navItems = [
  { id: "inicio" as View, label: "Inicio", icon: Home },
  { id: "armario" as View, label: "Armario", icon: Shirt },
  { id: "simulador" as View, label: "Outfit", icon: Sparkles, destacado: true },
  { id: "planificacion" as View, label: "Planificación", icon: Luggage },
  { id: "marketplace" as View, label: "Shop", icon: ShoppingBag },
  { id: "perfil" as View, label: "Perfil", icon: UserRound, incluye: ["estadisticas", "planes"] as View[] },
]

export const filterChips = ["Todos", "Ropa", "Accesorios", "Zapatos"]
