# Fix 7: guardar prenda sin fallos silenciosos e idempotente

**Qué pasaba:** al confirmar una prenda, si fallaba el procesado de imagen, la subida o el insert, el modal quedaba abierto sin ningún mensaje (`upload()` tragaba el error). Se podía pulsar 10 veces sin saber qué fallaba, y un doble clic podía duplicar.

**Qué se hizo**
- `resizeImage` rechaza con mensaje si la imagen no se puede leer (p. ej. HEIC), si `toBlob` da null o si tarda más de 20 s.
- `upload()` lanza el error; `armario-view` lo muestra en rojo dentro del modal.
- Guard `guardandoRef` contra doble clic.
- Idempotencia: `crypto.randomUUID()` al elegir la foto, usado como nombre en Storage (`upsert`) y como `client_id` de la prenda. Índice único `(user_id, client_id)`; si el insert devuelve 23505 se reutiliza la fila existente.

**Por qué:** cualquier reintento (doble clic, red caída tras insertar) produce una sola imagen y una sola fila.

**Aplicado en Supabase** (migración `prendas_client_id`); el SQL queda en `supabase/13-prendas-client-id.sql`. No se borran imágenes huérfanas si el insert falla (el reintento reutiliza la misma ruta, así que no se acumulan).
