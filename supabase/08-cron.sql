-- 08: tareas programadas con Supabase pg_cron (decisión de Mauri: dejarlo
-- listo para escalar, en vez de Vercel Cron). Requiere 06 y 07.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 1. Acreditar puntos de compras recientes que ya cumplieron (todos los días
--    a las 09:00 UTC = 03:00 en Ciudad de México). Corre dentro de la base.
select cron.schedule(
  'clossapp-acreditar-compras',
  '0 9 * * *',
  $$ select public.acreditar_compras_pendientes(); $$
);

-- 2. Recordatorio push "¿compraste algo nuevo?" (18:00 UTC = 12:00 en CDMX).
--    Llama a la app con el secreto guardado en Vault. Mientras no exista el
--    secreto 'cron_secret' en Vault y CRON_SECRET en Vercel, la ruta responde
--    401 y no envía nada. Para crear el secreto (SQL editor):
--      select vault.create_secret('<el mismo valor que CRON_SECRET>', 'cron_secret');
select cron.schedule(
  'clossapp-recordatorio-push',
  '0 18 * * *',
  $$
  select net.http_post(
    url := 'https://clossapp.vercel.app/api/push/enviar',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'), ''),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Ver ejecuciones: select * from cron.job_run_details order by start_time desc limit 20;
-- Quitar una tarea: select cron.unschedule('clossapp-recordatorio-push');
