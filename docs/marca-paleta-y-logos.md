# Paleta y logos del branding

Fuente: PDF "BRANDING CLOSSAPP" (págs. 15 y 16). El PDF no se versiona: está
fuera del repo (`brag-output/`, ignorada en `.git/info/exclude`).

## Fase 1: paleta

**Decisión de Mauri:** solo tres colores de la marca (beige arena, negro
grafito y terracota), cambios globales y sin tocar componentes. El verde
`emerald` de éxito se queda. Modo oscuro después, en su propia tanda.

**Qué se cambió y cómo:**

- `app/globals.css`
  - Se redefine la escala `zinc` de Tailwind en un bloque `@theme`: va de
    beige arena (`zinc-50` = `#E8E3DC`) a negro grafito (`zinc-900` =
    `#1F1F1F`), con grises cálidos intermedios. La app usa `zinc-*` más de
    2,000 veces, así que esto aplica la marca sin editar componentes.
  - `zinc-500` (texto secundario, 399 usos) se ajustó a `#6B645C` para que dé
    4.5:1 de contraste sobre el beige.
  - Los tokens de shadcn (`--background`, `--primary`, `--border`, etc.) se
    alinearon a la misma paleta; tarjetas y modales quedan en blanco óptico.
  - Nuevo token `terracota` (`#C97863`): ya se puede usar como `bg-terracota`
    o `text-terracota`. Por ahora solo pinta la selección de texto y el
    `--ring` de shadcn.
- `components/clossapp-dashboard.tsx`: los dos contenedores raíz de la app
  pasan de `bg-white` a `bg-background` (beige). Era lo único que tapaba el
  fondo. El login tiene su propio fondo blanco y no cambia.
- `app/layout.tsx` y `app/manifest.ts`: color de la barra del sistema y del
  splash de la PWA en beige.

**Decisiones mías:**

- El foco del teclado sigue en grafito: el terracota sobre beige da 2.5:1 y
  no llega al 3:1 que pide WCAG para indicadores.
- La terracota casi no se ve todavía porque ningún componente la usa. Usarla
  en botones o en el indicador de la barra inferior requiere tocar
  componentes; queda a decisión de Mauri. Si va con texto, que sea texto
  grafito (5:1); el blanco solo da 3.2:1.

## Fase 2: logos

**Decisión de Mauri:** opción b, redibujar el logo del PDF en vectores (el PDF
solo trae imágenes de baja resolución).

**Qué se cambió y cómo:**

- `scripts/hanger.mjs`: nueva percha con gancho en círculo abierto, esquinas
  y puntas redondeadas. Se dibujó sobre la máscara de la imagen del PDF
  (944x612) y se ajustó superponiendo ambas.
- `scripts/wordmark.mjs`: "CLOSSAPP" en **Cinzel** (Google Fonts, licencia
  OFL), convertido a contornos con fontTools y HarfBuzz, tracking -29. Al
  superponerlo con el logo del PDF coincide letra por letra, así que es la
  misma tipografía o una prácticamente idéntica.
- `scripts/generate-icons.mjs`: el lockup ahora es el imagotipo apilado
  (percha sobre el nombre) en grafito. Además genera `logo.png` (500x500 sobre
  blanco), que usan los correos de Supabase.
- Regenerados con `node scripts/generate-icons.mjs`: `logo.svg`,
  `logo-mark.svg`, `icon.svg`, `icon-192/512.png`, `icon-maskable-192/512.png`,
  `apple-icon.png`, `logo.png` y `favicon.ico`. Los íconos de app pasan a fondo
  beige con percha grafito.

Para regenerar el wordmark con otra tipografía o tracking: convertir el texto
con fontTools + uharfbuzz y encajarlo en `WORDMARK_BOX` (base y=465, alto 134).

## Pendiente

- Modo oscuro: fondo grafito, superficies café chocolate, texto beige y
  acento terracota. Requiere interruptor y revisar los ~340 `bg-white` y
  `text-white` fijos.
- `public/logo_f.png` no se tocó: no lo usa ningún componente.
- Los íconos de la PWA ya instalada en un teléfono se actualizan solos cuando
  el sistema relee el manifest; puede tardar días o requerir reinstalar.

## Fase 3: colores fijos que se saltaban la paleta

**Decisión de Mauri:** corregir lo que quedó fuera (señaló la tarjeta del
viaje en Planificación, que seguía en negro puro).

- `plan-detalle.tsx`: tarjeta del plan de `#121212` a `bg-zinc-900` (grafito).
- Estadísticas (`rotation-bar`, `health-ring`, `color-palette`): los grises
  zinc escritos en hex pasan a `var(--color-zinc-*)`, así siguen la escala.
- Blancos sobre el beige dentro de la app pasan a `bg-background`: tira de
  días y barra de acción en Planificación, barra fija de Donar, degradado de
  la vista previa Elite y la pantalla de carga (para no saltar del splash
  beige a blanco).
- Se dejan blancas a propósito las tarjetas, modales, menús y la barra de
  navegación: son el "blanco óptico" de la paleta.

## Fase 4: dónde va la terracota

**Decisión de Mauri:** opción B. La terracota significa "IA / Elite" y se usa
como relleno con texto grafito (5.1:1), línea o ícono; nunca como texto chico,
porque sobre beige da 2.5:1 y sobre blanco 3.2:1.

- `bottom-nav.tsx`: raya del ícono activo y destellos del botón Outfit.
- `tour-guiado.tsx`: barra de progreso de la guía.
- `inicio-view.tsx`: insignia "Sugerencia IA de Hoy" y destellos de la
  tarjeta del outfit del día.
- `plan-detalle.tsx`: chip "Hoy · día X de Y" del plan en curso.
- `simulador-view.tsx` y `planificacion-inicio.tsx`: insignia "Elite".

Las pantallas completas en blanco (login, onboarding, vender, carrito y
páginas sueltas) siguen sin cambio: queda pendiente decidir si pasan a beige.
