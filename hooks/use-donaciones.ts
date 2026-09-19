"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import {
  fetchPuntosAcopio,
  fetchUserTickets,
  fetchUserPuntos,
  fetchAcopioImpacto,
  createDonacionTicket,
  validarTicketQR,
  fetchAcopioRegistros,
} from "@/services/donaciones.service"
import type { DonacionTicket, AcopioRegistroDB, PuntoAcopioDB } from "@/types/donaciones"
import type { Prenda } from "@/types"

export function useDonaciones(userId?: string, userName?: string, userEmail?: string, isGuest: boolean = false) {
  const [puntos, setPuntos] = useState<number>(0)
  const [tickets, setTickets] = useState<DonacionTicket[]>([])
  const [puntosAcopio, setPuntosAcopio] = useState<PuntoAcopioDB[]>([])
  const [acopioRegistros, setAcopioRegistros] = useState<AcopioRegistroDB[]>([])
  const [impacto, setImpacto] = useState({ prendasDonadas: 0, familiasApoyadas: 0 })
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserSupabaseClient()

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [pacopio, userTkts, userPts, imp, regs] = await Promise.all([
        fetchPuntosAcopio(supabase),
        fetchUserTickets(supabase, userId),
        fetchUserPuntos(supabase, userId, userName, userEmail),
        fetchAcopioImpacto(supabase),
        fetchAcopioRegistros(supabase),
      ])

      setPuntosAcopio(pacopio)
      setTickets(userTkts)
      setPuntos(userPts)
      setImpacto(imp)
      setAcopioRegistros(regs)
    } catch (err) {
      console.error("Error refreshing donaciones:", err)
    } finally {
      setLoading(false)
    }
  }, [supabase, userId, userName, userEmail])

  useEffect(() => {
    refresh()

    const handlePuntosEvent = (e: any) => {
      if (e?.detail?.puntos !== undefined) {
        setPuntos(e.detail.puntos)
      }
      refresh()
    }

    if (typeof window !== "undefined") {
      window.addEventListener("clossapp_puntos_updated", handlePuntosEvent)
      window.addEventListener("storage", refresh)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("clossapp_puntos_updated", handlePuntosEvent)
        window.removeEventListener("storage", refresh)
      }
    }
  }, [refresh])

  const handleCreateTicket = useCallback(
    async (input: {
      puntoAcopioId: string
      puntoAcopioNombre: string
      prendas: Prenda[]
      puntosEstimados: number
    }): Promise<DonacionTicket | null> => {
      try {
        const newTicket = await createDonacionTicket(supabase, {
          userId: userId || "guest",
          donorName: userName || "Usuario Donante",
          donorEmail: userEmail || "donante@clossapp.com",
          puntoAcopioId: input.puntoAcopioId,
          puntoAcopioNombre: input.puntoAcopioNombre,
          cantidadPrendas: input.prendas.length,
          prendas: input.prendas,
          puntosEstimados: input.puntosEstimados,
        })

        if (newTicket) {
          setTickets((prev) => [newTicket, ...prev])
        }
        await refresh()
        return newTicket
      } catch (err) {
        console.error("Error in handleCreateTicket:", err)
        return null
      }
    },
    [supabase, userId, userName, userEmail, refresh]
  )

  const handleVerifyTicket = useCallback(
    async (qrToken: string, centroId: string, centroNombre?: string) => {
      try {
        const res = await validarTicketQR(supabase, qrToken, centroId, centroNombre)
        if (res.success) {
          await refresh()
        }
        return res
      } catch (err) {
        console.error("Error verifying ticket:", err)
        throw err
      }
    },
    [supabase, refresh]
  )

  return {
    puntos,
    tickets,
    puntosAcopio,
    acopioRegistros,
    impacto,
    loading,
    refresh,
    handleCreateTicket,
    handleVerifyTicket,
  }
}
