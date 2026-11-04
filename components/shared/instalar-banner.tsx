"use client"

import { useEffect, useState } from "react"
import { Download, Share, X } from "lucide-react"
import { useInstalarApp } from "@/hooks/use-instalar-app"

const CLAVE = "instalar-banner-cerrado"

/** Invita a instalar la app: botón en Android/Chrome, pasos manuales en iPhone/iPad. */
export function InstalarBanner() {
  const { instalada, ios, puedeInstalar, instalar } = useInstalarApp()
  const [cerrado, setCerrado] = useState(true)
  useEffect(() => { setCerrado(localStorage.getItem(CLAVE) === "1") }, [])

  if (instalada || cerrado || (!ios && !puedeInstalar)) return null

  function cerrar() {
    localStorage.setItem(CLAVE, "1")
    setCerrado(true)
  }

  return (
    <div role="region" aria-label="Instalar Clossapp" className="relative border border-zinc-200 bg-white p-4 pr-10 flex flex-col gap-2">
      <button type="button" onClick={cerrar} aria-label="Cerrar" className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-900">
        <X className="w-4 h-4" />
      </button>
      <p className="text-xs uppercase tracking-widest text-zinc-500">Instala Clossapp</p>
      {ios ? (
        <p className="text-xs text-zinc-600 leading-relaxed">
          En Safari toca <Share className="w-3.5 h-3.5 inline -mt-0.5" /> <strong>Compartir</strong> y luego{" "}
          <strong>Añadir a pantalla de inicio</strong>. Así la abres como una app y puedes recibir recordatorios.
        </p>
      ) : (
        <>
          <p className="text-xs text-zinc-600 leading-relaxed">Ábrela como una app desde tu pantalla de inicio.</p>
          <button type="button" onClick={() => void instalar()}
            className="self-start flex items-center gap-2 bg-zinc-900 text-white text-xs font-medium px-4 py-2">
            <Download className="w-3.5 h-3.5" /> Instalar
          </button>
        </>
      )}
    </div>
  )
}
