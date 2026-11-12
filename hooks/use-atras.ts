import { useEffect, useId, useRef } from "react"

// Capas abiertas ahora mismo; el historial guarda las suyas en history.state.capas.
const vivas = new Set<string>()
const enHistorial = (): string[] => (window.history.state as { capas?: string[] } | null)?.capas ?? []

/**
 * El gesto o botón "atrás" del teléfono cierra esta capa (modal, cajón o subpantalla) en vez de
 * salir de la app: al abrirse deja una entrada en el historial y, si se cierra con su propio
 * botón, la quita. Las vistas principales las registra AuthenticatedShell.
 */
export function useAtras(abierta: boolean, onCerrar: () => void) {
  const id = useId()
  const cerrar = useRef(onCerrar)
  useEffect(() => { cerrar.current = onCerrar })

  useEffect(() => {
    if (!abierta) return
    vivas.add(id)
    const capas = enHistorial()
    // En desarrollo React monta dos veces: la entrada puede estar puesta ya.
    if (!capas.includes(id)) {
      // Si la de encima ya se cerró (una capa que abre otra), se reemplaza su entrada en vez de apilar.
      const reemplaza = capas.length > 0 && !vivas.has(capas[capas.length - 1])
      window.history[reemplaza ? "replaceState" : "pushState"]({ ...window.history.state, capas: [...capas.filter((c) => vivas.has(c)), id] }, "")
    }
    const alVolver = () => { if (!enHistorial().includes(id)) cerrar.current() }
    window.addEventListener("popstate", alVolver)
    return () => {
      window.removeEventListener("popstate", alVolver)
      vivas.delete(id)
      // Diferido: deja pasar el doble montaje de desarrollo y a la capa que la reemplace.
      setTimeout(() => { if (!vivas.has(id) && enHistorial().at(-1) === id) window.history.back() })
    }
  }, [abierta, id])
}
