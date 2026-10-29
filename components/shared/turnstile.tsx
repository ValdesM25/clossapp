"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}

declare global {
  interface Window { turnstile?: TurnstileApi }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""

let scriptPromise: Promise<void> | null = null
function cargarScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script")
    s.src = SCRIPT_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => { scriptPromise = null; reject(new Error("No cargó Turnstile")) }
    document.head.appendChild(s)
  })
  return scriptPromise
}

export type TurnstileHandle = { reset: () => void }

/**
 * CAPTCHA de Cloudflare. Supabase valida el token del lado del servidor.
 * Cada token sirve una sola vez: hay que llamar reset() después de cada envío.
 * Sin site key no renderiza nada (desarrollo local).
 */
export const Turnstile = forwardRef<TurnstileHandle, { onToken: (token: string | null) => void }>(
  function Turnstile({ onToken }, ref) {
    const elRef = useRef<HTMLDivElement>(null)
    const idRef = useRef<string | null>(null)
    const onTokenRef = useRef(onToken)
    onTokenRef.current = onToken

    useImperativeHandle(ref, () => ({
      reset: () => {
        onTokenRef.current(null)
        if (idRef.current) window.turnstile?.reset(idRef.current)
      },
    }), [])

    useEffect(() => {
      if (!TURNSTILE_SITE_KEY) return
      let cancelado = false
      cargarScript()
        .then(() => {
          if (cancelado || !elRef.current || !window.turnstile) return
          idRef.current = window.turnstile.render(elRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            language: "es",
            // Claro y del ancho del formulario; solo se ve si Cloudflare necesita que la persona interactúe.
            theme: "light",
            size: "flexible",
            appearance: "interaction-only",
            callback: (t: string) => onTokenRef.current(t),
            "expired-callback": () => onTokenRef.current(null),
            "error-callback": () => onTokenRef.current(null),
          })
        })
        .catch((err) => console.error("[turnstile]", err instanceof Error ? err.message : err))
      return () => {
        cancelado = true
        if (idRef.current) window.turnstile?.remove(idRef.current)
        idRef.current = null
      }
    }, [])

    if (!TURNSTILE_SITE_KEY) return null
    return <div ref={elRef} className="w-full" />
  }
)
