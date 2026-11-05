"use client"

import { useEffect, useState } from "react"

interface EventoInstalar extends Event {
  prompt: () => Promise<void>
}

// Chrome lanza beforeinstallprompt una sola vez y temprano; se captura al cargar el módulo
// para que no se pierda si el componente que lo usa se monta después.
let guardado: EventoInstalar | null = null
const oyentes = new Set<() => void>()
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    guardado = e as EventoInstalar
    oyentes.forEach((f) => f())
  })
  window.addEventListener("appinstalled", () => {
    guardado = null
    oyentes.forEach((f) => f())
  })
}

/** Estado de instalación de la PWA. iOS no tiene API de instalación: solo se puede guiar al usuario. */
export function useInstalarApp() {
  // true hasta medir, para no mostrar el aviso un instante en una app ya instalada.
  const [instalada, setInstalada] = useState(true)
  const [ios, setIos] = useState(false)
  // Navegador dentro de otra app (Instagram, Facebook, TikTok…): ahí no se puede añadir a inicio.
  const [enApp, setEnApp] = useState(false)
  const [evento, setEvento] = useState<EventoInstalar | null>(guardado)

  useEffect(() => {
    setInstalada(
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true,
    )
    // iPadOS 13+ se identifica como Mac: se distingue por la pantalla táctil.
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))
    setEnApp(/FBAN|FBAV|Instagram|TikTok|musical_ly|Snapchat|LinkedInApp|Line\//.test(navigator.userAgent))
    const actualizar = () => setEvento(guardado)
    oyentes.add(actualizar)
    actualizar()
    return () => { oyentes.delete(actualizar) }
  }, [])

  async function instalar() {
    if (!evento) return
    await evento.prompt()
    guardado = null
    setEvento(null)
  }

  return { instalada, ios, enApp, puedeInstalar: !!evento, instalar }
}
