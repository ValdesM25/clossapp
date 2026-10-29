-- 08 (OPCIONAL): disparo diario de los recordatorios push desde Supabase
-- (pg_cron + pg_net). Es una de dos opciones; la otra es Vercel Cron. Mauri
-- decide cuál; comparación en docs/tanda-registro-pwa/fase-3-armario-al-dia.md.
--
-- NO se aplica tal cual. Antes:
--   1. Desplegar la app con CRON_SECRET configurado en Vercel.
--   2. Guardar el mismo secreto en Supabase Vault (SQL editor):
--        select vault.create_secret('<el CRON_SECRET>', 'cron_secret');
--   3. Reemplazar <TU-DOMINIO> abajo.
--   4. Activar las extensiones pg_cron y pg_net (Database > Extensions).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Todos los días a las 18:00 UTC (12:00 en Ciudad de México).
select cron.schedule(
  'clossapp-recordatorio-push',
  '0 18 * * *',
  $$
  select net.http_post(
    url := 'https://<TU-DOMINIO>/api/push/enviar',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para quitarlo: select cron.unschedule('clossapp-recordatorio-push');
