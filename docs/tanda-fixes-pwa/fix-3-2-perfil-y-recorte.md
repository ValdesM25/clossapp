# Fix 3 + 2: el perfil se guarda de verdad y la foto se puede ajustar

**Qué pasaba:** nombre, teléfono y foto solo cambiaban en el estado de React (`updateProfile` no guardaba nada). Al recargar volvían los valores de ejemplo. La tabla `perfiles` no tenía columnas para ellos y el `grant update` no las permitía. La foto no se podía recortar.

**Qué se hizo**
- `supabase/11-perfil-datos.sql`: columnas `nombre`, `telefono`, `avatar_url` en `perfiles` y grant de update.
- `hooks/use-auth.ts`: `updateProfile` sube la foto a `closet-images/<userId>/avatar-<timestamp>.jpg`, actualiza `perfiles` y lanza error si algo falla (el modal ya lo muestra). `aplicarSesion` lee las columnas nuevas. En demo el cambio se ve pero no se guarda.
- `components/shared/avatar-cropper.tsx` (nuevo, `react-easy-crop`): recorte circular con arrastre y zoom, salida cuadrada de 256 px. Se usa dentro del modal de perfil.
- El correo queda de solo lectura: nunca se guardó y cambiarlo exige confirmación por correo.

**Por qué ruta con timestamp:** el bucket no tiene policy de UPDATE, así que no se puede sobrescribir. Tras guardar la foto nueva se borra la anterior de Storage, así que solo queda la actual.

**Decisión tuya / pendiente:** correr `supabase/11-perfil-datos.sql` a mano. Si quieres cambiar el correo de verdad, hay que usar `auth.updateUser({email})` y manejar la confirmación.
