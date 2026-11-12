# Gesto "atrás", posición de scroll y cuadrícula del Armario

Estado: **hecho el 12 nov 2026 en la rama `fix/gesto-atras`, sin subir.** Sale de `feat/viajes-ux`
(toca `planificacion-view.tsx`, que esa rama cambió).

## Qué preguntó Mauri

Por qué el gesto de "volver" del teléfono saca de la app en vez de regresar a la pantalla anterior,
y pidió una pasada de UI/UX por las demás pantallas.

## Por qué pasaba

La app es una sola página: cambiar de pantalla solo cambiaba una variable (`activeView`) y nunca
dejaba nada en el historial del navegador. Para el teléfono no existía "pantalla anterior", así que
el gesto salía de la app. Lo mismo con modales abiertos.

## Qué cambió

- **Vistas en el historial** (`components/clossapp-dashboard.tsx`): cada cambio de vista hace
  `history.pushState({ vista })` y un `popstate` regresa a la anterior. La URL no cambia, así que
  los enlaces `?plan`, `?vender` y `?pedido` siguen igual. En Inicio, "atrás" sale de la app (normal).
- **"Atrás" cierra lo que esté abierto** (`hooks/use-atras.ts`, nuevo): modal, cajón o subpantalla
  dejan una entrada al abrirse; el gesto los cierra y, si se cierran con su botón, la entrada se quita.
  Puesto en `CenteredModal` (cubre los modales de Armario, Perfil, Planes, Shop y centro de acopio),
  carrito, pedidos, pago, las dos capas de vender y las subpantallas de Planificación (crear y
  detalle regresan a la lista).
- **Scroll por vista:** una vista nueva empieza arriba (antes heredaba el scroll de la anterior);
  al volver con "atrás" se recupera la posición; tocar la pestaña activa sube al inicio.
- **Armario:** las fotos tenían alturas alternadas (180/140/160 px) dentro de una cuadrícula de
  filas iguales y dejaban huecos; ahora todas van a 3:4.
- `PrendaSkeleton`: se quitó `space-y-3`, que desalineaba la segunda columna.

## Decisiones

- **De Mauri:** que "volver" regrese a la pantalla anterior; revisar las demás pantallas.
- **Mías:** no cambiar la URL (menos riesgo con los enlaces de Stripe y avisos); cada cambio de
  pestaña cuenta como una pantalla en el historial; recordar el scroll solo al volver.

## Cómo se probó

`tsc` y `eslint` sin errores, `node --test lib/*.test.mjs` 33 de 33. En Chromium a 390×844 (demo):
Inicio → Armario → Shop → Planificación y tres "atrás" regresan en orden; "atrás" con un modal
abierto lo cierra sin cambiar de vista; cerrar con la X no deja entradas de más; scroll al entrar y
al volver.

## Pendiente

- Probar en teléfono real (gesto de iOS y botón de Android) con la app instalada.
- No probado: "atrás" dentro de un plan (requiere cuenta Elite), carrito, pedidos, pago y vender;
  usan el mismo gancho que el modal probado.
- Sin cubrir: la guía de la demo, el diálogo "¿Borrar este plan?" y los pasos dentro de crear plan
  ("atrás" regresa a la lista, no al paso anterior).
- Revisadas sin cambios: Inicio, Shop, Outfit y Perfil.
