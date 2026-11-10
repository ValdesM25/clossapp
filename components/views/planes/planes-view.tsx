"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Check, Sparkles, Crown, Zap, ShieldCheck, Gift, Tag, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { pageProps } from "@/constants/animation"
import { CenteredModal } from "@/components/shared/centered-modal"
import { OPCIONES_CANJE_SUSCRIPCION } from "@/constants/donaciones"
import type { OpcionCanjeSuscripcion, CanjeRealizado } from "@/types/donaciones"
import { useAuthContext } from "@/context/auth-context"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { fetchUserPuntos, PUNTOS_BASE } from "@/services/donaciones.service"
import { NOMBRE_PLAN, PLANES, esDePago } from "@/constants/planes"

export function PlanesView() {
  // Points & Rewards state
  const { userId, isGuest, plan: planActual } = useAuthContext()
  // Quien paga ya no compara planes: aquí ve sus puntos y el canje; su suscripción se administra en /planes.
  const esPremium = esDePago(planActual)
  const [puntos, setPuntos] = useState<number>(PUNTOS_BASE)
  const [pendientes, setPendientes] = useState(0)
  const [canjeando, setCanjeando] = useState(false)
  const [errorCanje, setErrorCanje] = useState<string | null>(null)
  const [canjes, setCanjes] = useState<CanjeRealizado[]>([])
  const [canjeModalOpen, setCanjeModalOpen] = useState(false)
  const [selectedCanje, setSelectedCanje] = useState<OpcionCanjeSuscripcion | null>(null)
  const [canjeExitoso, setCanjeExitoso] = useState<CanjeRealizado | null>(null)

  // Saldo e historial de canjes salen de la base (puntos_historial); antes vivían en localStorage.
  useEffect(() => {
    if (isGuest) return
    let activo = true
    const supabase = createBrowserSupabaseClient()
    fetchUserPuntos(supabase, userId).then((p) => { if (activo) setPuntos(p) })
    supabase.from("puntos_pendientes").select("puntos").is("acreditado_at", null).not("prenda_id", "is", null)
      .then(({ data }) => { if (activo) setPendientes((data ?? []).reduce((s, r) => s + r.puntos, 0)) })
    supabase.from("descuentos_canje").select("id, opcion, estado, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!activo || !data) return
        setCanjes(data.map((row) => {
          const opcion = OPCIONES_CANJE_SUSCRIPCION.find((o) => o.id === row.opcion)
          return {
            id: row.id,
            opcionId: row.opcion,
            titulo: opcion?.titulo ?? "Descuento",
            estado: row.estado,
            puntosUsados: opcion?.puntosCoste ?? 0,
            fecha: row.created_at,
          }
        }))
      })
    return () => { activo = false }
  }, [userId, isGuest])

  const planes = PLANES.map((p) => ({
    id: p.id,
    name: NOMBRE_PLAN[p.id],
    price: `$${p.precio}`,
    period: p.precio ? "MXN / mes" : "para siempre",
    desc: p.resumen,
    features: p.incluye,
    highlight: p.id === "plus",
    badge: p.id === "plus" ? "Más Popular" : p.id === "gratis" ? "Gratuito" : "Completo",
  }))

  // El pago y los cambios de plan viven en /planes, fuera de la app.
  function handleSelect(id: string) {
    window.location.assign(`/planes?plan=${id}`)
  }

  // El servidor valida costo y saldo y aplica el descuento en Stripe: el cliente no decide nada.
  async function handleConfirmCanje() {
    if (!selectedCanje || puntos < selectedCanje.puntosCoste || canjeando) return
    if (isGuest) { setErrorCanje("Crea una cuenta para canjear tus puntos."); return }
    setCanjeando(true)
    setErrorCanje(null)
    const res = await fetch("/api/puntos/canjear", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ opcion: selectedCanje.id }),
    }).catch(() => null)
    const json = await res?.json().catch(() => null)
    setCanjeando(false)
    if (!res?.ok || !json) {
      setErrorCanje(json?.error ?? "No se pudo canjear. Revisa tu conexión e intenta de nuevo.")
      return
    }
    setPuntos(json.saldo)
    const nuevoCanje: CanjeRealizado = {
      id: `canje_${Date.now()}`,
      opcionId: selectedCanje.id,
      titulo: selectedCanje.titulo,
      estado: json.aplicado ? "aplicado" : "pendiente",
      puntosUsados: selectedCanje.puntosCoste,
      fecha: new Date().toISOString(),
    }
    setCanjes((prev) => [nuevoCanje, ...prev])
    setCanjeExitoso(nuevoCanje)
  }

  return (
    <motion.div {...pageProps} className="flex flex-col gap-8 pb-36 pt-8 px-4">
      {/* Encabezado */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-zinc-900" />
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Membresías & Recompensas</p>
        </div>
        <h1 className="font-serif text-3xl text-zinc-900">{esPremium ? "Tus puntos" : "Planes de Suscripción"}</h1>
        <p className="text-xs text-zinc-500 max-w-lg leading-relaxed mt-1">
          {esPremium
            ? <>Dona prendas en desuso para ganar <strong>Puntos ClossApp</strong> y canjearlos por descuentos en tu mensualidad.</>
            : <>Elige la experiencia que mejor se adapte a tu guardarropa. Dona prendas en desuso para ganar <strong>Puntos ClossApp</strong> y canjearlos por descuentos en tu mensualidad.</>}
        </p>
        {esPremium && (
          <a href="/planes" className="self-start mt-2 min-h-10 inline-flex items-center text-sm font-medium text-zinc-900 underline underline-offset-4">
            Administrar suscripción
          </a>
        )}
      </div>

      {/* Banner de Puntos por Donaciones */}
      <div data-tour="planes-puntos" className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white p-5 border border-zinc-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/20 border border-zinc-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-zinc-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-200">Programa de Donaciones</span>
            </div>
            <p className="font-serif text-2xl text-zinc-200 mt-0.5">{puntos} Puntos ClossApp</p>
            {pendientes > 0 && (
              <p className="text-[11px] text-zinc-300 mt-0.5">+{pendientes} pendientes por compras recientes (se acreditan al usar las prendas)</p>
            )}
            <p className="text-xs text-zinc-400 mt-1">
              Ganas +100 pts por cada donación de 3+ prendas verificada con Código QR.
            </p>
          </div>
        </div>

        <button
          onClick={() => setCanjeModalOpen(true)}
          className="w-full md:w-auto px-4 py-2.5 bg-white text-zinc-950 font-semibold text-xs tracking-wide hover:bg-white transition-colors flex items-center justify-center gap-2"
        >
          <Gift className="w-4 h-4" />
          Canjear Puntos por Descuentos
        </button>
      </div>

      {/* Grid de Planes */}
      {!esPremium && <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planes.map((plan) => {
          const isCurrent = !isGuest && (planActual ?? "gratis") === plan.id
          return (
            <motion.div
              key={plan.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "relative flex flex-col justify-between border p-6 transition-all shadow-xs",
                plan.highlight
                  ? "border-zinc-900 bg-zinc-900 text-white shadow-xl"
                  : "border-zinc-200 bg-white text-zinc-900"
              )}
            >
              {plan.badge && (
                <span
                  className={cn(
                    "absolute top-4 right-4 text-[9px] uppercase tracking-widest px-2.5 py-1 font-semibold",
                    plan.highlight
                      ? "bg-white text-zinc-900"
                      : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                  )}
                >
                  {plan.badge}
                </span>
              )}

              <div>
                <div className="mb-4">
                  <h3
                    className={cn(
                      "font-serif text-xl",
                      plan.highlight ? "text-white" : "text-zinc-900"
                    )}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={cn(
                      "text-xs mt-1 leading-relaxed",
                      plan.highlight ? "text-zinc-500" : "text-zinc-500"
                    )}
                  >
                    {plan.desc}
                  </p>
                </div>

                <div className="my-6 border-y py-4 border-zinc-100/10">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={cn(
                        "font-serif text-3xl font-bold",
                        plan.highlight ? "text-white" : "text-zinc-900"
                      )}
                    >
                      {plan.price}
                    </span>
                    <span
                      className={cn(
                        "text-xs",
                        plan.highlight ? "text-zinc-500" : "text-zinc-500"
                      )}
                    >
                      {plan.period}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 mb-6">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Check
                        className={cn(
                          "w-4 h-4 shrink-0 mt-0.5",
                          plan.highlight ? "text-zinc-500" : "text-zinc-900"
                        )}
                      />
                      <span
                        className={cn(
                          "text-xs leading-relaxed",
                          plan.highlight ? "text-zinc-500" : "text-zinc-600"
                        )}
                      >
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(plan.id)}
                disabled={isCurrent}
                className={cn(
                  "w-full py-3 text-xs font-medium tracking-wider uppercase transition-colors flex items-center justify-center gap-2",
                  isCurrent
                    ? "bg-zinc-900 text-white cursor-default"
                    : plan.highlight
                    ? "bg-white text-zinc-900 hover:bg-zinc-100"
                    : "border border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white"
                )}
              >
                {isCurrent ? (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Plan Actual
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" /> Seleccionar {plan.name}
                  </>
                )}
              </motion.button>
            </motion.div>
          )
        })}
      </div>}

      {/* Historial de cupones canjeados */}
      {canjes.length > 0 && (
        <div className="border border-zinc-200 bg-white p-5 flex flex-col gap-3">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-zinc-700" /> Mis descuentos canjeados
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {canjes.map((c) => (
              <div key={c.id} className="border border-zinc-200 bg-zinc-50 p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-900">{c.titulo}</p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Usó {c.puntosUsados} pts</p>
                </div>
                <p className="text-[11px] text-zinc-600 text-right">
                  {c.estado === "aplicado" ? "Aplicado a tu suscripción" : "Se aplica en tu primer pago"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Canje de Puntos */}
      <CenteredModal open={canjeModalOpen} onClose={() => setCanjeModalOpen(false)}>
        <div className="p-1 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {!canjeExitoso ? (
            <>
              <div className="bg-zinc-50 border border-zinc-200 p-3 flex items-center justify-between">
                <span className="text-xs text-zinc-900 font-medium">Saldo disponible:</span>
                <span className="font-serif text-zinc-900 text-base">{puntos} Puntos</span>
              </div>

              <p className="text-xs text-zinc-600">
                Selecciona la recompensa que deseas desbloquear con tus puntos acumulados por donaciones:
              </p>

              <div className="flex flex-col gap-3">
                {OPCIONES_CANJE_SUSCRIPCION.map((opcion) => {
                  const alcanza = puntos >= opcion.puntosCoste
                  const isSelected = selectedCanje?.id === opcion.id

                  return (
                    <div
                      key={opcion.id}
                      onClick={() => alcanza && setSelectedCanje(opcion)}
                      className={cn(
                        "border p-4 transition-all flex flex-col gap-2 bg-white cursor-pointer",
                        isSelected ? "border-zinc-900 ring-2 ring-zinc-900" : "border-zinc-200",
                        !alcanza && "opacity-50 cursor-not-allowed bg-zinc-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-sm text-zinc-900">{opcion.titulo}</span>
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-zinc-100 text-zinc-900">
                          {opcion.puntosCoste} pts
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">{opcion.descripcion}</p>

                      {!alcanza && (
                        <p className="text-[10px] text-red-500 font-medium">
                          Te faltan {opcion.puntosCoste - puntos} puntos para este descuento.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              {errorCanje && <p role="alert" className="text-xs text-red-500">{errorCanje}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setCanjeModalOpen(false)}
                  className="flex-1 py-3 border border-zinc-200 text-zinc-600 text-xs tracking-wide hover:border-zinc-400"
                >
                  Cerrar
                </button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  disabled={canjeando || !selectedCanje || puntos < (selectedCanje?.puntosCoste ?? 0)}
                  onClick={handleConfirmCanje}
                  className="flex-1 py-3 bg-zinc-900 text-white text-xs font-medium tracking-wide disabled:opacity-40"
                >
                  Canjear
                </motion.button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center py-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-xl text-zinc-900">¡Canje Exitoso!</h3>
              <p className="text-xs text-zinc-600">
                Has canjeado <strong>{canjeExitoso.puntosUsados} puntos</strong> por:
                <br />
                <strong className="text-zinc-900">{canjeExitoso.titulo}</strong>
              </p>

              <p className="w-full bg-zinc-50 border border-zinc-200 p-4 text-xs text-zinc-700 leading-relaxed">
                {canjeExitoso.estado === "aplicado"
                  ? "Listo, se descontará solo en tu próximo cobro. No tienes que hacer nada más."
                  : "Se aplicará solo cuando elijas Plus o Elite. No tienes que copiar ningún código."}
              </p>

              <button
                onClick={() => {
                  setCanjeExitoso(null)
                  setSelectedCanje(null)
                  setCanjeModalOpen(false)
                }}
                className="w-full py-2.5 bg-zinc-100 text-zinc-800 text-xs font-medium hover:bg-zinc-200 mt-2"
              >
                Entendido
              </button>
            </div>
          )}
        </div>
      </CenteredModal>
    </motion.div>
  )
}
