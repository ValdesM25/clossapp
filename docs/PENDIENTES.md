# Pendientes

Actualizado el 11 de noviembre de 2026. Lo que ya se hizo de la revisión está en `docs/revision-app-2026-11-10.md` (en `main`).

## ⏳ En curso
- **Marketplace con pago real en Stripe:** en producción desde el 11 de noviembre de 2026 (#52, con la UX de vendedor). Connect, el webhook de cuentas conectadas y la migración 21 ya están. Falta la compra real de prueba de $10 y la revisión legal de `/politicas`. Detalle en `docs/marketplace-stripe.md` (sección PENDIENTE) y `docs/marketplace-vender.md`.

## Por decidir o hacer (del reporte de bugs)
- [ ] Plus promete "Estadísticas avanzadas", que no existen (no hay estadísticas distintas por plan).
- [ ] Elite: "Modelos de IA frontier" y "Planificación de outfits" (Mauri: en desarrollo).
- [ ] Al terminar la guía de la demo, "Crear mi cuenta" deja en la pestaña "Iniciar sesión" en lugar de "Crear cuenta".
- [ ] En la demo, "Agregar prenda" no hace nada al tocarlo (solo muestra un candado); explicar que hay que crear cuenta.
- [ ] Al entrar se lee el perfil dos veces (`login` y el evento `SIGNED_IN`).
- [ ] "Copiar código" usa el portapapeles sin manejar el error (ya casi no se usa tras el canje automático).
- [ ] Next avisa que `middleware.ts` ahora se llama `proxy.ts`.
- [ ] Si alguien sin cuenta elige un plan, se registra y confirma por correo en otra pestaña, no regresa a `/planes` (el destino vive en `sessionStorage`).
- [ ] El aviso "Instala Clossapp" solo sale en Inicio con cuenta; el video de instalación sí sale en el login.

## Diseño
- [ ] Color de acento (recomendación sin aplicar): terracota `#B4532A`, oliva `#4F6146` o burdeos `#7A1F2B`. Detalle en `docs/revision-app-2026-11-10.md`.
