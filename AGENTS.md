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

Single-page app — `ClossappDashboard` (`components/clossapp-dashboard.tsx`) is the only entrypoint. `app/page.tsx` is a thin wrapper with `dynamic = 'force-dynamic'`.

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
