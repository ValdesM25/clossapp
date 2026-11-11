# Fase 5: avisos push

Estado: **sin empezar.**
Rama: `feat/planificacion-avisos`. Depende de la fase 4 (usa `planId` en la navegación). Archivo nuevo: `supabase/24-avisos-planificacion.sql`.

## Objetivo

Dos avisos diarios a las **21:00 de Ciudad de México** (D8), solo para Elite (en solo lectura se apagan, D12):
1. **Outfit de mañana:** a quien tenga un momento `listo` mañana.
2. **Empacar:** a quien empiece un viaje mañana o pasado mañana y tenga prendas sin marcar en la maleta.

Se disparan con pg_cron, igual que el recordatorio que ya existe (`supabase/08-cron.sql`; Mauri decidió pg_cron y no Vercel Cron).

## 1. Migración `24-avisos-planificacion.sql`

**Función que arma los avisos.** Solo la puede llamar `service_role`. Copiar el estilo de `pendientes_recordatorio` (buscarla en `supabase/` para ver cómo está escrita).

```sql
-- Avisos de planificación para hoy a las 21:00 (CDMX). Solo Elite.
create or replace function public.avisos_planificacion()
returns table (user_id uuid, title text, body text, url text)
language sql
security definer
set search_path = public
as $$
  with hoy as (select (now() at time zone 'America/Mexico_City')::date as d),
  manana as (
    select distinct on (m.user_id)
      m.user_id,
      'Mañana: ' || (m.outfit->>'titulo') as title,
      coalesce(nullif(m.actividad, ''), 'Día casual') || ' · ' || p.nombre as body,
      '/?plan=' || p.id as url
    from plan_momentos m
    join planes_outfit p on p.id = m.plan_id
    join perfiles pf on pf.user_id = m.user_id and pf.plan = 'elite'
    where m.estado = 'listo' and m.fecha = (select d + 1 from hoy)
    order by m.user_id, p.fecha_inicio, m.momento   -- 'dia' antes que 'noche'
  ),
  empacar as (
    select distinct on (p.user_id)
      p.user_id,
      'Empaca para ' || p.nombre as title,
      'Te faltan ' || f.faltan || ' prendas por marcar en tu maleta.' as body,
      '/?plan=' || p.id as url
    from planes_outfit p
    join perfiles pf on pf.user_id = p.user_id and pf.plan = 'elite'
    cross join lateral (
      select count(*) as faltan
      from (
        select distinct jsonb_array_elements_text(m.outfit->'prenda_ids') as prenda
        from plan_momentos m
        where m.plan_id = p.id and m.estado = 'listo'
      ) x
      where not (x.prenda = any (p.empacadas))
    ) f
    where p.tipo = 'viaje'
      and p.fecha_inicio between (select d + 1 from hoy) and (select d + 2 from hoy)
      and f.faltan > 0
    order by p.user_id, p.fecha_inicio
  )
  select * from manana
  union all
  select * from empacar;
$$;
revoke all on function public.avisos_planificacion() from public, anon, authenticated;
grant execute on function public.avisos_planificacion() to service_role;
```

**Tarea de cron.** 03:00 UTC son las 21:00 en Ciudad de México (México ya no cambia de horario). Antes de escribirla, ver la URL que usa la tarea que ya existe:

```sql
select jobname, schedule, command from cron.job;
```

Usar el mismo dominio que `clossapp-recordatorio-push` y el mismo secreto de Vault (`cron_secret`):

```sql
select cron.schedule(
  'clossapp-avisos-planificacion',
  '0 3 * * *',
  $$
  select net.http_post(
    url := '<mismo dominio que clossapp-recordatorio-push>/api/push/planificacion',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'), ''),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

**Revisar que el secreto exista sin leerlo:** `select name from vault.secrets where name = 'cron_secret';`. **Nunca** seleccionar `decrypted_secret` desde el MCP. Si no existe, avisar a Mauri: hoy el recordatorio de 08 tampoco estaría saliendo.

La función se probó contra producción el 11 nov 2026 dentro de un bloque que se deshace. Con un plan con día y noche para mañana y un viaje que empieza pasado mañana (4 prendas, 1 empacada), devolvió "Mañana: <título del de día>" y "Empaca para Oaxaca · Te faltan 3 prendas". Volver a probarla después de la fase 1 con el mismo truco (bloque `do` que termina en `raise exception`): crear un plan de prueba de una cuenta Elite con un momento `listo` para mañana y un viaje que empiece pasado mañana, y revisar que salen los dos avisos con los textos correctos. Aplicar en producción **solo con el OK de Mauri**.

## 2. Secreto del cron compartido

`app/api/push/enviar/route.ts` revisa `Authorization: Bearer <CRON_SECRET>` con `timingSafeEqual`. Mover esa revisión a `lib/push.server.ts` como `export function cronAutorizado(req: Request): boolean` y usarla en las dos rutas. El comportamiento de la ruta vieja no cambia.

## 3. Ruta `app/api/push/planificacion/route.ts`

- `GET` y `POST` (como la otra ruta).
- Si `!cronAutorizado(req)` → 401.
- Si `!configurarPush()` o no hay `SUPABASE_SERVICE_ROLE_KEY` → 500.
- `supabaseAdmin().rpc("avisos_planificacion")` y, para cada fila, `avisar(user_id, { title, body, url })` de `lib/push.server.ts`. `avisar` nunca lanza. Mandarlos de 10 en 10 con `Promise.all` para no saturar.
- Responder `{ avisos: n }`.

## 4. Abrir el plan al tocar el aviso

- **Service worker (`app/sw.ts`, evento `notificationclick`):** hoy, si la app ya está abierta, solo la enfoca y **no** va a la URL del aviso. Cambiarlo: si hay ventana abierta y la URL no es `/`, llamar `ventana.navigate(url)` y después `focus()`. Si no hay ventana, `openWindow(url)` como ahora. Con `url === "/"` (el recordatorio viejo) todo sigue igual.
- **Dashboard (`clossapp-dashboard.tsx`):** al cargar, si la URL trae `?plan=<uuid>`, abrir la vista `planificacion` con `planInicial` (fase 4) y limpiar la URL con `history.replaceState`, igual que ya se hace con `?vender`.

## Cómo verificar

1. `npx tsc --noEmit` y `npx eslint` de los archivos tocados.
2. Probar la ruta en local con `next dev`: llamarla con el header `Authorization: Bearer <CRON_SECRET de .env.local>` (leer la variable sin imprimirla) y una cuenta Elite de prueba con push activado y un plan con momento para mañana. Debe llegar el aviso y, al tocarlo, abrir ese plan.
3. Sin el header, 401.
4. Con la app abierta, tocar un aviso abre el plan; el recordatorio viejo ("¿Compraste algo nuevo?") sigue abriendo Inicio.

## Criterios de aceptación

- [ ] La función y la tarea de cron están en producción, aplicadas con el OK de Mauri.
- [ ] El primer día real, `select * from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'clossapp-avisos-planificacion') order by start_time desc limit 1;` muestra la llamada sin error.
- [ ] Las dos rutas de push usan `cronAutorizado`.

## Hecho

(Lo llena quien ejecute la fase.)
