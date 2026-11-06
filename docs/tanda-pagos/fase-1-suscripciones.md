# Fase 1: suscripciones con Stripe (rama `feat/suscripciones-stripe`)

Estado: **en producción con el sandbox de Stripe (llaves de prueba).** Probado el 5 nov 2026 en `www.clossapp.com`: pagar Plus, cambiar a Elite y cancelar. Ver "Cómo quedó activado" y "Pendientes".

## Qué pidió Mauri

Cobrar Plus ($59) y Elite ($99) al mes con Stripe, con el pago fuera de cualquier tienda de apps, en `www.clossapp.com`. Las cuentas `premium` que ya existen pasan a `elite`.

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
- Stripe: cuenta **ClossApp** (`acct_1UYa3RG95iTnfeMV`), sin activar aún para cobros reales, y su sandbox (`acct_1UYa4Q4c5Iy6MkQW`). En el sandbox:
  - Productos separados "Clossapp Plus" (`price_1UYaLY4c5Iy6MkQWD27r2J5l`) y "Clossapp Elite" (`price_1UYaOX4c5Iy6MkQWit8j8lLY`). Tienen que ser productos distintos: el portal no deja cambiar entre dos precios mensuales del mismo producto.
  - Webhook `we_1UYaOE4c5Iy6MkQWY9Ymzhm9` hacia `https://www.clossapp.com/api/stripe/webhook` con los 4 eventos.
  - Portal por defecto `bpc_1UYaOX4c5Iy6MkQWsVFWNKFT`: cambiar Plus↔Elite con prorrateo, cancelar al final del periodo, tarjeta, facturas y correo.
- Vercel Production: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_ELITE` y `SUPABASE_SERVICE_ROLE_KEY`. Esta última **no existía** en Vercel y hacía fallar el checkout ("No se pudo iniciar el pago"). En el proyecto de Supabase se llama "Secret key" (`sb_secret_…`); supabase-js la acepta igual que la service role.
- Los previews de Vercel tienen protección de acceso: Stripe no puede mandarles webhooks. Por eso se probó en producción.

## Pendientes

1. **Pasar a llaves reales.** Mientras producción tenga llaves del sandbox, cualquiera puede sacar Plus o Elite gratis con la tarjeta `4242`. Activar la cuenta ClossApp, repetir productos, webhook y portal en modo real, y cambiar las 4 variables `STRIPE_*` de Production.
2. **Rotar la `sk_test_` del sandbox**: salió completa en una captura durante la configuración.
3. **Guardar la cancelación programada.** Al cancelar, Stripe deja la suscripción `active` hasta fin de periodo con `cancel_at_period_end = true`. `sincronizarSuscripcion` no copia ese dato, así que la app no puede decir "tu plan termina el 6 dic". Falta una columna en `perfiles` (p. ej. `suscripcion_cancela boolean`) y escribirla en `lib/stripe.server.ts`.
4. **Administrar la suscripción desde Clossapp (fase 1b, opción B).** Mauri no quiere mandar a la gente al portal de Stripe para lo común. Se acordó un modelo mixto:
   - **En Clossapp (`/planes`):** cambiar Plus↔Elite mostrando antes el cobro prorrateado (`invoices.createPreview`), cancelar al final del periodo, reactivar si aún no vence, y mostrar estado y fecha ("Elite, termina el 6 dic"). Rutas nuevas del servidor que sacan al usuario de la sesión y llaman a `subscriptions.update`, como checkout y portal.
   - **Se queda en el portal de Stripe:** cambiar la tarjeta y ver facturas. Hacerlo en la app obligaría a meter Stripe Elements (publishable key, 3D Secure) y no vale la pena todavía.
   - Depende del pendiente 3.
   - Se descartaron: todo en Clossapp (A), por lo delicado de los datos de tarjeta, y dejar solo el portal (C), porque saca a la gente de la app.
