# Fase 1: base de datos

Estado: **sin empezar.**
Rama: `feat/planificacion-base`. Archivo nuevo: `supabase/24-planificacion.sql`.

## Objetivo

Guardar planes y sus momentos, llevar la cuota de días planeados (D11), dejar al usuario solo las escrituras seguras (D12) y registrar los tokens reales de cada llamada a la IA.

## Diseño

- **`planes_outfit`**: un plan. El `tipo` solo sirve para prellenar el formulario y para saber si hay maleta (`viaje`). `lugar` guarda dónde se calcula el clima: `{ "nombre": "Oaxaca, México", "lat": 17.06, "lon": -96.72, "zona": "America/Mexico_City" }`. Es obligatorio en viajes y opcional en los otros dos tipos. `empacadas` son los ids (texto) de las prendas marcadas en la maleta.
- **`plan_momentos`**: una fila por día y momento (`dia` o `noche`). `outfit` es `{ "titulo": "…", "descripcion": "…", "prenda_ids": ["123", "456"] }`. `faltante` es `{ "categoria": "Calzado", "motivo": "No tienes zapatos formales para la boda" }` o `null`. `clima` es `{ "min": 12, "max": 24, "texto": "Nublado", "lluvia": false, "fuente": "pronostico" }` (`fuente` puede ser `pronostico` o `historico`).
- **Quién escribe qué:**
  - El usuario solo **lee** sus filas (RLS). No tiene `insert`, `update` ni `delete` directos.
  - Crear, borrar, marcar maleta y "Me lo puse" van por funciones `security definer` que revisan que el plan sea suyo.
  - **Crear exige Elite.** Borrar, marcar maleta y "Me lo puse" no: así funciona el modo solo lectura (D12).
  - Guardar los outfits que devuelve la IA lo hace **solo el servidor** con el cliente admin (`supabaseAdmin()`), después de comprobar que el plan es del usuario de la sesión.
- **Cuota:** igual que `usar_ia` (`supabase/15-limites-plan.sql`), pero descuenta N días de una vez y tiene tope diario y mensual. Devolver cuota solo lo puede hacer el servidor (`service_role`); si lo pudiera llamar el usuario, se regalaría cuota infinita.
- **Límite de planes:** máximo 10 planes que no hayan terminado por usuario. Es una decisión de este plan para que nadie llene la base con planes vacíos; se puede ajustar.

## Pasos

1. Crear `supabase/24-planificacion.sql` con este contenido (comentarios en español, como el resto de migraciones):

```sql
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
```

2. **Probar sin dejar rastro** con el MCP de Supabase (`execute_sql`). Lo más seguro es un bloque `do` que ejecuta la migración, corre las pruebas, junta los resultados en un `jsonb` y **termina con `raise exception`**: Postgres deshace todo y el resultado llega en el mensaje del error. Así se probó este SQL el 11 nov 2026 y todos los casos de abajo dieron lo esperado.

```sql
do $do$
declare
  r jsonb := '{}'::jsonb;
  h date := (now() at time zone 'America/Mexico_City')::date;
  v_elite uuid;
begin
  execute $migr$ (pegar aquí el contenido completo de 24-planificacion.sql) $migr$;
  select user_id into v_elite from public.perfiles where plan = 'elite' limit 1;
  -- Hace que auth.uid() devuelva ese usuario dentro del bloque.
  perform set_config('request.jwt.claims', json_build_object('sub', v_elite, 'role', 'authenticated')::text, true);

  -- Cada caso que debe fallar va en su propio begin … exception para seguir con los demás:
  begin
    perform crear_plan_outfit('fecha', 'x', h - 1, h - 1, null,
      jsonb_build_array(jsonb_build_object('fecha', h - 1, 'momento', 'dia')));
    r := r || '{"pasada":"sin error"}';
  exception when others then r := r || jsonb_build_object('pasada', sqlerrm); end;

  r := r || jsonb_build_object('cuota1', usar_dias_plan(7), 'cuota2', usar_dias_plan(7), 'cuota3', usar_dias_plan(1));
  r := r || jsonb_build_object('auth_puede_devolver',
    has_function_privilege('authenticated', 'public.devolver_dias_plan(uuid,int)', 'execute'));

  raise exception 'RESULTADO %', r;
end
$do$;
```

   El bloque corre como `postgres`, así que los permisos se revisan con `has_function_privilege` y `has_table_privilege` en vez de cambiar de rol. Para probar con una cuenta no Elite, cambiar `request.jwt.claims` a un `user_id` con `plan <> 'elite'`. Casos mínimos:
   - Elite: `crear_plan_outfit('semana', 'Mi semana', <hoy>, <hoy+6>, null, <7 momentos>)` devuelve un uuid. `select * from plan_momentos` muestra 7 filas.
   - Con un día sin momento, falla con `FALTAN_DIAS`. Con fecha de ayer, `FECHA_PASADA`. Con 31 días, viola `planes_outfit_rango`. `viaje` sin lugar viola `planes_outfit_viaje_con_lugar`.
   - No Elite: `crear_plan_outfit` falla con `SOLO_ELITE` y `usar_dias_plan(3)` devuelve `solo_elite`.
   - Cuota: `usar_dias_plan(7)` y otra vez `usar_dias_plan(7)` dan `ok`; la tercera, `usar_dias_plan(1)`, da `plan_dia`.
   - `authenticated` no tiene `execute` sobre `devolver_dias_plan`. Llamada como postgres, baja el contador (7 + 7, devolver 5, queda en 9).
   - `authenticated` tiene `select` pero no `insert` sobre `plan_momentos`; `anon` no puede ejecutar `crear_plan_outfit`.
   - `marcar_empacada` con `'abc'` falla con `PRENDA_INVALIDA`; con un id numérico agrega y quita sin duplicar.
   - `marcar_momento_usado` devuelve `false` si el momento no está `listo` (todos están `pendiente` recién creados). Para probar el `true`, poner uno en `listo` como postgres.
3. Pasar el resultado de las pruebas a Mauri y **pedir el OK** para aplicar en producción. Con el OK, aplicar con `apply_migration` (nombre `planificacion`).
4. Después de aplicar, revisar los avisos de seguridad del proyecto (`get_advisors`, tipo `security`) y corregir lo nuevo que salga de estas tablas o funciones.

## Criterios de aceptación

- [ ] `supabase/24-planificacion.sql` existe y corre sin error dentro de una transacción.
- [ ] Todas las pruebas del paso 2 dan lo esperado.
- [ ] Mauri dio el OK y la migración está aplicada en producción.
- [ ] `get_advisors` no muestra avisos nuevos de estas tablas o funciones.

## Qué NO hacer

- No dar `insert`, `update` ni `delete` a `authenticated` sobre las tablas nuevas.
- No permitir que `authenticated` ejecute `devolver_dias_plan`.
- No tocar `usar_ia` ni las columnas de outfits y análisis: la cuota de planificación va aparte (D11).

## Hecho

(Lo llena quien ejecute la fase.)
