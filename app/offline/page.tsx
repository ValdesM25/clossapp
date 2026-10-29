"use client"

import { useEffect } from "react"

/**
 * Pantalla que el service worker sirve cuando una navegacion falla por falta de
 * conexion. Se precachea en el build, asi que tiene que ser estatica y no
 * depender de datos.
 */
export default function OfflinePage() {
  useEffect(() => {
    // navigator.onLine solo dice si hay interfaz de red, no si el servidor
    // responde, asi que no sirve para afirmarle a nadie que ya tiene senal.
    // Se usa solo como disparador para reintentar.
    const retry = () => window.location.replace("/")
    window.addEventListener("online", retry)
    return () => window.removeEventListener("online", retry)
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <img src="/logo.svg" alt="Clossapp" className="h-12 w-auto opacity-40" />

      <h1 className="mt-12 text-sm uppercase tracking-widest text-zinc-900">
        Sin conexión
      </h1>

      <p className="mt-4 max-w-xs text-xs leading-relaxed text-zinc-500">
        Tu armario vive en la nube, así que necesitamos internet para mostrártelo.
        Revisá tu conexión y volvé a intentar.
      </p>

      <button
        type="button"
        onClick={() => window.location.replace("/")}
        className="mt-10 h-12 w-full max-w-xs rounded-none bg-zinc-900 text-sm text-white"
      >
        Reintentar
      </button>
    </main>
  )
}
