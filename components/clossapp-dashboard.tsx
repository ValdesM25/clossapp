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
import { PASOS_DEMO_ACOPIO, PASOS_DEMO_USUARIO, PASO_INSTALAR_IOS } from "@/constants/tour"
import { useInstalarApp } from "@/hooks/use-instalar-app"
import { PantallaEntrada } from "@/components/shared/pantalla-entrada"
import { EVENTO_NAVEGAR } from "@/lib/navegar"

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
  const { ios, instalada } = useInstalarApp()
  if (!demo || !tourActivo) return null
  // En iOS sin instalar, el paso de instalación va antes del cierre ("Listo").
  const pasosUsuario = ios && !instalada
    ? [...PASOS_DEMO_USUARIO.slice(0, -1), PASO_INSTALAR_IOS, PASOS_DEMO_USUARIO[PASOS_DEMO_USUARIO.length - 1]]
    : PASOS_DEMO_USUARIO
  return (
    <TourGuiado
      key={demo}
      pasos={demo === "acopio" ? PASOS_DEMO_ACOPIO : pasosUsuario}
      onCerrar={cerrarTour}
      accionFinal={demo === "usuario" ? { texto: "Crear mi cuenta", onClick: () => void logout() } : undefined}
    />
  )
}

function AppShell() {
  const { userMode, initializing } = useAuthContext()
  // Cada inicio de sesión vuelve a montar la entrada. Se calcula en el render (no en un
  // efecto) para que la cuenta no se vea ni un cuadro antes de que la tape.
  const [modoPrevio, setModoPrevio] = useState(userMode)
  const [entradas, setEntradas] = useState(0)
  if (modoPrevio !== userMode) {
    setModoPrevio(userMode)
    if (!initializing && userMode === "VIP") setEntradas((n) => n + 1)
  }

  return (
    <>
      <Contenido />
      {/* La sesión se comprueba debajo de la entrada: sin esto la app instalada mostraría el login un instante. */}
      <PantallaEntrada key={entradas} />
    </>
  )
}

function Contenido() {
  const { userMode, isRecoleccion, initializing, mostrarOnboarding, estilo, terminarOnboarding } = useAuthContext()

  // Si se llegó al login desde otra página (ej. /centros), regresar ahí al entrar.
  // Después del recorrido de estilo, para no saltárselo en cuentas nuevas.
  useEffect(() => {
    if (userMode !== "VIP" || mostrarOnboarding) return
    const destino = tomarVolverA()
    if (destino) window.location.assign(destino)
  }, [userMode, mostrarOnboarding])

  if (initializing) return null
  if (!userMode) return <LoginView />

  // Collection Point / Punto de Recolección isolated portal mode
  if (isRecoleccion || userMode === "RECOLECCION") {
    return (
      <div className="overflow-y-auto h-dvh overscroll-contain bg-zinc-50">
        <PuntoRecoleccionView />
        <BarraDemo abajo="bottom-4" />
        <GuiaDemo />
      </div>
    )
  }

  // Cuentas con sesión que no han visto el recorrido, o que lo abrieron desde "Mi estilo".
  if (userMode === "VIP" && mostrarOnboarding) {
    return <OnboardingView modo={mostrarOnboarding} inicial={estilo} onTerminar={(e) => void terminarOnboarding(e)} />
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

  useEffect(() => {
    const ir = (e: Event) => setActiveView((e as CustomEvent<View>).detail)
    window.addEventListener(EVENTO_NAVEGAR, ir)
    return () => window.removeEventListener(EVENTO_NAVEGAR, ir)
  }, [])

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
      <div className="overflow-y-auto h-dvh overscroll-contain pb-40 lg:pb-48">
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
