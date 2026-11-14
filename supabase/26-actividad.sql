-- 26: Registro de actividad (bitácora para administración).
-- Quién hizo qué, cuándo, desde dónde y con qué dispositivo. Solo el servidor
-- escribe (service_role desde lib/actividad.server.ts); solo es_admin lee.
-- Requiere 10 (es_admin). Opcional: 08 (pg_cron) para la limpieza automática.

create table if not exists public.actividad (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid references auth.users (id) on delete set null,
  evento      text not null check (evento in (
                'sesion_iniciada', 'sesion_social', 'cuenta_confirmada', 'registro',
                'sesion_cerrada', 'app_abierta', 'demo_iniciada',
                'prenda_subida', 'prenda_analizada', 'outfits_generados',
                'outfit_elegido', 'perfil_actualizado', 'foto_perfil_subida'
              )),
  detalle     jsonb not null default '{}'::jsonb check (pg_column_size(detalle) <= 4000),
  ip          text,
  pais        text,
  region      text,
  ciudad      text,
  dispositivo text,          -- movil | tablet | escritorio | bot
  so          text,          -- iOS 18, Android 15, Windows, macOS...
  navegador   text,          -- Safari, Chrome, Firefox, Edge...
  pwa         boolean,       -- abierta como app instalada
  user_agent  text check (length(user_agent) <= 500)
);

create index if not exists actividad_created_at on public.actividad (created_at desc);
create index if not exists actividad_user on public.actividad (user_id, created_at desc);
create index if not exists actividad_evento on public.actividad (evento, created_at desc);

alter table public.actividad enable row level security;

-- Solo lectura para admin; sin políticas de insert/update/delete (escribe service_role).
drop policy if exists "actividad_select_admin" on public.actividad;
create policy "actividad_select_admin" on public.actividad
  for select to authenticated using (public.es_admin());

revoke all on public.actividad from anon;
revoke insert, update, delete on public.actividad from authenticated;

-- Lista para el panel, con el correo de cada cuenta (auth.users no es legible desde el cliente).
create or replace function public.actividad_reciente(
  p_limite int default 200,
  p_evento text default null,
  p_user uuid default null
)
returns table (
  id bigint, created_at timestamptz, user_id uuid, correo text, evento text, detalle jsonb,
  ip text, pais text, region text, ciudad text, dispositivo text, so text, navegador text, pwa boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then raise exception 'SOLO_ADMIN: solo administración puede ver la actividad'; end if;
  return query
    select a.id, a.created_at, a.user_id, u.email::text, a.evento, a.detalle,
           a.ip, a.pais, a.region, a.ciudad, a.dispositivo, a.so, a.navegador, a.pwa
    from public.actividad a
    left join auth.users u on u.id = a.user_id
    where (p_evento is null or a.evento = p_evento)
      and (p_user is null or a.user_id = p_user)
    order by a.created_at desc
    limit least(greatest(p_limite, 1), 1000);
end;
$$;

-- Números para las tarjetas y gráficas del panel (últimos p_dias días, hora de CDMX).
create or replace function public.actividad_resumen(p_dias int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_desde timestamptz := now() - make_interval(days => least(greatest(p_dias, 1), 365));
  v jsonb;
begin
  if not public.es_admin() then raise exception 'SOLO_ADMIN: solo administración puede ver la actividad'; end if;
  with a as (select * from public.actividad where created_at >= v_desde)
  select jsonb_build_object(
    'eventos',            (select count(*) from a),
    'usuarios_activos',   (select count(distinct user_id) from a where user_id is not null),
    'activos_hoy',        (select count(distinct user_id) from a where user_id is not null
                             and (created_at at time zone 'America/Mexico_City')::date = (now() at time zone 'America/Mexico_City')::date),
    'inicios_sesion',     (select count(*) from a where evento in ('sesion_iniciada', 'sesion_social', 'cuenta_confirmada')),
    'registros',          (select count(*) from a where evento = 'registro'),
    'fotos_subidas',      (select count(*) from a where evento in ('prenda_subida', 'foto_perfil_subida')),
    'outfits_generados',  (select count(*) from a where evento = 'outfits_generados'),
    'por_evento',     coalesce((select jsonb_object_agg(evento, n) from (select evento, count(*) n from a group by 1) x), '{}'::jsonb),
    'por_dispositivo',coalesce((select jsonb_object_agg(k, n) from (select coalesce(dispositivo, 'desconocido') k, count(distinct user_id) n from a where user_id is not null group by 1) x), '{}'::jsonb),
    'por_so',         coalesce((select jsonb_object_agg(k, n) from (select coalesce(so, 'desconocido') k, count(distinct user_id) n from a where user_id is not null group by 1) x), '{}'::jsonb),
    'por_ciudad',     coalesce((select jsonb_agg(jsonb_build_object('ciudad', k, 'n', n) order by n desc)
                        from (select coalesce(ciudad || ', ' || pais, pais, 'desconocida') k, count(distinct user_id) n
                              from a where user_id is not null group by 1 order by 2 desc limit 10) x), '[]'::jsonb),
    'por_dia',        coalesce((select jsonb_agg(jsonb_build_object('dia', d, 'usuarios', u, 'eventos', e) order by d)
                        from (select (created_at at time zone 'America/Mexico_City')::date d,
                                     count(distinct user_id) u, count(*) e
                              from a group by 1) x), '[]'::jsonb)
  ) into v;
  return v;
end;
$$;

revoke all on function public.actividad_reciente(int, text, uuid) from public, anon;
revoke all on function public.actividad_resumen(int) from public, anon;
grant execute on function public.actividad_reciente(int, text, uuid) to authenticated;
grant execute on function public.actividad_resumen(int) to authenticated;

-- Retención: la IP y la ubicación son datos personales; se guardan 90 días.
create or replace function public.limpiar_actividad()
returns void
language sql
security definer
set search_path = public
as $$ delete from public.actividad where created_at < now() - interval '90 days'; $$;
revoke all on function public.limpiar_actividad() from public, anon, authenticated;

-- Programa la limpieza diaria si pg_cron está instalado (08). 10:00 UTC = 04:00 CDMX.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('clossapp-limpiar-actividad', '0 10 * * *', 'select public.limpiar_actividad();');
  end if;
end;
$$;
