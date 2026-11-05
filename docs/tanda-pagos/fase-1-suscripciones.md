# Fase 1: suscripciones con Stripe (rama `feat/suscripciones-stripe`)

## Qué pidió Mauri

Cobrar Plus ($59) y Elite ($99) al mes con Stripe, con el pago fuera de cualquier tienda de apps, en `www.clossapp.com`. Planear antes de ejecutar y dejar el plan aquí.

## Lo que hay hoy

- `perfiles.plan` acepta `gratis` o `premium`. El usuario no puede editarlo: solo cambia desde funciones `security definer` o el dashboard (`supabase/05-perfiles.sql`).
- `premium` no tiene límites. El gratis tiene 50 prendas (trigger `prendas_limite_plan`), 50 análisis y 1 outfit al día (`consumir_cuota`).
- El código compara contra `"premium"` en `constants/planes.ts`, `hooks/use-outfit-del-dia.ts`, `components/views/perfil/perfil-view.tsx`, `components/views/armario/armario-view.tsx` y `components/views/inicio/inicio-view.tsx`.
- `components/views/planes/planes-view.tsx` muestra los planes, pero "Elegir plan" no cobra.
- El servidor ya tiene `SUPABASE_SERVICE_ROLE_KEY`, que usará el webhook para escribir el plan.

## Qué se hace

### 1. Base: `supabase/15-suscripciones.sql`

- `plan` pasa a `gratis | plus | elite`. Las filas `premium` se migran a `elite`.
- Columnas nuevas en `perfiles`, sin permiso de escritura para el usuario: `stripe_customer_id`, `stripe_subscription_id`, `suscripcion_estado` y `suscripcion_vence`.
- `prendas_limite_plan`: tope de 50, 200 o 500 según el plan.
- `consumir_cuota`: `plus` y `elite` sin límite.
- `constants/planes.ts` y la base deben tener los mismos números.

### 2. Stripe

- Dos precios mensuales en MXN: Plus $59 y Elite $99. Empezar en modo de prueba.
- Variables de entorno (solo servidor; Mauri las pone): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PLUS` y `STRIPE_PRICE_ELITE`.

### 3. Rutas de API

- `POST /api/stripe/checkout` con `{ plan }`: identifica al usuario por la sesión, nunca por el body. Crea o reutiliza su cliente de Stripe (con `user_id` en metadata) y crea una sesión de Checkout en modo suscripción. Devuelve la URL.
- `POST /api/stripe/portal`: abre el portal de Stripe para cambiar de plan, actualizar la tarjeta o cancelar.
- `POST /api/stripe/webhook`: verifica la firma con el cuerpo crudo. Escucha `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` e `invoice.payment_failed`.
  - Escribe siempre el estado completo de la suscripción, no incrementos, así que repetir un evento no cambia el resultado.
  - Regla: suscripción `active` o `trialing` da el plan del precio. `past_due` mantiene el plan mientras Stripe reintenta el cobro. `canceled`, `unpaid` o `incomplete_expired` regresan a `gratis`.
  - Si una cuenta baja de plan con más prendas que el tope, se conservan, pero no puede agregar nuevas hasta bajar del límite.

### 4. App

- Los botones de `planes-view.tsx` llaman a `/api/stripe/checkout` y redirigen al pago.
- Quien ya paga ve "Administrar suscripción", que abre el portal.
- Al volver con `?pago=ok`, la app consulta el perfil unos segundos hasta que el webhook actualice el plan. No le cree a la URL.
- Nueva ruta pública `/planes` (como `/centros`) para entrar directo desde la landing o desde una futura app nativa, con `?plan=plus` o `?plan=elite`. Sin sesión, pide iniciar sesión y regresa.
- Las 5 comparaciones contra `"premium"` pasan a "tiene plan de pago" (`plus` o `elite`).

### 5. Landing (`clossapp-landing`)

- "Elegir Plus" y "Elegir Elite" apuntan a `https://www.clossapp.com/planes?plan=plus` y `?plan=elite`.

### 6. Pruebas

- Prueba pequeña de la función que traduce el estado de Stripe al plan.
- Flujo completo en modo de prueba: `stripe listen --forward-to localhost:3000/api/stripe/webhook`, tarjetas de prueba de pago exitoso, rechazado y cancelación desde el portal.

## Fuera de esta fase

- Canje de puntos con descuento real: hoy los códigos (`DONA20OFF`, etc.) son fijos y cualquiera podría usarlos. Pasa a la fase 2 como código de un solo uso en Stripe.
- Limitar vender y rentar a planes de pago: fase 3.
- Funciones exclusivas de Elite: fase 4. Mientras no existan, Elite y Plus solo se distinguen por el tope de prendas.
- Shop con Stripe Connect y 5%: fase 5.

## Pendiente de Mauri

- Poner las llaves de prueba de Stripe en `.env.local` y en Vercel.
- Confirmar los precios creados en Stripe antes de pasar a modo real.
