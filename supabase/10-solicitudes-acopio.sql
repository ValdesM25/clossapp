-- 10: solicitudes para ser centro de acopio y panel de administración.
-- Detalle en docs/tanda-registro-pwa/fase-5-solicitudes-acopio.md.
--
-- Flujo: el centro crea una cuenta normal, llena "Quiero ser centro de acopio"
-- y Mauri la aprueba en /admin. Al aprobar, esa misma cuenta pasa a rol
-- 'acopio'. No hace falta mandar invitaciones ni usar la service key.

-- 1. Admin: marca aparte del rol, para que Mauri siga usando la app normal.
alter table public.perfiles add column if not exists es_admin boolean not null default false;
-- es_admin no está en el grant de update de 05: nadie se lo puede dar a sí mismo.

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select es_admin from public.perfiles where user_id = auth.uid()), false);
$$;

-- Decisión de Mauri: él administra. Cuenta identificada por el correo de sus commits.
update public.perfiles set es_admin = true
where user_id = (select id from auth.users where email = 'mau.valdes09+clossapp@outlook.com');

-- 2. Solicitudes -----------------------------------------------------------------
create table if not exists public.solicitudes_acopio (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 2 and 80),
  direccion text not null check (length(trim(direccion)) between 5 and 200),
  ciudad text not null check (length(trim(ciudad)) between 2 and 60),
  horario text not null check (length(trim(horario)) between 3 and 120),
  capacidad_bolsas int not null check (capacidad_bolsas between 1 and 1000),
  contacto_nombre text not null check (length(trim(contacto_nombre)) between 2 and 80),
  telefono text not null check (telefono ~ '^[0-9+() -]{8,20}$'),
  tipo_negocio text check (length(tipo_negocio) <= 60),
  mensaje text check (length(mensaje) <= 600),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  nota_admin text check (length(nota_admin) <= 300),
  created_at timestamptz not null default now(),
  revisada_at timestamptz
);

-- Una sola solicitud pendiente por cuenta (evita spam).
create unique index if not exists solicitudes_acopio_una_pendiente
  on public.solicitudes_acopio (user_id) where estado = 'pendiente';

alter table public.solicitudes_acopio enable row level security;

drop policy if exists "solicitudes_select" on public.solicitudes_acopio;
create policy "solicitudes_select" on public.solicitudes_acopio
  for select to authenticated using (user_id = auth.uid() or public.es_admin());

drop policy if exists "solicitudes_insert_propia" on public.solicitudes_acopio;
create policy "solicitudes_insert_propia" on public.solicitudes_acopio
  for insert to authenticated with check (
    user_id = auth.uid() and estado = 'pendiente' and nota_admin is null and revisada_at is null
  );
-- Sin update/delete directos: la revisión pasa por revisar_solicitud.

-- 3. Revisar (solo admin) ---------------------------------------------------------
create or replace function public.revisar_solicitud(p_id uuid, p_decision text, p_nota text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sol public.solicitudes_acopio%rowtype;
begin
  if not public.es_admin() then raise exception 'SOLO_ADMIN: solo administración puede revisar solicitudes'; end if;
  if p_decision not in ('aprobada', 'rechazada') then raise exception 'DECISION_INVALIDA'; end if;

  select * into v_sol from public.solicitudes_acopio where id = p_id for update;
  if not found then raise exception 'NO_ENCONTRADA: la solicitud ya no existe'; end if;
  if v_sol.estado <> 'pendiente' then raise exception 'YA_REVISADA: esta solicitud ya se revisó'; end if;

  update public.solicitudes_acopio
    set estado = p_decision, nota_admin = left(nullif(trim(p_nota), ''), 300), revisada_at = now()
    where id = p_id returning * into v_sol;

  if p_decision = 'aprobada' then
    -- La misma cuenta que pidió pasa a ser centro de acopio.
    insert into public.perfiles (user_id) values (v_sol.user_id) on conflict do nothing;
    update public.perfiles
      set rol = 'acopio',
          punto_acopio_id = 'centro-' || substr(v_sol.id::text, 1, 8),
          punto_acopio_nombre = v_sol.nombre,
          updated_at = now()
      where user_id = v_sol.user_id;
  end if;

  return to_jsonb(v_sol);
end;
$$;

-- 4. Correo de quien pidió (para que Mauri pueda contactarlo). Solo admin.
create or replace function public.solicitudes_con_correo()
returns table (id uuid, correo text)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, u.email from public.solicitudes_acopio s join auth.users u on u.id = s.user_id
  where public.es_admin();
$$;

revoke all on function public.es_admin() from public, anon;
revoke all on function public.revisar_solicitud(uuid, text, text) from public, anon;
revoke all on function public.solicitudes_con_correo() from public, anon;
grant execute on function public.es_admin() to authenticated;
grant execute on function public.revisar_solicitud(uuid, text, text) to authenticated;
grant execute on function public.solicitudes_con_correo() to authenticated;
