# Experiencia de vendedor: "Vende en Clossapp" y espacio de vendedor

**Decisión de Mauri (10 de noviembre de 2026):** convertirse en vendedor deja de ser "conecta Stripe para poder publicar" y pasa a ser un recorrido guiado, con un espacio propio para ver las ventas. Va en la misma entrega que el pago real con Stripe (PR #52, `docs/marketplace-stripe.md`); esta rama sale de `feat/marketplace-stripe`.

## Qué cambió
- **Botón "Vender" en el Shop.** Antes decía "Publicar". Ahora abre el espacio de vendedor. No se agregó ningún botón nuevo a la cabecera del Shop.
- **Intro "Vende en Clossapp".** Pantalla completa de 3 pasos antes de mandar a Stripe: así funciona vender (Clossapp guarda el pago y lo libera al entregar en el centro de acopio), cuánto ganas (vendes en $200, te llegan $170) y el último paso, que cambia según el caso:
  - **Plan gratis:** "Vender es parte de Plus" y el botón "Activa Plus" lleva a `/planes?plan=plus`. Vender funciona como gancho para subir de plan.
  - **Sin cuenta de cobro:** "Conectar con Stripe" (identificación y CLABE, unos 5 minutos, una sola vez).
  - **Stripe revisando:** "Stripe está revisando tus datos"; se avisa por push cuando esté lista.
  - **Stripe pide más datos:** "Completar en Stripe".
  - **Cuenta activa:** "Publicar mi primera prenda".
  - **Error al volver de Stripe:** "Intentar de nuevo".
- **Regreso de Stripe.** Cae en el intro, ya en el paso 3, con el caso que corresponde (`?vender=ok`, `revision`, `datos` o `error`).
- **Publicar.** Con cuenta activa y plan de pago, "Vender" abre el espacio de vendedor y desde ahí se publica. Si algo falla al publicar (por ejemplo sin cuenta de cobro), el error se ve en pantalla. Al terminar dice "Publicada. Ya aparece en el Shop".
- **Espacio de vendedor, en Plus:** lista simple de sus ventas, cada una con su estado ("Llévala al centro de acopio", "En el centro, esperando a quien compró", "Rentada para el 15 de noviembre", "Depositado", "Conecta tu cuenta para recibir tu dinero", "Cancelada"), y una tarjeta que invita a Elite.
- **Espacio de vendedor, en Elite:** lo mismo más:
  - totales: Por cobrar, Cobrado este mes y Cobrado en total;
  - pestaña **Vendidas**;
  - pestaña **Publicadas**, con días publicada, "Cambiar precio" y "Quitar";
  - pestaña **Rentas**.
- **Avisos push al vendedor** (tabla de abajo). Tocar cualquiera abre el espacio de vendedor (`/?vender=1`).
- **"Vender" en Prendas olvidadas (Inicio):** entra al mismo flujo y abre el formulario con esa prenda ya elegida. En plan gratis ese botón no aparece (ahí solo hay "Donar").
- **No cambia:** la fila de Perfil "Cobrar mis ventas / Mis cobros".

## Decisiones de Mauri
- Entrada con pantalla propia "Vende en Clossapp" de 3 pasos antes de Stripe.
- Plan gratis: vender como gancho. Ve el intro y al final "Activa Plus".
- "Publicar" pasa a "Vender" y abre el espacio de vendedor. Ningún botón nuevo en la cabecera del Shop.
- Plus: lista simple de ventas y una tarjeta hacia Elite.
- Elite: totales, Vendidas, Publicadas (cambiar precio, quitar) y Rentas.
- Push al vendedor: se vendió o se rentó, entregada y pagada, Stripe necesita datos, cuenta lista.
- El botón "Vender" de Prendas olvidadas entra al flujo.
- La fila de Perfil "Cobrar mis ventas / Mis cobros" no cambia.

## Decisiones mías
- **`cobros_estado` y `publicada_en` van dentro de la migración 21**, no en una 22: la 21 todavía no se aplica, así que no hay nada que migrar encima. `cobros_estado` guarda `sin_cuenta`, `en_revision`, `requiere_datos` o `activa`; `publicada_en` sirve para mostrar "lleva N días publicada". Solo el servidor puede escribir `cobros_estado`.
- **"Stripe necesita más datos" solo se manda si la cuenta ya había terminado el alta** (estaba en revisión o activa). Durante la primera alta también faltan datos, y no se debe avisar mientras la persona sigue llenando el formulario.
- **Los eventos `account.updated` de cuentas conectadas llegan por un destino de webhook aparte**, con ámbito "Connected accounts" y su propio secreto. Se verifican en la misma ruta (`/api/stripe/webhook`) probando primero `STRIPE_WEBHOOK_SECRET` y luego `STRIPE_CONNECT_WEBHOOK_SECRET`.
- **Si el regreso de Stripe guarda "activa" antes que el webhook, no llega el push "cuenta lista"**: la persona ya está en la app y se evitan avisos duplicados. El push solo sale cuando el estado cambia.
- **Después de publicar, el aviso dice "Publicada. Ya aparece en el Shop"**, porque Plus no ve sus publicadas en el espacio de vendedor (eso es de Elite).

## Avisos push
Los manda el servidor a todos los dispositivos de la persona. Si el push falla, no se rompe la venta ni el pago.

| Cuándo | Texto | A dónde lleva |
|---|---|---|
| Se pagó una compra o renta | "¡Vendiste {prenda}!" / "Rentaron {prenda}" (varias: "¡Vendiste N prendas!", "Rentaron N prendas" o "Tienes N pedidos nuevos"). Cuerpo: "Llévala al centro {centro} para que te paguen." (en renta: "Para el {día}. Llévala al centro {centro}.") | Espacio de vendedor |
| El centro libera la orden y se deposita | "Entregaste {prenda}" / "Te depositamos {monto} en tu cuenta de Stripe." | Espacio de vendedor |
| El centro libera pero la persona no tiene cuenta activa | "Entregaste {prenda}" / "Conecta tu cuenta de cobro para recibir {monto}." | Espacio de vendedor |
| La cuenta ya terminada vuelve a pedir datos | "Stripe necesita más datos" / "Complétalos para que podamos pagarte tus ventas." | Espacio de vendedor |
| La cuenta pasa a activa (por el webhook) | "Tu cuenta de cobro está lista" / "Ya puedes publicar y recibir el pago de tus ventas." | Espacio de vendedor |

## Archivos
- Base: `supabase/21-marketplace-stripe.sql` (columnas `cobros_estado` y `publicada_en`; el trigger de publicar llena `publicada_en`).
- App nueva: `components/views/marketplace/vender-intro.tsx` (intro de 3 pasos), `vender-view.tsx` (espacio de vendedor), `hooks/use-ventas.ts` (ventas, totales, publicadas y rentas), `hooks/use-capa.ts`.
- App editada: `marketplace-view.tsx` (botón "Vender", capas, avisos), `sell-form-modal.tsx` (errores visibles), `clossapp-dashboard.tsx` y `inicio-view.tsx` (botón de Prendas olvidadas), `use-marketplace.ts`, `use-auth.ts`, `auth-context.tsx`, `services/marketplace.service.ts`.
- Lógica: `lib/ventas.ts` (estado de cada venta y totales, con tests en `lib/ventas.test.mjs`), `lib/marketplace.ts` (estados de la cuenta de cobro), `lib/marketplace.server.ts` (guardar el estado de la cuenta, avisos de venta y de pago), `lib/push.server.ts` (envío de push compartido), `lib/navegar.ts` (abrir el Shop con `?vender`).
- Rutas: `app/api/stripe/webhook/route.ts` (`account.updated`), `app/api/stripe/connect/route.ts` y `connect/volver/route.ts`, `app/api/escrow/avanzar/route.ts` (aviso de pago), `app/api/renta/route.ts` (errores de plan y cuenta), `app/api/push/enviar/route.ts` (ahora usa `push.server.ts`).
- Variable nueva: `STRIPE_CONNECT_WEBHOOK_SECRET` en `.env.example`.

## Cómo se probó
- `tsc` limpio, `node --test lib/*.test.mjs` 16/16 (incluye `estadoCuenta`, `estadoVenta` y `totales`), `eslint` sin errores nuevos y `npm run build` exitoso.
- Los cambios de la migración 21 se corrieron en producción dentro de una transacción que se deshizo:
  - el default de `cobros_estado` es `sin_cuenta`;
  - sin cuenta de cobro, publicar se bloquea con `SIN_CUENTA_COBRO`;
  - con cuenta, publicar llena `publicada_en`;
  - el check rechaza valores inválidos;
  - `authenticated` no puede hacer UPDATE de `cobros_estado`.
  Después se confirmó que no quedó nada.
- **No se probó contra Stripe real ni con push reales.**
- Prueba visual a 390×844 (celular) con `next dev` y Chromium: los 6 casos del paso 3 del intro, el espacio de vendedor vacío en Plus y en Elite, y con datos simulados (se interceptaron las respuestas de Supabase en el navegador, sin tocar la base): montos al 85%, estados, totales y las pestañas Publicadas y Rentas. Se corrigió la alineación de los totales y el texto de las rentas, que son por día ("Rentada para el…", no "hasta").

## Pendiente
- [x] Webhook de cuentas conectadas y `STRIPE_CONNECT_WEBHOOK_SECRET` en Vercel (Mauri, 10 de noviembre de 2026).
- [x] En producción junto con #52 y la migración 21 (11 de noviembre de 2026).
- [ ] Prueba real con dos cuentas (`docs/marketplace-stripe.md`, sección PENDIENTE): revisar los 4 push y el espacio de vendedor en Plus y en Elite.
