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
}

const PrendasContext = createContext<PrendasContextValue | null>(null)

export function PrendasProvider({ children }: { children: ReactNode }) {
  const { userId, isGuest } = useAuthContext()

  if (!userId) {
    return <>{children}</>
  }

  return <PrendasProviderInner userId={userId} isGuest={isGuest}>{children}</PrendasProviderInner>
}

function PrendasProviderInner({ userId, isGuest, children }: { userId: string; isGuest: boolean; children: ReactNode }) {
  const { prendas, loading, refresh, addPrenda } = usePrendas(userId, isGuest)
  return (
    <PrendasContext.Provider value={{ prendas, loading, refresh, addPrenda }}>
      {children}
    </PrendasContext.Provider>
  )
}

export function usePrendasContext() {
  const ctx = useContext(PrendasContext)
  if (!ctx) throw new Error("usePrendasContext must be used within PrendasProvider")
  return ctx
}
