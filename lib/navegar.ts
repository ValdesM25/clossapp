import type { View } from "@/types"

// Para cambiar de sección desde fuera de la barra (menú del avatar, guía de la demo)
// sin pasar callbacks por toda la app. Lo escucha AuthenticatedShell.
export const EVENTO_NAVEGAR = "clossapp:navegar"

export function navegarA(vista: View): void {
  window.dispatchEvent(new CustomEvent<View>(EVENTO_NAVEGAR, { detail: vista }))
}
