"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { useAuthContext } from "@/context/auth-context"
import type { MomentoPlan, PlanOutfit } from "@/lib/planificacion"
import {
  borrarPlan, crearPlan, fetchCuotaPlan, fetchPlanes, generar, marcarEmpacada, marcarUsado, type DatosPlan,
} from "@/services/planificacion.service"

/**
 * Estado de la pantalla de Planificación. En demo o invitado no toca la base.
 * `generando` es el plan que se está armando: mientras no sea null, la pantalla
 * deshabilita todo lo que gasta IA (la ruta no bloquea dos pedidos a la vez).
 */
export function usePlanificacion() {
  const { userId, plan, isGuest, demo } = useAuthContext()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const activa = !isGuest && !demo && !!userId && !!plan

  const [planes, setPlanes] = useState<PlanOutfit[]>([])
  const [cuota, setCuota] = useState<{ hoy: number; mes: number } | null>(null)
  const [cargando, setCargando] = useState(activa)
  const [error, setError] = useState<string | null>(null)
  const [avisoCuota, setAvisoCuota] = useState<string | null>(null)
  const [generando, setGenerando] = useState<string | null>(null)
  const [regenerando, setRegenerando] = useState<string | null>(null)
  // El estado tarda un render: dos toques en el mismo instante pasarían los dos.
  const ocupado = useRef(false)

  const recargar = useCallback(async () => {
    if (!activa) return
    try {
      setPlanes(await fetchPlanes(supabase))
    } catch (e) {
      console.error("[planificacion]", e)
      setError("No pudimos cargar tus planes.")
    } finally {
      setCargando(false)
    }
  }, [activa, supabase])

  const refrescarCuota = useCallback(async () => {
    if (activa && plan === "elite") setCuota(await fetchCuotaPlan(supabase, userId, plan))
  }, [activa, plan, supabase, userId])

  useEffect(() => { recargar(); refrescarCuota() }, [recargar, refrescarCuota])

  /** Arma bloque tras bloque mientras salgan outfits y queden pendientes. */
  const armar = useCallback(async (planId: string) => {
    if (ocupado.current) return
    ocupado.current = true
    setGenerando(planId)
    setError(null)
    setAvisoCuota(null)
    try {
      for (;;) {
        const r = await generar(planId)
        await recargar()
        if ("error" in r) {
          if (r.limite === "plan_dia" || r.limite === "plan_mes") setAvisoCuota(r.error)
          else setError(r.error)
          break
        }
        if (!(r.generados > 0 && r.pendientes > 0)) break
      }
    } finally {
      ocupado.current = false
      setGenerando(null)
      refrescarCuota()
    }
  }, [recargar, refrescarCuota])

  const otroOutfit = useCallback(async (planId: string, momentoId: string) => {
    if (ocupado.current) return
    ocupado.current = true
    setGenerando(planId)
    setRegenerando(momentoId)
    setError(null)
    try {
      const r = await generar(planId, momentoId)
      if ("error" in r) setError(r.error)
      else if (r.generados === 0) setError("No pudimos armar otro outfit. Se quedó el que tenías y no se descontó de tu cuota.")
      await recargar()
    } finally {
      ocupado.current = false
      setGenerando(null)
      setRegenerando(null)
      refrescarCuota()
    }
  }, [recargar, refrescarCuota])

  /** Crea el plan y empieza a armarlo sin esperar: devuelve el id para abrir el detalle. */
  const crear = useCallback(async (datos: DatosPlan) => {
    const id = await crearPlan(supabase, datos)
    await recargar()
    void armar(id)
    return id
  }, [supabase, recargar, armar])

  const borrar = useCallback(async (planId: string) => {
    await borrarPlan(supabase, planId)
    await recargar()
  }, [supabase, recargar])

  /** Optimista: la casilla cambia al instante y se regresa si falla. */
  const empacar = useCallback(async (planId: string, prendaId: string, valor: boolean) => {
    const cambiar = (v: boolean) => setPlanes((ps) => ps.map((p) => p.id !== planId ? p : {
      ...p, empacadas: v ? [...new Set([...p.empacadas, prendaId])] : p.empacadas.filter((id) => id !== prendaId),
    }))
    cambiar(valor)
    try {
      await marcarEmpacada(supabase, planId, prendaId, valor)
    } catch (e) {
      console.error("[empacar]", e)
      cambiar(!valor)
      setError("No pudimos guardar tu maleta. Intenta de nuevo.")
    }
  }, [supabase])

  const meLoPuse = useCallback(async (momento: MomentoPlan) => {
    try {
      await marcarUsado(supabase, momento)
      await recargar()
    } catch (e) {
      console.error("[meLoPuse]", e)
      setError("No pudimos guardarlo. Intenta de nuevo.")
    }
  }, [supabase, recargar])

  return {
    planes, cuota, cargando, error, avisoCuota, generando, regenerando,
    recargar, crear, armar, otroOutfit, borrar, empacar, meLoPuse,
  }
}
