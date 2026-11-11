# Fase 4: entradas (Inicio, Perfil, Simulador y /planes)

Estado: **sin empezar.**
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
- **No tocar** "Modelos de IA frontier": es la pendiente P2 del README.

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

- [ ] Las cuatro filas de la tabla de Inicio se ven bien.
- [ ] El outfit planeado sustituye al del día sin gastar IA.
- [ ] Perfil, Simulador y /planes con los textos nuevos.
- [ ] La barra inferior quedó como dijo Mauri.

## Hecho

(Lo llena quien ejecute la fase.)
