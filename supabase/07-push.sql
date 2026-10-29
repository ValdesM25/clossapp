-- 07: notificaciones push del recordatorio "¿compraste algo nuevo?".
-- Detalle en docs/tanda-registro-pwa/fase-3-armario-al-dia.md.
-- El disparo diario está en 08-cron.sql (pg_cron).

create table if not exists public.push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  ultimo_envio timestamptz,
  created_at timestamptz not null default now()
);

alter table public.push_suscripciones enable row level security;

drop policy if exists "push_select_propio" on public.push_suscripciones;
create policy "push_select_propio" on public.push_suscripciones
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "push_insert_propio" on public.push_suscripciones;
create policy "push_insert_propio" on public.push_suscripciones
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "push_delete_propio" on public.push_suscripciones;
create policy "push_delete_propio" on public.push_suscripciones
  for delete to authenticated using (user_id = auth.uid());

-- Suscripciones a las que toca avisar: la prenda más nueva de la cuenta tiene
-- más de 14 días y no se le avisó en los últimos 7. Los números deben coincidir
-- con constants/recordatorio.ts. Solo la llama el servidor (service_role).
create or replace function public.pendientes_recordatorio()
returns table (id uuid, endpoint text, p256dh text, auth text)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.endpoint, s.p256dh, s.auth
  from public.push_suscripciones s
  join (
    select user_id, max(created_at) as ultima from public.prendas group by user_id
  ) p on p.user_id = s.user_id
  where p.ultima < now() - interval '14 days'
    and (s.ultimo_envio is null or s.ultimo_envio < now() - interval '7 days');
$$;

revoke all on function public.pendientes_recordatorio() from public, anon, authenticated;
grant execute on function public.pendientes_recordatorio() to service_role;
