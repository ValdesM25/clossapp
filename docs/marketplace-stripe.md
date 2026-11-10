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
- La experiencia del vendedor (intro "Vende en Clossapp", espacio de vendedor y avisos push) está en `docs/marketplace-vender.md`.
- `supabase/21-marketplace-stripe.sql`: columnas de Stripe en `perfiles` y `escrow_ordenes`, estado `pendiente_pago`, tabla `escrow_pagos_vendedor`, nuevas `crear_orden_escrow`, `cancelar_orden_escrow`, `escrow_avanzar`, `expirar_ordenes_sin_pago` (+ cron) y trigger de publicar.
- Rutas nuevas: `app/api/marketplace/checkout`, `app/api/escrow/avanzar`, `app/api/escrow/cancelar`, `app/api/stripe/connect`, `app/api/stripe/connect/volver`. Webhook: `app/api/stripe/webhook/route.ts`.
- `lib/marketplace.ts` (reparto 85/15, con tests) y `lib/marketplace.server.ts` (pagos a vendedores, confirmación del pago).
- App: `escrow-checkout-modal.tsx` (sin formulario falso), `escrow-orders-modal.tsx` (estado "Pago pendiente", cancelar con reembolso), `marketplace-view.tsx` (Publicar pide cuenta de cobro, avisos al volver de Stripe), `perfil-view.tsx` (fila de cobros), `services/escrow.service.ts`, `use-auth.ts`, `clossapp-dashboard.tsx`, `app/politicas/page.tsx`.

## ⏳ PENDIENTE: activar Stripe Connect y hacer el deploy

Estado al 10 de noviembre de 2026: #47, #48, #49, #50 y #51 ya están en producción; la migración 19 está aplicada. **Este PR (#52) sigue sin merge** y la migración 21 **no** está aplicada. Hasta entonces el marketplace sigue con el pago simulado de antes (ver "Qué pasa mientras tanto").

### Paso 1. Activar Connect (lo hace Mauri, en modo Live, cuenta "ClossApp")
Los nombres de los botones pueden variar un poco en el panel.
- [ ] Abrir https://dashboard.stripe.com/connect y tocar **Empezar** (Get started).
- [ ] Modelo: **Marketplace** (Clossapp cobra al comprador y le paga al vendedor). No elegir "Plataforma".
- [ ] Tipo de cuenta de los vendedores: **Express**.
- [ ] Perfil de plataforma:
  - Qué se vende: ropa de segunda mano entre personas (compra, venta y renta).
  - Quién paga las comisiones de Stripe: **la plataforma**.
  - Quién responde por saldos negativos de vendedores (contracargos): **la plataforma**.
  - El dinero se retiene hasta que la prenda se entrega en un centro de acopio y luego se transfiere al vendedor.
  - Stripe puede tardar en revisarlo; mientras tanto los vendedores no pueden conectar su cuenta.
- [ ] Settings → Connect → **Branding**: nombre "Clossapp", logo (`public/icon-512.png`), color `#18181b`.
- [ ] Settings → Connect → **Onboarding options**: país **México**; capacidades **Transfers** y **Card payments**.
- [ ] **Payouts**: dejar el calendario automático.
- [ ] Stripe → Developers → **Webhooks** → crear un destino de eventos nuevo:
  - **Events from: Connected accounts** (no "Your account");
  - URL: la misma del webhook actual, `https://<dominio>/api/stripe/webhook`;
  - evento: `account.updated`.
- [ ] Copiar el **secreto de firma** (`whsec_...`) de ese destino a Vercel como `STRIPE_CONNECT_WEBHOOK_SECRET` (Production) y hacer redeploy. Es un secreto distinto al `STRIPE_WEBHOOK_SECRET` que ya existe. Lo usa el aviso "cuenta lista" y "Stripe necesita más datos" (ver `docs/marketplace-vender.md`).
- Las demás llaves y variables de Vercel no cambian.

### Paso 2. Deploy (lo hace Claude cuando Mauri avise)
- [ ] Aplicar `supabase/21-marketplace-stripe.sql` y hacer merge de #52 **en el mismo momento**, no antes: la app actual crea órdenes sin pago y con la migración quedarían en "pago pendiente" hasta expirar.
- [ ] Confirmar que el deploy de producción quedó en vivo.

### Paso 3. Prueba real antes de anunciarlo (Mauri, con dos cuentas propias)
- [ ] Cuenta A (Plus/Elite): Perfil → "Cobrar mis ventas" → alta en Stripe con datos reales → publicar una prenda de **$10 MXN**.
- [ ] Cuenta B (Plus/Elite): comprarla con tarjeta real.
- [ ] En "Mis pedidos" de B debe decir "En custodia".
- [ ] Un centro de acopio escanea el QR (si no hay cuenta de centro, crear una antes).
- [ ] En Stripe: cobro de $10, transferencia de $8.50 a la cuenta A y $1.50 que se queda Clossapp (menos la comisión de Stripe).
- [ ] Probar también cancelar un pedido pagado: debe llegar el reembolso.
- [ ] Revisar los 4 push del vendedor (se vendió o rentó, entregada y pagada, Stripe necesita datos, cuenta lista) y el espacio de vendedor, con la cuenta A en Plus y en Elite.

### Paso 4. Después
- [ ] Revisión legal de la sección Marketplace de `/politicas` (custodia, comisión del 15%, reembolsos).
- [ ] Avisar a la persona con el pedido en custodia creado para "Centro de Acopio Norte" (no existe) dónde recoger.

### Qué pasa mientras tanto (sin #52)
Nada se rompe; la app sigue como estaba antes de este PR:
- El marketplace usa el pago **simulado** de antes: no cobra nada y la orden queda "en custodia" sin dinero. Con testers no es un problema; **no anunciarlo a usuarios reales** hasta terminar el paso 3.
- Lo ya publicado funciona igual: el plan gratis solo dona, el canje aplica descuentos reales en Stripe, los centros son TecNM y Alameda, y el video de instalación sale en iPhone.

## Cómo se probó
- `node --test lib/marketplace.test.mjs lib/plan-stripe.test.mjs`: 9 de 9 (reparto exacto con centavos impares y varios vendedores).
- La migración se corrió en producción dentro de una transacción que se deshizo: sin cuenta de cobro no se publica; con cuenta sí; la orden nace `pendiente_pago` y aparta la prenda; el centro no puede liberar sin pago; cancelar regresa la prenda; una orden pagada se libera y la prenda cambia de dueña; una orden vieja sin pago expira y libera la prenda; el cuarto pago pendiente se rechaza; el cron queda programado. Después se confirmó que no quedó nada.
- Rutas nuevas en local sin sesión: rechazan con 401/400 o sin permiso.
- `tsc` sin errores; `eslint` con un aviso nuevo del mismo tipo que ya hay en el repo (setState en un efecto, en el Shop).
- **No se probó un pago, una transferencia ni un reembolso reales en Stripe** (la cuenta solo tiene modo live y Connect no está configurado).
