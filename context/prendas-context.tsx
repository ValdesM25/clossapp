"use client"

import { createContext, useContext, type ReactNode } from "react"
import { usePrendas } from "@/hooks/use-prendas"
import { useAuthContext } from "./auth-context"
import type { Prenda } from "@/types"

type PrendasContextValue = {
  prendas: Prenda[]
  loading: boolean
  refresh: () => Promise<void>
  addPrenda: (payload: Parameters<typeof import("@/services/prendas.service").insertPrenda>[1]) => Promise<void>
  deletePrenda: (prendaId: string) => Promise<void>
}

const PrendasContext = createContext<PrendasContextValue | null>(null)

export function PrendasProvider({ children }: { children: ReactNode }) {
  const { userId, isGuest } = useAuthContext()
  // El provider se monta siempre. Antes se salteaba para invitadas, pero
  // AuthenticatedShell consume el contexto igual, asi que "Explorar como
  // invitada" reventaba. usePrendas ya distingue el caso: a las invitadas les
  // devuelve las prendas de demo sin tocar Supabase.
  const { prendas, loading, refresh, addPrenda, deletePrenda } = usePrendas(userId, isGuest)

  return (
    <PrendasContext.Provider value={{ prendas, loading, refresh, addPrenda, deletePrenda }}>
      {children}
    </PrendasContext.Provider>
  )
}

export function usePrendasContext() {
  const ctx = useContext(PrendasContext)
  if (!ctx) throw new Error("usePrendasContext must be used within PrendasProvider")
  return ctx
}
