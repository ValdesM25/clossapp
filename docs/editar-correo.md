# Editar el correo y confirmación de correo apagada (24 nov 2026)

Estado: **hecho en la rama `feat/editar-correo`, sin subir.** Sale de `main` (`09a3076`).

## Qué pasó

El 24 nov varias personas no pudieron crear cuenta. Los logs de Supabase Auth mostraron
`429 email rate limit exceeded` (`over_email_send_rate_limit`) en `/signup`. Entre las 18:40 y las
19:19 UTC hubo 2 registros bien y 7 rechazados, de 3 personas; 2 se quedaron sin cuenta.

**Causa:** Supabase sigue mandando los correos con su servidor de prueba, que permite muy pocos
correos por hora en todo el proyecto. El paso de configurar un SMTP propio (Resend) quedó
pendiente desde `docs/tanda-registro-pwa/fase-1-registro-planes.md` (pasos 5 y 6).

## Qué pidió Mauri

1. Que se pueda cambiar el correo desde **Perfil → Información personal**.
2. Apagar la confirmación de correo **solo por hoy**, para que la gente se pueda registrar.

## 1. Cambiar el correo (código)

| Archivo | Cambio |
|---|---|
| `services/auth.service.ts` | `cambiarCorreo(supabase, email)`: llama a `auth.updateUser({ email })` con el enlace de vuelta a `/auth/callback`. Devuelve `requiereConfirmacion` según si Supabase ya aplicó el correo o lo dejó pendiente. Traduce "ya lo usa otra cuenta" y "no es válido". |
| `hooks/use-auth.ts` | `updateProfile` acepta `email` y devuelve `{ correoPendiente }`. El correo va al final: si falla, lo demás ya quedó guardado. En la demo solo cambia en pantalla. Registra `correo` en la bitácora de actividad. |
| `context/auth-context.tsx` | El tipo de `updateProfile` con `email` y el valor de regreso. |
| `components/views/perfil/perfil-view.tsx` | El campo de correo se puede editar. Valida el formato, lo pasa a minúsculas y sin espacios, y solo lo manda si cambió. Si queda pendiente, el modal se queda abierto con "Te mandamos un enlace a … para confirmar el correo nuevo; mientras, sigues entrando con el anterior". Si falla: "Se guardaron tus datos, pero no el correo. …". La fila dice "Nombre, correo, teléfono, foto y contraseña." |

No hizo falta tocar `/auth/callback`: ya acepta `code` y `token_hash` con cualquier `type`,
incluido `email_change`. Tampoco la base: `perfiles` no guarda el correo, se lee de Auth, y la
sesión ya escucha `USER_UPDATED`.

**Cuándo se aplica el cambio:** con la confirmación de correo encendida, Supabase manda un enlace
y el cambio espera a que se abra. Ese correo también cuenta para el límite por hora del servidor
de prueba. Con la confirmación apagada, no confirmé en la documentación si el cambio es
inmediato. El código cubre los dos casos porque revisa el correo que devuelve Supabase.

## 2. Apagar la confirmación de correo (configuración, la hace Mauri)

No hay herramienta para cambiar la configuración de Auth desde aquí; es en el panel de Supabase:

1. **Authentication → Sign In / Providers → Email**.
2. Apagar **Confirm email** y guardar.

Con eso, el registro entra directo: `signUp` ya devuelve `requiereConfirmacion: false` cuando
Supabase regresa la sesión, y la app no pide revisar el correo.

**Mientras esté apagada:** entran correos sin verificar (Turnstile sigue frenando bots, pero no los
errores de dedo). Recuperar contraseña también manda correo, así que sigue con el mismo límite.

**Mañana (25 nov):** volver a encender **Confirm email**. Las cuentas que se crearon con la
confirmación apagada quedan confirmadas; no hay que hacer nada con ellas.

**Arreglo de fondo pendiente:** configurar Resend como SMTP y subir el límite en
*Authentication → Rate Limits* (pasos 5 y 6 de la fase 1).

## Decisiones

- **De Mauri:** permitir cambiar el correo desde Información personal; apagar la confirmación
  solo por hoy.
- **Mías:** guardar el correo al final para no perder lo demás si falla; dejar el modal abierto
  cuando el cambio queda pendiente; normalizar a minúsculas; no tocar el callback ni la base.

## Cómo se probó

- `npx tsc --noEmit` sin errores en los archivos tocados; `npx eslint`: 0 errores (3 avisos que ya
  existían).
- Chromium con `next dev --webpack` en modo demo: el campo se puede editar; `alex@nada` muestra
  "Escribe un correo válido."; ` Alex.Nuevo@Ejemplo.com ` guarda y el encabezado muestra
  `alex.nuevo@ejemplo.com`.
- **No probado:** el cambio con una cuenta real (Supabase), ni con la confirmación encendida o
  apagada.
