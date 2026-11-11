import type { Variants } from "framer-motion"

// transform en texto (no y) para que corra en la GPU aunque la vista esté cargando datos.
const EASE_OUT = [0.23, 1, 0.32, 1] as const

export const pageVariants: Variants = {
  initial: { opacity: 0, transform: "translateY(10px)" },
  // transitionEnd quita el transform: si se queda, los fixed de adentro (modales, carrito) se miden contra la vista y no contra la pantalla.
  animate: { opacity: 1, transform: "translateY(0px)", transition: { duration: 0.25, ease: EASE_OUT }, transitionEnd: { transform: "none" } },
  exit: { opacity: 0, transform: "translateY(-6px)", transition: { duration: 0.15, ease: EASE_OUT } },
}

export const pageProps = { variants: pageVariants, initial: "initial" as const, animate: "animate" as const, exit: "exit" as const }
