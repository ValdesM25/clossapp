# Fase 1: suscripciones con Stripe (rama `feat/suscripciones-stripe`)

Estado: **en producción con llaves reales de Stripe** (5 nov 2026). El flujo completo (pagar Plus, cambiar a Elite y cancelar) se probó en `www.clossapp.com` con el sandbox; con llaves reales falta confirmarlo con un pago real. Ver "Cómo quedó activado" y "Pendientes".

## Qué pidió Mauri

Cobrar Plus ($59) y Elite ($99) al mes con Stripe, con el pago fuera de cualquier tienda de apps, en `www.clossapp.com`. Las cuentas `premium` que ya existen pasan a `elite`.

> **11 nov 2026:** los precios cambian a Plus $89 y Elite $159 (decisión de Mauri). Este documento conserva los de la fase original; los precios nuevos de Stripe se anotan en "Cómo quedó activado".

## Lo que había antes

- La tanda de límites (`docs/tanda-planes`, PR #41) dejó `limites_plan` con los topes de `gratis` y `premium`, y `usar_ia` y `prendas_limite_plan` ya leen de esa tabla.
- `perfiles.plan` aceptaba `gratis` o `premium`, y el usuario no puede editarlo.
- "Elegir plan" en `planes-view.tsx` no cobraba: solo cambiaba un estado en pantalla.

## Qué se hizo

### Base: `supabase/17-suscripciones.sql`

- `limites_plan` gana `plus` (200 prendas) y `elite` (500 prendas). Los dos heredan el uso justo diario de premium: 30 análisis y 15 outfits al día, sin tope de por vida.
- `premium` pasa a `elite` en `perfiles` y en `uso_ia_dia`, y se borra de `limites_plan`.
- `plan` solo acepta `gratis`, `plus` o `elite`.
- `perfiles` gana `stripe_customer_id`, `stripe_subscription_id`, `suscripcion_estado` y `suscripcion_vence`. El usuario no las puede escribir; las escribe el servidor con la service role.
- `usar_ia` y `prendas_limite_plan` no cambian: leen los topes nuevos solos.

### Servidor

- `lib/plan-stripe.ts`: regla pura que decide el plan según la suscripción. `active`, `trialing` y `past_due` (mientras Stripe reintenta) dan el plan del precio. Cualquier otro estado, o un precio desconocido, da `gratis`. Pruebas en `lib/plan-stripe.test.mjs` (`node --test lib/plan-stripe.test.mjs`).
- `lib/stripe.server.ts`: cliente de Stripe, mapa de precios desde las variables de entorno y `sincronizarSuscripcion`, que escribe el estado completo en `perfiles`. Si llega el aviso de una suscripción vieja que terminó cuando la cuenta ya tiene otra, lo ignora.
- `POST /api/stripe/checkout` con `{ plan }`: el usuario sale de la sesión. Si ya tiene plan de pago responde 409 (los cambios van por el portal). Crea o reutiliza su cliente de Stripe y abre Checkout en modo suscripción, en español.
- `POST /api/stripe/portal`: abre el portal de Stripe para cambiar de plan, actualizar la tarjeta o cancelar.
- `POST /api/stripe/webhook`: verifica la firma. Con `checkout.session.completed` y `customer.subscription.created/updated/deleted` pide la suscripción actual a Stripe (los avisos pueden llegar desordenados) y la sincroniza. Si algo falla responde 500 y Stripe reintenta.

### App

- `constants/planes.ts`: `Plan` es `gratis | plus | elite`, `TOPE_PRENDAS`, `PLANES` (lo que se muestra de cada plan, igual que la landing), `esDePago` y `normalizarPlan`. Mientras no se aplique el SQL, `premium` se lee como `elite`.
- `app/planes/page.tsx`: página pública. Sin sesión muestra los planes y lleva a crear cuenta con `?volver=` para regresar. Con sesión, "Elegir Plus/Elite" abre Checkout. A quien paga le muestra "Administrar suscripción". Al volver con `?pago=ok` consulta el perfil cada 2 s hasta 20 s, esperando al webhook.
- `planes-view.tsx`: usa `PLANES` y sus botones llevan a `/planes`. Se quitó el modal que fingía activar el plan. Como decidió la tanda de límites para premium, quien paga (Plus o Elite) ve solo sus puntos y el canje, más "Administrar suscripción", que lleva a `/planes`. En Perfil su entrada se llama "Mis puntos y suscripción".
- Las comparaciones contra `"premium"` pasan a `esDePago` (perfil, inicio, outfit del día). El contador del armario se muestra en todos los planes con su tope.

### Landing (`clossapp-landing`)

- "Elegir Plus" y "Elegir Elite" apuntan a `https://www.clossapp.com/planes?plan=plus` y `?plan=elite`.

## Para activarlo (Mauri)

1. **Aplicar `supabase/17-suscripciones.sql`** en el SQL Editor de Supabase, **antes** de desplegar este código.
2. **Crear en Stripe**, primero en modo de prueba:
   - Producto "ClossApp Plus" con precio recurrente mensual de $59 MXN, y "ClossApp Elite" con $99 MXN.
   - Webhook hacia `https://www.clossapp.com/api/stripe/webhook` con los eventos `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` y `customer.subscription.deleted`.
   - Portal del cliente (Settings → Billing → Customer portal): permitir cancelar, actualizar el método de pago y cambiar entre Plus y Elite.
3. **Variables en `.env.local` y en Vercel**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PLUS` y `STRIPE_PRICE_ELITE`. `SUPABASE_SERVICE_ROLE_KEY` ya existe.
4. **Probar en local**: `stripe listen --forward-to localhost:3000/api/stripe/webhook` (da un `whsec_` para `.env.local`). Pagar con la tarjeta `4242 4242 4242 4242`, ver que el plan cambie, y cancelar desde el portal para ver que regrese a gratis. La tarjeta `4000 0000 0000 0341` sirve para probar un cobro rechazado.

## Fuera de esta fase

- Canje de puntos con descuento real (fase 2): hoy los códigos (`DONA20OFF`, etc.) son fijos y Checkout no acepta códigos.
- Limitar vender y rentar a planes de pago (fase 3).
- Funciones exclusivas de Elite (fase 4). Mientras no existan, Elite y Plus solo se distinguen por el tope de prendas.
- Shop con Stripe Connect y 5% (fase 5).

## Cómo quedó activado (5 nov 2026)

- `17-suscripciones.sql` se aplicó en producción **después** de desplegar el código (el PR #43 se mergeó antes). Mientras tanto `/api/stripe/checkout` y `/portal` respondían 500 sin cobrar a nadie. Las 6 cuentas `premium` pasaron a `elite`.
- Primero se probó con el sandbox de la cuenta ClossApp (`acct_1UYa4Q4c5Iy6MkQW`) y llaves de prueba en producción. Ya no se usa: su webhook está desactivado y el único perfil de prueba volvió a `gratis` sin datos de Stripe.
- **Cuenta real ClossApp** (`acct_1UYa3RG95iTnfeMV`), separada de la de Harbour:
  - Productos separados "Clossapp Plus" (`prod_VZkCJAgXcWO9Ny`, `price_1UYai8G95iTnfeMVhARM45se`, $59) y "Clossapp Elite" (`prod_VZkCJIe8FVF2NV`, `price_1UYaiGG95iTnfeMV25kCQgsl`, $99), mensuales en MXN con **IVA incluido** (`tax_behavior: inclusive`). Tienen que ser productos distintos: el portal no deja cambiar entre dos precios mensuales del mismo producto.
  - Webhook `we_1UYaxfG95iTnfeMVjBUV3kWN` hacia `https://www.clossapp.com/api/stripe/webhook`, con payload *Snapshot* y los 4 eventos más `customer.subscription.paused` (se ignora; la pausa llega también como `updated`).
  - Portal por defecto `bpc_1UYaiMG95iTnfeMVhFubiv3H`: cambiar Plus↔Elite con prorrateo, cancelar al final del periodo, tarjeta, facturas y correo. Pausa desactivada.
  - Llave **restringida** `rk_live_…` (`clossapp-vercel-prod`), solo en tu cuenta: Customers write, Checkout Sessions write, Customer portal write, Subscriptions read. Las fases 1b y 2 necesitarán ampliarla (Subscriptions write, Invoices read, Coupons/Promotion codes write).
- Vercel Production: `STRIPE_SECRET_KEY` (la `rk_live_`), `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_ELITE` y `SUPABASE_SERVICE_ROLE_KEY`. Esta última **no existía** en Vercel y hacía fallar el checkout ("No se pudo iniciar el pago"). En el proyecto de Supabase se llama "Secret key" (`sb_secret_…`); supabase-js la acepta igual que la service role.
- `.env.local` y Preview siguen con el sandbox.
- Los previews de Vercel tienen protección de acceso: Stripe no puede mandarles webhooks. Por eso se probó en producción.

## Pendientes

1. **Confirmar con un pago real**: pagar Plus con tarjeta propia, ver el plan en `/planes`, cancelar y reembolsar desde el dashboard. Confirmar también que la cuenta ClossApp esté activada para cobrar.
2. **Guardar la cancelación programada.** Al cancelar, Stripe deja la suscripción `active` hasta fin de periodo con `cancel_at_period_end = true`. `sincronizarSuscripcion` no copia ese dato, así que la app no puede decir "tu plan termina el 6 dic". Falta una columna en `perfiles` (p. ej. `suscripcion_cancela boolean`) y escribirla en `lib/stripe.server.ts`.
3. **Administrar la suscripción desde Clossapp (fase 1b, opción B).** Mauri no quiere mandar a la gente al portal de Stripe para lo común. Se acordó un modelo mixto:
   - **En Clossapp (`/planes`):** cambiar Plus↔Elite mostrando antes el cobro prorrateado (`invoices.createPreview`), cancelar al final del periodo, reactivar si aún no vence, y mostrar estado y fecha ("Elite, termina el 6 dic"). Rutas nuevas del servidor que sacan al usuario de la sesión y llaman a `subscriptions.update`, como checkout y portal.
   - **Se queda en el portal de Stripe:** cambiar la tarjeta y ver facturas. Hacerlo en la app obligaría a meter Stripe Elements (publishable key, 3D Secure) y no vale la pena todavía.
   - Depende del pendiente 2.
   - Se descartaron: todo en Clossapp (A), por lo delicado de los datos de tarjeta, y dejar solo el portal (C), porque saca a la gente de la app.
4. **Rotar la `sk_test_` del sandbox** (opcional): salió en una captura, pero ya solo da acceso al sandbox.
