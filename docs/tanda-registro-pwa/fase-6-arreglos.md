# Fase 6: arreglos chicos (rama `fix/arreglos-chicos`)

Mauri eligió avanzar con estos tres arreglos antes de la sesión de pruebas reales ("avanza con los arreglos chicos").

## 1. Cancelar un pedido en custodia

- **Antes:** no había forma de cancelar. La prenda comprada quedaba apartada para siempre, y en "Mis pedidos" una orden cancelada habría salido como "Fondos liberados".
- **Ahora:** en "Mis pedidos", los pedidos con el pago en custodia tienen **"Cancelar pedido"**, con confirmación en la misma tarjeta.
- **Base (`supabase/11-cancelar-orden.sql`, aplicada):** `cancelar_orden_escrow(folio)`.
  - Solo pueden cancelar quien compró, el centro de acopio o administración.
  - Solo mientras el pago sigue en custodia (nada recogido).
  - La prenda comprada **vuelve a estar en venta**, solo si sigue siendo de quien la vendía.
  - Las fechas de renta se liberan solas.
- En demo se cancela solo en `localStorage`.
- La tarjeta muestra el estado **"Cancelado"**.
- **Texto honesto:** el pago es simulado, así que el mensaje no promete reembolso. Dice que el dinero en custodia no llega a quien vende.

**Prueba con reversión:**

| Paso | Resultado |
|---|---|
| Comprar | la prenda sale de venta y la fecha de renta se ocupa |
| Otra cuenta intenta cancelar | `SIN_PERMISO` |
| Quien compró cancela | `cancelado` |
| Cancelar otra vez | `NO_CANCELABLE` |
| Después de cancelar | la prenda vuelve a venta y la fecha queda libre |

## 2. Volver a `/centros` después de entrar

- **Antes:** el negocio que iba a pedir ser centro tenía que crear su cuenta y luego volver a `/centros` por su cuenta.
- **Ahora:** el botón de `/centros` lleva a `/?volver=/centros`. Al terminar de entrar (con correo o con Google), la app regresa sola a `/centros`. En cuentas nuevas, primero pasa por el recorrido de estilo.
- `lib/volver-a.ts` solo acepta rutas internas (`/algo`), nunca otro sitio. Probado con `node:assert`: rechaza `//evil.com`, `https://…`, `/\evil.com` y vacío.
- Se guarda en `sessionStorage` para sobrevivir la redirección de Google en la misma pestaña. Si alguien confirma su correo desde otra pestaña, ese caso no regresa solo.

## 3. Lint

- El proyecto tenía `"lint": "eslint ."`, pero **`eslint` no estaba instalado**.
- Se instalaron `eslint@9` y `eslint-config-next@16.2.9` (misma versión que Next) con `eslint.config.mjs`.
- El primer análisis encontró **115 problemas (37 errores)**, casi todos de antes:
  - `no-explicit-any`: 19
  - `set-state-in-effect`: 15 (regla nueva y estricta de React)
  - `preserve-manual-memoization`: 2
  - `purity` (en `sidebar.tsx`, de shadcn): 1
- **Decisión mía:** esas 4 reglas quedan como **aviso**, con comentario en la configuración. Corregir los 37 errores es un refactor grande, fuera de "arreglos chicos". Así `npm run lint` pasa (0 errores, 115 avisos), sirve para revisar código nuevo, y los avisos se atacan poco a poco.

## Cómo se verificó

- `tsc`, `npm run lint` (0 errores) y `npm run build` sin errores.
- Migración 11 probada con reversión (tabla de arriba) y aplicada.
