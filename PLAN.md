# Plan de Refactorización — ClossApp

## Diagnóstico del Estado Actual

El archivo `components/clossapp-dashboard.tsx` (1,749 líneas / ~95 KB) contiene **todo**:

| Responsabilidad | Líneas aprox. | Problema |
|---|---|---|
| Tipos (`UserMode`, `View`, `ReparacionDB`, `OutfitRec`) | 1-29 | Tipos no reutilizables fuera del archivo |
| Datos demo/estáticos (6 constantes) | 31-88 | Mezclados con lógica |
| Helpers puros (`resizeImage`, `fetchPrendas`, `registrarUso`, `categoriaPermiteRenta`) | 90-133, 817-831, 1172-1176 | Lógica de negocio atada al archivo UI |
| 5 componentes auxiliares (`PrendaSkeleton`, `CenteredModal`, `OutfitVisual`, `OutfitCard`, `AnimatedNumber`) | 136-174, 837-868, 1079-1170, 1523-1531 | No reutilizables |
| 6 vistas completas (`LoginView`, `InicioView`, `ArmarioView`, `SimuladorView`, `MarketplaceView`, `EstadisticasView`) | 178-1656 | Cada una contiene su propio state + llamadas a Supabase + UI |
| Orquestador principal (`ClossappDashboard`) | 1658-1749 | Gestiona auth, navegación y prendas cache |

### Problemas críticos para migración móvil

1. Llamadas a Supabase directas dentro de componentes (no portables a React Native)
2. `prendas` se fetchea redundantemente en `ArmarioView` y en `ClossappDashboard`
3. Archivos duplicados: `hooks/use-mobile.ts` = `components/ui/use-mobile.tsx`, `hooks/use-toast.ts` = `components/ui/use-toast.ts`
4. `lib/supabase.ts` solo tiene tipos, no cliente (nombre confuso)
5. Cero separación entre servicios, estado y presentación

---

## 1. Nueva Estructura de Carpetas

```
clossapp/
├── app/
│   ├── layout.tsx                          # Sin cambios
│   ├── page.tsx                            # Sin cambios (wrapper delgado)
│   ├── globals.css                         # Sin cambios
│   └── api/                                # Sin cambios
│       ├── analyze-prenda/route.ts
│       ├── generate-outfits/route.ts
│       ├── recommend/route.ts
│       └── renta/route.ts
│
├── types/                                  # ★ NUEVO — Tipos centralizados
│   ├── index.ts                            #   Re-exporta todo
│   ├── prenda.ts                           #   Prenda, PrendaExtended (con usos/ultimo_uso)
│   ├── reparacion.ts                       #   ReparacionDB
│   ├── outfit.ts                           #   OutfitRec, GeneratedOutfit
│   ├── auth.ts                             #   UserMode, AuthState
│   └── views.ts                            #   View, NavItem
│
├── constants/                              # ★ NUEVO — Datos estáticos y config
│   ├── demo-data.ts                        #   GUEST_PRENDAS, GUEST_REPARACIONES,
│   │                                       #   DEMO_OUTFITS, STATIC_MARKET, STATIC_RENTA
│   ├── categories.ts                       #   FIXED_CATS, CATEGORIAS_RENTA, LAYER_ORDER
│   ├── navigation.ts                       #   navItems, filterChips
│   ├── images.ts                           #   fashionImages, outfitImages
│   └── animation.ts                        #   pageVariants, pageProps
│
├── services/                               # ★ NUEVO — Lógica pura (0 % React)
│   ├── prendas.service.ts                  #   fetchPrendas, uploadPrenda, deletePrenda
│   ├── reparaciones.service.ts             #   fetchReparaciones, createReparacion,
│   │                                       #   completeReparacion
│   ├── marketplace.service.ts              #   fetchMarketItems, fetchRentaItems,
│   │                                       #   publishForSale, publishForRent, apartarItem
│   ├── outfits.service.ts                  #   generateOutfits, registrarUso,
│   │                                       #   incrementarOutfits
│   ├── auth.service.ts                     #   signInWithPassword, signOut
│   ├── image.service.ts                    #   resizeImage, compressForAI,
│   │                                       #   uploadToStorage
│   ├── stats.service.ts                    #   fetchStats, fetchTopPrendas,
│   │                                       #   fetchOlvidadas
│   └── analyze.service.ts                  #   analyzePrenda (POST /api/analyze-prenda)
│
├── hooks/                                  # ★ REFACTORIZADO — Puente services → React
│   ├── use-auth.ts                         #   Login/logout + estado de sesión
│   ├── use-prendas.ts                      #   CRUD prendas + loading/error states
│   ├── use-reparaciones.ts                 #   CRUD reparaciones
│   ├── use-marketplace.ts                  #   Items marketplace + compra/venta/renta
│   ├── use-outfits.ts                      #   Generación + selección de outfits
│   ├── use-stats.ts                        #   KPIs + top/olvidadas
│   ├── use-image-upload.ts                 #   File → compress → analyze → upload
│   └── use-keyboard.ts                     #   useKeyboardOpen (existente)
│
├── context/                                # ★ NUEVO — Estado compartido cross-view
│   ├── auth-context.tsx                    #   AuthProvider + useAuthContext
│   └── prendas-context.tsx                 #   PrendasProvider + usePrendasContext
│
├── components/
│   ├── shared/                             # ★ NUEVO — Bloques UI reutilizables
│   │   ├── centered-modal.tsx
│   │   ├── prenda-skeleton.tsx
│   │   ├── animated-number.tsx
│   │   ├── bottom-nav.tsx
│   │   ├── page-header.tsx
│   │   ├── guest-lock-button.tsx
│   │   ├── prenda-card.tsx
│   │   └── prenda-grid.tsx
│   │
│   ├── views/                              # ★ NUEVO — Vistas descompuestas
│   │   ├── login-view.tsx
│   │   ├── inicio/
│   │   │   └── inicio-view.tsx
│   │   ├── armario/
│   │   │   ├── armario-view.tsx            #   Orquestador de la vista
│   │   │   ├── upload-modal.tsx            #   Preview + AI fields + confirm
│   │   │   ├── prenda-detail-modal.tsx     #   Detalle de prenda seleccionada
│   │   │   ├── repair-form-modal.tsx       #   Formulario nueva reparación
│   │   │   └── repair-list.tsx             #   Lista de reparaciones pendientes
│   │   ├── simulador/
│   │   │   ├── simulador-view.tsx          #   Orquestador de la vista
│   │   │   ├── outfit-form.tsx             #   Selector ocasión/clima/prenda
│   │   │   ├── outfit-card.tsx             #   Card de outfit generado
│   │   │   └── outfit-visual.tsx           #   Visual por capas de prendas
│   │   ├── marketplace/
│   │   │   ├── marketplace-view.tsx        #   Orquestador de la vista
│   │   │   ├── market-item-card.tsx        #   Card de item en marketplace
│   │   │   ├── item-detail-modal.tsx       #   Modal detalle + apartar/rentar
│   │   │   ├── sell-form-modal.tsx         #   Modal publicar para venta/renta
│   │   │   └── rent-date-picker.tsx        #   Selector de fecha de renta
│   │   └── estadisticas/
│   │       ├── estadisticas-view.tsx       #   Orquestador de la vista
│   │       ├── kpi-grid.tsx                #   4 tarjetas de KPIs
│   │       ├── top-prendas-list.tsx        #   Lista prendas más usadas
│   │       └── forgotten-prendas-list.tsx  #   Lista prendas olvidadas
│   │
│   ├── clossapp-dashboard.tsx              # ★ ADELGAZADO — Solo shell + providers
│   ├── theme-provider.tsx                  #   Sin cambios
│   └── ui/                                 #   shadcn/ui sin cambios
│
├── utils/
│   └── supabase/
│       ├── client.ts                       #   Sin cambios
│       └── server.ts                       #   Sin cambios
│
├── lib/
│   └── utils.ts                            #   cn() sin cambios
│
└── middleware.ts                            #   Sin cambios
```

### Archivos a eliminar

- `lib/supabase.ts` — tipo `Prenda` migra a `types/prenda.ts`
- `styles/globals.css` — duplicado de `app/globals.css`
- `hooks/use-mobile.ts` — duplicado de `components/ui/use-mobile.tsx`
- `hooks/use-toast.ts` — duplicado de `components/ui/use-toast.ts`

---

## 2. Desglose de Componentes

### 2.1 Capa de Servicios (`services/`) — 0 % React, 100 % portable

| Archivo | Funciones exportadas | Responsabilidad |
|---|---|---|
| `prendas.service.ts` | `fetchPrendas(userId)`, `insertPrenda(data)`, `updatePrenda(id, data)` | CRUD contra tabla `prendas` vía Supabase |
| `reparaciones.service.ts` | `fetchReparaciones(userId)`, `createReparacion(payload)`, `completeReparacion(id)` | CRUD contra tabla `reparaciones` |
| `marketplace.service.ts` | `fetchVentaItems()`, `fetchRentaItems()`, `publishForSale(prendaId, precio, talla, estado)`, `publishForRent(prendaId, precioRenta, userId)`, `apartarCompra(item, userId)`, `apartarRenta(item, userId, fecha)` | Toda la lógica de marketplace |
| `outfits.service.ts` | `generateOutfits(contexto, wardrobe, userId)`, `registrarUso(prendaIds)`, `incrementarOutfits(userName)` | POST a `/api/generate-outfits` + RPCs |
| `auth.service.ts` | `signIn(email, password)`, `signOut()` | Wrapper de `supabase.auth` |
| `image.service.ts` | `resizeImage(file, maxWidth, quality)`, `compressForAI(file)`, `uploadToStorage(userId, blob)` | Canvas API compress + Storage upload |
| `analyze.service.ts` | `analyzePrenda(file, userId)` | POST a `/api/analyze-prenda` (compress + call) |
| `stats.service.ts` | `fetchStats(userId, userName)` → `{total, usos, outfits, sinUsar, topPrendas, olvidadas}` | Agregaciones estadísticas |

**Criterio clave:** Cada servicio recibe una instancia de Supabase client como parámetro (inyección de dependencia), lo que permite sustituirla por un cliente React Native en el futuro.

```ts
// services/prendas.service.ts
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Prenda } from "@/types"

export async function fetchPrendas(
  supabase: SupabaseClient,
  userId: string
): Promise<Prenda[]> {
  const { data, error } = await supabase
    .from("prendas")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}
```

### 2.2 Custom Hooks (`hooks/`) — Puente entre servicios y React

| Hook | State que gestiona | Funciones que expone | Consume |
|---|---|---|---|
| `useAuth` | `userMode`, `userId`, `userName`, `loading`, `error` | `login(email, pw)`, `loginAsGuest()`, `logout()` | `auth.service` |
| `usePrendas` | `prendas[]`, `loading`, `error` | `refresh()`, `addPrenda(data)`, `updatePrenda(id, data)` | `prendas.service` |
| `useReparaciones` | `reparaciones[]`, `loading` | `add(payload)`, `complete(id)` | `reparaciones.service` |
| `useMarketplace` | `ventaItems[]`, `rentaItems[]`, `loading` | `publishSale(...)`, `publishRent(...)`, `apartar(...)` | `marketplace.service` |
| `useOutfits` | `outfits[]`, `generating`, `error`, `elegidoIdx` | `generate(contexto)`, `elegir(outfit, idx)` | `outfits.service` |
| `useStats` | `stats`, `topPrendas[]`, `olvidadas[]`, `loading` | `refresh()` | `stats.service` |
| `useImageUpload` | `preview`, `previewForm`, `analyzing`, `uploading` | `selectFile(file)`, `updateForm(field, val)`, `confirm()`, `cancel()` | `image.service`, `analyze.service` |
| `useKeyboard` | `isOpen` | — | `visualViewport` API |

### 2.3 Componentes Compartidos (`components/shared/`)

| Componente | Props | Responsabilidad |
|---|---|---|
| `CenteredModal` | `open: boolean`, `onClose: () => void`, `children` | Modal animado con backdrop + cierre |
| `PrendaSkeleton` | — | Placeholder de carga para grid de prendas |
| `AnimatedNumber` | `target: number` | Número que anima con spring de Framer Motion |
| `BottomNav` | `activeView: View`, `onNavigate: (v: View) => void`, `flash?: View` | Barra de navegación inferior (oculta con teclado) |
| `PageHeader` | `subtitle: string`, `title: string`, `rightSlot?: ReactNode` | Header consistente subtitle + serif title |
| `GuestLockButton` | `isGuest: boolean`, `onClick: () => void`, `label: string`, `children` | Botón que muestra candado si es guest |
| `PrendaCard` | `prenda: Prenda`, `onClick: (p) => void`, `height: number`, `showBadges?: boolean` | Card individual de prenda en masonry grid |
| `PrendaGrid` | `prendas: Prenda[]`, `onSelect: (p) => void`, `loading: boolean`, `emptyAction?: ReactNode` | Grid masonry de 2 columnas con skeleton |

### 2.4 Subcomponentes de Vistas

#### Armario

| Componente | Props | Responsabilidad |
|---|---|---|
| `ArmarioView` | — (consume Context) | Orquesta la vista: header + filtro + grid + reparaciones + FAB |
| `UploadModal` | `open`, `onClose`, `preview`, `form`, `analyzing`, `uploading`, `onFormChange`, `onConfirm` | Modal de subida con campos AI + manuales |
| `PrendaDetailModal` | `prenda: Prenda \| null`, `onClose` | Detalle de prenda: imagen + chips + ficha técnica |
| `RepairFormModal` | `open`, `onClose`, `prendas: Prenda[]`, `onSave: (payload) => void`, `saving: boolean` | Formulario nueva reparación |
| `RepairList` | `reparaciones: ReparacionDB[]`, `prendas: Prenda[]`, `loading`, `onComplete: (id) => void`, `isGuest` | Lista animada de reparaciones |

#### Simulador

| Componente | Props | Responsabilidad |
|---|---|---|
| `SimuladorView` | — (consume Context) | Orquesta: header + formulario + resultados |
| `OutfitForm` | `prendas`, `isGuest`, `generating`, `onGenerate: (contexto) => void` | Selectores de ocasión/clima/prenda + botón generar |
| `OutfitCard` | `index`, `outfit`, `outfitPrendas`, `isElegido`, `isEligiendo`, `isGuest`, `onElegir` | Card de outfit (sin cambios en props, extraída como archivo) |
| `OutfitVisual` | `outfitPrendas: Prenda[]` | Visualización por capas (Top → Bottom → Accesorio) |

#### Marketplace

| Componente | Props | Responsabilidad |
|---|---|---|
| `MarketplaceView` | — (consume Context) | Orquesta: tabs comprar/rentar + grid + modales |
| `MarketItemCard` | `item: Prenda`, `isRenta: boolean`, `onClick` | Card de item en marketplace |
| `ItemDetailModal` | `item`, `isRenta`, `onApartar`, `aparting`, `isGuest` | Modal detalle con CTA de compra/renta |
| `SellFormModal` | `open`, `prendas`, `onPublish`, `selling` | Modal 2-step: seleccionar prenda → fijar precio |
| `RentDatePicker` | `value`, `onChange`, `onConfirm`, `onCancel`, `confirming` | Selector de fecha para renta |

#### Estadísticas

| Componente | Props | Responsabilidad |
|---|---|---|
| `EstadisticasView` | — (consume Context) | Orquesta: KPIs + top + olvidadas |
| `KpiGrid` | `kpis: {value, label}[]` | Grid 2×2 de tarjetas KPI con AnimatedNumber |
| `TopPrendasList` | `prendas: PrendaExt[]`, `isGuest`, `formatDate` | Lista numerada de prendas más usadas |
| `ForgottenPrendasList` | `prendas: PrendaExt[]`, `isGuest`, `onSell: (p) => void`, `formatDate` | Lista de prendas olvidadas con CTA "Vender" |

---

## 3. Estrategia de Estado Global

### Problema actual

```
ClossappDashboard (prendas, userId, userName, activeView)
    ├── ArmarioView     ← fetch propio de prendas (DUPLICADO)
    ├── SimuladorView    ← recibe prendas como prop
    ├── MarketplaceView  ← recibe userPrendas como prop
    └── EstadisticasView ← fetch propio de stats
```

Cada vista gestiona su propio estado. `prendas` se fetchea en al menos 3 lugares distintos.

### Solución: 2 React Contexts + Hooks locales

```
AuthProvider                    ← Envuelve toda la app
  └── PrendasProvider           ← Envuelve todas las vistas (solo si authenticated)
        ├── ArmarioView         ← usePrendasContext() + useReparaciones()
        ├── SimuladorView       ← usePrendasContext() + useOutfits()
        ├── MarketplaceView     ← usePrendasContext() + useMarketplace()
        └── EstadisticasView    ← usePrendasContext() + useStats()
```

### 3.1 `AuthContext`

```ts
// context/auth-context.tsx
type AuthContextValue = {
  userMode: UserMode | null
  userId: string          // UUID de Supabase Auth
  userName: string        // Prefijo del email (display only)
  isGuest: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  loginAsGuest: () => void
  logout: () => void
  loading: boolean
  error: string | null
}
```

- **Dónde se monta:** En `ClossappDashboard`, envolviendo `LoginView` y todas las vistas.
- **Qué reemplaza:** Las variables `userMode`, `userId`, `userName`, `isGuest` y la función `handleLogin` del monolito actual (líneas 1660-1674).

### 3.2 `PrendasContext`

```ts
// context/prendas-context.tsx
type PrendasContextValue = {
  prendas: Prenda[]
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>         // Re-fetch completo
  addPrenda: (data: InsertPrenda) => Promise<void>   // Insert + refresh
  updatePrenda: (id: string, data: Partial<Prenda>) => Promise<void>
}
```

- **Dónde se monta:** Dentro de `AuthProvider`, solo cuando `isAuthenticated`. El provider internamente usa `usePrendas(userId)` y expone el resultado.
- **Qué reemplaza:** Los `fetchPrendas(userId)` dispersos en `ArmarioView` (línea 350), `ClossappDashboard` (línea 1680), y la prop-drilling de `prendas` hacia `SimuladorView` y `MarketplaceView`.

### 3.3 Estado local (hooks por vista)

Todo lo que **no** es cross-cutting permanece local:

| Vista | Hook local | Estado que maneja |
|---|---|---|
| Armario | `useReparaciones(userId)` | `reparaciones[]`, CRUD |
| Armario | `useImageUpload(userId)` | `preview`, `form`, `analyzing`, `uploading` |
| Simulador | `useOutfits(prendas, userId, userName)` | `outfits[]`, `generating`, `elegidoIdx` |
| Marketplace | `useMarketplace(userId, isGuest)` | `ventaItems[]`, `rentaItems[]`, sell form state |
| Estadísticas | `useStats(userId, userName, isGuest)` | `stats`, `topPrendas[]`, `olvidadas[]` |

### 3.4 Por qué **NO** Zustand / Redux

- El estado compartido real son solo 2 cosas: auth y prendas del usuario
- React Context con `useReducer` es suficiente y no agrega dependencias
- Para React Native, Context es nativo — zero friction
- Si en el futuro la app crece, migrar de Context a Zustand es trivial (misma forma del state)

### 3.5 Diagrama de flujo de datos post-refactor

```
┌──────────────────────────────────────────────────────┐
│  AuthContext (userMode, userId, userName, isGuest)    │
│  ┌────────────────────────────────────────────────┐  │
│  │  PrendasContext (prendas[], refresh, add)       │  │
│  │                                                 │  │
│  │  ┌─── View ────────────────────────────────┐   │  │
│  │  │  const { prendas } = usePrendasContext() │   │  │
│  │  │  const { userId } = useAuthContext()     │   │  │
│  │  │  const { outfits, generate } = useOutfits│() │  │
│  │  │                                          │   │  │
│  │  │  return <UI prendas={prendas} ... />     │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  │                    │                            │  │
│  │                    ▼                            │  │
│  │  ┌─── services/ (pure functions) ──────────┐   │  │
│  │  │  fetchPrendas(supabase, userId)          │   │  │
│  │  │  generateOutfits(contexto, wardrobe)     │   │  │
│  │  │  resizeImage(file, maxW, quality)        │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## 4. Plan de Ejecución por Fases

### Regla de oro

> Cada fase produce un commit funcional. La app nunca deja de compilar ni de funcionar.

---

### Fase 0 — Limpieza y preparación (sin cambios funcionales) ✅ COMPLETADA

**Objetivo:** Eliminar duplicados y crear la estructura de directorios vacía.

| # | Tarea | Detalle |
|---|---|---|
| 0.1 | Eliminar duplicados | Borrar `hooks/use-mobile.ts`, `hooks/use-toast.ts`, `styles/globals.css` (los de `components/ui/` y `app/` se quedan) |
| 0.2 | Crear directorios | `types/`, `constants/`, `services/`, `context/`, `components/shared/`, `components/views/` y subdirectorios |
| 0.3 | Verificar que `npm run build` pasa | |

**Riesgo:** Cero. Solo se borran archivos que no se importan.

**Commit:** `chore: cleanup duplicates and create directory scaffold`

**Completada:** 2026-06-08 | **Por:** mauri | **Modelo:** DeepSeek V4 Pro (OpenCode)

**Detalle de cambios:**
- `hooks/use-mobile.ts` → borrado (imports redirigidos a `@/components/ui/use-mobile` en `sidebar.tsx`)
- `hooks/use-toast.ts` → borrado (imports redirigidos a `@/components/ui/use-toast` en `toaster.tsx`)
- `styles/globals.css` → borrado (duplicado de `app/globals.css`, sin imports)
- Creadas 13 carpetas: `types/`, `constants/`, `services/`, `context/`, `components/shared/`, `components/views/inicio/`, `components/views/armario/`, `components/views/simulador/`, `components/views/marketplace/`, `components/views/estadisticas/`
- `npm run build` pasa sin errores

---

### Fase 1 — Extraer tipos y constantes ✅ COMPLETADA

**Objetivo:** Mover todas las definiciones de tipos y datos estáticos fuera del monolito.

| # | Tarea | Desde (dashboard.tsx) | Hacia |
|---|---|---|---|
| 1.1 | Tipo `Prenda` | `lib/supabase.ts:5-20` | `types/prenda.ts` |
| 1.2 | Tipos `ReparacionDB`, `OutfitRec` | líneas 25-28 | `types/reparacion.ts`, `types/outfit.ts` |
| 1.3 | Tipos `UserMode`, `View` | líneas 19, 29 | `types/auth.ts`, `types/views.ts` |
| 1.4 | `types/index.ts` | — | Re-exporta todo |
| 1.5 | Demo data | líneas 31-56 | `constants/demo-data.ts` |
| 1.6 | `navItems`, `filterChips` | líneas 58-64, 1184 | `constants/navigation.ts` |
| 1.7 | Categorías y layers | líneas 337, 835, 1173 | `constants/categories.ts` |
| 1.8 | Images arrays | líneas 66-80 | `constants/images.ts` |
| 1.9 | Animation variants | líneas 82-87 | `constants/animation.ts` |
| 1.10 | Actualizar imports en dashboard | — | `import { Prenda } from "@/types"` etc. |

**Método:** Extract → import → verify build. El dashboard sigue idéntico funcionalmente.

**Commit:** `refactor: extract types and constants from monolith`

**Completada:** 2026-06-08 | **Por:** mauri | **Modelo:** DeepSeek V4 Pro (OpenCode)

**Detalle de cambios:**
- `types/prenda.ts` — `Prenda`, `PrendaExt`
- `types/reparacion.ts` — `ReparacionDB`
- `types/outfit.ts` — `OutfitRec`
- `types/auth.ts` — `UserMode`
- `types/views.ts` — `View`
- `types/index.ts` — re-exports all types
- `constants/demo-data.ts` — `DEMO_OUTFITS`, `GUEST_PRENDAS`, `GUEST_REPARACIONES`, `STATIC_MARKET`, `STATIC_RENTA`
- `constants/navigation.ts` — `navItems`, `filterChips`
- `constants/categories.ts` — `FIXED_CATS`, `CATEGORIAS_RENTA_PERMITIDAS`, `categoriaPermiteRenta()`, `LAYER_ORDER`
- `constants/images.ts` — `fashionImages`, `outfitImages`
- `constants/animation.ts` — `pageVariants`, `pageProps`
- `clossapp-dashboard.tsx`: 1,749 → 1,669 líneas (-80)
- Cero imports to `@/lib/supabase` en todo el codebase
- `npm run build` pasa sin errores

---

### Fase 2 — Extraer capa de servicios ✅ COMPLETADA

**Objetivo:** Mover **TODA** la lógica de negocio (llamadas Supabase, fetch API, Canvas) a funciones puras.

| # | Archivo a crear | Lógica extraída desde dashboard | Líneas originales |
|---|---|---|---|
| 2.1 | `services/image.service.ts` | `resizeImage()` | 118-133 |
| 2.2 | `services/prendas.service.ts` | `fetchPrendas()` | 102-110 |
| 2.3 | `services/auth.service.ts` | `signInWithPassword()` de `LoginView` | 186-207 |
| 2.4 | `services/analyze.service.ts` | `analyzeImage()` de `ArmarioView` | 372-406 |
| 2.5 | `services/outfits.service.ts` | `handleGenerate()` cuerpo, `registrarUso()` | 893-929, 817-831 |
| 2.6 | `services/reparaciones.service.ts` | CRUD reparaciones de `ArmarioView` | 353-358, 447-469 |
| 2.7 | `services/marketplace.service.ts` | fetch + publish + apartar de `MarketplaceView` | 1212-1295 |
| 2.8 | `services/stats.service.ts` | `load()` de `EstadisticasView` | 1546-1571 |

**Patrón de cada servicio:**

```ts
// services/prendas.service.ts
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Prenda } from "@/types"

export async function fetchPrendas(
  supabase: SupabaseClient,
  userId: string
): Promise<Prenda[]> { ... }

export async function insertPrenda(
  supabase: SupabaseClient,
  data: InsertPrendaPayload
): Promise<Prenda> { ... }
```

**Después de crear cada servicio:** reemplazar la implementación inline en el dashboard por una llamada al servicio. La función original se elimina del dashboard.

**Commit:** `refactor: extract service layer (zero React, fully portable)`

**Completada:** 2026-06-08 | **Por:** mauri | **Modelo:** DeepSeek V4 Pro (OpenCode)

**Detalle de cambios:**
- `services/image.service.ts` — `resizeImage(file, maxWidth?, quality?)` — Canvas API pura
- `services/prendas.service.ts` — `fetchPrendas(supabase, userId)`, `insertPrenda(supabase, payload)`
- `services/auth.service.ts` — `signIn(supabase, email, password)` → `{uuid, displayName}`
- `services/analyze.service.ts` — `analyzePrenda(file, userId)` — comprime + llama API
- `services/outfits.service.ts` — `registrarUso(supabase, ids)`, `incrementarOutfits(supabase, userName)`, `generateOutfits(contexto, wardrobe, userId)`, `mapWardrobe(prendas)`
- `services/reparaciones.service.ts` — `fetchReparaciones(supabase, userId)`, `createReparacion(supabase, payload)`, `completeReparacion(supabase, id)`
- `services/marketplace.service.ts` — `fetchVentaItems(supabase)`, `fetchRentaItems(supabase)`, `publishForSale(supabase, ...)`, `publishForRent(...)`, `apartarCompra(supabase, ...)`, `apartarRenta(supabase, ...)`
- `services/stats.service.ts` — `fetchStats(supabase, userId, userName)` → `StatsResult`
- `clossapp-dashboard.tsx`: 1,669 → 1,522 líneas (-147)
- Todos los servicios reciben `SupabaseClient` como parámetro (inyección de dependencias)
- `npm run build` pasa sin errores

---

### Fase 3 — Extraer custom hooks ✅ COMPLETADA

**Objetivo:** Crear hooks que encapsulen estado + llamadas a servicios. Los componentes solo verán hooks.

| # | Hook | Consume servicio(s) | Estado encapsulado |
|---|---|---|---|
| 3.1 | `hooks/use-keyboard.ts` | — | `isOpen` (ya existe como `useKeyboardOpen`, renombrar) |
| 3.2 | `hooks/use-auth.ts` | `auth.service` | `userMode, userId, userName, loading, error` |
| 3.3 | `hooks/use-prendas.ts` | `prendas.service` | `prendas[]`, `loading`, `error` |
| 3.4 | `hooks/use-reparaciones.ts` | `reparaciones.service` | `reparaciones[]`, `loading`, form state |
| 3.5 | `hooks/use-image-upload.ts` | `image.service`, `analyze.service` | `preview`, `form`, `analyzing`, `uploading` |
| 3.6 | `hooks/use-outfits.ts` | `outfits.service` | `outfits[]`, `generating`, `error`, `elegidoIdx` |
| 3.7 | `hooks/use-marketplace.ts` | `marketplace.service` | `items[]`, `rentaItems[]`, sell form, `loading` |
| 3.8 | `hooks/use-stats.ts` | `stats.service` | `stats`, `topPrendas[]`, `olvidadas[]`, `loading` |

**Ejemplo concreto:**

```ts
// hooks/use-prendas.ts
export function usePrendas(userId: string, isGuest: boolean) {
  const [prendas, setPrendas] = useState<Prenda[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserSupabaseClient()

  const refresh = useCallback(async () => {
    if (isGuest) { setPrendas(GUEST_PRENDAS); setLoading(false); return }
    setLoading(true)
    const data = await fetchPrendas(supabase, userId)
    setPrendas(data)
    setLoading(false)
  }, [userId, isGuest])

  useEffect(() => { refresh() }, [refresh])

  return { prendas, loading, refresh, setPrendas }
}
```

**Método:** Crear hook → importar en la vista correspondiente → reemplazar `useState`/`useEffect` inline → verify build.

**Commit:** `refactor: extract custom hooks bridging services to React`

**Completada:** 2026-06-08 | **Por:** mauri | **Modelo:** DeepSeek V4 Pro (OpenCode)

**Detalle de cambios:**
- `hooks/use-keyboard.ts` — `useKeyboard()` extraído del helper `useKeyboardOpen` del dashboard
- `hooks/use-auth.ts` — `useAuth()` reemplaza mock anterior. Expone `login`, `loginAsGuest`, `logout`, `userMode`, `userId`, `userName`, `isGuest`, `isAuthenticated`, `loading`, `error`
- `hooks/use-prendas.ts` — `usePrendas(userId, isGuest)` → `{prendas, loading, refresh, setPrendas, addPrenda}`
- `hooks/use-reparaciones.ts` — `useReparaciones(userId, isGuest)` → `{reparaciones, loading, refresh, add, complete}`
- `hooks/use-image-upload.ts` — `useImageUpload(userId, isGuest)` → `{preview, previewForm, analyzing, analyzeError, uploading, fileInputRef, selectFile, updateForm, upload, cancel}`
- `hooks/use-outfits.ts` — `useOutfits(prendas, userId, userName, isGuest)` → `{outfits, generating, error, eligiendoIdx, elegidoIdx, generate, elegir, setElegidoIdx}`
- `hooks/use-marketplace.ts` — `useMarketplace(userId, isGuest)` → `{marketTab, setMarketTab, activeFilter, setActiveFilter, items, rentaItems, loading, aparting, apartSuccess, sellMode, setSellMode, selling, rentaError, refresh, apartar, publish}`
- `hooks/use-stats.ts` — `useStats(userId, userName, isGuest)` → `{stats, topPrendas, olvidadas, loading, refresh}`
- `LoginView` actualizado: recibe `onLogin(email, pw)`, `onLoginAsGuest()`, `loading`, `error` (ya no maneja su propio estado de auth)
- `ClossappDashboard` usa `useAuth()` + `useKeyboard()` en vez de estado inline
- `ArmarioView` usa `usePrendas()` + `useReparaciones()` + `useImageUpload()` → se eliminaron 3 `useEffect` y ~20 líneas de estado
- `SimuladorView` usa `useOutfits()` → se eliminaron 5 estados + 2 funciones inline
- `MarketplaceView` usa `useMarketplace()` → se eliminaron 8 estados + 1 `useEffect` + 2 funciones inline
- `EstadisticasView` usa `useStats()` → se eliminaron 4 estados + 1 `useEffect`
- `clossapp-dashboard.tsx`: 1,522 → 1,388 líneas (-134)
- `npm run build` pasa sin errores

---

### Fase 4 — Crear Context providers ✅ COMPLETADA

**Objetivo:** Eliminar prop-drilling y unificar el fetch de prendas.

| # | Archivo | Responsabilidad |
|---|---|---|
| 4.1 | `context/auth-context.tsx` | `AuthProvider` que envuelve la app. Expone `useAuthContext()`. Internamente usa `useAuth` hook. |
| 4.2 | `context/prendas-context.tsx` | `PrendasProvider` que se monta solo cuando el user está autenticado. Expone `usePrendasContext()`. Internamente usa `usePrendas` hook. |
| 4.3 | Actualizar `ClossappDashboard` | Envolver con `<AuthProvider><PrendasProvider>`. Eliminar state local de `prendas`, `userId`, `userName`. |

**Después de esta fase,** el dashboard principal baja de ~90 líneas de lógica a ~30.

**Commit:** `refactor: add AuthContext and PrendasContext providers`

**Completada:** 2026-06-08 | **Por:** mauri | **Modelo:** DeepSeek V4 Pro (OpenCode)

**Detalle de cambios:**
- `context/auth-context.tsx` — `AuthProvider` + `useAuthContext()`. Envuelve `useAuth()` hook en un React Context. Expone `userMode`, `userId`, `userName`, `isGuest`, `isAuthenticated`, `login`, `loginAsGuest`, `logout`, `loading`, `error`
- `context/prendas-context.tsx` — `PrendasProvider` + `usePrendasContext()`. Envuelve `usePrendas()` hook. Se monta solo si hay `userId` (dentro de AuthProvider). Expone `prendas`, `loading`, `refresh`, `addPrenda`
- `ClossappDashboard` separado en `AppShell` (consume contextos) + export wrapper (monta providers)
- Eliminada la duplicación de `fetchPrendas` en el dashboard principal. Ahora `PrendasContext` es la única fuente de verdad para los datos de prendas
- Eliminado el `useEffect` condicional que fetcheaba prendas según `activeView`
- Eliminada la `supabase` module-level ya que no era usada (cada hook crea su propio cliente)
- `clossapp-dashboard.tsx`: 1,388 → 1,380 líneas (-8)
- Arquitectura ahora: `ClossappDashboard → AuthProvider → PrendasProvider → AppShell → Views`
- `npm run build` pasa sin errores

---

### Fase 5 — Extraer componentes compartidos ✅ COMPLETADA

**Objetivo:** Sacar los building blocks reutilizables a archivos propios.

| # | Componente | Desde (líneas) | A |
|---|---|---|---|
| 5.1 | `CenteredModal` | 153-174 | `components/shared/centered-modal.tsx` |
| 5.2 | `PrendaSkeleton` | 136-150 | `components/shared/prenda-skeleton.tsx` |
| 5.3 | `AnimatedNumber` | 1523-1531 | `components/shared/animated-number.tsx` |
| 5.4 | `BottomNav` | 1716-1742 | `components/shared/bottom-nav.tsx` |
| 5.5 | `PageHeader` | Extraer patrón repetido | `components/shared/page-header.tsx` |
| 5.6 | `PrendaCard` | Patrón del masonry | `components/shared/prenda-card.tsx` |
| 5.7 | `PrendaGrid` | Patrón de grid + skeleton | `components/shared/prenda-grid.tsx` |

**Método:** Cut desde dashboard → paste a nuevo archivo → agregar exports → actualizar imports → verify build.

**Commit:** `refactor: extract shared UI components`

**Completada:** 2026-06-08 | **Por:** mauri | **Modelo:** DeepSeek V4 Pro (OpenCode)

**Detalle de cambios:**
- `components/shared/centered-modal.tsx` — componente `<CenteredModal>` con animación spring + backdrop + botón X
- `components/shared/prenda-skeleton.tsx` — skeleton de masonry grid 2 columnas con alturas variables
- `components/shared/animated-number.tsx` — número animado con `useMotionValue` + `useSpring` de Framer Motion
- `components/shared/bottom-nav.tsx` — barra de navegación inferior con flash animation y keyboard-aware
- `components/shared/page-header.tsx` — header consistente (`subtitle` + título serif + `rightSlot`)
- `components/shared/prenda-card.tsx` — card de prenda con imagen, nombre, categoría, badge y caption configurables
- `components/shared/prenda-grid.tsx` — grid masonry con skeleton, mensaje vacío y `PrendaCard` items
- `clossapp-dashboard.tsx`: 1,380 → 1,303 líneas (-77)
- `npm run build` pasa sin errores

---

### Fase 6 — Descomponer vistas (una por una)

> Cada sub-fase es un commit independiente. Si algo falla, solo afecta una vista.

#### 6A — `LoginView` (la más simple) ✅ COMPLETADA

```
components/views/login-view.tsx
├── Consume: useAuthContext() para login/loginAsGuest
└── Elimina: LoginView del monolito (líneas 178-238)
```

**Commit:** `refactor: extract LoginView`

**Completada:** 2026-06-08 | **Por:** mauri | **Modelo:** DeepSeek V4 Pro (OpenCode)

**Detalle:**
- `components/views/login-view.tsx` — LoginView usa `useAuthContext()` directamente en vez de recibir props
- Eliminados los props `onLogin`, `onLoginAsGuest`, `loading`, `error` del componente
- `AppShell` ahora solo pasa `<LoginView key="login" />` sin props
- `clossapp-dashboard.tsx`: 1,303 → 1,258 líneas (-45)

#### 6B — `InicioView` ✅ COMPLETADA

```
components/views/inicio/inicio-view.tsx
├── Consume: useAuthContext() para userName, isGuest
└── Elimina: InicioView del monolito (líneas 241-311)
```

**Commit:** `refactor: extract InicioView`

**Completada:** 2026-06-08 | **Por:** mauri | **Modelo:** DeepSeek V4 Pro (OpenCode)

**Detalle:**
- `components/views/inicio/inicio-view.tsx` — consume `useAuthContext()` directamente
- Eliminados los props `userName`, `isGuest`
- `clossapp-dashboard.tsx`: 1,258 → 1,186 líneas (-72)

#### 6C — `EstadisticasView` (independiente, sin dependencias complejas) ✅ COMPLETADA

```
components/views/estadisticas/
├── estadisticas-view.tsx       ← useAuthContext() + useStats()
├── kpi-grid.tsx                ← Props: kpis[]
├── top-prendas-list.tsx        ← Props: prendas[], formatDate
└── forgotten-prendas-list.tsx  ← Props: prendas[], onSell, formatDate
```

**Commit:** `refactor: extract EstadisticasView and subcomponents`

**Completada:** 2026-06-08 | **Por:** mauri | **Modelo:** DeepSeek V4 Pro (OpenCode)

**Detalle:**
- `components/views/estadisticas/estadisticas-view.tsx` — consume `useAuthContext()` + `useStats()`
- `components/views/estadisticas/kpi-grid.tsx` — grid 2x2 de KPIs con `AnimatedNumber`
- `components/views/estadisticas/top-prendas-list.tsx` — lista de prendas más usadas
- `components/views/estadisticas/forgotten-prendas-list.tsx` — lista de prendas olvidadas con CTA "Vender"
- Eliminados los props `userId`, `userName`, `isGuest` (ahora se obtienen del contexto)
- Solo recibe `onSellPrenda` (callback para navegar a marketplace)
- `clossapp-dashboard.tsx`: 1,186 → 1,096 líneas (-90)

#### 6D — `SimuladorView` ✅ COMPLETADA

```
components/views/simulador/
├── simulador-view.tsx   ← useAuthContext() + usePrendasContext() + useOutfits()
├── outfit-form.tsx      ← Props: prendas, isGuest, generating, onGenerate
├── outfit-card.tsx      ← Props: index, outfit, outfitPrendas, isElegido, isGuest, onElegir
└── outfit-visual.tsx    ← Props: outfitPrendas (ya existe aislado)
```

**Commit:** `refactor: extract SimuladorView and subcomponents`

**Completada:** 2026-06-08 | **Por:** mauri | **Modelo:** DeepSeek V4 Pro (OpenCode)

**Detalle:**
- `components/views/simulador/simulador-view.tsx` — consume `useAuthContext()` + `usePrendasContext()` + `useOutfits()`
- `components/views/simulador/outfit-form.tsx` — formulario de ocasión/clima/prenda destacada
- `components/views/simulador/outfit-card.tsx` — card de outfit con foto grid + descripción expandible + CTA
- `components/views/simulador/outfit-visual.tsx` — visualización por capas (re-usado de dashboard)
- Eliminados props `prendas`, `isGuest`, `userId`, `userName` (context)
- Solo recibe `onElegir` callback
- `clossapp-dashboard.tsx`: 1,096 → 816 líneas (-280)

#### 6E — `MarketplaceView` (la más compleja) ✅ COMPLETADA

```
components/views/marketplace/
├── marketplace-view.tsx     ← useAuthContext() + usePrendasContext() + useMarketplace()
├── market-item-card.tsx     ← Props: item, isRenta, onClick
├── item-detail-modal.tsx    ← Props: item, isRenta, onApartar, isGuest, aparting
├── sell-form-modal.tsx      ← Props: open, prendas, onPublish, selling
└── rent-date-picker.tsx     ← Props: value, onChange, onConfirm, onCancel
```

**Commit:** `refactor: extract MarketplaceView and subcomponents`

**Completada:** 2026-06-08 | **Por:** mauri | **Modelo:** DeepSeek V4 Pro (OpenCode)

**Detalle:**
- `components/views/marketplace/marketplace-view.tsx` — consume `useAuthContext()` + `usePrendasContext()` + `useMarketplace()`
- `components/views/marketplace/market-item-card.tsx` — card de item en marketplace
- `components/views/marketplace/item-detail-modal.tsx` — modal detalle con CTA + rent-date-picker
- `components/views/marketplace/sell-form-modal.tsx` — modal 2-step publicar venta/renta
- `components/views/marketplace/rent-date-picker.tsx` — selector de fecha de renta
- Eliminados props `userId`, `isGuest`, `userPrendas` (context)
- Solo recibe `onApartar` callback
- `clossapp-dashboard.tsx`: 816 → 535 líneas (-281)

#### 6F — `ArmarioView` (la más pesada — 500+ líneas)

```
components/views/armario/
├── armario-view.tsx          ← usePrendasContext() + useReparaciones() + useImageUpload()
├── upload-modal.tsx          ← Props: open, preview, form, analyzing, uploading, handlers
├── prenda-detail-modal.tsx   ← Props: prenda, onClose
├── repair-form-modal.tsx     ← Props: open, prendas, onSave, saving
└── repair-list.tsx           ← Props: reparaciones, prendas, loading, onComplete, isGuest
```

**Commit:** `refactor: extract ArmarioView and subcomponents`

---

### Fase 7 — Adelgazar el shell principal

**Objetivo:** `ClossappDashboard` queda como un shell de ~50-60 líneas.

```tsx
// components/clossapp-dashboard.tsx (final)
"use client"

import { AuthProvider, useAuthContext } from "@/context/auth-context"
import { PrendasProvider } from "@/context/prendas-context"
import { LoginView } from "@/components/views/login-view"
import { BottomNav } from "@/components/shared/bottom-nav"
import { InicioView } from "@/components/views/inicio/inicio-view"
import { ArmarioView } from "@/components/views/armario/armario-view"
import { SimuladorView } from "@/components/views/simulador/simulador-view"
import { MarketplaceView } from "@/components/views/marketplace/marketplace-view"
import { EstadisticasView } from "@/components/views/estadisticas/estadisticas-view"
import type { View } from "@/types"
import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useKeyboard } from "@/hooks/use-keyboard"

function AppShell() {
  const { isAuthenticated, isGuest } = useAuthContext()
  const [activeView, setActiveView] = useState<View>("inicio")
  const keyboardOpen = useKeyboard()

  if (!isAuthenticated) return <LoginView />

  const views: Record<View, JSX.Element> = {
    inicio: <InicioView />,
    armario: <ArmarioView />,
    simulador: <SimuladorView />,
    marketplace: <MarketplaceView />,
    estadisticas: <EstadisticasView />,
  }

  return (
    <PrendasProvider>
      <div className="overflow-y-auto h-screen pb-36">
        <AnimatePresence mode="wait">
          <div key={activeView}>{views[activeView]}</div>
        </AnimatePresence>
      </div>
      {!keyboardOpen && (
        <BottomNav activeView={activeView} onNavigate={setActiveView} />
      )}
    </PrendasProvider>
  )
}

export function ClossappDashboard() {
  return (
    <div className="flex items-start justify-center min-h-screen bg-white">
      <div className="w-full max-w-2xl mx-auto min-h-screen bg-white relative">
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </div>
    </div>
  )
}
```

**Commit:** `refactor: slim down ClossappDashboard to shell (~50 lines)`

---

### Fase 8 — Limpieza final y validación

| # | Tarea |
|---|---|
| 8.1 | Eliminar `lib/supabase.ts` (tipo ya vive en `types/prenda.ts`) |
| 8.2 | Actualizar todo import de `@/lib/supabase` a `@/types` |
| 8.3 | Verificar que **no** queda código muerto en el dashboard |
| 8.4 | `npm run build` — debe pasar limpio |
| 8.5 | `npm run lint` — corregir warnings |
| 8.6 | Verificar manualmente las 5 vistas + login + guest mode |
| 8.7 | Actualizar `AGENTS.md` con la nueva arquitectura |

**Commit:** `chore: final cleanup and documentation update`

---

## Resumen Cuantitativo

| Métrica | Antes | Después |
|---|---|---|
| `clossapp-dashboard.tsx` | 1,749 líneas | ~50-60 líneas |
| Archivos de lógica de negocio | 0 | 8 servicios |
| Custom hooks | 1 (mock) | 8 hooks reales |
| Componentes compartidos | 0 | 7 |
| Archivos de vista | 1 (todo junto) | 22 (6 vistas × ~3-4 subcomponentes) |
| Tipos centralizados | parcial (1 archivo) | 5 archivos en `types/` |
| Portabilidad a React Native | Imposible | Solo se reescribe `components/` |

## Preparación para React Native

Con esta arquitectura, migrar a React Native requiere:

1. **Copiar sin cambios:** `types/`, `constants/`, `services/`, `hooks/`
2. **Adaptar `services/`:** Cambiar `createBrowserSupabaseClient()` por el cliente de `@supabase/supabase-js` para React Native
3. **Reescribir:** Solo `components/` (React Native Views, no JSX/HTML)
4. **Context:** Se porta tal cual — React Context funciona idéntico en React Native

> La capa de negocio (~50 % del código) es **zero-rewrite**.
