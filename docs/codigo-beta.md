# Código de prueba para la beta (InnovaTecNM)

Pedido de Mauri (16 de noviembre de 2026): esta semana entran 30 a 100 usuarios por mensaje privado o en persona. Se les manda un código que da un plan de pago por unos días, sin pasar por Stripe, con una bienvenida que les diga que son parte del desarrollo de Clossapp rumbo al nacional del InnovaTecNM.

## Decisiones de Mauri
- Sin Stripe para la prueba. Stripe sigue siendo el camino para pagar de verdad.
- Un código por tipo de plan; el usuario no elige: el código decide plan y días.
- El código se mete en `/planes`.
- 100 usos y caduca el 30 de noviembre (los dos se cambian con un `update`).
- Al estar por vencer y al vencer: aviso "si no quieres perder tus funciones, elige tu plan".
- Una sola vez por cuenta.

## Cómo funciona
- **Base** (`supabase/26-codigos-beta.sql`): tabla `codigos_beta` (código, plan, días, tope de usos, usos, fecha límite). Sin acceso desde el cliente: nadie puede listar los códigos. `perfiles` gana `prueba_vence` y `codigo_beta`; el usuario no las puede escribir.
- **Canje**: RPC `canjear_codigo(p_codigo)` (security definer). Ignora espacios y mayúsculas. Rechaza sin sesión, si la cuenta ya canjeó uno (`YA_CANJEADO`), si ya tiene Plus/Elite (`YA_TIENE_PLAN`, protege las 5 cuentas puestas a mano) y, con un solo motivo hacia afuera, si el código no existe, caducó o se agotó (`CODIGO_INVALIDO`). Sube `plan`, fija `prueba_vence = ahora + días` y suma un uso.
- **Vencimiento**: `vencer_pruebas()` corre cada hora con pg_cron (`clossapp-vencer-pruebas`): baja a `gratis` a quien tenga `prueba_vence` pasada sin suscripción viva en Stripe. `prueba_vence` se conserva para el aviso "tu prueba terminó". Al bajar a gratis aplican de inmediato los topes de gratis (50 prendas: no se borra nada, pero no se puede subir más hasta bajar de 50; Shop solo dona).
- **Pagar durante la prueba**: `/api/stripe/checkout` ya no rechaza a quien está en prueba. Cuando llega la suscripción real, el webhook (`sincronizarSuscripcion`) escribe el plan de Stripe y borra `prueba_vence`, así ni el cron ni el aviso la tocan.
- **Pantalla `/planes`**: para cuentas gratis que no han canjeado, un campo "¿Tienes un código?". Desde la app, Perfil → "Planes y puntos" muestra la liga "¿Tienes un código? Canjéalo aquí" que lleva ahí. Al canjear sale la bienvenida ("Listo: tienes Plus hasta el 16 de diciembre" + el texto del InnovaTecNM). En prueba, las tarjetas de pago siguen con "Elegir" y arriba dice hasta cuándo dura la prueba. "Administrar suscripción" no aparece en prueba.
- **Inicio**: `AvisoPrueba` (`lib/prueba.ts` decide): los últimos 5 días "Tu prueba de Plus termina el …" y, ya en gratis, una semana con "Tu prueba terminó el …", los dos con "Si no quieres perder tus funciones, elige tu plan" y liga a `/planes`.

## Los códigos no van en el repo
El repositorio es público, así que ni la migración ni este doc traen los códigos reales. Se crean a mano en el SQL editor de Supabase, poniendo el texto del código solo ahí:

```sql
insert into public.codigos_beta (codigo, plan, dias, usos_max, vence) values
  ('<codigo-plus>', 'plus', 30, 100, '2026-11-30'),
  ('<codigo-elite>', 'elite', 15, 100, '2026-11-30');
```

Una versión anterior de este archivo sí traía los nombres reales; esos códigos se cambiaron en la base el 16 de noviembre (`update public.codigos_beta set codigo = '<nuevo>' where codigo = '<viejo>';`). Si un código se filtra, se cambia así: los canjes ya hechos no se tocan (`perfiles.codigo_beta` guarda el nombre viejo, y eso sigue contando como "ya canjeó").

Cambiar tope o fecha: `update public.codigos_beta set usos_max = 150, vence = '2026-12-15' where codigo = '<codigo-plus>';`
Ver cuántos lo usaron: `select codigo, usos, usos_max, vence from public.codigos_beta;`
Quién lo canjeó y hasta cuándo: `select user_id, plan, codigo_beta, prueba_vence from public.perfiles where codigo_beta is not null;`

## Archivos
- `supabase/26-codigos-beta.sql` (nuevo).
- `lib/prueba.ts` + `lib/prueba.test.mjs` (nuevos): cuándo avisar.
- `components/views/inicio/aviso-prueba.tsx` (nuevo), `components/views/inicio/inicio-view.tsx`, `hooks/use-auth.ts`, `context/auth-context.tsx`: `pruebaVence` llega del perfil.
- `app/planes/page.tsx`: campo de código, bienvenida, estado de prueba. `components/views/planes/planes-view.tsx`: liga al canje.
- `app/api/stripe/checkout/route.ts`, `lib/stripe.server.ts`: la prueba puede pagar y la suscripción la reemplaza.

## Estado
- **Aplicado en producción el 16 de noviembre** (migración `codigos_beta`), con OK de Mauri, y los dos códigos insertados (Plus 30 días y Elite 15 días, 100 usos cada uno, hasta el 30 de noviembre). Los advisors de seguridad no traen nada nuevo: `codigos_beta` sin políticas es a propósito (como `uso_ia_dia`).
- Falta el deploy de la rama. Mientras no salga, la app no lee las columnas nuevas y el cron no tiene pruebas que vencer.
- Confirmar en la consola de Anthropic el límite de gasto mensual: con 100 cuentas en Plus el tope es 30 análisis y 15 outfits al día por cuenta.

## Cómo se probó
- La migración se corrió en producción dentro de una transacción que se deshizo al final, con sesiones simuladas: sin sesión → `SIN_SESION`; canje con espacios y minúsculas → Plus con `prueba_vence` a 30 días y `usos = 1`; segundo canje → `YA_CANJEADO`; código agotado, caducado e inexistente → `CODIGO_INVALIDO`; cuenta Elite manual → `YA_TIENE_PLAN`; como `authenticated`, escribir `prueba_vence` y leer `codigos_beta` → permission denied; `vencer_pruebas()` no toca una prueba vigente, baja a gratis una vencida y deja las 5 cuentas de pago manuales como estaban; la tarea de cron queda programada.
- `node --test lib/prueba.test.mjs`: 4 de 4 (más los 6 de `plan-stripe`).
- `tsc` sin errores; `eslint` sin avisos nuevos en los archivos tocados.
- No se vio en el navegador: hace falta una cuenta gratis con sesión. Al probar en producción: canjear, volver a Inicio y ver que el plan cambió; pulsar "Elegir Plus" en prueba debe abrir Stripe (no cobrar).
