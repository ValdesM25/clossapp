# Fase 1: registro abierto, seguridad y planes (rama `feat/registro-planes`)

## Qué hace, en una línea

Cualquier persona puede crear su cuenta (correo, Google o Facebook). Cada cuenta tiene plan gratis o premium, y el gratis tiene límites que se aplican en el servidor y en la base, no solo en la pantalla.

Esta rama sale de `feat/pwa`, porque los dos tocan el login.

## Decisiones de Mauri que guían esta fase

- Registro abierto a cualquiera, con Google, Facebook o correo y contraseña. Instagram queda fuera: Supabase no lo soporta y Meta cerró ese login.
- Plan gratis: hasta **50 prendas a la vez**, **50 análisis IA de por vida**, **1 outfit IA al día**.
- Las cuentas que ya existen quedan **premium**. El **modo invitado se mantiene**.
- Sin pagos todavía: premium se activa a mano.
- Pidió **seguridad** extra en el registro, además de confirmar el correo.

## Cambios, archivo por archivo

### Base de datos: `supabase/05-perfiles.sql` (nuevo)
- **Qué:** tabla `perfiles` (una fila por cuenta) con `plan`, `estilo` (para la fase 2), `onboarding_completado` y contadores de uso de IA.
- **Cómo:**
  - Un trigger crea el perfil gratis al registrarse (`on_auth_user_perfil`). El trigger que ya existía (`on_auth_user_created`, que llena `usuarios_permitidos`) **no se tocó**.
  - Las 6 cuentas existentes se marcan premium.
  - Trigger `prendas_limite_plan`: si la cuenta es gratis y ya tiene 50 prendas, la base rechaza la 51. Copia el patrón del límite de 10 fotos por prenda.
  - Función `consumir_cuota('outfit' | 'analisis')`: revisa el plan y descuenta una unidad. Premium siempre pasa. El "día" se cuenta en hora de México, no en UTC.
- **Por qué:** si los límites solo estuvieran en la pantalla, se podrían saltar llamando a la API directamente.
- **Seguridad:** el usuario puede leer su perfil y editar solo `estilo` y `onboarding_completado`. No puede cambiarse el plan ni los contadores, porque los permisos se dan columna por columna.
- **Estado:** escrita, **no aplicada**. Se aplica cuando Mauri dé el OK.

### `constants/planes.ts` (nuevo)
- Los números del plan gratis y los mensajes de límite en un solo lugar. Deben coincidir con los del SQL, y así se indica en ambos archivos.

### `lib/cuota.server.ts` (nuevo) + rutas de IA
- **Archivos:** `app/api/generate-outfits`, `app/api/recommend`, `app/api/analyze-prenda`.
- **Antes:** solo revisaban que el `user_id` del body no fuera "guest". Cualquiera podía mandar un id inventado y usar la IA.
- **Ahora:** `exigirCuota()` obtiene el usuario **de la sesión** (cookies) y llama a `consumir_cuota`. Responde 401 sin sesión y 429 con un mensaje claro si se acabó la cuota.
- En `analyze-prenda` se cobra **después** de validar las fotos, para que un pedido mal formado no gaste análisis.
- **Decisión mía:** la tasación para vender (modo `venta`) también cuenta como análisis, porque también usa IA.
- **Límite conocido:** la cuota se descuenta antes de llamar a la IA. Si la IA falla, esa unidad se pierde. Está marcado en el código.

### Login: `components/views/login-view.tsx`, `services/auth.service.ts`, `hooks/use-auth.ts`, `context/auth-context.tsx`
- **Qué:** tres modos en la misma pantalla: **Entrar**, **Crear cuenta** y **Olvidé mi contraseña**. Arriba van los botones de Google y Facebook. Se mantienen "Explorar como invitada" y "Punto de Recolección".
- **Cómo:**
  - `auth.service.ts`: nuevas funciones `signUp`, `signInWithProvider` y `requestPasswordReset`, más mensajes de error en español claro. "Código no reconocido" pasa a ser "Correo o contraseña incorrectos".
  - Si alguien intenta registrarse con un correo que ya existe, se le avisa. Supabase no lo dice por defecto.
  - `use-auth.ts`: expone `register`, `loginWithProvider`, `resetPassword` y `plan`. El plan se lee de `perfiles` al entrar. Si la tabla aún no existe, `plan` queda vacío y la app no bloquea nada.
- **Decisión mía:** el correo debe confirmarse antes de entrar (se activa en Supabase; ver checklist).

### CAPTCHA: `components/shared/turnstile.tsx` (nuevo)
- **Qué:** widget de Cloudflare Turnstile en entrar, crear cuenta y recuperar contraseña.
- **Por qué:** a pedido de Mauri ("algo de seguridad"). Frena bots y registros masivos. Supabase valida el token en su servidor.
- **Cómo:** carga el script de Cloudflare sin instalar librerías. Cada token se usa una vez y se reinicia después de cada intento. Si no hay `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, no aparece (útil en desarrollo).

### `app/auth/callback/route.ts` (nuevo)
- **Qué:** la ruta a la que vuelven Google, Facebook y los enlaces de los correos.
- **Cómo:** convierte el código o el token del enlace en una sesión y redirige a la app. Si el enlace expiró, vuelve al login con un aviso.
- **Seguridad:** solo redirige a rutas internas, para que no se pueda usar el enlace para mandar a alguien a otro sitio.

### `app/restablecer/page.tsx` (nuevo)
- Pantalla para elegir la contraseña nueva después de abrir el enlace de recuperación. Aplica la misma regla: 8 caracteres, con letras y números.

### Armario: `components/views/armario/armario-view.tsx`, `hooks/use-image-upload.ts`, `services/analyze.service.ts`
- Contador "12/50 · Plan gratis" junto a "Mis Prendas" (solo en cuentas gratis).
- Con 50 prendas, el botón de agregar muestra el aviso **antes** de abrir la cámara. Antes, la foto se subía primero y después la base la rechazaba, dejando la foto huérfana.
- Si la base rechaza la prenda igual (por ejemplo, dos pestañas a la vez), ahora se ve el aviso. Antes el error solo iba a la consola.
- Si se acabaron los 50 análisis, se muestra ese mensaje y se pueden llenar los campos a mano.

### `components/shared/user-avatar-menu.tsx`
- Decía "Cuenta Premium VIP" a todo el que tuviera sesión. Ahora dice "Plan Gratis", "Cuenta Premium" o "Modo Invitado".

### `.env.example`
- Se agregó `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.

## Algo que encontré y no cambié

El modo "Punto de Recolección" se abre con un botón público, o escribiendo un correo con "acopio" o la contraseña "recoleccion". Todo se decide en el navegador, sin cuenta real. Viene de `main` y no es parte de esta fase, pero ese portal otorga puntos. Se revisa en la fase 3, junto con la seguridad de los puntos.

## Checklist de configuración externa (la hace Mauri)

Orden recomendado: primero desplegar el código y después activar el CAPTCHA en Supabase. Si se activa antes, el login actual deja de funcionar.

1. **Aplicar la migración** `supabase/05-perfiles.sql` (con OK de Mauri).
2. **Google Cloud Console** → APIs y servicios → Credenciales → Crear ID de cliente OAuth (aplicación web).
   - Orígenes autorizados: tu dominio.
   - URI de redirección: `https://<tu-proyecto>.supabase.co/auth/v1/callback`.
   - Pantalla de consentimiento con el nombre Clossapp y la URL de privacidad `/politicas#privacidad`.
3. **Meta for Developers** → Crear app → Facebook Login.
   - URI de redirección OAuth válida: la misma de Supabase.
   - URL de política de privacidad: `https://<tu-dominio>/politicas#privacidad`.
   - Pasar la app a modo **Live**; si no, solo pueden entrar los administradores.
4. **Cloudflare** → Turnstile → Agregar widget con tu dominio (y `localhost` para probar).
   - La **site key** va en `.env` como `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, y también en el hosting.
   - La **secret key** va en Supabase (paso 6).
5. **Resend** (o similar) → crear cuenta y verificar tu dominio (registros DNS). Te da datos de SMTP.
6. **Supabase → Authentication:**
   - *Sign In / Providers:* activar Email (con "Confirm email"), Google (Client ID y Secret del paso 2) y Facebook (App ID y Secret del paso 3).
   - *URL Configuration:* Site URL = tu dominio; Redirect URLs = `https://<tu-dominio>/auth/callback` y `http://localhost:3000/auth/callback`.
   - *Emails → SMTP Settings:* datos de Resend. Sin esto, Supabase envía muy pocos correos por hora.
   - *Emails → Templates:* para que los enlaces funcionen aunque se abran en otro dispositivo:
     - Confirm signup: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`
     - Reset password: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/restablecer`
   - *Attack Protection:* activar CAPTCHA con Turnstile y pegar la secret key (después de desplegar).
   - *Passwords:* mínimo 8 caracteres, con letras y dígitos.
   - *Rate limits:* revisar los valores por defecto; los de inicio de sesión y registro están bien para empezar.
7. **Activar premium a mano** (hasta que haya pagos): en el SQL editor, `update perfiles set plan = 'premium' where user_id = '<uuid>';`

## Cómo se verificó

- `npx tsc --noEmit`: sin errores.
- `npm run build`: compila; aparecen `/auth/callback` y `/restablecer`.
- `npm run lint`: no corre porque el proyecto no tiene `eslint` instalado (ya era así).
- Se revisó en la base real (solo lectura): `perfiles` no existe, `prendas.user_id` es uuid, hay 6 cuentas y un trigger previo en `auth.users`.

## Pendiente de probar (cuando la migración y la configuración estén listas)

- Crear cuenta con correo: pide CAPTCHA, llega el correo y el enlace entra a la app.
- Entrar con Google y con Facebook.
- Cuenta gratis: la prenda 51 se rechaza desde la app y también con un insert directo; el segundo outfit del día responde con el límite.
- Mandar un `user_id` falso en el body no salta los límites.
- Invitada y punto de recolección siguen funcionando.
- Recuperar contraseña de punta a punta.
