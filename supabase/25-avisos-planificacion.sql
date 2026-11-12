-- 25: Avisos push de planificación (docs/planificacion-outfits/fase-5-avisos.md).
-- Dos avisos diarios a las 21:00 de Ciudad de México, solo para Elite (D8 y D12):
-- el outfit de mañana y empacar para un viaje que empieza mañana o pasado mañana.
-- Requiere 08 (pg_cron, pg_net y el secreto 'cron_secret' en Vault) y 24.

-- 1. A quién avisar hoy y con qué texto. Solo el servidor (service_role).
create or replace function public.avisos_planificacion()
returns table (user_id uuid, title text, body text, url text)
language sql
stable
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
    from public.plan_momentos m
    join public.planes_outfit p on p.id = m.plan_id
    join public.perfiles pf on pf.user_id = m.user_id and pf.plan = 'elite'
    where m.estado = 'listo' and m.fecha = (select d + 1 from hoy)
    order by m.user_id, p.fecha_inicio, m.momento   -- 'dia' antes que 'noche'
  ),
  empacar as (
    select distinct on (p.user_id)
      p.user_id,
      'Empaca para ' || p.nombre as title,
      'Te faltan ' || f.faltan || ' prendas por marcar en tu maleta.' as body,
      '/?plan=' || p.id as url
    from public.planes_outfit p
    join public.perfiles pf on pf.user_id = p.user_id and pf.plan = 'elite'
    cross join lateral (
      select count(*) as faltan
      from (
        select distinct jsonb_array_elements_text(m.outfit->'prenda_ids') as prenda
        from public.plan_momentos m
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

-- 2. PENDIENTE (decisión de Mauri, 11 nov 2026): la tarea de cron no se programó
--    al aplicar esta migración. Programarla cuando el push esté configurado en
--    producción (P5 del README: llaves VAPID y CRON_SECRET en Vercel, 'cron_secret'
--    en Vault) y la ruta /api/push/planificacion ya esté desplegada. Correr esto en
--    el SQL editor (03:00 UTC = 21:00 en Ciudad de México; mismo dominio y secreto
--    que 'clossapp-recordatorio-push' de 08):
--
--   select cron.schedule(
--     'clossapp-avisos-planificacion',
--     '0 3 * * *',
--     $$
--     select net.http_post(
--       url := 'https://clossapp.vercel.app/api/push/planificacion',
--       headers := jsonb_build_object(
--         'Authorization', 'Bearer ' || coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'), ''),
--         'Content-Type', 'application/json'
--       ),
--       body := '{}'::jsonb
--     );
--     $$
--   );
--
--   -- Ver la última ejecución:
--   --   select * from cron.job_run_details where jobid = (select jobid from cron.job
--   --   where jobname = 'clossapp-avisos-planificacion') order by start_time desc limit 1;
