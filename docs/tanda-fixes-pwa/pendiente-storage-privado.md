# Storage: paso 1 hecho, falta hacer el bucket privado

**Hecho (aplicado en Supabase, `supabase/14-storage-escritura-propia.sql`):** el INSERT en `closet-images` solo se permite en `<userId>/...`. Antes cualquier usuario con sesión podía escribir en cualquier ruta de cualquier bucket. Se verificó que el único código que sube archivos (`hooks/use-image-upload.ts` y el avatar) ya usa esa ruta. Junto con la policy de DELETE propia (`supabase/12-perfil-datos.sql`).

**Pendiente (decisión: se deja para después):** hacer el bucket privado (bloque B de `supabase/01-migracion-pendiente.sql`). Hoy las fotos se leen por URL pública sin credencial; las URLs no son adivinables (llevan id de usuario y timestamp) pero tampoco secretas.

Qué hay que resolver antes de hacerlo:
- `prendas.image_url` guarda la URL pública completa: con bucket privado da 400. Guardar la ruta y firmar al leer, o migrar las filas existentes.
- Marketplace: un comprador debe ver las fotos del vendedor; una policy de lectura "solo carpeta propia" las rompe. Hace falta otra policy o servir esas fotos con una función.
- `app/sw.ts` hace CacheFirst del storage de Supabase; las URLs firmadas expiran y cambian, se pierde el caché.
- Cambiar `getPublicUrl` por `createSignedUrl` en `hooks/use-image-upload.ts` y en el avatar (`hooks/use-auth.ts`).
- Probar con marketplace, donaciones y avatar antes de desmarcar "Public bucket".
