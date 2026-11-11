# Fase 3: la pantalla

Estado: **hecha (11 nov 2026) en `feat/planificacion-pantalla`, sin integrar todavía a `integracion/elite`.** Probada con mariela@clossapp.com a 390×844; capturas en [`capturas/`](capturas/).
Rama: `feat/planificacion-pantalla`. Depende de la fase 2.

## Objetivo

Reemplazar la maqueta por la pantalla real, conservando su lenguaje visual (zinc, títulos con serif, bordes rectos, tarjeta oscura arriba, selector de días, maleta con barra de progreso). Todo lo inventado se borra: `OUTFITS_INICIALES`, `EQUIPAJE_INICIAL`, las fotos de Unsplash, la "IA" con `setTimeout`, el modal "Asistente de viaje IA" y el de "Editar viaje".

## Qué ve cada quien

Se decide con `useAuthContext()` (`plan`, `demo`, `isGuest`, `userId`):

| Quién | Qué ve |
|---|---|
| `isGuest` o `demo` | **Vista previa** con el ejemplo y el texto "Así se ve con Elite". En demo no se muestra el botón de pagar. |
| `plan` es `gratis` o `plus`, **sin** planes guardados | **Vista previa bloqueada** con "Desbloquear con Elite". |
| `plan` es `gratis` o `plus`, **con** planes guardados (dejó Elite) | Su lista en **solo lectura** (D12), con un aviso arriba y la vista previa debajo. |
| `plan` es `elite` | Todo. |

**Solo lectura** significa: puede ver planes, marcar la maleta, usar "Me lo puse" y borrar. **No** ve "Nuevo plan", "Otro outfit", "Reintentar" ni "Completar". El aviso dice: "Tu plan ya no incluye Planificación. Puedes ver tus planes y tu maleta; para crear o cambiar outfits, vuelve a Elite." y tiene un botón "Ver Elite" que llama `navegarA("planes")`.

## Archivos

| Archivo | Qué lleva |
|---|---|
| `services/planificacion.service.ts` | Acceso a datos desde el cliente |
| `hooks/use-planificacion.ts` | Estado de la pantalla |
| `constants/planificacion-ejemplo.ts` | El plan de ejemplo de la vista previa |
| `components/views/planificacion/planificacion-view.tsx` | Se reescribe: decide qué mostrar y navega entre subpantallas |
| `components/views/planificacion/vista-previa.tsx` | Ejemplo bloqueado |
| `components/views/planificacion/lista-planes.tsx` | Mis planes |
| `components/views/planificacion/crear-plan.tsx` | Formulario en 3 pasos |
| `components/views/planificacion/plan-detalle.tsx` | Un plan: portada, días, momentos y maleta |
| `components/views/planificacion/momento-card.tsx` | Un outfit planeado |
| `components/views/planificacion/maleta.tsx` | Checklist de la maleta (solo viajes) |
| `components/views/planificacion/sugerencias-shop.tsx` | Lo que falta, con prendas del Shop |
| `lib/navegar.ts`, `components/clossapp-dashboard.tsx`, `components/views/marketplace/marketplace-view.tsx` | Abrir una prenda concreta del Shop al llegar |

`PlanificacionView` conserva sus props actuales (`onNavigate`, `onBack`), porque así la llama `clossapp-dashboard.tsx`.

## 1. `services/planificacion.service.ts`

Funciones que reciben el `SupabaseClient` del navegador, igual que `services/prendas.service.ts`:

- `fetchPlanes(supabase): Promise<PlanOutfit[]>`: `.from("planes_outfit").select("*, plan_momentos(*)").order("fecha_inicio")`. Renombrar `plan_momentos` a `momentos` y ordenarlos por fecha y momento (`dia` antes que `noche`).
- `fetchCuotaPlan(supabase, userId, plan)`: lee los cuatro contadores de `perfiles` y `plan_dias_dia` / `plan_dias_mes` de `limites_plan`, y devuelve `cuotaRestante(...)` de `lib/planificacion.ts`.
- `crearPlan(supabase, datos)`: llama `rpc("crear_plan_outfit", { p_tipo, p_nombre, p_inicio, p_fin, p_lugar, p_momentos })` y devuelve el id. Traduce los errores de la base a texto:

  | Error | Texto |
  |---|---|
  | `SOLO_ELITE` | "La planificación es parte de Elite." |
  | `FECHA_PASADA` | "Elige fechas a partir de hoy." |
  | `DEMASIADOS_PLANES` | "Tienes 10 planes activos. Borra alguno para crear otro." |
  | `FALTAN_DIAS` / `MOMENTOS_INVALIDOS` | "Revisa los días del plan." |
  | `LUGAR_INVALIDO` o restricción `viaje_con_lugar` | "Elige el destino de la lista." |
  | restricción `planes_outfit_rango` | "Un plan puede durar hasta 30 días." |
  | cualquier otro | "No pudimos crear el plan. Intenta de nuevo." |

- `generar(planId, momentoId?)`: `fetch("/api/planificacion/generar", …)`. Devuelve el JSON y, si no es 200, `{ error, limite }`.
- `borrarPlan`, `marcarEmpacada` y `marcarUsado`, que llaman a sus `rpc`. `marcarUsado` llama `marcar_momento_usado` y, **solo si devuelve `true`**, llama `registrarUso(supabase, prenda_ids)` de `services/outfits.service.ts`.

## 2. `hooks/use-planificacion.ts`

Expone: `planes`, `cuota`, `cargando`, `error`, `generando` (id del plan que se está armando o `null`), `recargar()`, `crear(datos)`, `armar(planId)`, `otroOutfit(planId, momentoId)`, `borrar(planId)`, `empacar(planId, prendaId, valor)` y `meLoPuse(momento)`.

- `armar(planId)`: llama `generar(planId)` **en bucle** mientras la respuesta sea 200, `generados > 0` y `pendientes > 0`. Después de cada vuelta recarga el plan para que la pantalla muestre cada semana conforme llega. Si sale 429, guarda el mensaje para el aviso "Completar". Mientras corre, `generando = planId`; es lo que deshabilita los botones (ver el shortcut de la fase 2).
- `crear(datos)`: crea el plan, recarga y llama `armar` con el id nuevo. Devuelve el id para abrir el detalle.
- `empacar` actualiza la pantalla antes de la respuesta (optimista) y la regresa si falla.
- Después de `armar`, `otroOutfit` y `meLoPuse`, refrescar `cuota`.

## 3. `constants/planificacion-ejemplo.ts`

Un `PlanOutfit` fijo para la vista previa: viaje "Escapada a Oaxaca", 3 días a partir de hoy, momentos de día y una cena de noche, todos `listo`, con clima creíble, un `faltante` ("Calzado", "Para la cena formal no tienes zapatos de vestir") y algunas `empacadas`. Los `prenda_ids` deben ser ids de `GUEST_PRENDAS` de `constants/demo-data.ts`, que ya tienen foto, para que `OutfitVisual` las dibuje. Las fechas se calculan al importar con `hoyMexico()`.

## 4. Vista previa (`vista-previa.tsx`)

- Dibuja `PlanDetalle` con el plan de ejemplo y `soloLectura`, dentro de un contenedor con `aria-hidden="true"`, `inert` y `pointer-events-none`. La mitad de abajo se desvanece con un degradado a blanco.
- Encima, una tarjeta fija con:
  - título "Planifica tu semana, tus fechas importantes y tus viajes";
  - texto "Outfits para cada día según lo que harás y el clima, y tu maleta lista para empacar.";
  - botón "Desbloquear con Elite", que llama `navegarA("planes")`;
  - debajo, "Elite · $<precio> al mes", con el precio tomado de `PLANES` en `constants/planes.ts` (no escribirlo a mano).
- En demo o en modo invitado, sin el botón ni el precio; solo "Así se ve con Elite".

## 5. Lista (`lista-planes.tsx`)

- Arriba: título "Planificación" y la cuota: "Te quedan X días de planificación hoy y Y este mes." Solo en Elite.
- Botón "Nuevo plan" (solo Elite).
- Tarjetas de cada plan: ícono por tipo (`CalendarDays` semana, `Star` fecha, `Luggage` viaje, de `lucide-react`), nombre, fechas ("16 al 22 nov"), lugar y "X de Y outfits listos". Etiqueta: "En curso" si hoy cae en el rango, "Próximo" si empieza después y "Terminado" si ya pasó.
- Los terminados van al final, bajo "Anteriores", plegados.
- **Lista vacía en Elite:** las tres opciones del paso 1 de crear, como tarjetas grandes.

## 6. Crear (`crear-plan.tsx`), tres pasos

**Paso 1: tipo.** Tres tarjetas:
- "Mi semana": "Lo que te pondrás cada día, según tu agenda."
- "Fecha importante": "Una boda, una entrevista, una cena especial."
- "Viaje": "Outfits para cada día y tu maleta lista."

**Paso 2: datos,** prellenados con `prellenar(tipo, hoy)`:
- Nombre (máximo 60 caracteres, obligatorio).
- Fechas: dos `input type="date"` con `min` = hoy; el fin no puede pasar de inicio + 29 días. En "Fecha importante" el fin empieza igual al inicio.
- Lugar:
  - **Viaje:** obligatorio. Buscador que llama `buscarLugares` 300 ms después de dejar de escribir y muestra hasta 5 resultados; hay que elegir uno de la lista.
  - **Semana y fecha:** opcional. Botón "Usar mi ubicación" (`navigator.geolocation`, guarda `{ nombre: "Tu ubicación", lat, lon }`) o el mismo buscador. Si no eligen nada, aviso: "Sin lugar no podemos tomar en cuenta el clima."

**Paso 3: qué harás cada día.**
- Una fila por día, con la fecha corta ("lun 16 nov") y un campo de texto (máximo 120 caracteres) con un ejemplo según el tipo: semana "Oficina, gym, algo casual…", fecha "Boda, cena, entrevista…", viaje "Museos, playa, cena…".
- Atajos debajo de cada campo que rellenan el texto: Oficina, Casual, Cena, Evento formal, Playa, Deporte, Turismo.
- "+ Noche" agrega un segundo campo para ese día (momento `noche`); se puede quitar.
- Un campo vacío es válido: la ruta lo trata como "Día casual".
- Abajo, el costo en cuota: "Este plan usa N días de planificación." Si N es mayor a lo que queda hoy: "Hoy armamos X días; el resto lo completas mañana."
- Botón "Crear y armar outfits". Al crear, abre el detalle y empieza `armar`.

Se puede volver al paso anterior sin perder lo escrito. Los errores salen debajo del botón con `role="alert"`.

## 7. Detalle (`plan-detalle.tsx`)

Props: `plan`, `prendas` (de `usePrendasContext()`), `soloLectura`, `generando`, `cuota` y los callbacks del hook.

- **Portada** (tarjeta oscura de la maqueta, sin foto): tipo, nombre, fechas, lugar y "X de Y outfits listos" con barra de progreso.
- **Mientras se arma:** "Armando tus outfits… X de Y" con `aria-live="polite"`.
- **Aviso "Completar"** (no en solo lectura): si quedan momentos sin `listo` y no se está armando:
  - si queda cuota hoy, "Te faltan N días por armar" y botón "Completar" (`armar`);
  - si no queda, "Te faltan N días por armar. Mañana puedes completarlos."
- **Selector de días:** fila con scroll horizontal, como en la maqueta. Cada día es un botón con `aria-pressed`, día de la semana y número, y un punto: verde si todos sus momentos están listos, gris si falta alguno, rojo si hay error. Arranca en hoy si cae dentro del plan; si no, en el primer día.
- **Momentos del día elegido:** una `MomentoCard` por momento.
- **Maleta:** solo en viajes. En celular va debajo de los días; en pantalla ancha, a la derecha, como en la maqueta.
- **Borrar plan:** botón discreto al final que abre `AlertDialog` (de `components/ui/`): "¿Borrar este plan? Se borran sus outfits y su maleta." Al confirmar, vuelve a la lista.

## 8. `MomentoCard`

- Encabezado: "Día" o "Noche", la actividad (o "Día casual") y el clima: "18-24 °C · Nublado". Si `fuente` es `historico`, agregar "(clima típico)". Ícono de lluvia si `lluvia`.
- **Pendiente:** esqueleto "Armando…" si el plan se está armando; si no, "Pendiente".
- **Error:** "No pudimos armar este outfit." y, si no es solo lectura, "Reintentar" (`armar`).
- **Listo:**
  - `OutfitVisual` con las prendas del outfit (buscar los `prenda_ids` en `prendas`); título; descripción; los nombres de las prendas en texto chico.
  - Si alguna prenda ya no está en el armario, avisar "Una prenda de este outfit ya no está en tu armario." Si quedan menos de 2, no dibujar el outfit y ofrecer "Otro outfit".
  - Si hay `faltante`: `SugerenciasShop`.
  - "Otro outfit" (no en solo lectura): deshabilitado mientras se arma o si la cuota de hoy está en 0, con el motivo al lado.
  - "Me lo puse": visible si la fecha es hoy o anterior y `usado_en` es `null`. Al usarlo, cambia a "Usado ✓".

## 9. Lo que falta, con el Shop (`sugerencias-shop.tsx`)

- Texto: "Te falta: <categoría>. <motivo>".
- Hasta 3 prendas de `fetchVentaItems(supabase)` (cargar una vez por pantalla) cuyo `grupoDe(category)` sea igual a `grupoDe(faltante.categoria)` y cuyo `user_id` no sea el del usuario. Cada una con foto, nombre y precio (formato con `pesos` de `lib/ventas.ts`).
- Si no hay ninguna, solo "Búscalo en el Shop", que lleva al Shop.
- Al tocar una prenda: `navegarA("marketplace", { verPrendaId: item.id })`.
- **Abrir esa prenda al llegar al Shop:**
  - En `lib/navegar.ts`, agregar `verPrendaId?: string` a `DestinoNavegar` y a las opciones de `navegarA`.
  - En `clossapp-dashboard.tsx`, guardarlo al recibir el evento, igual que se hace con `venderPrendaId` / `peticionVender`, y pasárselo a `MarketplaceView`.
  - En `MarketplaceView`, cuando lleguen los items de venta, buscar ese id y abrir el detalle con `setSelectedItem(item)`. Después, avisar al dashboard que ya se usó para que no se vuelva a abrir.

## 10. Maleta (`maleta.tsx`)

- Usa `maletaDe(plan, prendas)`.
- Arriba: "Empacadas X de Y" con barra.
- Grupos con su título. Cada prenda es una fila con miniatura, nombre y una casilla (`Checkbox` de `components/ui/`, con su `label`), que llama `empacar`. Funciona también en solo lectura.
- Si no hay outfits listos: "Tu maleta aparece cuando tus outfits estén listos."

## Reglas de diseño

- **Celular primero:** todo debe funcionar a 390 px de ancho. Botones de al menos 40 px de alto y textos de al menos 12 px.
- Colores, bordes y tipografía como el resto de la app: `zinc`, bordes rectos, títulos con `font-serif`. No agregar colores nuevos.
- Animaciones con `pageProps` de `constants/animation`, como las otras vistas.
- Toda acción que tarda muestra su estado, y no se puede pulsar dos veces.

## Cómo verificar

1. `npx tsc --noEmit`, `node --test lib/*.test.mjs` y `npx eslint` de los archivos tocados.
2. `next dev` y Chromium a 390×844 (MCP `chromium-devtools`). Guardar capturas de:
   - vista previa con una cuenta Plus;
   - lista vacía con una cuenta Elite;
   - crear cada uno de los 3 tipos (al menos un viaje con destino buscado);
   - el detalle mientras se arma y ya listo;
   - la maleta;
   - un momento con faltante y sus prendas del Shop, y que al tocar una se abra en el Shop;
   - "Me lo puse";
   - solo lectura (con una cuenta Elite de prueba, cambiar su `plan` a `plus` desde el MCP **con OK de Mauri** y regresarlo después).
3. Armar un plan de 10 días con la cuenta Elite: deben salir 7 días, y luego 3 más con "Completar" (o solos, si el bucle sigue). Revisar `uso_ia_registro`.

## Criterios de aceptación

- [x] No queda nada de la maqueta inventada: el `rg` no encuentra nada en `components/views/planificacion`; la vista previa toma sus fotos de `GUEST_PRENDAS`.
- [x] Las cuatro situaciones de la tabla de arriba se ven bien a 390×844 (capturas 01, 03, 15 a 17).
- [x] Ningún botón que gasta IA aparece en solo lectura ni sin Elite (revisado en la pantalla: en solo lectura solo quedan "Me lo puse", la maleta y "Borrar plan").
- [x] Capturas: por decisión de Mauri van en `docs/planificacion-outfits/capturas/` (780 px de ancho, JPEG) en vez de la descripción del PR.

## Hecho

Rama `feat/planificacion-pantalla` (sale de `804a2e0`), commits `a42f3ae`, `acf11a9` y `864e67d`, más el de esta documentación. Sin push ni PR.

### Qué se hizo

- Los archivos de la tabla, tal como se describen. `planificacion-view.tsx` se reescribió entero; `PlanificacionView` conserva `onNavigate` y `onBack`.
- `lib/planificacion.ts`: `grupoDe` acepta plurales (las prendas de ejemplo usan "Pantalones", "Chaquetas"…); se exportan `sumarDias` y `ordenMomento`, y se agregan `fechaCorta`, `rangoFechas`, `estadoPlan` y `categoriaDe`, todas con tests (33 en total).
- `verPrendaId` en `lib/navegar.ts`, el dashboard y `MarketplaceView`: el Shop lo guarda al montarse (porque `onAtendida` limpia la petición enseguida) y abre el detalle cuando llegan los items. Una petición que solo trae `verPrendaId` ya no abre la capa de vender.

### Decisiones fuera del documento

- **`categoriaDe` (cambia también la fase 2).** Mariela tiene dos vestidos guardados como `Top` ("Vestido Largo Satinado Verde Salvia"). Para una boda la IA los elegía como vestido y la revisión los rechazaba por no llevar parte de abajo: falló 4 veces. Ahora una prenda cuyo nombre empieza con "Vestido" cuenta como vestido en el prompt, en la revisión y en la maleta. Con el cambio salió a la primera. La causa de fondo es el análisis de prendas, que a veces guarda mal la categoría.
- **La ruta deja en el log** por qué un outfit no pasó la revisión (`[planificacion] no pasaron la revisión`). Sin esto no se podía saber qué fallaba.
- **`OutfitVisual`** (compartido con el Simulador) dibuja también las prendas que no caen en `LAYER_ORDER` (Blusa, Vestido, plurales) en un grupo "Más prendas"; antes se perdían. Los nombres pasan a 12 px.
- **`prendas.id` llega como número** aunque `types/prenda.ts` diga texto; la vista lo convierte a texto al entrar, porque los planes guardan los ids como texto.
- **Candado con `useRef`** en `armar` y `otroOutfit`: el estado `generando` tarda un render y dos toques en el mismo instante cobrarían dos veces.
- **Sugerencias del Shop:** solo en planes de pago (Esencial solo dona). Si el faltante cae en el grupo "otro" (por ejemplo, "Impermeable"), solo se muestra "Búscalo en el Shop" para no sugerir cosas sin relación. En la vista previa se usa `STATIC_MARKET`, sin tocar la base.
- **La tarjeta de la vista previa no es fija:** con `sticky` tapaba casi la mitad de la pantalla del celular.
- `AlertDialog` con `rounded-none` para mantener los bordes rectos; es el primer uso de ese componente en la app.
- Rojo y verde solo para errores y para los puntos del selector de días; la app ya los usa en otras pantallas.

### Prueba real (11 nov 2026, `next dev` en el puerto 3100, Chromium a 390×844)

- **Sin IA:** vista previa bloqueada con mariela en `plus` y sin planes (01), lista vacía en Elite (03), crear un viaje con destino buscado hasta el paso 3 (04, 05) y demo en un contexto aislado del navegador (17: "Así se ve con Elite", sin botón ni precio).
- **Viaje de 10 días** (Oaxaca, 11 a 20 nov, 11 momentos): el primer bloque de 7 días tardó **12 s** en una sola llamada; el bucle siguió solo con los 3 días restantes. El plazo de 100 s queda muy holgado. Capturas mientras se arma (06) y listo (07).
- **Faltante con el Shop:** "Senderismo en la sierra con botas de montaña" dio `faltante` de calzado y sugirió la "Bota Vaquera Negra" ($1,500) del Shop; al tocarla se abrió su detalle en el Shop (08, 11).
- **Maleta:** 25 prendas agrupadas; dos marcadas se guardaron en `empacadas` (09).
- **Me lo puse:** cambió a "Usado ✓" y las 4 prendas sumaron un uso con `ultimo_uso` de hoy (10).
- **Fecha importante** con "Usar mi ubicación" (geolocalización emulada en Saltillo): 1 de 1 en 6 s, con clima de Saltillo (12).
- **Mi semana** sin lugar, con 3 días de cuota restantes: avisó "Hoy armamos 3 días; el resto lo completas mañana." (13), armó 3 de 7 y mostró "Te faltan 4 días por armar. Ya usaste los días de planificación de hoy…" sin botón de "Completar" (14).
- **Solo lectura:** mariela en `plus` con sus 3 planes: aviso con "Ver Elite", sin "Nuevo plan", "Completar", "Otro outfit" ni "Reintentar"; quedan "Me lo puse", la maleta y "Borrar plan" (15, 16). Regresó a `elite`.
- **Borrar:** los 3 planes se borraron desde la pantalla con el `AlertDialog` (18).
- La sesión del Chromium del MCP siguió viva desde la fase 2; no hizo falta otro enlace mágico.

Tokens en `uso_ia_registro` (filas 3 a 12, todas `claude-sonnet-5-5`):

| Filas | Qué | Entrada | Salida | Caché leído | Caché escrito | MXN |
|---|---|---|---|---|---|---|
| 3 | Bloque de 7 días (8 momentos) | 982 | 1,153 | 0 | 3,897 | 0.42 |
| 4 y 5 | 3 días restantes + corrección de la boda | 1,699 | 724 | 7,794 | 0 | 0.22 |
| 6 a 9 | La boda: reintento del bucle y "Reintentar" antes del arreglo | 3,184 | 910 | 15,588 | 0 | 0.33 |
| 10 | La boda después de `categoriaDe` (el inventario cambió: caché nuevo) | 761 | 221 | 0 | 3,901 | 0.24 |
| 11 | Fecha importante (1 día) | 183 | 214 | 3,901 | 0 | 0.06 |
| 12 | Mi semana (3 días) | 305 | 496 | 3,901 | 0 | 0.11 |

- Total de la prueba: **~$1.39 MXN**. Sin los intentos fallidos de la boda (filas 5 a 9) habría sido ~$0.97 por 14 días planeados (~$0.07 por día, debajo de los $0.17 estimados).
- El caché del inventario se comparte entre planes del mismo usuario: la fecha y la semana lo leyeron del caché del viaje.
- Mariela quedó con 14 de 14 días usados hoy y 14 de 30 en el mes, y sin planes.
- **Lo que borrar los planes no deshace:** "Me lo puse" sumó un uso a las prendas 123, 130, 154 y 162 de mariela y cambió su `ultimo_uso` al 11 nov. Esos datos alimentan Estadísticas. Los `usos` se pueden restar; las fechas anteriores no se anotaron y no se pueden recuperar.

### Pendiente o a revisar

- Cuando un momento falla, el bucle de `armar` lo vuelve a intentar una vez más por su cuenta (cobra y devuelve el día). Es barato (~$0.17 MXN por par de llamadas), pero si un momento falla siempre se paga dos veces.
- El análisis de prendas guarda algunas con categoría equivocada; `categoriaDe` solo cubre los vestidos.
- En este Chromium no cargan las fotos de Unsplash de `GUEST_PRENDAS` (error de certificado del navegador del MCP); en la vista previa y la demo se ven los nombres sin foto.
- La captura 05 es anterior a quitar las barras de scroll de los atajos.
