-- 26: códigos de prueba para la beta (InnovaTecNM): un código sube la cuenta a
-- Plus o Elite por N días sin pasar por Stripe. Una vez por cuenta.
-- Los códigos NO van en este archivo (el repo es público): se insertan a mano,
-- ver docs/codigo-beta.md.

begin;

create table if not exists public.codigos_beta (
  codigo text primary key,
  plan text not null check (plan in ('plus', 'elite')),
  dias int not null check (dias > 0),
  usos_max int not null,
  usos int not null default 0,
  vence date not null,                 -- último día (de México) para canjearlo
  created_at timestamptz not null default now()
);
alter table public.codigos_beta enable row level security;
revoke all on public.codigos_beta from anon, authenticated;
-- Sin políticas: solo canjear_codigo (security definer) la lee. Así nadie
-- puede listar los códigos desde el cliente.

alter table public.perfiles
  add column if not exists prueba_vence timestamptz,
  add column if not exists codigo_beta text;   -- qué código canjeó: una vez por cuenta
-- El usuario no tiene grant de update sobre estas columnas (05-perfiles.sql da
-- grants por columna), solo las escriben las funciones y el webhook.

create or replace function public.canjear_codigo(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_perfil public.perfiles%rowtype;
  v_cod public.codigos_beta%rowtype;
  v_vence timestamptz;
begin
  if v_uid is null then raise exception 'SIN_SESION'; end if;
  insert into public.perfiles (user_id) values (v_uid) on conflict do nothing;
  select * into v_perfil from public.perfiles where user_id = v_uid for update;
  if v_perfil.codigo_beta is not null then raise exception 'YA_CANJEADO'; end if;
  if v_perfil.plan in ('plus', 'elite') then raise exception 'YA_TIENE_PLAN'; end if;

  select * into v_cod from public.codigos_beta
    where lower(codigo) = lower(trim(p_codigo)) for update;
  -- Un solo motivo hacia afuera: no se revela si el código existe, caducó o se agotó.
  if v_cod.codigo is null
     or v_cod.vence < (now() at time zone 'America/Mexico_City')::date
     or v_cod.usos >= v_cod.usos_max then
    raise exception 'CODIGO_INVALIDO';
  end if;

  v_vence := now() + make_interval(days => v_cod.dias);
  update public.codigos_beta set usos = usos + 1 where codigo = v_cod.codigo;
  update public.perfiles
    set plan = v_cod.plan, prueba_vence = v_vence, codigo_beta = v_cod.codigo, updated_at = now()
    where user_id = v_uid;
  return jsonb_build_object('plan', v_cod.plan, 'vence', v_vence);
end;
$$;
revoke all on function public.canjear_codigo(text) from public, anon;
grant execute on function public.canjear_codigo(text) to authenticated;

-- Al vencer la prueba, de vuelta a gratis. prueba_vence se conserva para el
-- aviso "tu prueba terminó"; el webhook de Stripe la borra al llegar una
-- suscripción real, y una suscripción viva nunca se toca aquí.
create or replace function public.vencer_pruebas()
returns void
language sql
security definer
set search_path = public
as $$
  update public.perfiles
    set plan = 'gratis', updated_at = now()
    where prueba_vence < now()
      and plan <> 'gratis'
      and coalesce(suscripcion_estado, '') not in ('active', 'trialing', 'past_due');
$$;
revoke all on function public.vencer_pruebas() from public, anon, authenticated;

select cron.schedule('clossapp-vencer-pruebas', '15 * * * *', $$ select public.vencer_pruebas(); $$);

commit;

-- Probar: ver docs/codigo-beta.md. Quitar la tarea: select cron.unschedule('clossapp-vencer-pruebas');
