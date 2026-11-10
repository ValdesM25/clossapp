# Planes: uso justo, Esencial solo dona y sin doble cobro

Sale de la revisión del 10 de noviembre de 2026 (bugs 9, 11 y 12 del reporte).

## 1. Plus: de "ilimitados" a uso justo (decisión de Mauri)
- `constants/planes.ts`: "Outfits con IA ilimitados" pasa a "Outfits con IA con uso justo". El límite real sigue en `limites_plan` (15 al día); no se publica la cantidad, por pedido de Mauri.
- `app/politicas/page.tsx`: nueva sección "Uso justo" en Planes y pagos, sin cantidades.
- El aviso al llegar al tope no se cambió: también lo ve el plan Esencial.
- Elite se deja igual (Mauri: están trabajando en esas funciones).

## 2. Esencial (gratis) solo dona (decisión de Mauri)
- Shop: con plan gratis se ve solo "Donar", con un aviso "Comprar, vender y rentar prendas es parte de Plus" y botón a `/planes?plan=plus`. Sin pestañas, carrito, pedidos ni Publicar.
- Inicio y Estadísticas: en las prendas olvidadas, "Vender" desaparece (Inicio) o pasa a "Donar" (Estadísticas) con plan gratis.
- `constants/planes.ts`: Plus dice "Comprar, vender y rentar en el Shop". Políticas: el marketplace se aclara como de Plus y Elite.
- La demo (sin plan) sigue mostrando el marketplace completo, para enseñarlo.
- `supabase/18-gratis-solo-dona.sql` (decisión mía: la app sola no basta, se puede llamar a la API directo): triggers que impiden publicar para venta o renta y crear órdenes de compra a cuentas sin Plus o Elite. Retirar una publicación siempre se puede, por si alguien baja de plan. Hoy ninguna cuenta gratis tiene publicaciones ni pedidos, así que no afecta a nadie.
- **Falta aplicar el SQL en producción.** La prueba (dentro de una transacción que se deshace) quedó pendiente porque la herramienta pidió confirmación.

## 3. Doble cobro
- Antes: al volver de Stripe, si el webhook tardaba más de 20 s, `/planes` volvía a mostrar "Elegir Plus/Elite" y el servidor solo revisaba `perfiles.plan` (todavía "gratis"). Un segundo clic cobraba otra suscripción.
- `app/api/stripe/checkout/route.ts`: si el cliente ya existe en Stripe, se le preguntan sus suscripciones; si hay una activa, en prueba, atrasada, impagada, incompleta o pausada, responde 409. También expira los pagos abiertos en otras pestañas antes de abrir uno nuevo.
- `lib/plan-stripe.ts`: `bloqueaNuevoPago`, con dos tests nuevos en `lib/plan-stripe.test.mjs`.
- `app/planes/page.tsx`: tras volver del pago, en lugar de los botones dice "Esperando la confirmación del pago".

## Cómo se probó
- `node --test lib/plan-stripe.test.mjs`: 6 de 6.
- `tsc` sin errores; `eslint` sin avisos nuevos en los archivos tocados.
- No se vio en el navegador el Shop con plan gratis: hace falta una cuenta gratis con sesión.
