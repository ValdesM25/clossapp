# Fase 4: entradas (Inicio, Perfil, Simulador y /planes)

Estado: **hecha (11 nov 2026) e integrada en `integracion/elite` (merge `829d535`). La landing tiene el texto nuevo en `feat/precios-89-159` (`9c90b2f`).**
Rama: `feat/planificacion-entradas`. Depende de la fase 3.

## Objetivo

Que la planificación aparezca donde el usuario ya está (D13), y que el outfit planeado para hoy sustituya al outfit del día en Inicio (D8).

## 1. Abrir un plan concreto

Lo usan Inicio y los avisos de la fase 5.
- En `lib/navegar.ts`, agregar `planId?: string` a `DestinoNavegar` y a las opciones de `navegarA`.
- En `clossapp-dashboard.tsx`, al recibir el evento con `planId`, guardarlo en un estado `planInicial` y pasárselo a `PlanificacionView` (prop nueva `planInicial?: string`). La vista abre ese plan en el detalle si existe; si no, muestra la lista.

## 2. Inicio (`components/views/inicio/inicio-view.tsx`)

### Outfit de hoy planeado

- Solo con plan `elite` o con planes guardados (solo lectura también cuenta, D12). Leer los momentos de hoy con una consulta ligera en `services/planificacion.service.ts`:
  `fetchMomentosDeHoy(supabase, hoy)`: `.from("plan_momentos").select("*, planes_outfit(id, nombre)").eq("fecha", hoy).eq("estado", "listo")`.
- **Si hay alguno**, la tarjeta de "Outfit del día" muestra el planeado:
  - "Hoy tienes planeado · <nombre del plan>", la actividad, `OutfitVisual`, el título, "Me lo puse" (igual que en `MomentoCard`) y "Ver plan" (`navegarA("planificacion", { planId })`);
  - si también hay momento de noche, una línea: "Para la noche: <título>".
- **Ahorro de IA:** mientras se consulta y cuando hay outfit planeado, **no** generar el outfit del día. `useOutfitDelDia(prendas, userId, plan, activo)` ya recibe `activo`: pasar `!isGuest && consultaTerminada && !hayPlaneado`.

### Tarjeta de planificación

Va donde estaba la tarjeta falsa de París (justo después del outfit del día).

| Quién | Tarjeta |
|---|---|
| Elite con un plan que no ha terminado (`proximoPlan`) | "Tu próximo plan" · nombre · fechas · "X de Y outfits listos". Al tocarla, abre ese plan. |
| Elite sin planes | "Planea tu semana" · "Outfits para cada día según tu agenda y el clima." · botón "Crear plan". |
| `gratis` o `plus` sin planes, invitado o demo | "Planifica tu semana y tus viajes" con la etiqueta "Elite" · "Outfits para cada día, fechas importantes y tu maleta lista." Al tocarla, `navegarA("planificacion")` (muestra la vista previa). |
| Cuenta de centro de acopio (`rol = 'acopio'`) | Nada. Revisar cómo Inicio ya oculta cosas para ese rol y hacer lo mismo. |

## 3. Perfil (`components/views/perfil/perfil-view.tsx`)

La fila que agregó la maqueta se queda, con otro texto:
- `titulo`: "Planificación de outfits"
- `texto`: "Tu semana, fechas importantes y viajes, con outfits y maleta."
- `estado`: `"Elite"` si el plan no es `elite`; sin `estado` si lo es. `Fila` ya acepta `estado`.

## 4. Simulador (`components/views/simulador/simulador-view.tsx`)

Debajo de `OutfitForm`, un botón secundario con el ícono `Luggage`: "Planear varios días". Con la etiqueta "Elite" si el plan no es `elite`. Llama `navegarA("planificacion")`. No debe competir con el botón principal de generar: mismo estilo que los enlaces secundarios de esa vista.

## 5. /planes (`constants/planes.ts`)

- En la tarjeta de Elite, cambiar `"Planificación de outfits"` por `"Planifica tu semana, fechas importantes y viajes"`.
- Buscar el texto viejo en todo el repo (`rg -n "Planificación de outfits"`, también en la landing) y cambiarlo igual.
- "Modelos de IA frontier" **se queda** (P2 resuelta: Mauri decidió que se cumple con Sonnet 5.5 en la planificación).

## 6. Barra inferior: preguntar antes (pendiente P1)

El commit `5c04812` agregó "Planificación" como sexto botón de `constants/navigation.ts`. **No cambiarlo sin una respuesta de Mauri.** Llevarle estas opciones:

| Opción | A favor | En contra |
|---|---|---|
| Dejar los 6 botones | La función se ve siempre | Los textos ya se recortan a 10 px; Outfit dejó de estar al centro; Esencial y Plus tienen un botón que solo lleva a la vista previa |
| Quitarlo y usar las entradas de esta fase | Barra limpia, Outfit al centro otra vez | Se ve menos |
| Que Planificación reemplace a otro botón | 5 botones | Hay que decidir cuál sale |

Si se quita, devolver `"planificacion"` a `incluye` de Perfil para que Perfil quede marcado en esa vista, como estaba antes de `5c04812`.

## Cómo verificar

1. `npx tsc --noEmit` y `npx eslint` de los archivos tocados.
2. A 390×844, con una cuenta Elite **con** un momento listo para hoy: Inicio muestra el planeado y, en la pestaña de red, **no** hay llamada a `/api/generate-outfits`.
3. Con Elite sin plan para hoy: el outfit del día se genera como antes.
4. Con una cuenta Plus: la tarjeta de Inicio y la fila de Perfil llevan a la vista previa.
5. "Ver plan" y la tarjeta del próximo plan abren el detalle correcto.

## Criterios de aceptación

- [x] Las cuatro filas de la tabla de Inicio se ven bien (capturas 19 a 21; el centro de acopio no ve Inicio).
- [x] El outfit planeado sustituye al del día sin gastar IA (sin `POST /api/generate-outfits` en el log al recargar).
- [x] Perfil, Simulador y /planes con los textos nuevos; la landing, en su rama de precios (sin subir).
- [x] La barra inferior quedó como dijo Mauri: 6 botones, con Outfit en el extremo derecho (captura 24).

## Hecho

Rama `feat/planificacion-entradas` (sale de `5a131c4`), commit `99e0e57` más el de esta documentación. Sin push.

### Qué se hizo

- `navegarA` acepta `planId`. El dashboard lo guarda en `planInicial` y `PlanificacionView` abre ese plan una vez y avisa con `onPlanAbierto` para que se limpie; así, volver a Planificación desde la barra abre la lista y no el mismo plan.
- **Inicio:** si hay un outfit listo para hoy, ocupa la tarjeta oscura del outfit del día: "Hoy tienes planeado · <plan>", título, actividad y descripción, las prendas, "Para la noche: <título>", "Me lo puse" y "Ver plan". Debajo, la tarjeta de planificación (próximo plan, "Planea tu semana" o la invitación con la etiqueta Elite).
- **Perfil:** "Planificación de outfits" con su texto nuevo y la etiqueta Elite si la cuenta no es Elite.
- **Simulador:** enlace secundario "Planear varios días" debajo del formulario, con la etiqueta Elite si no es Elite.
- **/planes:** "Planifica tu semana, fechas importantes y viajes". En la app no quedaba el texto viejo en ningún otro lugar visible.
- **Landing (`clossapp-landing`):** el mismo texto en `src/data.ts`, commit `9c90b2f` en la rama local `feat/precios-texto-planificacion`, que sale de `origin/feat/precios-89-159`. La rama de precios está abierta en el worktree de otra sesión, por eso no se commiteó ahí; sube como avance directo de `feat/precios-89-159` con el OK de Mauri.

### Decisiones fuera del documento

- **Una sola consulta para Inicio:** en vez de `fetchMomentosDeHoy`, Inicio usa `fetchPlanes` (ya existía) con `momentosDeHoy` y `proximoPlan` de `lib/planificacion.ts`. La tarjeta del próximo plan necesita los planes con sus momentos de todos modos.
- **`usePlanesInicio`** marca la consulta como lista por usuario. Mientras no termina, el outfit del día no se genera y su tarjeta se ve cargando, para no gastar IA si resulta que hay uno planeado.
- **Prendas en la tarjeta de Inicio:** se usa la misma cuadrícula de fotos del outfit del día en lugar de `OutfitVisual`; en la tarjeta oscura se lee mejor y sigue el diseño de Inicio.
- **Centro de acopio:** no hace falta código; esas cuentas entran a otra pantalla (`userMode === "RECOLECCION"` en el dashboard) y no ven Inicio.
- **Sin Elite con planes (solo lectura):** si tiene un plan vigente, la tarjeta muestra ese plan; si no, la invitación.

### Barra inferior (P1)

Se le presentaron a Mauri las opciones de la tabla y una recomendación (quitar Planificación y dejar 5 botones, porque lo diario ya sale en Inicio). **Decidió que Planificación se queda** y que Outfit pase a la derecha para que no se vea mal y quede al alcance del pulgar.

- `constants/navigation.ts`: Inicio, Armario, Planificación, Shop, Perfil y Outfit (destacado) en el extremo derecho. Con 6 botones no hay centro y el destacado en el tercer lugar se veía chueco.
- `constants/tour.ts`: el paso de la barra ya no dice "Outfit (al centro)".
- A 390 px ningún texto se corta (Planificación mide 68 px; los demás, 56 px).

### Prueba (11 nov 2026, `next dev` en el puerto 3100, Chromium a 390×844, mariela@clossapp.com)

- **Elite sin plan para hoy:** Inicio llama a `/api/generate-outfits` como antes (respondió 429 porque mariela ya había usado sus outfits del día, y se usó el look simple) y muestra "Planea tu semana" (19).
- **Elite con plan para hoy** (fecha importante con día y noche, armado con la ruta): Inicio muestra el planeado con "Para la noche" (20) y, con la caché del outfit del día borrada, **no** hay `POST /api/generate-outfits` en el log ni se crea la caché. "Ver plan" y la tarjeta "Tu próximo plan" abren ese plan; volver por la barra abre la lista. "Me lo puse" cambia a "Usado".
- **Plus sin planes:** la invitación con la etiqueta Elite en Inicio (21), la fila de Perfil (22) y el enlace del Simulador (23) llevan a la vista previa. Mariela regresó a `elite`; el plan de prueba se borró desde la pantalla.
- Tokens (fila 13 de `uso_ia_registro`): 299 de entrada, 311 de salida y 3,901 escritos al caché, ~$0.24 MXN. Mariela quedó con 1 día usado.
