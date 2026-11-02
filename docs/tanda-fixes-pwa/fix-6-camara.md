# Fix 6: cámara denegada ya no es un callejón sin salida

**Qué pasaba:** los escáneres QR (`centro-scanner-modal`, `punto-recoleccion-view`) piden la cámara con `getUserMedia`. Si se negaba, solo decían "Sin acceso a cámara", sin forma de reintentar ni pista de qué hacer. La subida de prendas usa `<input capture>` y el permiso lo gestiona el sistema.

**Qué se hizo:** cuando hay error de cámara aparece un texto para activarla en ajustes y un botón "Reintentar" (contador en las dependencias del efecto que abre la cámara).

**Por qué no una pantalla previa de permisos:** el navegador ya pide el permiso en el momento de uso; una pantalla extra no cambia nada si se deniega.

**Decisión tuya:** ninguna pendiente. Verifica en el móvil: denegar, ir a ajustes, permitir, pulsar Reintentar.
