# Fase 4: marketplace visible y escrow con precio calculado en la base (rama `feat/marketplace-escrow`)

## Qué hace, en una línea

El marketplace muestra las prendas que publican todas las personas, y cada compra o renta se guarda en su propia tabla con el **precio calculado por la base**, no por el navegador.

## Decisión de Mauri

Pidió resolver dos problemas que encontré en la fase 3: "el market no ve desde la base las prendas en venta" y "el escrow guarda dinero en columna de puntos". También preguntó **cómo se soluciona que el precio se calcule desde el navegador**.

## Cómo se soluciona el precio (respuesta a Mauri)

**Antes:**
1. Al agregar al carrito, la app tomaba el precio del objeto de la prenda que tenía el navegador. Si no tenía precio, **inventaba 450 (compra) o 250 (renta)**.
2. En el pago, la app mandaba a la base: "guarda esta orden con subtotal X". Con las herramientas del navegador se podía cambiar X a 1 peso.

**Ahora:**
1. El navegador solo dice **qué** quiere: `[{ prenda_id: 123, tipo: "compra" }, { prenda_id: 456, tipo: "renta", fecha_renta: "2026-11-05" }]`. **No manda ningún precio.**
2. La función `crear_orden_escrow` en la base:
   - bloquea cada prenda mientras trabaja, para que dos personas no la compren al mismo tiempo;
   - revisa que siga publicada, que tenga precio y que no sea tuya;
   - en rentas, revisa que la fecha esté entre hoy y 6 meses y que **no esté ocupada**;
   - **lee el precio de la tabla `prendas`** y suma el total;
   - aparta las prendas compradas (dejan de estar a la venta);
   - guarda la orden y la devuelve con el total real.
3. La pantalla de éxito muestra el total que calculó la base. El carrito solo muestra un precio de referencia.

**Probado en la base real (con reversión):** una compradora mandó "precio: 1" en una prenda de 300 y una renta de 120, y la orden quedó en **420.00**.

Cuando haya pasarela de pagos, el monto a cobrar saldrá de esta orden en la base, y el aviso de pago confirmado de la pasarela (webhook) marcará la orden como pagada. El navegador nunca decide cuánto se cobra.

## Cambios en la base: `supabase/09-marketplace-escrow.sql`

- **`marketplace_publico(tipo)`:** devuelve las prendas en venta o renta de todas las cuentas, **solo con las columnas para anunciar** (nombre, foto, categoría, talla, estado, precio). No expone compras, usos ni datos personales. Solo salen prendas con precio mayor a 0.
- **Tabla `escrow_ordenes`:**
  - columnas de dinero de verdad (`subtotal`, `total_pagado` en pesos);
  - quién compra (`buyer_user_id`), quién vende (`vendedor_ids`), punto de acopio y estado;
  - RLS: la ve quien compra, quien vende y el punto de acopio; **nadie la escribe directo**.
- **`crear_orden_escrow(...)`:** lo explicado arriba.
- **`escrow_avanzar(token, acción)`:** solo cuentas de acopio.
  - `entregar_renta`: QR #1, la prenda rentada sale con el cliente.
  - `liberar`: compra entregada, o renta devuelta. Libera el pago.
  - Valida el orden de los pasos: no se libera una renta sin entregarla antes, ni se libera dos veces.
  - **Al liberar una compra, la prenda pasa al armario de quien compró.** Antes la app intentaba copiarla, y la base lo rechazaba en silencio.
  - Deja registro en la bitácora del centro.
- **`fechas_rentadas`:** ahora lee de `escrow_ordenes`.
- **Las 8 órdenes viejas** se copiaron de `donacion_tickets` a `escrow_ordenes`, con el monto como dinero. **No se borró nada**: las filas viejas quedan, y la app ya no las trata como escrow.

**Pruebas con reversión en la base real:**

| Prueba | Resultado |
|---|---|
| Órdenes viejas migradas | 8 |
| Total con "precio: 1" enviado | 420.00 (precio real) |
| Recomprar una prenda apartada | `PRENDA_NO_DISPONIBLE` |
| Rentar una fecha ocupada | `FECHA_OCUPADA` |
| Comprar tu propia prenda | `PRENDA_PROPIA` |
| Insertar una orden directo | bloqueado |
| Compradora intenta liberar su orden | `SOLO_ACOPIO` |
| Compradora y vendedora ven la orden | sí / sí |
| Liberar renta sin entregarla | `ESTADO_INVALIDO` |
| Entregar → liberar → liberar otra vez | `en_renta_cliente` → `entregado_y_liberado` → `YA_LIBERADA` |
| La prenda comprada pasa a la compradora | sí |

## Cambios en la app

| Archivo | Cambio |
|---|---|
| `services/marketplace.service.ts` | Venta y renta se leen con `marketplace_publico`. |
| `hooks/use-marketplace.ts` | Con cuenta real ya no se rellenan las listas vacías con prendas de ejemplo: esas prendas no existen en la base y su compra fallaría. |
| `context/cart-context.tsx` | Ya no inventa 250 o 450; una prenda sin precio no entra al carrito. |
| `services/escrow.service.ts` | Con cuenta real: crear orden → `crear_orden_escrow`; listar → tabla `escrow_ordenes` (RLS filtra); liberar y entregar renta → `escrow_avanzar`. Las funciones mantienen su firma, así que el portal y el checkout no cambian. **En demo** se usa solo `localStorage`; se quitó el código que en demo leía y sincronizaba con la base. |
| `escrow-checkout-modal.tsx` | Si la base rechaza la orden (prenda vendida, fecha ocupada), se muestra el motivo. |
| `escrow-orders-modal.tsx` | El botón "Vaciar órdenes" solo aparece en demo: las órdenes reales son pagos en custodia. |

## Lo que queda pendiente (no es de esta fase)

- **Cancelar una orden:** hoy no existe el flujo. Si se agrega, debe devolver la prenda a "en venta".
- **Pasarela de pagos real:** el checkout sigue siendo simulado (datos de tarjeta de ejemplo).
- ~~`apartarCompra` y `apartarRenta` sin uso real~~ → **borradas** después del deploy (PR "chore: quitar el apartado directo"). Copiaban prendas ajenas al armario de quien compraba; nada las llamaba, pero eran un riesgo si alguien las volvía a conectar. `aparting` y `apartSuccess` quedan fijos en `false` para no cambiar las props del modal de detalle.

## Cómo se verificó

- `tsc` y `build` sin errores.
- Migración probada completa en la base real con reversión (tabla de arriba).
- Recorrido automático de las demos en Chromium: los 19 pasos de la guía, el QR de donación de ejemplo y las entregas de compra y de renta en el portal demo funcionan; en demo la liberación ahora tarda menos de 2 segundos.
- Falta probar con cuentas reales en producción: publicar, comprar desde otra cuenta y entregar desde una cuenta de acopio.
