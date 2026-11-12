# Fase 8: la IA toma en cuenta el nombre del plan

Estado: **hecha el 12 nov 2026 en la rama `feat/nombre-plan-ia`, sin subir.** Sale de `main`
(`23c01a2`) y no depende de las otras ramas.

## Qué pidió Mauri

Que un plan llamado "Boda de Ana" arme un outfit de boda y uno llamado "Parque Xcaret" algo cómodo
que se pueda mojar: que el nombre cuente.

## Qué pasaba

El nombre sí llegaba a la IA, pero las instrucciones no decían que lo usara. Además, si el día se
dejaba sin actividad, el servidor mandaba "Día casual", que contradecía al nombre.

## Qué cambió (`lib/planificacion.server.ts`)

- Dos instrucciones nuevas: el nombre del plan dice la ocasión o el lugar y cuenta para todos sus
  momentos; si la actividad viene vacía se deduce del nombre, y solo si el nombre no dice nada se
  arma algo casual. Si la actividad dice algo concreto y distinto, manda la actividad.
- La actividad vacía se envía como `null` en vez de "Día casual".
- Inicio (`planificacion-inicio.tsx`): sin actividad ya no antepone "Día casual" a la descripción.

No cambian la base, la cuota ni el modelo. Los planes ya armados no se vuelven a generar solos:
aplica a planes nuevos y a "Otro outfit".

## Cómo se probó

Dos llamadas reales a la IA (unos centavos) con un armario de prueba de 14 prendas y el día sin
actividad:

- "Boda de Ana" → vestido largo satinado, tacones, aretes y blazer.
- "Parque Xcaret" (Playa del Carmen, 23–31 °C) → playera dry-fit, short de secado rápido,
  sandalias de agua y gorra.

`tsc` y `eslint` sin errores; `node --test lib/*.test.mjs` pasa.

## Pendiente

- La tarjeta del outfit dentro del plan todavía dice "Día casual" cuando no hay actividad, y el
  formulario dice "Si dejas uno vacío, armamos algo casual". Se corrigen al juntar con
  `feat/viajes-ux`, que reescribió esos archivos (tocarlos aquí daría conflictos).
