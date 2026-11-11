# Seguridad antes de abrir la app

10 de noviembre de 2026. Rama `fix/seguridad-prelanzamiento`.

**Decisión de Mauri:** va a compartir Clossapp con amigos de sistemas y pidió una revisión de seguridad para que nadie rompa algo ni entre donde no debe. De la revisión salieron 5 arreglos; propuse hacer 3 ahora y dejar 2 para después, y Mauri decidió hacer los 5.

## Qué se revisó

Las 13 rutas de `app/api`, el middleware, `/admin`, las políticas RLS, los permisos por columna, las funciones y triggers de la base de producción, el bucket de fotos, el historial de git y las dependencias.

Lo que ya estaba bien y no se tocó: nadie puede subirse de plan ni hacerse admin o centro de acopio (solo se pueden editar 6 columnas de `perfiles`), cada cuenta ve solo sus datos, los precios salen de la base, el webhook de Stripe verifica firma y los pagos no se duplican.

## Los 5 arreglos

### 1. Next.js actualizado
- **Qué:** `next` pasa de 16.2.9 a 16.4.6 (solo cambia `package-lock.json`).
- **Cómo:** `npm audit fix`, sin salto de versión mayor.
- **Por qué:** la versión anterior tenía avisos críticos de ejecución remota de código.
- **Decisión mía:** queda un aviso alto en `zod`. Arreglarlo exige pasar de la versión 3 a la 4 y la app no importa `zod` en ningún archivo propio, así que no se tocó.

### 2. Límite a las fotos (migración 22)
- **Qué:** el bucket `closet-images` acepta archivos de hasta 2 MB y solo JPEG, PNG o WebP. Antes: 25 MB y cualquier `image/*`.
- **Por qué:** una sola cuenta podía llenar el almacenamiento con un script, y SVG permite subir HTML con scripts.
- **Decisión mía:** 2 MB. La app sube JPEG de ~100 KB y la foto más pesada que hay hoy pesa 975 KB.

### 3. Una prenda con pedido en curso no se revende ni se borra (migración 22)
- **Qué:** función `prendas_pedido_activo` y dos triggers en `prendas`. Si la prenda está en un pedido sin pagar, pagado o en renta, la base responde `PRENDA_EN_PEDIDO` al ponerla en venta otra vez o al borrarla.
- **Por qué:** el vendedor podía republicar o borrar una prenda ya pagada y otra persona pagaba por algo comprometido.
- **En la app:** `hooks/use-marketplace.ts` traduce el aviso a "Esta prenda ya está en un pedido en curso". Al borrar no hay mensaje nuevo: la prenda reaparece en el armario, igual que con cualquier otro borrado que falla.

### 4. Cancelar un pedido pagado solo desde el servidor (migración 22 + `app/api/escrow/cancelar/route.ts`)
- **Qué:** `cancelar_orden_escrow` recibe un segundo dato, `p_uid`. Un pedido pagado solo se cancela cuando llama el servidor; la ruta ahora identifica a la persona por su sesión y llama con la service role.
- **Por qué:** llamando a la función directo desde fuera de la app, el pedido se cancelaba pero el reembolso de Stripe nunca salía, porque el reembolso vive en la ruta.
- **Decisión mía:** un pedido sin pagar se sigue cancelando con la sesión normal. Lo usa `/api/marketplace/checkout` cuando Stripe no abre el pago, y ahí no hay nada que reembolsar.

### 5. Cabeceras de seguridad (`next.config.mjs`)
- **Qué:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin` en todas las rutas.
- **Por qué:** sin ellas otro sitio podía mostrar la app dentro de un iframe y engañar a alguien para que toque botones.

## Orden para ponerlo en producción

1. Aplicar `supabase/22-seguridad-prelanzamiento.sql`.
2. Hacer deploy de la rama enseguida.

Entre un paso y otro, cancelar un pedido ya pagado responde un error y no cancela nada. Al revés (deploy primero) fallarían todas las cancelaciones.

## Lo que no se arregló

- Un centro de acopio puede validar un ticket de donación propio y darse puntos. Solo aplica a centros que Mauri aprueba.
- Con plan Plus o Elite se pueden apartar hasta 60 prendas por 45 minutos sin pagar, llamando a `crear_orden_escrow` directo.
- `image_url` de una prenda acepta cualquier dirección, no solo fotos del bucket.
- La protección de contraseñas filtradas de Supabase Auth está apagada (requiere plan Pro).
- El bucket sigue siendo público para lectura (ver `docs/tanda-fixes-pwa/pendiente-storage-privado.md`).
