"use client"

import { useEffect, useState } from "react"
import { CenteredModal } from "@/components/shared/centered-modal"
import { useInstalarApp } from "@/hooks/use-instalar-app"

const CLAVE = "video-instalar-ios-dia"
// Después de la pantalla de entrada (máximo 4 s): debajo de ella el video arrancaría sin que nadie lo vea.
const ESPERA_MS = 4200

/** Video de cómo instalar la app. Solo en iPhone/iPad sin instalar, una vez al día; en Android nunca. */
export function VideoInstalarIos() {
  const { ios, instalada, enApp } = useInstalarApp()
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    // Dentro de Instagram o Facebook no se puede instalar: ahí el aviso de Inicio pide abrir Safari.
    if (!ios || instalada || enApp) return
    const hoy = new Date().toLocaleDateString("en-CA")
    if (localStorage.getItem(CLAVE) === hoy) return
    const t = setTimeout(() => {
      localStorage.setItem(CLAVE, hoy)
      setAbierto(true)
    }, ESPERA_MS)
    return () => clearTimeout(t)
  }, [ios, instalada, enApp])

  return (
    <CenteredModal open={abierto} onClose={() => setAbierto(false)}>
      <div className="p-5 pt-6 flex flex-col gap-4">
        <div className="pr-10">
          <h2 className="font-serif text-xl text-zinc-900">Instala Clossapp en tu iPhone</h2>
          <p className="text-xs text-zinc-500 mt-1">Tres toques en Safari y la abres desde tu pantalla de inicio.</p>
        </div>
        {/* Sin muted, iOS no reproduce solo; con controls se puede activar el sonido. */}
        <video src="/instalar-ios.mp4" poster="/instalar-ios.jpg" autoPlay muted playsInline controls
          className="w-full max-h-[62dvh] object-contain bg-zinc-50" />
        <button type="button" onClick={() => setAbierto(false)}
          className="h-11 bg-zinc-900 text-white text-sm font-medium tracking-wide">
          Entendido
        </button>
      </div>
    </CenteredModal>
  )
}
