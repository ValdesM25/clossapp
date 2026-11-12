# Fase 7: usabilidad y diseño de la planificación (viajes, fechas y semana)

Estado: **hecha el 12 nov 2026 en la rama `feat/viajes-ux`, sin subir.** Sale de `main` (`23c01a2`).

## Qué pidió Mauri

Mejorar la UI/UX de la parte de viajes: que se vea bien, que sea fácil de navegar y que
«Fecha importante» pida una sola fecha (pedía «Desde» y «Hasta»).

## Qué cambió y por qué

### Crear un plan (`crear-plan.tsx`)

- **Una sola fecha en «Fecha importante».** Ahora es un calendario donde se toca un día. Antes había
  dos campos de fecha para un plan de un solo día.
- **Calendario en pantalla para viaje y semana.** Se toca el día de ida y luego el de regreso; abajo
  dice el rango y cuántos días son. Reemplaza los dos campos de fecha del navegador. Usa el
  `Calendar` que ya existía en `components/ui` (no hay dependencias nuevas). El tope de 30 días se
  aplica bloqueando los días que se pasan.
- **En viajes, primero el destino.** Al elegirlo se sugiere el nombre («Viaje a Oaxaca»); no pisa un
  nombre que la persona ya escribió.
- **Buscador de lugares:** avisa cuando no encuentra nada, en vez de quedarse vacío.
- **Paso 3:** cada día es una tarjeta; «Usar en todos los días» copia la actividad del primer día a
  los demás (no toca las noches); tocar de nuevo un atajo lo quita.
- **Barra de progreso** de los 3 pasos y **botón principal siempre a la vista** sobre la barra inferior.
- Campos a 16 px para que iOS no acerque la página al escribir.

### Detalle del plan (`plan-detalle.tsx`, `momento-card.tsx`, `maleta.tsx`)

- **Cuenta regresiva** en la portada: «Faltan 7 días», «Mañana», «Hoy · día 2 de 4», «Terminado».
- **Pestañas Outfits / Maleta en celular.** Antes la maleta quedaba debajo de todos los outfits. En
  pantallas anchas siguen lado a lado.
- **La tira de días se queda arriba** al bajar, marca «Hoy» y centra el día elegido.
- **Cambiar de día:** botones anterior/siguiente al final de los outfits y deslizar a los lados.
- **Fotos grandes de las prendas** en cada outfit (antes miniaturas de 32 px); si una prenda no tiene
  foto, sale un recuadro con ícono.
- Clima más legible (`13°–26°`), botones de acción a lo ancho, maleta con fotos más grandes y
  «Maleta lista» al terminar.

### Lista de planes (`lista-planes.tsx`) y pantalla (`planificacion-view.tsx`)

- Tarjetas con cuenta regresiva y barra de avance.
- Al cambiar de pantalla (lista, crear, detalle) se entra desde arriba y con transición.

### Regla nueva (`lib/planificacion.ts`)

- `cuentaRegresiva(plan, hoy)`, con su prueba en `lib/planificacion.test.mjs`.

## Decisiones

- **De Mauri:** una sola fecha en «Fecha importante»; mejorar el diseño y la navegación de viajes.
- **Mías:** calendario en pantalla en lugar de campos de fecha; destino primero y nombre sugerido;
  pestañas en celular; deslizar entre días; mantener la identidad actual (serif, blanco y negro,
  esquinas rectas). No se tocó la base, la IA ni las cuotas.

## Cómo se probó

- `npx tsc --noEmit` sin errores, `npx eslint` sin errores, `node --test lib/*.test.mjs` 33 de 33.
- Chromium a 390×844 y 1280×800 con `next dev` y el plan de ejemplo (sin crear planes reales, sin
  gastar IA): lista, detalle, pestañas, cambio de día, maleta y los tres pasos de crear para fecha
  y viaje. Capturas 25 a 29 en [`capturas/`](capturas/).

## Pendiente

- Probar con una cuenta Elite real en un teléfono: crear un plan de cada tipo y el gesto de deslizar
  entre días (en el navegador de prueba solo se probaron los botones).
