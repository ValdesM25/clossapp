# Bitácora de actividad (panel de administración)

Estado: **hecho el 14 nov 2026 en la rama `claude/admiring-lovelace-h8z5gp`; migración 26 aplicada
en producción el 14 nov con el OK de Mauri (migración `actividad`).** Migración 27 (anonimizar en vez
de borrar) probada con rollback, **sin aplicar en producción**. Falta: aplicar la 27 con el OK de
Mauri, revisar que `SUPABASE_SERVICE_ROLE_KEY` esté en Vercel y mergear el PR.

## Qué pidió Mauri

Un registro de lo que pasa en la app para verlo como sysadmin: quién entra, cuándo, desde dónde,
con qué dispositivo y si sube fotos, con estadísticas para mostrar.

## Qué se hizo

- **Tabla `actividad`** (`supabase/26-actividad.sql`): usuario, evento, detalle (JSON chico), IP,
  país/estado/ciudad, dispositivo, sistema, navegador, si se abrió como app instalada y user agent.
  Solo escribe el servidor (service_role); solo lee `es_admin()`. Los usuarios no pueden insertar
  ni leer nada.
- **Funciones para el panel:** `actividad_reciente` (lista con el correo de `auth.users`, filtro por
  evento y por cuenta, máx. 1000) y `actividad_resumen` (KPIs y conteos por dispositivo, sistema,
  ciudad, evento y día, en hora de CDMX). Las dos rechazan a quien no es admin.
- **Retención (decisión de Mauri, 14 nov, migración 27):** la bitácora se guarda siempre, pero a
  los 90 días `limpiar_actividad()` borra la IP y el user agent; quedan evento, fecha, cuenta,
  ciudad y dispositivo. Corre en la tarea de pg_cron diaria (10:00 UTC) que programa la 26. Antes
  (26) borraba la fila completa a los 90 días; se cambió para tener estadísticas de más de 90 días
  sin acumular datos personales. Conviene mencionarlo en `/politicas`.
- El panel tiene rangos de Hoy, 7, 30 y 90 días y 1 año (`actividad_resumen` acepta hasta 365).
- **Escritura** (`lib/actividad.server.ts`): IP de `x-forwarded-for`, ubicación de los headers
  `x-vercel-ip-*` (solo existen en Vercel; en local quedan vacías) y dispositivo leído del
  User-Agent (`leerUserAgent` en `lib/actividad.ts`, sin dependencias). Nunca lanza: si falla,
  la acción del usuario sigue. Sin `SUPABASE_SERVICE_ROLE_KEY` no registra nada.
- **Eventos del servidor** (con `after()` de Next, no retrasan la respuesta):
  `prenda_analizada` (`/api/analyze-prenda`), `outfits_generados` (`/api/generate-outfits`),
  `sesion_social`, `cuenta_confirmada` y recuperación de contraseña (`/auth/callback`).
- **Eventos del navegador** (`POST /api/actividad`, lista cerrada `EVENTOS_CLIENTE`; el `user_id`
  sale de la sesión, nunca del body; el detalle se recorta a 10 campos planos):
  `sesion_iniciada`, `registro`, `sesion_cerrada`, `app_abierta` (una vez por pestaña),
  `demo_iniciada`, `prenda_subida` (con la URL de la foto), `outfit_elegido`, `perfil_actualizado`,
  `foto_perfil_subida`.
- **Panel `/admin/actividad`** (enlace desde `/admin`): KPIs, usuarios activos por día, barras por
  dispositivo, sistema, ciudad y evento, y el registro (tabla en pantallas anchas, tarjetas en
  celular). Clic en un correo filtra esa cuenta.

## Decisiones del agente

- `sesion_cerrada` se manda **antes** de `signOut` (espera hasta 1.5 s): después ya no hay sesión
  para saber quién salió.
- Con confirmación de correo, el registro aparece como `cuenta_confirmada` al abrir el enlace (antes
  no hay sesión). Por eso "Cuentas nuevas" solo cuenta registros sin confirmación.
- `prenda_analizada` se registra aunque luego falle la IA (`after` corre igual), igual que la cuota.
- Sin tope de frecuencia en `/api/actividad`: una cuenta con sesión podría inflar sus propios
  eventos, pero no hacerse pasar por otra. Si pasa, agregar un tope por usuario.

## Cómo se probó

- `npx tsc --noEmit`, `node --test lib/*.test.mjs` (33/33) y `npx eslint` en los archivos tocados.
- `leerUserAgent` con iPhone, Android, Windows/Edge y Mac/Safari.
- **Migración 26 en la base real, dentro de un bloque que se deshace solo** (14 nov): se aplica
  completa; service_role inserta; un evento fuera de la lista se rechaza; una cuenta normal ve 0
  filas, no puede insertar, leer el resumen ni la lista, ni limpiar; anon no tiene acceso; admin ve
  todo, el resumen y la lista traen datos correctos (con correos) y los filtros por evento y cuenta
  funcionan; la tarea de pg_cron se programa. Después se confirmó que no quedó nada en la base.
  Arreglo tras la prueba: las barras por dispositivo, sistema y ciudad ya no muestran
  "desconocida: 0" por las visitas de la demo (solo cuentan cuentas).
- Prueba visual a 390×844 con `next dev` y respuestas de Supabase simuladas en Playwright: sin
  scroll horizontal. Sin probar el panel contra la base real.
- **Producción (14 nov):** tabla con RLS y 0 filas; anon no lee, `authenticated` no inserta,
  anon no ejecuta el resumen y nadie fuera del servidor ejecuta la limpieza; pg_cron programado
  (`0 10 * * *`). Los avisos de seguridad de Supabase que salen para `actividad` son los mismos que
  ya tienen las demás tablas y funciones admin (visible en GraphQL para cuentas con sesión, pero RLS
  no devuelve filas; funciones `security definer` que revisan `es_admin()` adentro).
- **Migración 27 con rollback (14 nov):** una fila de hace 120 días sigue existiendo, pierde IP y
  user agent y conserva ciudad, dispositivo y evento; una fila de hoy queda intacta; una cuenta
  normal no puede ejecutar la limpieza; la tarea de pg_cron sigue. Después se confirmó que la base
  quedó como estaba.
