"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
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

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
function AppShell() {
  const { userMode } = useAuthContext()
  const { refresh: refreshPrendas } = usePrendasContext()
  const [activeView, setActiveView] = useState<View>("inicio")
  const [marketFlash, setMarketFlash] = useState(false)
  const keyboardOpen = useKeyboard()

  const renderView = () => {
    switch (activeView) {
      case "inicio": return <InicioView />
      case "armario": return <ArmarioView />
      case "simulador": return <SimuladorView onElegir={() => setActiveView("armario")} />
      case "marketplace": return <MarketplaceView onApartar={refreshPrendas} />
      case "estadisticas": return <EstadisticasView onSellPrenda={() => setActiveView("marketplace")} />
      default: return <InicioView />
    }
  }

  return (
    <div className="flex items-start justify-center min-h-screen bg-white">
      <div className="w-full max-w-2xl mx-auto min-h-screen bg-white relative">
        <AnimatePresence mode="wait">
          {!userMode ? (
            <LoginView key="login" />
          ) : (
            <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
              className="relative min-h-screen">
              <div className="overflow-y-auto h-screen pb-36">
                <AnimatePresence mode="wait">
                  <div key={activeView}>{renderView()}</div>
                </AnimatePresence>
              </div>

              {/* Bottom Nav */}
              <BottomNav activeView={activeView} onNavigate={setActiveView} open={!keyboardOpen} flash={marketFlash ? "marketplace" : undefined} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
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
