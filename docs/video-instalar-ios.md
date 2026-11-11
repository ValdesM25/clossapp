# Video de instalación en iPhone

**Qué:** al abrir la app en iPhone o iPad sin tenerla instalada, aparece un video de 18 s que enseña a instalarla desde Safari (Compartir → Añadir a pantalla de inicio → Añadir).

**Cuándo sale (decisión de Mauri):** solo en iOS y solo si la app no está instalada. Si ya se instaló deja de salir; en Android no sale nunca. Sale una vez al día (la primera apertura del día); se guarda la fecha en `localStorage` (`video-instalar-ios-dia`).

**Decisiones mías:**
- Tampoco sale dentro de Instagram, Facebook o TikTok: ahí no se puede instalar, y el aviso de Inicio ya pide abrir Safari.
- Se abre 4.2 s después de cargar, cuando ya se fue la pantalla de entrada (dura máximo 4 s); si se abriera antes, el video correría debajo sin que nadie lo vea.
- Empieza sin sonido porque iOS no reproduce solo un video con audio; tiene controles para activarlo.
- El video (`public/instalar-ios.mp4`, 700 KB, 720×1280) no entra al precache del service worker: quien ya instaló no lo necesita.

**Archivos:** `components/shared/video-instalar-ios.tsx` (nuevo), `components/clossapp-dashboard.tsx` (lo monta en toda la app, con o sin sesión), `app/serwist/[path]/route.ts`, `public/instalar-ios.mp4`, `public/instalar-ios.jpg`. El video fuente está en `brag-output/instalar-ios/`.

**Cómo se probó:** iPhone simulado sin instalar → sale y carga; segunda apertura el mismo día → no sale; iPhone con `navigator.standalone` → no sale; Android → no sale.
