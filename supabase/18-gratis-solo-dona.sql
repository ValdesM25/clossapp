-- 18: el plan Esencial (gratis) solo dona. Comprar, vender y rentar es de Plus y Elite.
-- La app ya esconde esas opciones; esto lo hace valer aunque alguien llame a la API directo.
-- "premium" cuenta como Elite hasta que no quede ninguno (ver 17-suscripciones.sql).

create or replace function public.tiene_marketplace(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.perfiles where user_id = p_uid and plan in ('plus', 'elite', 'premium'));
$$;

revoke execute on function public.tiene_marketplace(uuid) from public, anon, authenticated;

-- Vender y rentar: solo se bloquea publicar (pasar a true). Quitar una publicación siempre se puede,
-- y así una cuenta que baja de plan puede retirar lo que tenía.
create or replace function public.prendas_marketplace_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    (new.en_venta and (tg_op = 'INSERT' or not coalesce(old.en_venta, false)))
    or (new.en_renta and (tg_op = 'INSERT' or not coalesce(old.en_renta, false)))
  ) and not public.tiene_marketplace(new.user_id) then
    raise exception 'PLAN_SIN_MARKETPLACE: vender y rentar es parte de Plus y Elite';
  end if;
  return new;
end;
$$;

drop trigger if exists prendas_marketplace_plan_trg on public.prendas;
create trigger prendas_marketplace_plan_trg
  before insert or update of en_venta, en_renta on public.prendas
  for each row execute function public.prendas_marketplace_plan();

-- Comprar y rentar prendas de otros: crear_orden_escrow inserta aquí.
create or replace function public.escrow_ordenes_marketplace_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.tiene_marketplace(new.buyer_user_id) then
    raise exception 'PLAN_SIN_MARKETPLACE: comprar y rentar es parte de Plus y Elite';
  end if;
  return new;
end;
$$;

drop trigger if exists escrow_ordenes_marketplace_plan_trg on public.escrow_ordenes;
create trigger escrow_ordenes_marketplace_plan_trg
  before insert on public.escrow_ordenes
  for each row execute function public.escrow_ordenes_marketplace_plan();
