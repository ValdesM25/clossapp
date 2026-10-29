# Fase 3b: modo demo con recorrido guiado (rama `feat/modo-demo`)

## Qué hace, en una línea

El modo invitado desaparece. En su lugar, el login ofrece **"Demo de usuario"** y **"Demo de centro de acopio"**, con datos de ejemplo y una guía paso a paso encima de la interfaz real, como una presentación.

Esta rama sale de `feat/armario-al-dia` y se despliega justo después de ella. La fase 3 quita el botón público del portal de recolección, y esta fase es la que le devuelve a Mauri su demo para presentaciones, ahora de forma segura.

## Decisión de Mauri

> "Quiero que quites el modo invitado, que ahora sea modo demo donde tengas dos opciones, demo de usuario y demo de centro de acopio, todo serán datos falsos y simulados, inclusive con un walkthrough… algo bien sencillo de usar… casi como si fuera una presentación de PowerPoint donde, aunque se ve todo exactamente igual a la interfaz real, la ayuda visual está ahí."

Además, no quería dejar sin funcionar el portal que usa para demostraciones.

## Cómo funciona

### Entrar y salir
- En el login, el bloque "¿Solo quieres conocer Clossapp?" tiene los dos botones.
- Al entrar arranca la guía sola. Después queda una pastilla fija **"Modo demo · Ver guía · Salir"**, encima de la barra de navegación (o en la esquina inferior del portal).
- "Salir" vuelve al login. En la última pantalla de la demo de usuario está "Crear mi cuenta".

### La guía (`components/shared/tour-guiado.tsx`)
- **Diapositivas** de bienvenida y cierre, centradas.
- **Pasos con foco:** oscurece todo menos el elemento que explica y muestra una tarjeta de texto (abajo, o arriba si el elemento está en la mitad inferior).
- Cada paso puede **abrir sola la sección** que explica (por ejemplo, tocar "Armario" en la barra o abrir el escáner).
- Botones Atrás y Siguiente, salir con la X, barra de progreso "3 de 10", y teclado (flechas y Esc).
- En los pasos **interactivos** se puede tocar lo resaltado: probar el simulador de outfits o el QR de ejemplo. Si el elemento cambia al tocarlo (el botón de QR se vuelve el resultado), el oscurecido se quita para que se vea lo que pasó.
- **Decisión mía:** la hice propia en vez de usar una librería, para que se vea igual que la app (mismas fuentes, colores y esquinas rectas), y porque abrir secciones entre pasos lo tenía que escribir de todos modos.

### Los guiones (`constants/tour.ts`)
- **Para cambiar cualquier texto basta con editar este archivo.**
- **Demo de usuario (10 pasos):** bienvenida → barra de navegación → outfit del día → armario → botón de agregar prenda → outfits con IA (interactivo) → shop (vender, rentar, donar) → estadísticas → puntos → cierre.
- **Demo de centro de acopio (9 pasos):** bienvenida → las tres áreas → botón de escanear → QR de ejemplo (interactivo) → metas del mes → bitácora → entregas de compras → rentas con dos QR → cierre ("¿Tu negocio puede ser centro de acopio?").
- Los elementos se marcan en la interfaz con `data-tour="…"`. Para agregar un paso nuevo hay que poner esa marca en el elemento.

### Datos simulados (`lib/demo.ts`)
- **Nada se escribe en Supabase.**
- La demo de usuario reutiliza lo que ya hacía el modo invitado: prendas de ejemplo y outfits inventados. Ahora además se puede "elegir" un outfit y se ve como en real.
- La demo de acopio siembra 2 órdenes de ejemplo (una compra y una renta) y un registro en la bitácora. "Usar QR de ejemplo" simula la validación: quién dona, 5 prendas y 140 puntos con la misma fórmula que la base. El registro presencial también se simula.
- **Protección de datos reales:** varias pantallas guardan respaldo en `localStorage`. Al entrar a la demo se guarda una copia de las claves `clossapp_*` y se vacían. Al salir se borran las de la demo y se restaura la copia. Si la pestaña se cerró en plena demo, se restaura la próxima vez que se abre la app.

## Archivos tocados

| Archivo | Cambio |
|---|---|
| `lib/demo.ts` (nuevo) | Estado de la demo, respaldo y restauración de `localStorage`, datos sembrados y fórmula de puntos. |
| `constants/tour.ts` (nuevo) | Los dos guiones. |
| `components/shared/tour-guiado.tsx` (nuevo) | La guía. |
| `hooks/use-auth.ts`, `context/auth-context.tsx` | `loginAsGuest` se reemplaza por `entrarModoDemo(tipo)`; estados `demo` y `tourActivo`; al salir de la demo se restaura todo. |
| `components/clossapp-dashboard.tsx` | Pastilla "Modo demo" y la guía, en la app y en el portal. |
| `components/views/login-view.tsx` | Bloque con los dos botones de demo. |
| `services/donaciones.service.ts` | En demo, validar QR y el registro presencial se simulan. |
| `hooks/use-outfits.ts`, `outfit-card.tsx` | En demo se puede elegir un outfit. |
| `punto-recoleccion-view.tsx` | Botón "Usar QR de ejemplo" (solo en demo), marcas `data-tour` y un botón oculto que la guía usa para cerrar el escáner. |
| Vistas varias | Marcas `data-tour` y el texto "Modo Invitado" pasa a "Modo demo". |

## Cómo se verificó

- `tsc` sin errores.
- **Recorrido automático en Chromium** (pantalla de teléfono de 390×844) de las dos demos completas:
  - Los 8 pasos con foco de la demo de usuario y los 7 de la de acopio encontraron su elemento.
  - El QR de ejemplo mostró "Mariela Morales (ejemplo)" y dejó el registro en la bitácora.
  - Un dato "real" puesto antes en `localStorage` **no se vio durante la demo y volvió intacto al salir**.
  - Revisé capturas de cada paso. Así encontré y corregí dos detalles: el foco no seguía al resultado del QR, y la pastilla de demo tapaba el encabezado.
- Queda un aviso de "recurso 404" en consola en alguna pantalla interna; por el patrón, parece una imagen externa de ejemplo. No afecta el funcionamiento.

## Pendiente de probar a mano

- Ver la guía en un teléfono real y en pantalla de computadora.
- Ajustar textos de los guiones a tu gusto (en `constants/tour.ts`).
