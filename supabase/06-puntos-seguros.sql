-- 06: puntos, donaciones y escrow protegidos en la base.
-- Detalle y motivos en docs/tanda-registro-pwa/fase-3-armario-al-dia.md.
--
-- Antes: puntos_historial, donacion_tickets y acopio_registros estaban sin
-- RLS, y los puntos se acreditaban con inserts desde el navegador. Con la
-- anon key (pública) cualquiera podía darse puntos o leer datos de otros.
-- Ahora los puntos solo cambian por las funciones de este archivo.

-- 1. Cuentas de punto de recolección -----------------------------------------
alter table public.perfiles
  add column if not exists rol text not null default 'usuario' check (rol in ('usuario', 'acopio')),
  add column if not exists punto_acopio_id text,
  add column if not exists punto_acopio_nombre text;
-- rol y punto_* no están en el grant de update de 05: el usuario no puede dárselos.

create or replace function public.es_acopio()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.perfiles where user_id = auth.uid() and rol = 'acopio');
$$;

-- 2. Columnas de compra reciente en prendas ----------------------------------
alter table public.prendas
  add column if not exists comprada_reciente boolean not null default false,
  add column if not exists compra_lugar text,
  add column if not exists compra_tienda text,
  add column if not exists compra_precio numeric,
  add column if not exists compra_fecha date;

-- 3. RLS -----------------------------------------------------------------------
alter table public.puntos_historial enable row level security;
alter table public.donacion_tickets enable row level security;
alter table public.acopio_registros enable row level security;

-- puntos_historial: cada quien ve lo suyo; nadie escribe directo.
drop policy if exists "puntos_select_propio" on public.puntos_historial;
create policy "puntos_select_propio" on public.puntos_historial
  for select to authenticated using (user_id = auth.uid()::text);

-- donacion_tickets (también guarda órdenes de escrow):
-- la usuaria crea y ve los suyos; el punto de acopio ve y actualiza todos.
drop policy if exists "tickets_select" on public.donacion_tickets;
create policy "tickets_select" on public.donacion_tickets
  for select to authenticated using (user_id = auth.uid()::text or public.es_acopio());

drop policy if exists "tickets_insert_propio" on public.donacion_tickets;
create policy "tickets_insert_propio" on public.donacion_tickets
  for insert to authenticated with check (
    user_id = auth.uid()::text
    and status in ('pendiente', 'pago_en_custodia')
    and validated_at is null
    and validated_by is null
  );

drop policy if exists "tickets_update_acopio" on public.donacion_tickets;
create policy "tickets_update_acopio" on public.donacion_tickets
  for update to authenticated using (public.es_acopio()) with check (public.es_acopio());

-- acopio_registros: bitácora del punto de acopio. Sus puntos son solo
-- informativos: el saldo sale únicamente de puntos_historial.
drop policy if exists "acopio_select" on public.acopio_registros;
create policy "acopio_select" on public.acopio_registros
  for select to authenticated using (public.es_acopio() or donor_user_id = auth.uid()::text);

drop policy if exists "acopio_insert" on public.acopio_registros;
create policy "acopio_insert" on public.acopio_registros
  for insert to authenticated with check (public.es_acopio());

-- 4. Saldo -----------------------------------------------------------------------
-- 150 de base (como ya mostraba la app) + movimientos de puntos_historial.
create or replace function public.mis_puntos()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select 150 + coalesce((select sum(puntos) from public.puntos_historial where user_id = auth.uid()::text), 0)::int;
$$;

-- 5. Validar QR de donación (solo punto de acopio) ---------------------------
-- Los puntos se calculan aquí con la misma fórmula que mostraba la app
-- (3+ prendas: 100 + 20 por cada extra; menos de 3: 50), nunca del QR.
create or replace function public.validar_donacion_qr(p_token text, p_cantidad int default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil public.perfiles%rowtype;
  v_ticket public.donacion_tickets%rowtype;
  v_cantidad int;
  v_puntos int;
  v_registro uuid;
  v_ids bigint[];
begin
  select * into v_perfil from public.perfiles where user_id = auth.uid();
  if v_perfil.rol is distinct from 'acopio' then
    raise exception 'SOLO_ACOPIO: solo un punto de recolección puede validar donaciones';
  end if;

  select * into v_ticket from public.donacion_tickets where qr_token = trim(p_token) for update;
  if not found then
    raise exception 'TICKET_NO_ENCONTRADO: este código no corresponde a ninguna donación';
  end if;
  if upper(v_ticket.qr_token) like 'ESC-%' or v_ticket.status in ('pago_en_custodia', 'en_renta_cliente', 'entregado_y_liberado') then
    raise exception 'NO_ES_DONACION: este código es de una entrega de compra o renta';
  end if;
  if v_ticket.status <> 'pendiente' then
    raise exception 'TICKET_YA_VALIDADO: esta donación ya se registró';
  end if;

  -- El punto de acopio puede corregir la cantidad con lo que recibió en mano. Tope de 30 por ticket.
  v_cantidad := least(greatest(coalesce(p_cantidad, v_ticket.cantidad_prendas, 1), 1), 30);
  v_puntos := case when v_cantidad >= 3 then 100 + (v_cantidad - 3) * 20 else 50 end;

  update public.donacion_tickets
    set status = 'completado', validated_at = now(),
        validated_by = coalesce(v_perfil.punto_acopio_id, auth.uid()::text),
        cantidad_prendas = v_cantidad, puntos_otorgados = v_puntos
    where id = v_ticket.id;

  insert into public.acopio_registros (ticket_id, punto_acopio_id, punto_acopio_nombre, donor_user_id,
    donor_name, donor_email, cantidad_prendas, puntos_otorgados, fecha_registro, observaciones)
  values (v_ticket.id, coalesce(v_perfil.punto_acopio_id, v_ticket.punto_acopio_id),
    coalesce(v_perfil.punto_acopio_nombre, v_ticket.punto_acopio_nombre), v_ticket.user_id,
    v_ticket.donor_name, v_ticket.donor_email, v_cantidad, v_puntos, now(),
    'Donación verificada por QR (' || v_ticket.qr_token || ')')
  returning id into v_registro;

  -- Solo cuentas reales reciben puntos; un ticket sin cuenta queda en la bitácora.
  if v_ticket.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    insert into public.puntos_historial (user_id, puntos, tipo, referencia_id, descripcion)
    values (v_ticket.user_id, v_puntos, 'donacion', v_ticket.id::text,
      'Donación de ' || v_cantidad || ' prendas verificada en ' || coalesce(v_perfil.punto_acopio_nombre, 'punto de recolección'));

    -- Marca como donadas solo prendas que son de quien dona.
    select array_agg(x::bigint) into v_ids
    from (
      select case when jsonb_typeof(e) = 'object' then e->>'id' else e #>> '{}' end as x
      from jsonb_array_elements(case when jsonb_typeof(v_ticket.prendas_ids) = 'array' then v_ticket.prendas_ids else '[]'::jsonb end) e
    ) s
    where x ~ '^\d+$';

    if v_ids is not null then
      update public.prendas
        set estado_uso = 'Donada',
            metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('donada', true, 'fecha_donacion', now())
        where id = any(v_ids) and user_id = v_ticket.user_id::uuid;
    end if;
  end if;

  return jsonb_build_object(
    'puntos', v_puntos,
    'donor_name', v_ticket.donor_name,
    'donor_email', v_ticket.donor_email,
    'cantidad', v_cantidad,
    'prendas', coalesce(v_ticket.prendas_ids, '[]'::jsonb),
    'registro_id', v_registro
  );
end;
$$;

-- 6. Canje de puntos por descuentos ------------------------------------------
-- Costos y códigos deben coincidir con OPCIONES_CANJE_SUSCRIPCION (constants/donaciones.ts).
create or replace function public.canjear_puntos(p_opcion text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_costo int;
  v_prefijo text;
  v_codigo text;
  v_saldo int;
begin
  if v_uid is null then raise exception 'SIN_SESION'; end if;
  select costo, prefijo into v_costo, v_prefijo from (values
    ('desc_20', 400, 'DONA20OFF'),
    ('desc_50', 800, 'DONA50OFF'),
    ('mes_gratis', 1500, 'DONAFREE1M')
  ) o(id, costo, prefijo) where o.id = p_opcion;
  if v_costo is null then raise exception 'OPCION_INVALIDA'; end if;

  -- Bloquea el perfil para que dos canjes simultáneos no gasten el mismo saldo.
  perform 1 from public.perfiles where user_id = v_uid for update;
  v_saldo := 150 + coalesce((select sum(puntos) from public.puntos_historial where user_id = v_uid::text), 0);
  if v_saldo < v_costo then raise exception 'PUNTOS_INSUFICIENTES'; end if;

  v_codigo := v_prefijo || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
  insert into public.puntos_historial (user_id, puntos, tipo, referencia_id, descripcion)
  values (v_uid::text, -v_costo, 'canje_suscripcion', p_opcion, v_codigo);

  return jsonb_build_object('codigo', v_codigo, 'puntos_usados', v_costo, 'saldo', v_saldo - v_costo);
end;
$$;

-- 7. Compra reciente: datos para estadística + 10 pts (tope 100/mes) ------
create or replace function public.registrar_compra_reciente(
  p_prenda_id bigint, p_lugar text, p_tienda text, p_precio numeric, p_fecha date
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_mes_inicio timestamptz := date_trunc('month', now() at time zone 'America/Mexico_City') at time zone 'America/Mexico_City';
  v_ganados int;
  v_puntos int := 10;
begin
  if v_uid is null then raise exception 'SIN_SESION'; end if;
  if p_lugar not in ('tienda', 'online', 'segunda_mano') then raise exception 'LUGAR_INVALIDO'; end if;
  if p_precio is null or p_precio < 0 or p_precio > 1000000 then raise exception 'PRECIO_INVALIDO'; end if;
  if p_fecha is null or p_fecha > (now() at time zone 'America/Mexico_City')::date
     or p_fecha < (now() at time zone 'America/Mexico_City')::date - 60 then
    raise exception 'FECHA_INVALIDA: la compra debe ser de los últimos 60 días';
  end if;

  update public.prendas
    set comprada_reciente = true, compra_lugar = p_lugar, compra_tienda = left(nullif(trim(p_tienda), ''), 80),
        compra_precio = p_precio, compra_fecha = p_fecha
    where id = p_prenda_id and user_id = v_uid;
  if not found then raise exception 'PRENDA_NO_ENCONTRADA'; end if;

  -- Una sola vez por prenda.
  if exists (select 1 from public.puntos_historial where tipo = 'compra_registrada' and referencia_id = p_prenda_id::text) then
    return 0;
  end if;

  select coalesce(sum(puntos), 0) into v_ganados from public.puntos_historial
    where user_id = v_uid::text and tipo = 'compra_registrada' and created_at >= v_mes_inicio;
  v_puntos := least(v_puntos, 100 - v_ganados);
  if v_puntos <= 0 then return 0; end if;

  insert into public.puntos_historial (user_id, puntos, tipo, referencia_id, descripcion)
  values (v_uid::text, v_puntos, 'compra_registrada', p_prenda_id::text, 'Compra reciente registrada');
  return v_puntos;
end;
$$;

-- 8. Lecturas públicas sin exponer datos personales --------------------------
create or replace function public.impacto_donaciones()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(cantidad_prendas), 0)::int from public.acopio_registros
  where ticket_id is null or ticket_id not in (
    select id from public.donacion_tickets where status in ('pago_en_custodia', 'en_renta_cliente', 'entregado_y_liberado')
  );
$$;

-- Fechas ya rentadas de una prenda, para que el calendario no deje rentarla dos veces.
create or replace function public.fechas_rentadas(p_prenda_id text default null)
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select distinct e->>'fechaRenta'
  from public.donacion_tickets t,
       jsonb_array_elements(case when jsonb_typeof(t.prendas_ids) = 'array' then t.prendas_ids else '[]'::jsonb end) e
  where t.status in ('pago_en_custodia', 'en_renta_cliente', 'entregado_y_liberado')
    and e->>'fechaRenta' is not null
    and (p_prenda_id is null or e->'prenda'->>'id' = p_prenda_id);
$$;

-- 9. Permisos de las funciones ------------------------------------------------
revoke all on function public.es_acopio() from public, anon;
revoke all on function public.mis_puntos() from public, anon;
revoke all on function public.validar_donacion_qr(text, int) from public, anon;
revoke all on function public.canjear_puntos(text) from public, anon;
revoke all on function public.registrar_compra_reciente(bigint, text, text, numeric, date) from public, anon;
grant execute on function public.es_acopio() to authenticated;
grant execute on function public.mis_puntos() to authenticated;
grant execute on function public.validar_donacion_qr(text, int) to authenticated;
grant execute on function public.canjear_puntos(text) to authenticated;
grant execute on function public.registrar_compra_reciente(bigint, text, text, numeric, date) to authenticated;
grant execute on function public.impacto_donaciones() to anon, authenticated;
grant execute on function public.fechas_rentadas(text) to anon, authenticated;
