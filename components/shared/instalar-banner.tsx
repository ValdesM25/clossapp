"use client"

import { useEffect, useState } from "react"
import { Download, Ellipsis, Share, SquarePlus, X } from "lucide-react"
import { useInstalarApp } from "@/hooks/use-instalar-app"

const CLAVE_CIERRES = "instalar-banner-cierres"
const CLAVE_HASTA = "instalar-banner-hasta"
// Tras el 1er cierre vuelve a las 2 semanas, tras el 2º a las 4; al 3º ya no vuelve.
const ESPERAS_DIAS = [14, 28]
const DIA_MS = 86_400_000

function leerCierres(): number {
  // Versión anterior: un solo cierre para siempre. Cuenta como el primero.
  if (localStorage.getItem("instalar-banner-cerrado") === "1") {
    localStorage.removeItem("instalar-banner-cerrado")
    localStorage.setItem(CLAVE_CIERRES, "1")
    localStorage.setItem(CLAVE_HASTA, String(Date.now() + ESPERAS_DIAS[0] * DIA_MS))
  }
  return Number(localStorage.getItem(CLAVE_CIERRES) ?? 0)
}

/** Invita a instalar la app: botón en Android/Chrome, pasos manuales en iPhone/iPad. */
export function InstalarBanner() {
  const { instalada, ios, enApp, puedeInstalar, instalar } = useInstalarApp()
  const [cerrado, setCerrado] = useState(true)
  useEffect(() => {
    const cierres = leerCierres()
    setCerrado(cierres > ESPERAS_DIAS.length || Date.now() < Number(localStorage.getItem(CLAVE_HASTA) ?? 0))
  }, [])

  if (instalada || cerrado || (!ios && !puedeInstalar)) return null

  function cerrar() {
    const cierres = leerCierres() + 1
    localStorage.setItem(CLAVE_CIERRES, String(cierres))
    const espera = ESPERAS_DIAS[cierres - 1]
    if (espera) localStorage.setItem(CLAVE_HASTA, String(Date.now() + espera * DIA_MS))
    setCerrado(true)
  }

  return (
    <section aria-labelledby="instalar-titulo" className="relative border border-zinc-200 bg-zinc-50 p-5">
      <button type="button" onClick={cerrar} aria-label="Cerrar"
        className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-900">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-3 pr-8">
        <img src="/apple-icon.png" alt="" className="w-11 h-11 shrink-0 border border-zinc-200" />
        <div>
          <h2 id="instalar-titulo" className="text-sm font-medium text-zinc-900">Instala Clossapp</h2>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">Ábrela desde tu pantalla de inicio, a pantalla completa y con recordatorios.</p>
        </div>
      </div>

      {ios && enApp ? (
        <p className="mt-4 text-xs text-zinc-600 leading-relaxed">
          Desde esta app no se puede instalar. Toca <Ellipsis className="w-3.5 h-3.5 inline -mt-0.5" aria-label="el menú" /> y elige{" "}
          <strong className="font-medium text-zinc-900">Abrir en Safari</strong>; ahí verás los pasos.
        </p>
      ) : ios ? (
        <ol className="mt-4 flex flex-col gap-2.5 text-xs text-zinc-600">
          <Paso n={1}>
            Toca <Share className="w-3.5 h-3.5 inline -mt-0.5" aria-hidden="true" /> <strong className="font-medium text-zinc-900">Compartir</strong>.
            {" "}Si no lo ves, está en <Ellipsis className="w-3.5 h-3.5 inline -mt-0.5" aria-label="el menú de tres puntos" />.
          </Paso>
          <Paso n={2}>
            Elige <SquarePlus className="w-3.5 h-3.5 inline -mt-0.5" aria-hidden="true" /> <strong className="font-medium text-zinc-900">Añadir a pantalla de inicio</strong>.
          </Paso>
          <Paso n={3}>Toca <strong className="font-medium text-zinc-900">Añadir</strong>. Listo, ya está en tu inicio.</Paso>
        </ol>
      ) : (
        <button type="button" onClick={() => void instalar()}
          className="mt-4 h-11 px-5 flex items-center gap-2 bg-zinc-900 text-white text-sm font-medium">
          <Download className="w-4 h-4" /> Instalar
        </button>
      )}
    </section>
  )
}

function Paso({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 leading-relaxed">
      <span aria-hidden="true" className="w-5 h-5 shrink-0 flex items-center justify-center bg-white border border-zinc-300 text-[11px] text-zinc-700 tabular-nums">{n}</span>
      <span>{children}</span>
    </li>
  )
}
