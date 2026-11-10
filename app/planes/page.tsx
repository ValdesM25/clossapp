"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Check, CheckCircle2, Loader2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { NOMBRE_PLAN, PLANES, esDePago, normalizarPlan, type Plan } from "@/constants/planes"
import { cn } from "@/lib/utils"

type Estado = "cargando" | "sin-sesion" | "listo"

/** Elegir o administrar el plan. Aquí se paga, fuera de cualquier tienda de apps. */
export default function PlanesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [estado, setEstado] = useState<Estado>("cargando")
  const [plan, setPlan] = useState<Plan | null>(null)
  const [conSuscripcion, setConSuscripcion] = useState(false)
  const [elegido, setElegido] = useState<string | null>(null)
  const [volvioDelPago, setVolvioDelPago] = useState(false)
  const [pagoOk, setPagoOk] = useState(false)
  const [esperando, setEsperando] = useState(false)
  const [enviando, setEnviando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setElegido(params.get("plan"))
    const volvio = params.get("pago") === "ok"
    setVolvioDelPago(volvio)
    let activo = true

    async function leerPlan(): Promise<Plan | null> {
      // "*": stripe_customer_id no existe hasta aplicar 17-suscripciones.sql.
      const { data } = await supabase.from("perfiles").select("*").maybeSingle()
      if (!activo) return null
      const p = normalizarPlan(data?.plan) ?? "gratis"
      setPlan(p)
      setConSuscripcion(!!data?.stripe_customer_id && esDePago(p))
      return p
    }

    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!activo) return
      if (!user) return setEstado("sin-sesion")
      const p = await leerPlan()
      if (!activo) return
      setEstado("listo")
      if (!volvio || esDePago(p)) return setPagoOk(volvio)
      // El plan lo escribe el webhook de Stripe unos segundos después del pago.
      setEsperando(true)
      for (let i = 0; i < 10 && activo; i++) {
        await new Promise((r) => setTimeout(r, 2000))
        if (esDePago(await leerPlan())) { if (activo) setPagoOk(true); break }
      }
      if (activo) setEsperando(false)
    })()
    return () => { activo = false }
  }, [supabase])

  async function ir(ruta: "checkout" | "portal", destino?: Plan) {
    setEnviando(destino ?? ruta)
    setError(null)
    const res = await fetch(`/api/stripe/${ruta}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan: destino }),
    }).catch(() => null)
    const json = await res?.json().catch(() => null)
    if (res?.ok && json?.url) return window.location.assign(json.url)
    setEnviando(null)
    setError(json?.error ?? "No se pudo conectar. Revisa tu conexión e intenta de nuevo.")
  }

  const volverA = (id: Plan) => (id === "gratis" ? "/" : `/?volver=${encodeURIComponent(`/planes?plan=${id}`)}`)

  return (
    <main className="min-h-dvh bg-white">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        <header className="text-center space-y-3">
          <Link href="/" className="inline-block mb-2"><img src="/logo.svg" alt="Clossapp" className="mx-auto h-10 w-auto" /></Link>
          <h1 className="font-serif text-3xl text-zinc-900">Elige tu plan</h1>
          <p className="text-sm text-zinc-500 max-w-lg mx-auto leading-relaxed">
            Empieza gratis y cambia cuando tu clóset lo pida. Cancela cuando quieras.
          </p>
        </header>

        {estado === "cargando" && (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-zinc-500" /></div>
        )}

        {estado !== "cargando" && (
          <>
            {plan && (pagoOk || esperando) && (
              <p role="status" className="flex items-center justify-center gap-2 border border-zinc-200 px-4 py-3 text-sm text-zinc-700">
                {pagoOk
                  ? <><CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" /> Listo, ya tienes el plan {NOMBRE_PLAN[plan]}.</>
                  : <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Confirmando tu pago…</>}
              </p>
            )}
            {volvioDelPago && !pagoOk && !esperando && (
              <p role="status" className="border border-zinc-200 px-4 py-3 text-sm text-zinc-700 text-center">
                Tu pago se está procesando. Tu plan se activará en unos minutos.
              </p>
            )}

            <section className="grid gap-4 md:grid-cols-3">
              {PLANES.map((p) => {
                const actual = p.id === plan
                const destacado = elegido ? p.id === elegido : p.id === "plus"
                return (
                  <article key={p.id} className={cn("flex flex-col border p-6", destacado ? "border-zinc-900" : "border-zinc-200")}>
                    <h2 className="font-serif text-xl text-zinc-900">{NOMBRE_PLAN[p.id]}</h2>
                    <p className="text-xs text-zinc-500 mt-1">{p.resumen}</p>
                    <p className="mt-5 mb-5 flex items-baseline gap-1">
                      <span className="font-serif text-3xl text-zinc-900">${p.precio}</span>
                      <span className="text-xs text-zinc-500">MXN al mes</span>
                    </p>
                    <ul className="space-y-2 mb-6 flex-1">
                      {p.incluye.map((x) => (
                        <li key={x} className="flex items-start gap-2 text-sm text-zinc-700">
                          <Check className="w-4 h-4 mt-0.5 shrink-0 text-zinc-900" aria-hidden="true" />{x}
                        </li>
                      ))}
                    </ul>
                    {estado === "sin-sesion" ? (
                      // ?volver: al terminar de entrar, la app regresa aquí sola.
                      <Link href={volverA(p.id)}
                        className={cn("h-11 text-sm font-medium tracking-wide flex items-center justify-center",
                          destacado ? "bg-zinc-900 text-white" : "border border-zinc-900 text-zinc-900")}>
                        {p.id === "gratis" ? "Crear cuenta gratis" : `Elegir ${NOMBRE_PLAN[p.id]}`}
                      </Link>
                    ) : actual ? (
                      <p className="h-11 flex items-center justify-center border border-zinc-200 text-sm text-zinc-500">Tu plan actual</p>
                    ) : volvioDelPago && !esDePago(plan) ? (
                      // Recién pagó y el webhook aún no llega: otro botón de pago aquí cobraría dos veces.
                      <p className="h-11 flex items-center justify-center text-xs text-zinc-500 text-center">Esperando la confirmación del pago</p>
                    ) : esDePago(p.id) && !esDePago(plan) ? (
                      <button type="button" onClick={() => ir("checkout", p.id)} disabled={!!enviando}
                        className={cn("h-11 text-sm font-medium tracking-wide flex items-center justify-center disabled:opacity-50",
                          destacado ? "bg-zinc-900 text-white" : "border border-zinc-900 text-zinc-900")}>
                        {enviando === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : `Elegir ${NOMBRE_PLAN[p.id]}`}
                      </button>
                    ) : conSuscripcion ? (
                      <p className="h-11 flex items-center justify-center text-xs text-zinc-500 text-center">Cámbialo desde Administrar suscripción</p>
                    ) : null}
                  </article>
                )
              })}
            </section>

            {conSuscripcion && (
              <div className="text-center">
                <button type="button" onClick={() => ir("portal")} disabled={!!enviando}
                  className="inline-flex h-11 px-6 items-center bg-zinc-900 text-white text-sm font-medium tracking-wide disabled:opacity-50">
                  {enviando === "portal" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Administrar suscripción"}
                </button>
                <p className="mt-2 text-xs text-zinc-500">Cambia de plan, actualiza tu tarjeta o cancela.</p>
              </div>
            )}

            {error && <p role="alert" className="text-sm text-red-600 text-center">{error}</p>}

            <p className="text-xs text-zinc-500 text-center">
              Precios en pesos mexicanos por mes, IVA incluido, con tarjeta. Los precios y condiciones pueden cambiar sin previo aviso.
              {" "}<Link href="/politicas#planes" className="underline underline-offset-2">Pagos, cancelación y reembolsos</Link>
              {" · "}<Link href="/" className="underline underline-offset-2">Volver a la app</Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
