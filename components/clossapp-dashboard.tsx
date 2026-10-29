"use client"

import { useState, type ReactElement } from "react"
import { AnimatePresence } from "framer-motion"
import type { View } from "@/types"
import { useKeyboard } from "@/hooks/use-keyboard"
import { AuthProvider, useAuthContext } from "@/context/auth-context"
import { PrendasProvider, usePrendasContext } from "@/context/prendas-context"
import { CartProvider } from "@/context/cart-context"
import { BottomNav } from "@/components/shared/bottom-nav"
import { SiteFooter } from "@/components/shared/site-footer"
import { LoginView } from "@/components/views/login-view"
import { InicioView } from "@/components/views/inicio/inicio-view"
import { EstadisticasView } from "@/components/views/estadisticas/estadisticas-view"
import { SimuladorView } from "@/components/views/simulador/simulador-view"
import { MarketplaceView } from "@/components/views/marketplace/marketplace-view"
import { ArmarioView } from "@/components/views/armario/armario-view"
import { PlanesView } from "@/components/views/planes/planes-view"
import { PuntoRecoleccionView } from "@/components/views/punto-recoleccion/punto-recoleccion-view"

/**
 * Se muestra mientras se comprueba si hay sesion guardada. Sin esto la app
 * instalada mostraria el login por un instante en cada apertura, incluso
 * teniendo la sesion iniciada.
 */
function SplashScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <img src="/logo.svg" alt="Clossapp" className="h-12 w-auto animate-pulse" />
    </div>
  )
}

function AppShell() {
  const { userMode, isRecoleccion, initializing } = useAuthContext()

  if (initializing) return <SplashScreen />
  if (!userMode) return <LoginView />

  // Collection Point / Punto de Recolección isolated portal mode
  if (isRecoleccion || userMode === "RECOLECCION") {
    return (
      <div className="overflow-y-auto h-screen bg-zinc-50">
        <PuntoRecoleccionView />
      </div>
    )
  }

  return <AuthenticatedShell />
}

function AuthenticatedShell() {
  const { refresh } = usePrendasContext()
  const [activeView, setActiveView] = useState<View>("inicio")
  const keyboardOpen = useKeyboard()

  const views: Record<View, ReactElement> = {
    inicio: <InicioView onNavigate={(view) => setActiveView(view)} />,
    armario: <ArmarioView />,
    simulador: <SimuladorView onElegir={() => setActiveView("armario")} />,
    marketplace: <MarketplaceView onApartar={refresh} />,
    estadisticas: <EstadisticasView onSellPrenda={() => setActiveView("marketplace")} />,
    planes: <PlanesView />,
    punto_recoleccion: <PuntoRecoleccionView />,
  }

  return (
    <>
      <div className="overflow-y-auto h-screen pb-40 lg:pb-48">
        <AnimatePresence mode="wait">
          <div key={activeView} className="mx-auto w-full max-w-6xl">
            {views[activeView]}
            <SiteFooter />
          </div>
        </AnimatePresence>
      </div>
      <BottomNav activeView={activeView} onNavigate={setActiveView} open={!keyboardOpen} />
    </>
  )
}

export function ClossappDashboard() {
  return (
    <div className="min-h-screen bg-white">
      <div className="min-h-screen w-full bg-white relative">
        <AuthProvider>
          <PrendasProvider>
            <CartProvider>
              <AppShell />
            </CartProvider>
          </PrendasProvider>
        </AuthProvider>
      </div>
    </div>
  )
}
