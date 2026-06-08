import type { View } from "@/types"
import { Home, Shirt, Sparkles, ShoppingBag, BarChart3 } from "lucide-react"

export const navItems = [
  { id: "inicio" as View, label: "Inicio", icon: Home },
  { id: "armario" as View, label: "Armario", icon: Shirt },
  { id: "simulador" as View, label: "Outfit", icon: Sparkles },
  { id: "marketplace" as View, label: "Shop", icon: ShoppingBag },
  { id: "estadisticas" as View, label: "Stats", icon: BarChart3 },
]

export const filterChips = ["Todos", "Ropa", "Accesorios", "Zapatos"]
