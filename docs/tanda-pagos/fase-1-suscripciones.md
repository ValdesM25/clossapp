# Fase 1: suscripciones con Stripe (rama `feat/suscripciones-stripe`)

Estado: **programada, sin probar con Stripe real.** Falta que Mauri aplique el SQL, ponga las llaves y configure Stripe (ver "Para activarlo").

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
