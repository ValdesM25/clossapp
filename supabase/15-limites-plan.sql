-- 15: limites por plan en una sola tabla, topes diarios y fusible global.
-- Detalle y motivos en docs/tanda-planes/README.md.
-- Reemplaza a consumir_cuota (05-perfiles.sql): esa funcion se deja viva
-- solo para el codigo ya desplegado; borrarla despues del deploy (ver abajo).

create table if not exists public.limites_plan (
  plan text primary key check (plan in ('gratis', 'premium')),
  prendas int,              -- null = sin tope
  analisis_dia int not null,
  analisis_total int,       -- null = sin tope
  outfits_dia int not null,
  tope_global_dia int       -- llamadas IA al dia sumando todas las cuentas del plan; null = sin tope
);

alter table public.limites_plan enable row level security;
drop policy if exists "limites_plan_lectura" on public.limites_plan;
create policy "limites_plan_lectura" on public.limites_plan
  for select to authenticated using (true);
revoke all on public.limites_plan from anon, authenticated;
grant select on public.limites_plan to authenticated;

insert into public.limites_plan (plan, prendas, analisis_dia, analisis_total, outfits_dia, tope_global_dia) values
  ('gratis', 50, 10, 60, 1, 200),
  ('premium', null, 30, null, 15, null)
on conflict (plan) do update set
  prendas = excluded.prendas,
  analisis_dia = excluded.analisis_dia,
  analisis_total = excluded.analisis_total,
  outfits_dia = excluded.outfits_dia,
  tope_global_dia = excluded.tope_global_dia;

-- Fusible contra multicuentas: cuenta las llamadas del dia por plan. Solo la
-- toca usar_ia (security definer); nadie la lee ni escribe desde el cliente.
create table if not exists public.uso_ia_dia (
  fecha date not null,
  plan text not null,
  llamadas int not null default 0,
  primary key (fecha, plan)
);
alter table public.uso_ia_dia enable row level security;
revoke all on public.uso_ia_dia from anon, authenticated;

alter table public.perfiles
  add column if not exists analisis_dia int not null default 0,
  add column if not exists analisis_dia_fecha date;

-- Tope de prendas a la vez segun el plan, en la base y no solo en la UI.
create or replace function public.prendas_limite_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tope int;
begin
  select l.prendas into v_tope from public.limites_plan l
    where l.plan = coalesce((select plan from public.perfiles where user_id = new.user_id), 'gratis');
  if v_tope is not null and (select count(*) from public.prendas where user_id = new.user_id) >= v_tope then
    raise exception 'LIMITE_PRENDAS: tu plan permite hasta % prendas', v_tope;
  end if;
  return new;
end;
$$;

-- Descuenta una unidad de cuota IA del usuario de la sesion.
-- p_tipo: 'outfit' o 'analisis'. Devuelve 'ok' o el motivo del rechazo:
-- 'sin_sesion', 'outfit_dia', 'analisis_dia', 'analisis_total' o 'global'.
-- shortcut: cualquiera con sesion puede llamarla por RPC y gastar su propia
-- cuota (y su parte del fusible); con multicuentas se puede agotar el fusible
-- gratis del dia. No cuesta creditos, solo deja sin IA gratis a los demas.
create or replace function public.usar_ia(p_tipo text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hoy date := (now() at time zone 'America/Mexico_City')::date;
  v_perfil public.perfiles%rowtype;
  v_lim public.limites_plan%rowtype;
  v_filas int;
begin
  if v_uid is null then
    return 'sin_sesion';
  end if;
  if p_tipo not in ('outfit', 'analisis') then
    raise exception 'tipo de cuota desconocido: %', p_tipo;
  end if;

  insert into public.perfiles (user_id) values (v_uid) on conflict do nothing;
  select * into v_perfil from public.perfiles where user_id = v_uid for update;
  select * into v_lim from public.limites_plan where plan = v_perfil.plan;
  if not found then
    raise exception 'plan sin limites: %', v_perfil.plan;
  end if;

  if p_tipo = 'outfit' then
    if v_perfil.outfits_dia_fecha = v_hoy and v_perfil.outfits_dia >= v_lim.outfits_dia then
      return 'outfit_dia';
    end if;
  else
    if v_perfil.analisis_dia_fecha = v_hoy and v_perfil.analisis_dia >= v_lim.analisis_dia then
      return 'analisis_dia';
    end if;
    if v_lim.analisis_total is not null and v_perfil.analisis_total >= v_lim.analisis_total then
      return 'analisis_total';
    end if;
  end if;

  if v_lim.tope_global_dia is not null then
    insert into public.uso_ia_dia as u (fecha, plan, llamadas) values (v_hoy, v_perfil.plan, 1)
    on conflict (fecha, plan) do update set llamadas = u.llamadas + 1
      where u.llamadas < v_lim.tope_global_dia;
    get diagnostics v_filas = row_count;
    if v_filas = 0 then
      return 'global';
    end if;
  end if;

  if p_tipo = 'outfit' then
    update public.perfiles
      set outfits_dia = case when outfits_dia_fecha = v_hoy then outfits_dia + 1 else 1 end,
          outfits_dia_fecha = v_hoy,
          updated_at = now()
      where user_id = v_uid;
  else
    update public.perfiles
      set analisis_dia = case when analisis_dia_fecha = v_hoy then analisis_dia + 1 else 1 end,
          analisis_dia_fecha = v_hoy,
          analisis_total = analisis_total + 1,
          updated_at = now()
      where user_id = v_uid;
  end if;
  return 'ok';
end;
$$;

revoke all on function public.usar_ia(text) from public, anon;
grant execute on function public.usar_ia(text) to authenticated;
revoke execute on function public.prendas_limite_plan() from public, anon, authenticated;

-- Despues del deploy que usa usar_ia:
-- drop function if exists public.consumir_cuota(text);
