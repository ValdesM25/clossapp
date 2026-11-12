import type { View } from "@/types"

// Para cambiar de sección desde fuera de la barra (menú del avatar, guía de la demo)
// sin pasar callbacks por toda la app. Lo escucha AuthenticatedShell.
export const EVENTO_NAVEGAR = "clossapp:navegar"

/** Lo que viaja en el evento: la vista y, si se quiere, vender o ver una prenda en el Shop o abrir un plan. */
export type DestinoNavegar = { vista: View; venderPrendaId?: string; verPrendaId?: string; planId?: string }

export function navegarA(vista: View, opciones?: { venderPrendaId?: string; verPrendaId?: string; planId?: string }): void {
  window.dispatchEvent(new CustomEvent<DestinoNavegar>(EVENTO_NAVEGAR, { detail: { vista, ...opciones } }))
}

/**
 * Qué abrir en el Shop al llegar: regreso de Stripe, push del vendedor ("?vender=1"), una prenda
 * propia para vender (prendaId) o el detalle de una prenda publicada (verPrendaId, desde Planificación).
 */
export type PeticionVender = { retorno?: "ok" | "revision" | "datos" | "error"; prendaId?: string; verPrendaId?: string }

/** Plan que abrir desde la URL ("?plan=<uuid>", lo mandan los avisos de planificación); null si no hay. */
export function planDeUrl(search: string): string | null {
  const id = new URLSearchParams(search).get("plan")
  return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null
}

export function peticionVenderDeUrl(search: string): PeticionVender | null {
  const v = new URLSearchParams(search).get("vender")
  if (v === null) return null
  return v === "ok" || v === "revision" || v === "datos" || v === "error" ? { retorno: v } : {}
}
