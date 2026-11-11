-- 24: Planificación de outfits, exclusiva de Elite (docs/planificacion-outfits/).
-- Decisiones de Mauri del 11 nov 2026: cuota en días planeados, 14 al día y 30 al mes;
-- si deja Elite, sus planes quedan en solo lectura.

-- 1. Topes por plan, en días planeados. Solo Elite tiene planificación.
alter table public.limites_plan
  add column if not exists plan_dias_dia int not null default 0,
  add column if not exists plan_dias_mes int not null default 0;
update public.limites_plan set plan_dias_dia = 14, plan_dias_mes = 30 where plan = 'elite';

-- 2. Contadores por usuario. Solo los cambian las funciones de abajo.
alter table public.perfiles
  add column if not exists plan_dias_dia int not null default 0,
  add column if not exists plan_dias_dia_fecha date,
  add column if not exists plan_dias_mes int not null default 0,
  add column if not exists plan_dias_mes_inicio date;

-- 3. Planes y momentos.
create table if not exists public.planes_outfit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('semana', 'fecha', 'viaje')),
  nombre text not null check (char_length(nombre) between 1 and 60),
  fecha_inicio date not null,
  fecha_fin date not null,
  lugar jsonb,
  empacadas text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint planes_outfit_rango check (fecha_fin >= fecha_inicio and fecha_fin - fecha_inicio <= 29),
  constraint planes_outfit_viaje_con_lugar check (tipo <> 'viaje' or lugar is not null)
);
create index if not exists planes_outfit_user_idx on public.planes_outfit (user_id, fecha_inicio);

create table if not exists public.plan_momentos (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.planes_outfit(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  momento text not null check (momento in ('dia', 'noche')),
  actividad text not null default '' check (char_length(actividad) <= 120),
  clima jsonb,
  outfit jsonb,
  faltante jsonb,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'listo', 'error')),
  generado_en timestamptz,
  usado_en timestamptz,
  unique (plan_id, fecha, momento)
);
create index if not exists plan_momentos_user_fecha_idx on public.plan_momentos (user_id, fecha);

-- El usuario solo lee lo suyo; todo lo demás pasa por funciones o por el servidor.
alter table public.planes_outfit enable row level security;
alter table public.plan_momentos enable row level security;
drop policy if exists "planes_outfit_select_propio" on public.planes_outfit;
create policy "planes_outfit_select_propio" on public.planes_outfit
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "plan_momentos_select_propio" on public.plan_momentos;
create policy "plan_momentos_select_propio" on public.plan_momentos
  for select to authenticated using (user_id = auth.uid());
revoke all on public.planes_outfit, public.plan_momentos from anon, authenticated;
grant select on public.planes_outfit, public.plan_momentos to authenticated;

-- 4. Tokens reales de cada llamada a la IA, para comparar con lo estimado.
create table if not exists public.uso_ia_registro (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  ruta text not null,
  modelo text not null,
  entrada int not null default 0,
  salida int not null default 0,
  cache_lectura int not null default 0,
  cache_escritura int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.uso_ia_registro enable row level security;
revoke all on public.uso_ia_registro from anon, authenticated;

-- 5. Cuota: descuenta p_dias días planeados del usuario de la sesión.
-- Devuelve 'ok' o el motivo: 'sin_sesion', 'solo_elite', 'plan_dia' o 'plan_mes'.
-- La ruta calcula antes cuántos días le quedan y nunca pide más de eso.
create or replace function public.usar_dias_plan(p_dias int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hoy date := (now() at time zone 'America/Mexico_City')::date;
  v_mes date := date_trunc('month', (now() at time zone 'America/Mexico_City'))::date;
  v_perfil public.perfiles%rowtype;
  v_lim public.limites_plan%rowtype;
  v_dia int;
  v_en_mes int;
begin
  if v_uid is null then
    return 'sin_sesion';
  end if;
  if p_dias is null or p_dias < 1 or p_dias > 7 then
    raise exception 'p_dias fuera de rango: %', p_dias;
  end if;

  select * into v_perfil from public.perfiles where user_id = v_uid for update;
  if not found or v_perfil.plan <> 'elite' then
    return 'solo_elite';
  end if;
  select * into v_lim from public.limites_plan where plan = v_perfil.plan;

  v_dia := case when v_perfil.plan_dias_dia_fecha = v_hoy then v_perfil.plan_dias_dia else 0 end;
  v_en_mes := case when v_perfil.plan_dias_mes_inicio = v_mes then v_perfil.plan_dias_mes else 0 end;
  if v_dia + p_dias > v_lim.plan_dias_dia then
    return 'plan_dia';
  end if;
  if v_en_mes + p_dias > v_lim.plan_dias_mes then
    return 'plan_mes';
  end if;

  update public.perfiles
    set plan_dias_dia = v_dia + p_dias,
        plan_dias_dia_fecha = v_hoy,
        plan_dias_mes = v_en_mes + p_dias,
        plan_dias_mes_inicio = v_mes,
        updated_at = now()
    where user_id = v_uid;
  return 'ok';
end;
$$;
revoke all on function public.usar_dias_plan(int) from public, anon;
grant execute on function public.usar_dias_plan(int) to authenticated;

-- Devuelve días cuando la IA falla. Solo el servidor: si el usuario pudiera
-- llamarla, se regalaría cuota.
create or replace function public.devolver_dias_plan(p_uid uuid, p_dias int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoy date := (now() at time zone 'America/Mexico_City')::date;
  v_mes date := date_trunc('month', (now() at time zone 'America/Mexico_City'))::date;
begin
  if p_dias is null or p_dias < 1 then
    return;
  end if;
  update public.perfiles
    set plan_dias_dia = case when plan_dias_dia_fecha = v_hoy then greatest(plan_dias_dia - p_dias, 0) else plan_dias_dia end,
        plan_dias_mes = case when plan_dias_mes_inicio = v_mes then greatest(plan_dias_mes - p_dias, 0) else plan_dias_mes end,
        updated_at = now()
    where user_id = p_uid;
end;
$$;
revoke all on function public.devolver_dias_plan(uuid, int) from public, anon, authenticated;
grant execute on function public.devolver_dias_plan(uuid, int) to service_role;

-- 6. Crear un plan con todos sus momentos. Solo Elite.
-- p_momentos: [{ "fecha": "2026-11-16", "momento": "dia", "actividad": "Oficina" }, …]
-- Cada día del rango debe tener al menos un momento.
create or replace function public.crear_plan_outfit(
  p_tipo text, p_nombre text, p_inicio date, p_fin date, p_lugar jsonb, p_momentos jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hoy date := (now() at time zone 'America/Mexico_City')::date;
  v_plan uuid;
  v_m jsonb;
  v_fecha date;
  v_dias int;
begin
  if v_uid is null then
    raise exception 'SIN_SESION';
  end if;
  if not exists (select 1 from public.perfiles where user_id = v_uid and plan = 'elite') then
    raise exception 'SOLO_ELITE';
  end if;
  if p_inicio < v_hoy then
    raise exception 'FECHA_PASADA';
  end if;
  if (select count(*) from public.planes_outfit where user_id = v_uid and fecha_fin >= v_hoy) >= 10 then
    raise exception 'DEMASIADOS_PLANES';
  end if;
  if jsonb_typeof(p_momentos) is distinct from 'array'
     or jsonb_array_length(p_momentos) = 0 or jsonb_array_length(p_momentos) > 60 then
    raise exception 'MOMENTOS_INVALIDOS';
  end if;
  if p_lugar is not null and (
       jsonb_typeof(p_lugar->'lat') is distinct from 'number'
    or jsonb_typeof(p_lugar->'lon') is distinct from 'number'
    or char_length(coalesce(p_lugar->>'nombre', '')) not between 1 and 80) then
    raise exception 'LUGAR_INVALIDO';
  end if;

  -- tipo, nombre y rango de fechas los validan los checks de la tabla.
  insert into public.planes_outfit (user_id, tipo, nombre, fecha_inicio, fecha_fin, lugar)
    values (v_uid, p_tipo, trim(p_nombre), p_inicio, p_fin, p_lugar)
    returning id into v_plan;

  for v_m in select value from jsonb_array_elements(p_momentos) loop
    v_fecha := (v_m->>'fecha')::date;
    if v_fecha < p_inicio or v_fecha > p_fin then
      raise exception 'MOMENTO_FUERA_DE_FECHAS';
    end if;
    insert into public.plan_momentos (plan_id, user_id, fecha, momento, actividad)
      values (v_plan, v_uid, v_fecha, v_m->>'momento', left(trim(coalesce(v_m->>'actividad', '')), 120));
  end loop;

  select count(distinct fecha) into v_dias from public.plan_momentos where plan_id = v_plan;
  if v_dias <> (p_fin - p_inicio + 1) then
    raise exception 'FALTAN_DIAS';
  end if;
  return v_plan;
end;
$$;
revoke all on function public.crear_plan_outfit(text, text, date, date, jsonb, jsonb) from public, anon;
grant execute on function public.crear_plan_outfit(text, text, date, date, jsonb, jsonb) to authenticated;

-- 7. Escrituras permitidas también en solo lectura (D12).
create or replace function public.borrar_plan_outfit(p_plan uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.planes_outfit where id = p_plan and user_id = auth.uid();
$$;
revoke all on function public.borrar_plan_outfit(uuid) from public, anon;
grant execute on function public.borrar_plan_outfit(uuid) to authenticated;

create or replace function public.marcar_empacada(p_plan uuid, p_prenda text, p_empacada boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_prenda !~ '^[0-9]{1,19}$' then
    raise exception 'PRENDA_INVALIDA';
  end if;
  update public.planes_outfit
    set empacadas = case
      when p_empacada then array(select distinct unnest(empacadas || p_prenda))
      else array_remove(empacadas, p_prenda)
    end
    where id = p_plan and user_id = auth.uid() and tipo = 'viaje';
end;
$$;
revoke all on function public.marcar_empacada(uuid, text, boolean) from public, anon;
grant execute on function public.marcar_empacada(uuid, text, boolean) to authenticated;

-- "Me lo puse": true solo la primera vez, para no contar dos veces el uso de las prendas.
create or replace function public.marcar_momento_usado(p_momento uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoy date := (now() at time zone 'America/Mexico_City')::date;
begin
  update public.plan_momentos
    set usado_en = now()
    where id = p_momento and user_id = auth.uid()
      and estado = 'listo' and usado_en is null and fecha <= v_hoy;
  return found;
end;
$$;
revoke all on function public.marcar_momento_usado(uuid) from public, anon;
grant execute on function public.marcar_momento_usado(uuid) to authenticated;
