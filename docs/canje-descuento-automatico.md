# Canje de puntos: descuento automático

Sale del bug 8 de la revisión del 10 de noviembre de 2026: el canje descontaba puntos y entregaba un código (`DONA50OFF-XXXXXX`) que no existía en Stripe.

## Decisiones de Mauri
- Descuento automático, sin códigos que copiar.
- Vale para Plus y Elite.
- La única persona que ya había canjeado (800 puntos por 50%) recupera sus puntos: se borró ese registro de `puntos_historial` el 10 de noviembre.

## Cómo funciona
- **Stripe:** tres cupones creados en producción el 10 de noviembre: `canje_desc_20` (20%), `canje_desc_50` (50%), `canje_mes_gratis` (100%). Duran un cobro y solo aplican a los productos Plus y Elite. El cupón de cada opción es `canje_<id de la opción>`.
- **Si ya paga:** `POST /api/puntos/canjear` descuenta los puntos (RPC `canjear_puntos`) y pega el cupón a su suscripción; sale en el próximo cobro. Si Stripe falla, se deshace el canje y no se pierden puntos.
- **Si no paga:** el descuento queda `pendiente` en `descuentos_canje`. `/api/stripe/checkout` lo agrega al primer pago, y el webhook (`checkout.session.completed`) lo marca `aplicado`.
- **Uno a la vez (decisión mía):** dos cupones en el mismo cobro no se suman en Stripe, el segundo reemplaza al primero. Por eso no se puede canjear otro mientras haya uno esperando, ni si la suscripción ya tiene uno para el próximo cobro.
- **Pantalla:** sin códigos. Al canjear dice "se descontará solo en tu próximo cobro" o "se aplicará cuando elijas Plus o Elite". El historial muestra cada descuento con su estado. Textos sin "Suscripción Pro" (no existe).

## Archivos
- `supabase/19-canje-descuento-automatico.sql`: tabla `descuentos_canje` (solo lectura propia por RLS), índice de un pendiente por cuenta, `canjear_puntos` nueva.
- `app/api/puntos/canjear/route.ts` (nuevo), `app/api/stripe/checkout/route.ts`, `app/api/stripe/webhook/route.ts`.
- `components/views/planes/planes-view.tsx`, `constants/donaciones.ts`, `types/donaciones.ts`.

## Pendiente
- **Aplicar `supabase/19-canje-descuento-automatico.sql` al hacer deploy de esta rama, no antes:** la app actual espera el campo `codigo` que la función nueva ya no devuelve.
- Esta rama sale de `fix/planes-uso-justo-y-cobro` (las dos tocan el checkout): hacer merge de esa primero.

## Cómo se probó
- La migración se corrió en producción dentro de una transacción que se deshizo al final, con la sesión simulada de una cuenta de 1030 puntos: canjear 20% deja 630; un segundo canje con uno pendiente da `DESCUENTO_PENDIENTE`; 50% con 630 da `PUNTOS_INSUFICIENTES`; una opción inventada da `OPCION_INVALIDA`. Después se confirmó que no quedó ni la tabla ni cambios en el saldo.
- `tsc` sin errores, `eslint` limpio en los archivos tocados.
- No se probó un cobro real con descuento en Stripe.
