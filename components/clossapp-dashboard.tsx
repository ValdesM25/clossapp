"use client"

import { useEffect, useState, type ReactElement } from "react"
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
import { OnboardingView } from "@/components/views/onboarding/onboarding-view"
import { TourGuiado } from "@/components/shared/tour-guiado"
import { tomarVolverA } from "@/lib/volver-a"
import { PASOS_DEMO_ACOPIO, PASOS_DEMO_USUARIO } from "@/constants/tour"

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

/** Pastilla fija del modo demo: recuerda que todo es de ejemplo y deja repetir la guía o salir. */
function BarraDemo({ abajo }: { abajo: string }) {
  const { demo, tourActivo, iniciarTour, logout } = useAuthContext()
  if (!demo || tourActivo) return null
  return (
    <div role="status" className={`fixed ${abajo} left-1/2 -translate-x-1/2 z-[70] flex items-center gap-3 whitespace-nowrap bg-zinc-900 text-white text-[11px] px-4 py-2 shadow-lg`}>
      <span className="uppercase tracking-widest text-emerald-300">Modo demo</span>
      <button type="button" onClick={iniciarTour} className="underline underline-offset-2">Ver guía</button>
      <button type="button" onClick={() => void logout()} className="text-zinc-300 hover:text-white">Salir</button>
    </div>
  )
}

function GuiaDemo() {
  const { demo, tourActivo, cerrarTour, logout } = useAuthContext()
  if (!demo || !tourActivo) return null
  return (
    <TourGuiado
      key={demo}
      pasos={demo === "acopio" ? PASOS_DEMO_ACOPIO : PASOS_DEMO_USUARIO}
      onCerrar={cerrarTour}
      accionFinal={demo === "usuario" ? { texto: "Crear mi cuenta", onClick: () => void logout() } : undefined}
    />
  )
}

function AppShell() {
  const { userMode, isRecoleccion, initializing, mostrarOnboarding, estilo, terminarOnboarding } = useAuthContext()

  // Si se llegó al login desde otra página (ej. /centros), regresar ahí al entrar.
  // Después del recorrido de estilo, para no saltárselo en cuentas nuevas.
  useEffect(() => {
    if (userMode !== "VIP" || mostrarOnboarding) return
    const destino = tomarVolverA()
    if (destino) window.location.assign(destino)
  }, [userMode, mostrarOnboarding])

  if (initializing) return <SplashScreen />
  if (!userMode) return <LoginView />

  // Collection Point / Punto de Recolección isolated portal mode
  if (isRecoleccion || userMode === "RECOLECCION") {
    return (
      <div className="overflow-y-auto h-screen bg-zinc-50">
        <PuntoRecoleccionView />
        <BarraDemo abajo="bottom-4" />
        <GuiaDemo />
      </div>
    )
  }

  // Cuentas con sesión que no han visto el recorrido, o que lo abrieron desde "Mi estilo".
  if (userMode === "VIP" && mostrarOnboarding) {
    return <OnboardingView inicial={estilo} onTerminar={(e) => void terminarOnboarding(e)} />
  }

  return (
    <>
      <AuthenticatedShell />
      {/* Encima de la barra de navegación inferior. */}
      <BarraDemo abajo="bottom-24" />
      <GuiaDemo />
    </>
  )
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
