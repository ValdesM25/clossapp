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
