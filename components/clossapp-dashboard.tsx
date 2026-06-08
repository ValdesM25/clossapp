"use client"

import { useState } from "react"
import { AnimatePresence } from "framer-motion"
import type { View } from "@/types"
import { useKeyboard } from "@/hooks/use-keyboard"
import { AuthProvider, useAuthContext } from "@/context/auth-context"
import { PrendasProvider, usePrendasContext } from "@/context/prendas-context"
import { BottomNav } from "@/components/shared/bottom-nav"
import { LoginView } from "@/components/views/login-view"
import { InicioView } from "@/components/views/inicio/inicio-view"
import { EstadisticasView } from "@/components/views/estadisticas/estadisticas-view"
import { SimuladorView } from "@/components/views/simulador/simulador-view"
import { MarketplaceView } from "@/components/views/marketplace/marketplace-view"
import { ArmarioView } from "@/components/views/armario/armario-view"

function AppShell() {
  const { userMode } = useAuthContext()
  const { refresh } = usePrendasContext()
  const [activeView, setActiveView] = useState<View>("inicio")
  const keyboardOpen = useKeyboard()

  if (!userMode) return <LoginView />

  const views: Record<View, JSX.Element> = {
    inicio: <InicioView />,
    armario: <ArmarioView />,
    simulador: <SimuladorView onElegir={() => setActiveView("armario")} />,
    marketplace: <MarketplaceView onApartar={refresh} />,
    estadisticas: <EstadisticasView onSellPrenda={() => setActiveView("marketplace")} />,
  }

  return (
    <>
      <div className="overflow-y-auto h-screen pb-36">
        <AnimatePresence mode="wait">
          <div key={activeView}>{views[activeView]}</div>
        </AnimatePresence>
      </div>
      <BottomNav activeView={activeView} onNavigate={setActiveView} open={!keyboardOpen} />
    </>
  )
}

export function ClossappDashboard() {
  return (
    <div className="flex items-start justify-center min-h-screen bg-white">
      <div className="w-full max-w-2xl mx-auto min-h-screen bg-white relative">
        <AuthProvider>
          <PrendasProvider>
            <AppShell />
          </PrendasProvider>
        </AuthProvider>
      </div>
    </div>
  )
}
