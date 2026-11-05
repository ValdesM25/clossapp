-- 16: toda cuenta nueva entra a usuarios_permitidos.
-- prendas (y otras tablas) tienen FK a usuarios_permitidos(id). handle_new_user
-- insertaba new.id::text en una columna uuid: fallaba siempre y el
-- "exception when others" lo ocultaba, así que ninguna cuenta registrada desde
-- la app podía guardar prendas. Detalle en docs/tanda-planes/README.md.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text := coalesce(nullif(split_part(new.email, '@', 1), ''), 'usuario');
begin
  -- username es único: si ya existe (juan@gmail y juan@hotmail), se le agrega
  -- un pedazo del id.
  insert into public.usuarios_permitidos (id, username, outfits_creados)
  values (
    new.id,
    case when exists (select 1 from public.usuarios_permitidos where username = v_base)
      then v_base || '-' || left(new.id::text, 8) else v_base end,
    0
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  -- Nunca bloquear el registro en Auth, pero dejar rastro en los logs.
  raise warning 'handle_new_user % : %', new.id, sqlerrm;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Cuentas que ya se registraron sin entrar.
insert into public.usuarios_permitidos (id, username, outfits_creados)
select u.id,
       coalesce(nullif(split_part(u.email, '@', 1), ''), 'usuario') || '-' || left(u.id::text, 8),
       0
from auth.users u
where not exists (select 1 from public.usuarios_permitidos up where up.id = u.id)
on conflict (id) do nothing;
