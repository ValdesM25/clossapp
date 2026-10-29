# Fase 3: armario al día, puntos seguros y recordatorios (rama `feat/armario-al-dia`)

## Qué hace, en una línea

Al subir una prenda se puede marcar "la compré recientemente" (dónde, cuánto, cuándo) y eso da puntos. Los puntos, las donaciones y el escrow ya no se pueden alterar desde el navegador, y la app recuerda subir ropa nueva con un banner y, si se activa, con una notificación push.

Esta rama sale de `feat/onboarding-estilo`.

## Decisiones de Mauri que guían esta fase

- Preguntar en cada prenda nueva si fue **comprada recientemente**, y a cambio dar **puntos para los descuentos** que ya existen en donaciones.
- **10 puntos por prenda, tope de 100 al mes.**
- **"Arreglar todo ya"** en la seguridad de los puntos, aunque toque el flujo de donaciones por QR.
- Recordatorio con **banner y push**.
- Disparador diario: **Supabase pg_cron**, "para mantenerlo listo para escalar".
- **Anti-farmeo opción A + D:** Mauri notó que 10 pts solo por marcar una casilla se podía abusar (subir cualquier foto, borrar y volver a subir). Los puntos quedan **pendientes** y se acreditan a los 14 días **solo si la prenda sigue en el armario y se usó en un outfit** al menos un día después de registrarla.

## Lo que encontré antes de cambiar nada

Revisé la base real (solo lectura). Era peor de lo que decían los `.sql` del repo:

1. `puntos_historial`, `donacion_tickets` y `acopio_registros` **no tenían RLS** en producción. Con la anon key, que es pública, cualquiera podía leer los tickets y correos de todos y escribir puntos a cualquier cuenta.
2. Si `validarTicketQR` recibía un QR que no existía, **creaba un ticket completado y daba los puntos que dijera el QR**. Un QR con `{"puntos": 99999}` daba 99999.
3. El saldo sumaba registros de acopio que coincidieran **por nombre o correo**, así que alguien con el mismo nombre se quedaba con tus puntos.
4. El portal "Punto de Recolección" se abría con un **botón público**, o escribiendo un correo con "acopio" o la contraseña "recoleccion". Todo se decidía en el navegador.
5. Los canjes **solo restaban en `localStorage`**: se podía canjear sin tener puntos.
6. `puntos_acopio` y `escrow_ordenes` no existen en producción; las migraciones 03 y 04 nunca se aplicaron completas. El código cae a `donacion_tickets` y a `localStorage`.

Datos actuales revisados: 25 tickets, 22 registros de acopio y 8 movimientos de puntos (880 pts, todos de una sola cuenta y coherentes con sus registros). No hubo que rellenar nada.

## Cambios en la base

### `supabase/06-puntos-seguros.sql` (nuevo, **no aplicado**)
- **RLS** en las tres tablas:
  - `puntos_historial`: cada quien ve lo suyo y **nadie escribe directo**.
  - `donacion_tickets`: cada quien crea y ve los suyos, solo como `pendiente` o `pago_en_custodia`; el punto de acopio ve y actualiza todos (lo necesita el escrow).
  - `acopio_registros`: solo el punto de acopio inserta y ve todo; quien dona ve los suyos.
- **Cuentas de punto de recolección:** nuevas columnas `rol`, `punto_acopio_id` y `punto_acopio_nombre` en `perfiles`. El usuario no puede dárselas a sí mismo.
- **Funciones** (todo lo que mueve puntos pasa por aquí):
  - `mis_puntos()`: 150 de base + movimientos. Es el mismo número que mostraba la app.
  - `validar_donacion_qr(token, cantidad)`: solo cuentas de acopio. Calcula los puntos en la base con la fórmula que ya usaba la app (3 o más prendas: 100 + 20 por cada extra; menos de 3: 50), con tope de 30 prendas por ticket. El punto de acopio puede corregir la cantidad con lo que recibió. Rechaza QR inexistentes, repetidos y de escrow. Marca como donadas solo prendas de quien dona.
  - `canjear_puntos(opcion)`: valida costo y saldo, bloquea canjes simultáneos y genera el código. Los costos están copiados de `OPCIONES_CANJE_SUSCRIPCION`.
  - `registrar_compra_reciente(...)`: la prenda tiene que ser propia y la fecha de los últimos 60 días. **No da puntos al instante:** crea un registro en `puntos_pendientes` (10 pts, una vez por prenda, tope de 100 al mes en hora de México).
  - `puntos_pendientes` (tabla nueva): solo se puede leer; nadie la escribe desde la app. Si se borra la prenda, el pendiente queda huérfano. Nunca se acredita, pero **sigue contando para el tope**, así que borrar y volver a subir no libera cupo.
  - `incrementar_uso(...)` (reemplaza la anterior, que no revisaba de quién era la prenda): suma un uso solo en prendas propias y marca el pendiente como "usado" si el uso es al menos un día después de registrarla.
  - `acreditar_compras_pendientes()`: la corre pg_cron cada día. Pasa a `puntos_historial` lo que tiene más de 14 días, se usó y la prenda sigue existiendo. Borra lo que pasó 60 días sin usarse.
  - `impacto_donaciones()` y `fechas_rentadas()`: lecturas públicas que no exponen datos personales. La segunda es la que necesita el calendario de rentas.
- **Columnas nuevas en `prendas`:** `comprada_reciente`, `compra_lugar`, `compra_tienda`, `compra_precio` y `compra_fecha` (para estadísticas).

**Prueba del anti-farmeo (con reversión):**
- Registrar dos compras → 10 + 10 pendientes y 0 en el historial.
- Usar la prenda el mismo día → no cuenta.
- Insertar un pendiente desde el cliente → bloqueado.
- Usar una prenda ajena → no marca nada.
- A los 15 días con uso → se acredita 1.
- La prenda borrada → no se acredita y sigue contando 20 en el tope.

**Cómo se probó el resto:** ejecuté la migración completa dentro de un bloque que siempre termina en error, para que Postgres revirtiera todo. Resultados:
- QR con 99999 puntos → se acreditaron **140**.
- Una usuaria normal valida un QR → `SOLO_ACOPIO`.
- Validar dos veces → `TICKET_YA_VALIDADO`; QR inventado → `TICKET_NO_ENCONTRADO`.
- Insertar puntos o un ticket completado desde el cliente → bloqueado.
- Canje con saldo → código y saldo correcto; canje sin saldo → `PUNTOS_INSUFICIENTES`.
- Compra reciente → 10; la misma prenda otra vez → 0; compra de 2020 → `FECHA_INVALIDA`.
- Un anónimo lee 0 puntos y 0 tickets.

Después confirmé que la base quedó igual que antes.

### `supabase/07-push.sql` (nuevo, **no aplicado**)
- Tabla `push_suscripciones` (una fila por dispositivo), con RLS: cada quien maneja solo las suyas.
- `pendientes_recordatorio()`: devuelve las cuentas cuya prenda más nueva tiene más de 14 días y a las que no se avisó en los últimos 7. Solo la puede llamar el servidor.
- Probada igual que la 06.

### `supabase/08-cron.sql` (nuevo)
- Activa `pg_cron` y `pg_net` y programa dos tareas:
  - **03:00 CDMX:** `acreditar_compras_pendientes()`, dentro de la base, sin secretos.
  - **12:00 CDMX:** llamada a `https://clossapp.vercel.app/api/push/enviar` con el secreto de Vault. Mientras no exista `cron_secret` en Vault y `CRON_SECRET` en Vercel, la ruta responde 401 y no envía nada.

## Cambios en la app

### Puntos y donaciones: `services/donaciones.service.ts`, `hooks/use-donaciones.ts`
- `fetchUserPuntos` → `mis_puntos()`. Ya no suma por nombre o correo ni guarda el saldo en `localStorage`.
- `fetchAcopioImpacto` → `impacto_donaciones()`.
- `validarTicketQR` → `validar_donacion_qr()`. Se eliminó el camino que fabricaba tickets. Mantiene la misma forma de respuesta para no tocar el portal (2,373 líneas).

### Canje: `components/views/planes/planes-view.tsx`
- El saldo sale de la base, y el historial de canjes de `puntos_historial`.
- "Canjear" llama a `canjear_puntos()`. Si no alcanza, se muestra un mensaje claro.
- Los invitados no pueden canjear.

### Calendario de rentas: `components/views/marketplace/rent-date-picker.tsx`
- Usa `fechas_rentadas()`. Con RLS, cada quien solo ve sus órdenes; sin esta función el calendario dejaría rentar dos veces la misma fecha.

### Portal de recolección: `hooks/use-auth.ts`, `context/auth-context.tsx`, `components/views/login-view.tsx`
- **Se eliminaron** el botón público "Punto de Recolección", el truco del correo con "acopio" o "recoleccion" y `loginAsRecoleccion`.
- Ahora se entra con una **cuenta real** cuyo perfil tenga `rol = 'acopio'`. Al entrar se lee el perfil **antes** de elegir pantalla, así el portal abre directo y el login normal también respeta el rol.
- El login muestra: "¿Eres un punto de recolección? Entra con el correo de tu centro."
- El escáner de demo del marketplace (un usuario normal haciendo de centro) ahora responde "solo un punto de recolección puede validar donaciones".

### Compra reciente: `upload-modal.tsx`, `use-image-upload.ts`, `armario-view.tsx`, `services/prendas.service.ts`
- Casilla "La compré recientemente (+10 puntos al usarla)". Al marcarla aparecen: dónde (tienda física, en línea, segunda mano), tienda (opcional), precio en MXN y fecha (hoy por defecto, solo últimos 60 días).
- `insertPrenda` ahora devuelve el id de la prenda nueva, y con él se llama a `registrar_compra_reciente`.
- La prenda se guarda aunque falle la parte de compra; en ese caso solo se avisa.
- Mensaje: "Tus 10 puntos quedan pendientes: se acreditan en 14 días si la prenda sigue en tu armario y la usas en un outfit". En Planes se muestran los puntos pendientes junto al saldo.

### Banner: `components/views/inicio/recordatorio-armario.tsx`, `constants/recordatorio.ts`
- Banner "¿Compraste algo nuevo?" en Inicio si la prenda más nueva tiene más de **14 días**. Se puede ocultar por **7 días**. "Agregar prenda" lleva al Armario.
- No aparece para invitados ni con el armario vacío.
- **Decisión mía:** lleva al Armario en vez de abrir la cámara, porque el navegador no deja abrir la cámara sin que la usuaria toque algo en esa misma pantalla.

### Push: `lib/push.ts`, `app/sw.ts`, `app/api/push/enviar/route.ts`, menú de avatar
- **Nueva dependencia:** `web-push` (+ `@types/web-push`). Es el estándar para cifrar y firmar las notificaciones (VAPID); hacerlo a mano sería mucho código criptográfico propio.
- En el menú de avatar aparece **"Activar recordatorios"**. Pide permiso y guarda la suscripción del dispositivo.
- **Decisión mía:** el plan decía "pedir permiso tras la primera prenda", pero el navegador solo deja pedirlo desde un clic. Un botón en el menú respeta eso y no interrumpe.
- En iPhone, push solo funciona con la app **instalada** en la pantalla de inicio (regla de Apple). Se le avisa a la usuaria.
- El service worker muestra la notificación y, al tocarla, abre Clossapp.
- `/api/push/enviar` acepta `GET` (Vercel Cron) y `POST` (pg_cron). Exige `Authorization: Bearer <CRON_SECRET>`, comparado en tiempo constante. Borra las suscripciones que el navegador ya dio de baja.

## Disparador diario: por qué pg_cron

Mauri eligió **Supabase pg_cron** después de comparar:

| Opción | Pros | Contras |
|---|---|---|
| Vercel Cron | 3 líneas en `vercel.json`; vive con el código. | En Hobby, 1 vez al día y con hora aproximada; ata al hosting. |
| **Supabase pg_cron** (elegida) | Hora exacta, cualquier frecuencia; no depende del hosting; tareas internas (como acreditar puntos) sin pasar por HTTP. | Hay que activar extensiones y guardar el secreto en Vault. |

Lo que decidió: el escrow y las rentas van a necesitar tareas más frecuentes, y pg_cron escala mejor para eso.

## Checklist de despliegue (Mauri)

**El orden importa.** La migración 06 rompe la versión vieja de la app, y la app nueva necesita la 06.

1. Mergear las 4 ramas en orden y desplegar.
2. **Inmediatamente después**, aplicar `06-puntos-seguros.sql` y `07-push.sql`. En los minutos entre los dos pasos, el saldo se ve en 150 y validar un QR da error, pero no se pierde nada.
3. **Crear las cuentas de los puntos de recolección:** Supabase → Authentication → "Invite user" con el correo del centro. Luego en el SQL editor:
   ```sql
   update perfiles set rol = 'acopio', punto_acopio_id = 'norte', punto_acopio_nombre = 'Centro de Acopio Norte - San Patricio'
   where user_id = (select id from auth.users where email = 'correo@del-centro.com');
   ```
4. **Push:**
   - `npx web-push generate-vapid-keys` → poner las llaves en Vercel (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).
   - `VAPID_SUBJECT=mailto:...`
   - `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API; **solo** en el servidor).
   - `CRON_SECRET`: cualquier texto largo y aleatorio.
5. Crear el secreto del cron en Vault con el mismo valor que `CRON_SECRET`: `select vault.create_secret('<valor>', 'cron_secret');`

## Cosas que no cambié (fuera de alcance, para otra fase)

- En `prendas`, cada usuaria solo puede leer las suyas. Por eso el marketplace nunca ve desde la base las prendas en venta de otras personas y cae a datos de demo. Arreglarlo es parte de rehacer el marketplace.
- El escrow sigue guardando órdenes en `donacion_tickets` y en `localStorage`. Ahora está protegido con RLS, pero su diseño (por ejemplo, `puntos_otorgados` guarda el dinero) merece su propia tabla.
- Los canjes hechos antes de este cambio vivían solo en el navegador de cada persona y no se pasan a la base.
- El portal de recolección todavía suma puntos a su propio `localStorage` al validar. Es solo visual en el equipo del centro; el saldo real ya no lo usa.

## Cómo se verificó

- `npx tsc --noEmit` y `npm run build`: sin errores (el aviso de "workspace root" viene de que el worktree está dentro del repo principal).
- Migraciones 06 y 07 probadas con reversión (resultados arriba).
- Pruebas con `node:assert` de `necesitaRecordatorio`: sin prendas, fechas vacías, una hora después de los 14 días, varias prendas (cuenta la más nueva) y el cálculo del descarte.
- Falta probar en la app con cuentas reales después del despliegue: portal con cuenta de acopio, donación de punta a punta, canje, compra reciente y push en Android y en iPhone instalado.
