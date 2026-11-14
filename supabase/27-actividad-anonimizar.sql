-- 27: La bitácora de actividad se guarda siempre; lo sensible solo 90 días.
-- Antes (26) limpiar_actividad borraba las filas de más de 90 días. Ahora solo
-- borra la IP y el user agent: quedan evento, fecha, cuenta, ciudad y dispositivo
-- para las estadísticas de siempre. La tarea de pg_cron de 26 sigue igual
-- (llama a la misma función, todos los días a las 10:00 UTC).

create or replace function public.limpiar_actividad()
returns void
language sql
security definer
set search_path = public
as $$
  update public.actividad
     set ip = null, user_agent = null
   where created_at < now() - interval '90 days'
     and (ip is not null or user_agent is not null);
$$;
revoke all on function public.limpiar_actividad() from public, anon, authenticated;

-- El índice parcial deja que la limpieza diaria solo toque las filas que aún tienen IP.
create index if not exists actividad_con_ip on public.actividad (created_at) where ip is not null or user_agent is not null;
