import type { View } from "@/types"

// Para cambiar de sección desde fuera de la barra (menú del avatar, guía de la demo)
// sin pasar callbacks por toda la app. Lo escucha AuthenticatedShell.
export const EVENTO_NAVEGAR = "clossapp:navegar"

/** Lo que viaja en el evento: la vista y, si se quiere, vender una prenda concreta al llegar al Shop. */
export type DestinoNavegar = { vista: View; venderPrendaId?: string }

export function navegarA(vista: View, opciones?: { venderPrendaId?: string }): void {
  window.dispatchEvent(new CustomEvent<DestinoNavegar>(EVENTO_NAVEGAR, { detail: { vista, ...opciones } }))
}

/** Qué abrir en el Shop al llegar: regreso de Stripe, push del vendedor ("?vender=1") o una prenda concreta. */
export type PeticionVender = { retorno?: "ok" | "revision" | "datos" | "error"; prendaId?: string }

export function peticionVenderDeUrl(search: string): PeticionVender | null {
  const v = new URLSearchParams(search).get("vender")
  if (v === null) return null
  return v === "ok" || v === "revision" || v === "datos" || v === "error" ? { retorno: v } : {}
}
