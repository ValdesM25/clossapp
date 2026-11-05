"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useAuthContext } from "@/context/auth-context"
import { usePrendasContext } from "@/context/prendas-context"

// Lo justo para que la animación se lea completa sin sentirse como espera.
const MINIMO_MS = 900
// Con red lenta no se retiene a nadie: pasado esto se entra aunque falten fotos.
const TOPE_FOTOS_MS = 2500
const FOTOS_PRECARGA = 6
// Si la consulta de prendas se cuelga, igual se entra.
const TOPE_TOTAL_MS = 4000

/**
 * Cubre la app al abrirla o al iniciar sesión mientras se restaura la sesión,
 * llegan las prendas y se decodifican las primeras fotos de Inicio. Así se
 * entra con todo puesto en lugar de verlo aparecer a pedazos.
 */
export function PantallaEntrada() {
  const { initializing, userMode, userId, mostrarOnboarding } = useAuthContext()
  const { prendas, loading } = usePrendasContext()
  const reducir = useReducedMotion()
  // Solo al abrir la app o al entrar a una cuenta; cerrar sesión no la muestra.
  const [activa] = useState(initializing || userMode === "VIP")
  const [minimo, setMinimo] = useState(false)
  const [fotos, setFotos] = useState(false)
  const [agotada, setAgotada] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMinimo(true), reducir ? 0 : MINIMO_MS)
    const tope = setTimeout(() => setAgotada(true), TOPE_TOTAL_MS)
    return () => { clearTimeout(t); clearTimeout(tope) }
  }, [reducir])

  // Al cambiar de cuenta quedan un render las prendas anteriores (las de ejemplo): esas no cuentan.
  const prendasListas = !loading && prendas.every((p) => p.user_id === userId)
  const necesitaFotos = userMode === "VIP" && !mostrarOnboarding

  useEffect(() => {
    if (!necesitaFotos || !prendasListas) return
    let vivo = true
    const decodificar = prendas.slice(0, FOTOS_PRECARGA).filter((p) => p.image_url).map((p) => {
      const img = new Image()
      img.src = p.image_url
      return img.decode()
    })
    void Promise.race([Promise.allSettled(decodificar), new Promise((r) => setTimeout(r, TOPE_FOTOS_MS))])
      .then(() => { if (vivo) setFotos(true) })
    return () => { vivo = false }
  }, [necesitaFotos, prendasListas, prendas])

  // Sin cuenta (login) o en el recorrido de estilo no hay nada que esperar.
  const lista = !initializing && (!necesitaFotos || agotada || (minimo && fotos))

  return (
    <AnimatePresence>
      {activa && !lista && (
        <motion.div key="entrada" role="status" aria-label="Cargando Clossapp"
          exit={{ opacity: 0 }} transition={{ duration: reducir ? 0 : 0.35, ease: "easeOut" }}
          className="fixed inset-0 z-[250] flex flex-col items-center justify-center gap-6 bg-white">
          <motion.img src="/logo.svg" alt="Clossapp" className="h-12 w-auto"
            initial={reducir ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={reducir ? undefined : { scale: 1.04 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
          <div className="w-16 h-0.5 bg-zinc-100 overflow-hidden" aria-hidden="true">
            <motion.div className="h-full bg-zinc-900 origin-left"
              initial={{ scaleX: 0 }} animate={{ scaleX: 0.9 }}
              transition={{ duration: reducir ? 0 : MINIMO_MS / 1000 + 0.6, ease: "easeOut" }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
