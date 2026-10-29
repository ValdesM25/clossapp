# Fase 0: PWA (rama `feat/pwa`)

## Qué hace, en una línea

Clossapp se puede instalar en el teléfono como una app, recuerda la sesión al abrirla, y muestra una pantalla propia si no hay internet.

## Punto de partida

La rama `feat/pwa` ya tenía un commit con la PWA (julio 2026), pero estaba 39 commits atrás de `main`.
**Decisión de Mauri:** subir la PWA en esta tanda. Por eso la puse al día con `main` (rebase), y al hacerlo aparecieron conflictos en archivos que cambiaron en ambos lados.

## Qué trae la PWA (sin cambios respecto al commit original)

| Pieza | Qué hace |
|---|---|
| `app/manifest.ts` | Le dice al teléfono el nombre, íconos y colores de la app para instalarla. |
| `app/sw.ts` + `app/serwist/[path]/route.ts` | El "service worker": guarda en caché la estructura de la app para que abra rápido. |
| `app/offline/page.tsx` | Pantalla propia cuando no hay internet, en vez del error del navegador. |
| `app/layout.tsx` | Metadatos para iPhone (Safari no lee el manifest). |
| `middleware.ts` | Ya no procesa los archivos de la PWA. |
| `next.config.mjs`, `package.json` | Agrega Serwist (`@serwist/turbopack`, `serwist`, `esbuild`). |
| `components/shared/bottom-nav.tsx`, `app/globals.css` | La barra inferior respeta la zona segura del iPhone. |

Reglas de caché importantes: lo que viene de login y base de datos de Supabase **nunca** se guarda en caché, para no dejar sesiones o datos de otra persona en el equipo.

## Conflictos resueltos al ponerla al día

### `hooks/use-auth.ts`
- **Qué había en cada lado:** `main` agregó el modo punto de recolección, correo, teléfono, avatar y "editar perfil". La PWA agregó recuperar la sesión guardada al abrir la app y cerrar sesión de verdad en Supabase.
- **Cómo lo resolví:** me quedé con todo lo de `main` y le sumé lo de la PWA:
  - Al abrir, se consulta si hay sesión guardada (`getSession`) y se escucha si cambia (`onAuthStateChange`), y ahora también se llena el correo del usuario.
  - `logout` ahora es asíncrono y llama a `signOut` de Supabase, además de limpiar el correo.
  - Se usa un solo cliente de Supabase por montaje, también para cambiar contraseña.
- **Por qué:** sin restaurar la sesión, la app instalada pediría contraseña en cada apertura; sin `signOut`, cerrar sesión no serviría porque la sesión volvería sola.
- **Se mantuvo de `main`:** "invitado" sigue siendo solo `userMode === "GUEST"` (la PWA lo calculaba como "todo lo que no sea VIP", lo que habría convertido al punto de recolección en invitado).

### `context/auth-context.tsx`
- Se unieron los tipos: quedan `loginAsRecoleccion` y `updateProfile` de `main`, y `initializing` de la PWA. `logout` pasa a devolver una promesa.

### `context/prendas-context.tsx`
- **Cómo:** se usó la versión de la PWA (el provider se monta siempre) con el `deletePrenda` que agregó `main`.
- **Por qué:** en `main`, para invitados el provider no se montaba, pero la pantalla de Inicio lo usa igual, así que "Explorar como invitada" tronaba. `usePrendas` ya devuelve las prendas de demo para invitados sin tocar Supabase.

### `components/clossapp-dashboard.tsx`
- Se juntaron la pantalla de arranque de la PWA (logo mientras se revisa la sesión) y el portal de punto de recolección de `main`.

### `components/views/inicio/inicio-view.tsx`
- **Cómo:** se quedó la versión de `main` sin cambios.
- **Por qué:** la PWA solo agregaba un botón "Salir" en el encabezado; en `main` ese encabezado ya tiene el menú de avatar (`UserAvatarMenu`) con cerrar sesión.

### `package-lock.json`
- Se tomó el de `main` y se regeneró con `npm install` para sumar las dependencias de la PWA.

## Cómo se verificó

- `npx tsc --noEmit`: sin errores.
- `npm run build`: compila; genera `/manifest.webmanifest`, `/offline` y `/serwist/sw.js`.
- Aviso del build: el video `public/WhatsApp Video 2026-08-25 at 6.43.05 AM.mp4` (4 MB) no se guarda en caché por tamaño. Es lo correcto; no se cambió nada.

## Pendiente de probar a mano

- Instalar la app en un teléfono (Android/iPhone) y confirmar que abre con la sesión iniciada.
- Apagar internet y confirmar que aparece la pantalla offline.
- Entrar como invitada y como punto de recolección.
