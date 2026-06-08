# AGENTS.md — ClossApp

## Stack
- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** with `@tailwindcss/postcss` (uses `@import "tailwindcss"` in CSS, not `@tailwind` directives)
- **shadcn/ui** (new-york style, `components.json`) + **Radix UI** + **Lucide** icons
- **Framer Motion** for animations
- **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`) — PostgreSQL, Storage (bucket: `closet-images`), Auth
- **Anthropic SDK** — Claude Sonnet 4.6 (vision/analysis) + Claude Haiku (outfit generation)
- Hosted on Vercel

## Commands
```bash
npm run dev      # Next.js dev server
npm run build    # production build (ignores TypeScript errors — see next.config.mjs)
npm run lint     # eslint
```

## Architecture

Single-page app — `ClossappDashboard` (`components/clossapp-dashboard.tsx`) is a thin shell (57 lines). `app/page.tsx` is a wrapper with `dynamic = 'force-dynamic'`.

### Directory Layout (modular post-refactor)
```
components/
├── clossapp-dashboard.tsx    # Shell: AuthProvider → PrendasProvider → AppShell
├── shared/                   # 7 reusable UI components
│   ├── bottom-nav.tsx        # Fixed bottom nav with view icons
│   ├── centered-modal.tsx    # Generic modal wrapper
│   ├── page-header.tsx       # View title + optional action
│   ├── prenda-card.tsx       # Single garment card
│   ├── prenda-grid.tsx       # Grid layout for cards
│   ├── prenda-skeleton.tsx   # Loading placeholder
│   └── animated-number.tsx   # Animated counter
└── views/                    # 20 view components (6 sections)
    ├── login-view.tsx
    ├── inicio/inicio-view.tsx
    ├── armario/{armario-view,upload-modal,prenda-detail-modal,repair-form-modal,repair-list}.tsx
    ├── simulador/{simulador-view,outfit-form,outfit-card,outfit-visual}.tsx
    ├── marketplace/{marketplace-view,market-item-card,item-detail-modal,sell-form-modal,rent-date-picker}.tsx
    └── estadisticas/{estadisticas-view,kpi-grid,top-prendas-list,forgotten-prendas-list}.tsx
context/
├── auth-context.tsx          # AuthProvider + useAuthContext (userMode, userId, user, isGuest)
└── prendas-context.tsx       # PrendasProvider + usePrendasContext (prendas, refresh, loading)
hooks/
├── use-auth.ts               # Demo mock + real Supabase auth logic
├── use-keyboard.ts           # Detects mobile keyboard open/close
├── use-prendas.ts            # CRUD for prendas (fetch, insert, update, delete)
├── use-reparaciones.ts       # CRUD for reparaciones
├── use-image-upload.ts       # Canvas resize + Supabase storage upload
├── use-outfits.ts            # Outfit generation via /api/generate-outfits
├── use-marketplace.ts        # Sell/rent mutations via /api/renta
└── use-stats.ts              # Usage/frequency stats
services/
├── image.service.ts          # Canvas compression utilities
├── prendas.service.ts        # Supabase prendas queries
├── auth.service.ts           # Sign in/up/signOut + username check
├── analyze.service.ts        # Claude Sonnet image analysis
├── outfits.service.ts        # Outfit generation API call
├── reparaciones.service.ts   # Reparaciones queries
├── marketplace.service.ts    # Market listings + renta API
└── stats.service.ts          # Usage stats queries
types/
├── prenda.ts                 # Prenda, PrendaExt
├── reparacion.ts             # ReparacionDB
├── outfit.ts                 # OutfitRec
├── auth.ts                   # UserMode
├── views.ts                  # View (union of view IDs)
└── index.ts                  # Re-exports all types
constants/
├── demo-data.ts              # GUEST_PRENDAS, GUEST_REPARACIONES, DEMO_OUTFITS, etc.
├── navigation.ts             # navItems, filterChips
├── categories.ts             # FIXED_CATS, CATEGORIAS_RENTA, LAYER_ORDER
├── images.ts                 # fashionImages, outfitImages
└── animation.ts              # pageVariants, pageProps
```

### Data Flow
```
AuthProvider (auth state) → PrendasProvider (wardrobe) → AppShell (routing)
  ├── LoginView (email/password or demo login)
  ├── InicioView (welcome, recent adds, AI recommendations)
  ├── ArmarioView (wardrobe grid, upload, repair management)
  ├── SimuladorView (outfit generation with Haiku)
  ├── MarketplaceView (sell/rent items)
  └── EstadisticasView (usage stats, KPIs)
```

All views consume context via `useAuthContext()` / `usePrendasContext()` — zero props from AppShell (except callbacks for navigation: `onElegir`, `onApartar`, `onSellPrenda`).

Services take `SupabaseClient` as parameter (dependency injection) for React Native portability.

### Auth
- **Two modes coexist**: demo mock (`hooks/use-auth.ts` — hardcoded `DEMO_USER`) and real Supabase email/password login inside `LoginView`.
- Guest mode renders static demo data (`GUEST_PRENDAS`, `GUEST_REPARACIONES`) without DB calls.
- Guest guard in API routes: every endpoint rejects `user_id === "guest"` with 403.
- Display name = email prefix (before `@`), UUID = `data.user.id` from Supabase auth.

### Supabase Clients
- Browser: `utils/supabase/client.ts` — `createBrowserClient` with `NEXT_PUBLIC_*` keys
- Server: `utils/supabase/server.ts` — `createServerClient` using `next/headers` cookies
- Middleware: `middleware.ts` refreshes the session cookie on every navigation (uses its own `createServerClient`)

### Database Tables
- `prendas` — UUID pk, `user_id`, `name`, `category`, `image_url`, `talla`, `estado_uso`, `precio`, `precio_renta`, `en_venta`, `en_renta`, `fecha_renta`, `usos`, `ultimo_uso`, `metadata` (JSONB)
- `reparaciones` — UUID pk, `user_id`, `prenda_id`, `tarea`, `prioridad`, `completado`
- `usuarios_permitidos` — `username` (text PK), `outfits_creados`
- RPCs: `incrementar_uso(prenda_id_input)`, `incrementar_outfits(username_input)`

### API Routes (App Router handlers)
| Route | Model | Purpose |
|---|---|---|
| `/api/analyze-prenda` | Claude Sonnet 4.6 | Image → JSON (name, category, color, style, description) |
| `/api/generate-outfits` | Claude Haiku | Context + wardrobe → 3 outfit proposals with `prenda_ids` |
| `/api/recommend` | Claude Sonnet | Contextual recommendations |
| `/api/renta` | — | Validates category & publishes for rent |

### Business Rule: Rental Categories
Only **vestidos** and **accesorios** can be rented. Validation happens in both UI layer (button disabled + tooltip) and backend (`/api/renta` checks `CATEGORIAS_RENTA`). Categories rejected: calzado, pantalones, blusas, ropa interior.

## Gotchas
- **TypeScript errors don't block builds** — `next.config.mjs` has `typescript.ignoreBuildErrors: true`. Always run `npm run lint` separately.
- **No `.env.example`** — the only required env vars are `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `ANTHROPIC_API_KEY`.
- **Image compression is mandatory client-side** — Canvas API resizes to 800px/JPEG 0.7 before sending to AI APIs (Vercel has a 4.5MB body limit). Storage uploads use 1000px/JPEG 0.85.
- **Import alias `@/*`** maps to project root (e.g. `@/lib/utils` → `lib/utils.ts`).
- **Tailwind CSS v4** — uses `@import 'tailwindcss'` and CSS-first config (`@theme inline` block in `globals.css`), not `tailwind.config.ts`.
- **No tests, no CI** exists yet.
- **`tw-animate-css`** (`tw-animate-css` v1.3.3) is used for animation utilities, imported in `globals.css`.
- **Project originated from v0.app** — gitignore includes v0 sandbox entries, layout metadata has `generator: 'v0.app'`.
- **Font:** Geist + Geist Mono (next/font/google).
- **No RSC/SSR fetching** — all data is fetched client-side via Supabase browser client. `dynamic = 'force-dynamic'` on the page.
