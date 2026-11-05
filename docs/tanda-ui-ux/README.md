# Tanda UI/UX: primera impresión y velocidad percibida

Rama: `feat/ui-ux-primera-impresion`. Pedido de Mauri: priorizar que la app no se vea ni se sienta lenta, sobre todo en cuentas nuevas.

## 1. Sin datos de ejemplo en cuentas reales

**Qué pasaba:** con el armario vacío, Inicio mostraba las 6 prendas de la demo como si fueran tuyas. Aun con prendas reales, "días sin usar" y "usos" eran números inventados (`(idx + 1) * 18 + 12`). Si fallaba la red, prendas y reparaciones se rellenaban con las de la demo, y Shop con las de ejemplo al publicar.

**Qué se hizo**
- `components/views/inicio/inicio-view.tsx`: todo sale de las prendas del contexto. Olvidadas = 30+ días desde `ultimo_uso` (o desde que se subió). Las que más usas = 8+ usos reales. Cada sección se oculta si no hay nada que mostrar.
- `types/prenda.ts`: `usos` y `ultimo_uso` pasan a `Prenda` (ya venían con `select("*")`). `PrendaExt` queda como alias para no tocar a quien la usa.
- `constants/demo-data.ts`: las prendas de la demo traen usos y fechas para que la demo se siga viendo llena con la misma lógica.
- `hooks/use-prendas.ts`, `use-reparaciones.ts`, `use-marketplace.ts`: si falla la red se queda lo real que había, nunca lo de ejemplo.

**Decisión de Mauri:** quitar los placeholders de cuentas nuevas. **Mía:** umbrales de 30 días y 8 usos (constantes arriba de `inicio-view.tsx`).

## 2. Mini manual para cuentas nuevas

`components/views/inicio/primeros-pasos.tsx`: tarjeta "Empieza aquí" en Inicio con 3 pasos que se marcan solos (primera prenda, 3 prendas, estilo) y un "Cómo funciona Clossapp" plegable con una línea por sección. Se va al completarla o con la X (por cuenta, en localStorage). En lugar del outfit del día falso, un estado vacío con "Agregar prenda".

**Decisión de Mauri:** algo que invite a usar la app sin ser un recorrido guiado. **Mía:** checklist en lugar de tour (ver pros y contras en el reporte).

## 3. Preguntas del inicio

`constants/onboarding.ts` + `onboarding-view.tsx`: un campo puede tener `noMasculina`, opciones que no se muestran si se elige ropa masculina. "Romántico" pasó a "Femenino / delicado" y se oculta junto con "Bohemio", "Reloj de arena" y "Triángulo (pera)". Las tallas dicen "parte de arriba / de abajo" en lugar de "blusas / falda". Ejemplos de texto más neutros.

**Motivo:** feedback de un amigo ("¿por qué dice que si me visto romántico?").

## 4. Banner de instalar en iOS

`components/shared/instalar-banner.tsx` + `hooks/use-instalar-app.ts`: ícono de la app, 3 pasos numerados con íconos (incluye que en iOS 26 Compartir está dentro de "•••"), botón de cerrar de 40px. Detecta navegadores dentro de apps (Instagram, Facebook, TikTok…), donde no se puede instalar, y pide abrir en Safari.

## 5. Animación de entrada

`components/shared/pantalla-entrada.tsx`, montada en `clossapp-dashboard.tsx` (reemplaza al `SplashScreen`). Cubre la app con el logo y una línea de progreso mientras: se restaura la sesión, llegan las prendas y se decodifican las primeras 6 fotos. Mínimo 0.9 s, 2.5 s como máximo esperando fotos, 4 s de tope total. Luego se desvanece y ya estás dentro con todo puesto. Sale al abrir la app y al iniciar sesión; no al cerrar sesión ni en el login. Respeta "reducir movimiento".

## 6. Velocidad y pulido

- Armario usa el contexto de prendas: entrar ya no vuelve a pedirlas ni muestra el esqueleto cada vez.
- Stats: esqueleto con la forma de los KPIs en lugar de spinner.
- Fotos: `loading="lazy"` y `decoding="async"` fuera de la primera pantalla.
- Áreas táctiles de 40 a 48px (botones de Inicio, barra inferior, opciones del onboarding). Ningún texto menor a 11px en lo tocado.
- Barra inferior: cada botón ocupa su parte del ancho e indica la sección activa con una línea arriba (`aria-current`).
- Color de acento: se quitaron el ámbar decorativo (sol, destellos, badges) de Inicio. Verde queda solo para "registrado", ámbar para avisos.

## Sin probar

- No se probó en navegador (la extensión de Chrome no estaba conectada) ni en iPhone real. Se verificó `tsc` y `next build`.

## 7. Ajustes tras revisión de Mauri

- **Onboarding de 4 pasos** (`constants/onboarding.ts`): "Cuerpo y tallas", "Inspiración" y "Cómo compras" llevan `despues: true` y no salen al registrarse. Se piden con la tarjeta "Afina tus sugerencias" en Inicio (`completar-perfil.tsx`) cuando ya terminaste "Empieza aquí" y no contestaste ninguna; la X la pospone 2 semanas. "Mi estilo" sigue mostrando los 7 pasos. `mostrarOnboarding` pasó de booleano a modo: `"inicial" | "despues" | "todo"`.
  - Decisión de Mauri: bajar a 4 pasos sin perder esa información para después.
- **Letrero de instalar**: vuelve a las 2 semanas del primer cierre y a las 4 del segundo; al tercero ya no. Quien lo cerró con la versión anterior cuenta como primer cierre.
  - Decisión de Mauri.
- **Opciones que ya no aparecen**: lo que elegiste siempre se muestra en el onboarding, aunque la opción se haya renombrado ("Romántico") o no aplique a la ropa elegida, para poder quitarlo.
  - Decisión de Mauri.
- Umbrales de 30 días y 8 usos: aprobados por Mauri.

## 8. Pase con skills de diseño (impeccable, mobile-native, guías de Vercel, Emil Kowalski, ui-ux-pro-max)

Pedido de Mauri: aplicar todas las skills de diseño disponibles. Lo que se corrigió:

- **Móvil nativo** (`app/globals.css`, `app/layout.tsx`): sin destello gris al tocar, `touch-action: manipulation` (toque inmediato), texto de botones no seleccionable con pulsación larga, campos de 16px en pantallas táctiles (iOS ya no hace zoom al enfocarlos) y **zoom permitido** (antes `userScalable: false`, falla de accesibilidad). Contenedor principal con `h-dvh` en lugar de `h-screen` (100vh se mete debajo de la barra del navegador).
- **Foco de teclado visible** en todo lo interactivo (contorno de 2px del color del texto).
- **Armario**: cada prenda es un `<button>` (antes `<div>` con clic, sin teclado).
- **Animaciones** (`constants/animation.ts`, `pantalla-entrada.tsx`): transform en texto en lugar de `y`/`scale` de Framer Motion, que corren en el hilo principal y se traban justo mientras la app carga. Curva ease-out más firme.
- **Contraste**: `zinc-400` (2.6:1) → `zinc-500` (4.8:1, pasa WCAG AA) en las pantallas de esta tanda, salvo sobre fondo oscuro y estados deshabilitados. Textos de 9-10px → 11px; ayudas del login → 12px.
- Escaneo renderizado del login en 390×844: de 7 problemas a 0.

Pendiente de decisión de Mauri: tipografía serif real, etiquetas en mayúsculas sobre títulos, 6 secciones en la barra inferior, acentos y contraste en el resto de la app.

## 9. Decisiones de Mauri sobre el pase de diseño

| # | Decisión | Qué se hizo |
|---|---|---|
| 1A | Vender/donar van con las olvidadas | Olvidadas: Combinar, Vender, Donar. "Las que más usas" queda informativa (foto, nombre, usos). |
| 2A | Apagar `ignoreBuildErrors` | Quitado de `next.config.mjs`; el build ya corre TypeScript y falla con errores. |
| 3A | Arreglar ESLint | `eslint` y `eslint-config-next` ya estaban declarados, solo faltaba instalarlos (`npm install`, lockfile sin cambios). `npm run lint`: 0 errores, 120 avisos heredados. |
| 4B | `middleware.ts` → `proxy.ts` | Se espera. |
| 5C | Bucket privado | Otra tanda. |
| 6A | Instrument Serif | Cargada con `next/font` como `--font-serif`; se quitaron 32 pesos (semibold/bold) que salían con negrita falsa. |
| 7B | Etiquetas sobre títulos solo si informan | Quitadas 10 decorativas (Insights, Mi Colección, Descubre, IA Stylist, Suscripción, Mi Cuenta, Foto de perfil, Look 0N, Legal, Centros de acopio). Se quedan "1 de 3 listos" y la categoría sobre el nombre de una prenda. Inicio: "Hola, {nombre}" en un solo título. |
| 8A | 5 secciones, Outfit al centro | Inicio · Armario · **Outfit** (botón negro elevado) · Shop · Stats. Planes pasa al menú del avatar como "Planes y puntos" y desaparece con plan premium. `lib/navegar.ts` permite cambiar de sección desde el menú y la guía de la demo. |
| 9A | Un acento | Negro = acciones y selección; verde = éxito; ámbar = pendiente/aviso; rojo = error. Fuera morado, rosa e índigo de toda la app (renta/devolución se distingue por texto e ícono). Degradados de color en encabezados → zinc. Calendario de renta: disponible / elegido / no disponible. |
| 10A | Contraste en toda la app | 130 textos `zinc-300/400` → `zinc-500` sobre fondo claro (se respetaron 71 sobre fondo oscuro y 12 deshabilitados o íconos decorativos). Políticas: texto sobre gris a `zinc-600`. Párrafos con `text-wrap: pretty`, títulos con `balance`. |

Verificación: escaneo renderizado de login, /centros, /politicas y /offline a 390×844 sin fallas (queda solo la nota "una sola tipografía", intencional en UI de producto). El detector estático marca las esquinas del visor QR del portal como "borde lateral": falso positivo.

Pendiente de Mauri: si se mantiene Inicio (ver pros y contras en el reporte).
