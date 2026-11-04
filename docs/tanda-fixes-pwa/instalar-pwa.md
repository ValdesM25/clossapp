# Instalar la PWA en iOS y Android

**Qué pasaba:** la app no tiene aviso de instalación propio. En Android sale el mensaje nativo de Chrome; en iOS no hay ninguno y Apple no ofrece API para instalar, solo se puede enseñar el paso manual (Compartir, Añadir a pantalla de inicio).

**Qué se hizo**
- `hooks/use-instalar-app.ts`: detecta iOS (iPadOS incluido), si ya está instalada y captura `beforeinstallprompt` al cargar el módulo para no perderlo.
- `components/shared/instalar-banner.tsx` en Inicio (solo cuenta real, no demo): en iOS muestra los pasos; en Android/Chrome un botón "Instalar". Se cierra y no vuelve; desaparece al instalar.
- Tour de la demo: paso extra "Llévala en tu pantalla de inicio" solo en iOS sin instalar, antes del cierre.

**Por qué:** en iPhone las notificaciones push solo funcionan con la app instalada (ya lo dice `lib/push.ts`).

**Ojo:** los pasos de iOS dependen del menú de Safari (en navegadores dentro de otras apps, como Instagram, no se puede añadir). No se probó en un iPhone real. Al capturar `beforeinstallprompt` se oculta el mensaje nativo de Chrome y queda solo nuestro botón.
