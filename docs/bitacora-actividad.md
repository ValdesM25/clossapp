# Bitácora de actividad (panel de administración)

Estado: **hecho el 14 nov 2026 en la rama `claude/admiring-lovelace-h8z5gp`, sin aplicar en producción.**
Falta: probar la migración 26 con rollback, aplicarla con el OK de Mauri y revisar que
`SUPABASE_SERVICE_ROLE_KEY` esté en Vercel. La migración va **antes** del merge.

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
- **Retención de 90 días:** `limpiar_actividad()` y una tarea de pg_cron diaria (10:00 UTC) que se
  programa solo si pg_cron está instalado (08). La IP y la ubicación son datos personales: conviene
  mencionarlo en `/politicas`.
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
- Prueba visual a 390×844 con `next dev` y respuestas de Supabase simuladas en Playwright: sin
  scroll horizontal. Sin probar contra la base real.
