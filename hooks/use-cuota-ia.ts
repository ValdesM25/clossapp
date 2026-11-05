"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { useAuthContext } from "@/context/auth-context"
import { MENSAJES_LIMITE } from "@/constants/planes"

export type CuotaIA = {
  outfitsHoy: number
  outfitsDia: number
  analisisHoy: number
  analisisDia: number
  analisisTotal: number
  /** null = sin tope de por vida. */
  analisisTotalMax: number | null
}

// Mismo "hoy" que usar_ia en la base: el día cambia a medianoche de México.
const hoyMexico = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date())

/** true si el mensaje de error es un aviso de límite (y no un fallo de red o de la IA). */
export const esAvisoLimite = (msg: string | null) => !!msg && Object.values(MENSAJES_LIMITE).includes(msg)

/**
 * Uso de IA de la cuenta y los límites de su plan, para mostrar contadores.
 * Solo informa: quien decide si se puede es `usar_ia` en el servidor.
 * `null` en demo, sin sesión o mientras carga.
 */
export function useCuotaIA() {
  const { userId, plan, isGuest } = useAuthContext()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const [cuota, setCuota] = useState<CuotaIA | null>(null)

  const refrescar = useCallback(async () => {
    if (isGuest || !userId || !plan) return
    const [{ data: p }, { data: l }] = await Promise.all([
      supabase.from("perfiles")
        .select("outfits_dia, outfits_dia_fecha, analisis_dia, analisis_dia_fecha, analisis_total")
        .eq("user_id", userId).maybeSingle(),
      supabase.from("limites_plan").select("outfits_dia, analisis_dia, analisis_total").eq("plan", plan).maybeSingle(),
    ])
    if (!p || !l) { setCuota(null); return }
    const hoy = hoyMexico()
    setCuota({
      outfitsHoy: p.outfits_dia_fecha === hoy ? p.outfits_dia : 0,
      outfitsDia: l.outfits_dia,
      analisisHoy: p.analisis_dia_fecha === hoy ? p.analisis_dia : 0,
      analisisDia: l.analisis_dia,
      analisisTotal: p.analisis_total,
      analisisTotalMax: l.analisis_total,
    })
  }, [supabase, userId, plan, isGuest])

  useEffect(() => { refrescar() }, [refrescar])

  const activa = !isGuest && !!userId && !!plan
  return { cuota: activa ? cuota : null, refrescar, esGratis: plan === "gratis" && !isGuest }
}
