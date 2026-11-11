import { useEffect, type RefObject } from "react"

// Incluye el título con tabindex="-1", que es donde cae el foco al abrir.
const ENFOCABLES = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]"

/** Capa a pantalla completa: Escape la cierra y Tab no se sale de ella (aria-modal no lo impide solo). */
export function useCapa(capa: RefObject<HTMLElement | null>, onCerrar: () => void, activa = true) {
  useEffect(() => {
    if (!activa) return
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onCerrar()
      if (e.key !== "Tab" || !capa.current) return
      const enfocables = [...capa.current.querySelectorAll<HTMLElement>(ENFOCABLES)]
      if (!enfocables.length) return
      const i = enfocables.indexOf(document.activeElement as HTMLElement)
      if (e.shiftKey && i <= 0) {
        e.preventDefault()
        enfocables[enfocables.length - 1].focus()
      } else if (!e.shiftKey && (i === -1 || i === enfocables.length - 1)) {
        e.preventDefault()
        enfocables[0].focus()
      }
    }
    window.addEventListener("keydown", alTeclear)
    return () => window.removeEventListener("keydown", alTeclear)
  }, [capa, onCerrar, activa])
}
