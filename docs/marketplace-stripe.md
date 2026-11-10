# Marketplace con pago real en Stripe y 15% de comisión

**Decisión de Mauri (10 de noviembre de 2026):** el marketplace cobra de verdad con Stripe y Clossapp se queda con el 15% de cada venta o renta. Antes el pago era simulado: un formulario de tarjeta prellenado ("Alex Rivera •••• 4242") que no cobraba nada y aun así marcaba la orden como "pago en custodia".

## Cómo funciona
1. **Vendedor:** para publicar necesita una cuenta de cobro en Stripe (Connect Express). La conecta desde "Publicar" en el Shop o desde Perfil → "Cobrar mis ventas". Stripe le pide identificación y CLABE y verifica todo; Clossapp no ve esos datos. Ya activa, la misma fila abre su panel de depósitos en Stripe.
2. **Comprador:** "Pagar" lo manda a la página de pago de Stripe (solo tarjeta, que incluye Apple Pay y Google Pay). La orden nace en `pendiente_pago` y aparta las prendas. Si no paga, el pago expira a los 30 min y la base libera las prendas a los 45 (cron cada 10 min).
3. **Custodia:** con el pago confirmado (webhook `checkout.session.completed`), la orden pasa a `pago_en_custodia`. El dinero queda en la cuenta de Clossapp.
4. **Entrega:** el centro de acopio escanea el QR (`liberar`; en renta, al devolverse). El servidor apunta lo de cada vendedor en `escrow_pagos_vendedor` y le transfiere el **85%** a su cuenta. El **15%** se queda en Clossapp.
5. **Cancelar antes de entregar:** reembolso completo a la tarjeta. Si el pago llega después de que la orden expiró, se reembolsa solo.

## Decisiones mías
- **Cargos y transferencias separados** (no destination charges): es lo que permite retener el dinero hasta la entrega y pagar a varios vendedores de una misma orden.
- **Comisiones de Stripe:** las absorbe Clossapp desde su 15%; el vendedor recibe 85% limpio. Ejemplo con una prenda de $200: el vendedor recibe $170 y Clossapp $30 menos la comisión de Stripe (unos $12 con IVA).
- **Rentas a máximo 2 meses** (antes 6): Stripe pide no retener fondos más de 90 días.
- **Máximo 3 pagos pendientes por cuenta:** cada orden sin pagar aparta prendas; sin tope, alguien podría apartar todo el Shop.
- **Liberar exige que la orden esté pagada:** antes se podía liberar cualquier orden no cancelada.
- **Publicar exige cuenta de cobro activa** (trigger en la base), para no vender algo que luego no se puede pagar al vendedor. Lo que ya estaba publicado sigue publicado; si se vende y el vendedor no tiene cuenta, su pago espera hasta que la conecte.
- **Transferencias idempotentes** (`pago-vendedor-<id>`), y cada liberación reintenta los pagos que hayan fallado antes.
- Se actualizaron las políticas (sección Marketplace): Clossapp sí cobra y guarda el pago; comisión del 15%; reembolsos y expiración.

## Archivos
- `supabase/21-marketplace-stripe.sql`: columnas de Stripe en `perfiles` y `escrow_ordenes`, estado `pendiente_pago`, tabla `escrow_pagos_vendedor`, nuevas `crear_orden_escrow`, `cancelar_orden_escrow`, `escrow_avanzar`, `expirar_ordenes_sin_pago` (+ cron) y trigger de publicar.
- Rutas nuevas: `app/api/marketplace/checkout`, `app/api/escrow/avanzar`, `app/api/escrow/cancelar`, `app/api/stripe/connect`, `app/api/stripe/connect/volver`. Webhook: `app/api/stripe/webhook/route.ts`.
- `lib/marketplace.ts` (reparto 85/15, con tests) y `lib/marketplace.server.ts` (pagos a vendedores, confirmación del pago).
- App: `escrow-checkout-modal.tsx` (sin formulario falso), `escrow-orders-modal.tsx` (estado "Pago pendiente", cancelar con reembolso), `marketplace-view.tsx` (Publicar pide cuenta de cobro, avisos al volver de Stripe), `perfil-view.tsx` (fila de cobros), `services/escrow.service.ts`, `use-auth.ts`, `clossapp-dashboard.tsx`, `app/politicas/page.tsx`.

## Antes del deploy (lo hace Mauri)
1. **Activar Connect en Stripe:** Dashboard → Connect → completar el perfil de plataforma (tipo marketplace, cuentas Express) y la marca que ven los vendedores. Sin esto, crear cuentas de cobro falla.
2. **Aplicar `supabase/21-marketplace-stripe.sql` al hacer deploy**, no antes: la app actual crea órdenes sin pago y con esto quedarían pendientes hasta expirar.
3. Orden de merge: `fix/planes-uso-justo-y-cobro` → `feat/canje-descuento-automatico` → `feat/marketplace-stripe` (esta trae también los centros de acopio).

## Cómo se probó
- `node --test lib/marketplace.test.mjs lib/plan-stripe.test.mjs`: 9 de 9 (reparto exacto con centavos impares y varios vendedores).
- La migración se corrió en producción dentro de una transacción que se deshizo: sin cuenta de cobro no se publica; con cuenta sí; la orden nace `pendiente_pago` y aparta la prenda; el centro no puede liberar sin pago; cancelar regresa la prenda; una orden pagada se libera y la prenda cambia de dueña; una orden vieja sin pago expira y libera la prenda; el cuarto pago pendiente se rechaza; el cron queda programado. Después se confirmó que no quedó nada.
- Rutas nuevas en local sin sesión: rechazan con 401/400 o sin permiso.
- `tsc` sin errores; `eslint` con un aviso nuevo del mismo tipo que ya hay en el repo (setState en un efecto, en el Shop).
- **No se probó un pago, una transferencia ni un reembolso reales en Stripe** (la cuenta solo tiene modo live y Connect no está configurado).
