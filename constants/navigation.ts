import type { View } from "@/types"
import { Home, Shirt, Sparkles, ShoppingBag, UserRound } from "lucide-react"

// Máximo 5. Outfit va al centro y destacado. Estadísticas y Planes se abren desde Perfil,
// por eso Perfil queda marcado también en esas pantallas (`incluye`).
export const navItems = [
  { id: "inicio" as View, label: "Inicio", icon: Home },
  { id: "armario" as View, label: "Armario", icon: Shirt },
  { id: "simulador" as View, label: "Outfit", icon: Sparkles, destacado: true },
  { id: "marketplace" as View, label: "Shop", icon: ShoppingBag },
  { id: "perfil" as View, label: "Perfil", icon: UserRound, incluye: ["estadisticas", "planes", "planificacion"] as View[] },
]

export const filterChips = ["Todos", "Ropa", "Accesorios", "Zapatos"]
