import type { View } from "@/types"
import { Home, Shirt, Sparkles, ShoppingBag, BarChart3 } from "lucide-react"

// Máximo 5. Outfit va al centro y destacado; Planes vive en el menú del avatar (solo plan gratis).
export const navItems = [
  { id: "inicio" as View, label: "Inicio", icon: Home },
  { id: "armario" as View, label: "Armario", icon: Shirt },
  { id: "simulador" as View, label: "Outfit", icon: Sparkles, destacado: true },
  { id: "marketplace" as View, label: "Shop", icon: ShoppingBag },
  { id: "estadisticas" as View, label: "Stats", icon: BarChart3 },
]

export const filterChips = ["Todos", "Ropa", "Accesorios", "Zapatos"]
