-- 05: perfiles con plan gratis/premium y limites del plan gratis.
-- Detalle y motivos en docs/tanda-registro-pwa/fase-1-registro-planes.md.
-- Los numeros (50 prendas, 50 analisis, 1 outfit al dia) deben coincidir con
-- constants/planes.ts.

create table if not exists public.perfiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'gratis' check (plan in ('gratis', 'premium')),
  estilo jsonb,
  onboarding_completado boolean not null default false,
  analisis_total int not null default 0,
  outfits_dia int not null default 0,
  outfits_dia_fecha date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.perfiles enable row level security;

drop policy if exists "perfiles_select_propio" on public.perfiles;
create policy "perfiles_select_propio" on public.perfiles
  for select using (auth.uid() = user_id);

drop policy if exists "perfiles_update_propio" on public.perfiles;
create policy "perfiles_update_propio" on public.perfiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- El usuario solo puede editar su estilo y el onboarding. Plan y contadores
-- solo cambian desde las funciones security definer de abajo o el dashboard.
revoke insert, update, delete on public.perfiles from anon, authenticated;
grant select on public.perfiles to authenticated;
grant update (estilo, onboarding_completado, updated_at) on public.perfiles to authenticated;

-- Cada cuenta nueva nace gratis. Trigger aparte de on_auth_user_created
-- (que llena usuarios_permitidos) para no tocar ese flujo.
create or replace function public.crear_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (user_id) values (new.id) on conflict do nothing;
  return new;
exception when others then
  -- Igual que handle_new_user: nunca bloquear el registro en Auth.
  return new;
end;
$$;

drop trigger if exists on_auth_user_perfil on auth.users;
create trigger on_auth_user_perfil
  after insert on auth.users
  for each row execute function public.crear_perfil_usuario();

-- Las cuentas que ya existen (creadas a mano) quedan premium.
insert into public.perfiles (user_id, plan)
select id, 'premium' from auth.users
on conflict (user_id) do update set plan = 'premium';

-- Tope de 50 prendas a la vez para el plan gratis, en la base y no solo en la UI.
create or replace function public.prendas_limite_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce((select plan from public.perfiles where user_id = new.user_id), 'gratis') = 'gratis'
     and (select count(*) from public.prendas where user_id = new.user_id) >= 50 then
    raise exception 'LIMITE_PRENDAS: el plan gratis permite hasta 50 prendas';
  end if;
  return new;
end;
$$;

drop trigger if exists prendas_limite_plan_trg on public.prendas;
create trigger prendas_limite_plan_trg
  before insert on public.prendas
  for each row execute function public.prendas_limite_plan();

-- Descuenta una unidad de cuota IA del usuario de la sesion.
-- p_tipo: 'outfit' (1 al dia en gratis) o 'analisis' (50 de por vida en gratis).
-- Devuelve true si puede usar la IA. Premium siempre true.
create or replace function public.consumir_cuota(p_tipo text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_perfil public.perfiles%rowtype;
begin
  if v_uid is null then
    return false;
  end if;

  insert into public.perfiles (user_id) values (v_uid) on conflict do nothing;
  select * into v_perfil from public.perfiles where user_id = v_uid for update;

  if v_perfil.plan = 'premium' then
    return true;
  end if;

  if p_tipo = 'outfit' then
    if v_perfil.outfits_dia_fecha = (now() at time zone 'America/Mexico_City')::date and v_perfil.outfits_dia >= 1 then
      return false;
    end if;
    update public.perfiles
      set outfits_dia = case when outfits_dia_fecha = (now() at time zone 'America/Mexico_City')::date then outfits_dia + 1 else 1 end,
          outfits_dia_fecha = (now() at time zone 'America/Mexico_City')::date,
          updated_at = now()
      where user_id = v_uid;
    return true;
  elsif p_tipo = 'analisis' then
    if v_perfil.analisis_total >= 50 then
      return false;
    end if;
    update public.perfiles
      set analisis_total = analisis_total + 1, updated_at = now()
      where user_id = v_uid;
    return true;
  end if;

  raise exception 'tipo de cuota desconocido: %', p_tipo;
end;
$$;

revoke all on function public.consumir_cuota(text) from public, anon;
grant execute on function public.consumir_cuota(text) to authenticated;
