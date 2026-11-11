-- 21: marketplace con pago real en Stripe y 15% de comisión (decisión de Mauri, 10 de noviembre de 2026).
--
-- Flujo: /api/marketplace/checkout crea la orden en 'pendiente_pago' (aparta las prendas) y abre el pago
-- en Stripe. El webhook la pasa a 'pago_en_custodia'. El dinero queda en la cuenta de Clossapp hasta que el
-- centro de acopio escanea el QR ('liberar'); entonces /api/escrow/avanzar transfiere a cada vendedor el 85%
-- de lo suyo a su cuenta Express de Stripe. Cancelar antes de entregar reembolsa todo.
--
-- Se aplica AL HACER DEPLOY de la rama feat/marketplace-stripe, no antes: la app actual crea las órdenes
-- sin pago y con esto quedarían en 'pendiente_pago' hasta expirar.

-- Cuenta de cobro del vendedor. Solo el servidor las escribe (authenticated no tiene UPDATE en estas columnas:
-- 05-perfiles.sql le da UPDATE solo a una lista de columnas y estas no están en ella).
-- cobros_estado: sin_cuenta (no ha empezado), en_revision (Stripe verifica sus datos), requiere_datos (Stripe
-- pide algo más o la restringió), activa (puede cobrar; cobros_activos = true).
alter table public.perfiles
  add column if not exists stripe_account_id text,
  add column if not exists cobros_activos boolean not null default false,
  add column if not exists cobros_estado text not null default 'sin_cuenta'
    check (cobros_estado in ('sin_cuenta', 'en_revision', 'requiere_datos', 'activa'));

-- Cuándo se publicó para venta o renta (la pone prendas_marketplace_plan): para mostrar "lleva N días publicada".
alter table public.prendas add column if not exists publicada_en timestamptz;

alter table public.escrow_ordenes
  add column if not exists stripe_checkout_id text,
  add column if not exists stripe_payment_intent text,
  add column if not exists stripe_charge_id text,
  add column if not exists stripe_reembolso_id text;

alter table public.escrow_ordenes drop constraint if exists escrow_ordenes_status_check;
alter table public.escrow_ordenes add constraint escrow_ordenes_status_check check (status = any (array[
  'pendiente_pago', 'pago_en_custodia', 'listo_en_punto', 'en_renta_cliente', 'entregado_y_liberado', 'cancelado'
]));
alter table public.escrow_ordenes alter column status set default 'pendiente_pago';
alter table public.escrow_ordenes alter column punto_acopio_id set default 'tecnm-saltillo';
alter table public.escrow_ordenes alter column punto_acopio_nombre set default 'TecNM ITS Saltillo';

-- Lo que se le paga a cada vendedor por orden. Una fila por vendedor; 'pendiente' si aún no conecta su cuenta.
create table if not exists public.escrow_pagos_vendedor (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid not null references public.escrow_ordenes(id) on delete restrict,
  vendedor_id uuid not null references auth.users(id) on delete restrict,
  bruto_centavos integer not null check (bruto_centavos >= 0),
  comision_centavos integer not null check (comision_centavos >= 0),
  neto_centavos integer not null check (neto_centavos >= 0),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'enviado')),
  stripe_transfer_id text,
  created_at timestamptz not null default now(),
  enviado_at timestamptz,
  unique (orden_id, vendedor_id)
);

alter table public.escrow_pagos_vendedor enable row level security;
drop policy if exists pagos_vendedor_select_propio on public.escrow_pagos_vendedor;
create policy pagos_vendedor_select_propio on public.escrow_pagos_vendedor
  for select using (auth.uid() = vendedor_id);
-- Sin políticas de escritura: solo el servidor con service role.

-- Publicar para venta o renta también pide cuenta de cobro activa: si no, el vendedor no tendría a dónde
-- recibir su dinero. (Reemplaza la función de 18-gratis-solo-dona.sql.)
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
  ) then
    if not public.tiene_marketplace(new.user_id) then
      raise exception 'PLAN_SIN_MARKETPLACE: vender y rentar es parte de Plus y Elite';
    end if;
    if not exists (select 1 from public.perfiles where user_id = new.user_id and cobros_activos) then
      raise exception 'SIN_CUENTA_COBRO: conecta tu cuenta de cobro para vender o rentar';
    end if;
    new.publicada_en := now();
  end if;
  return new;
end;
$$;

-- crear_orden_escrow: igual que antes, pero la orden nace en 'pendiente_pago' (por el default), hay un tope
-- de órdenes sin pagar por cuenta (cada una aparta prendas) y la renta es a máximo 60 días: Stripe pide
-- no retener fondos más de 90 días.
create or replace function public.crear_orden_escrow(p_items jsonb, p_metodo text default 'tarjeta'::text,
  p_punto_id text default 'tecnm-saltillo'::text, p_punto_nombre text default 'TecNM ITS Saltillo'::text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_item jsonb;
  v_prenda public.prendas%rowtype;
  v_tipo text;
  v_fecha date;
  v_precio numeric;
  v_items jsonb := '[]'::jsonb;
  v_vendedores uuid[] := '{}';
  v_total numeric := 0;
  v_codigo text;
  v_orden public.escrow_ordenes%rowtype;
  v_hoy date := (now() at time zone 'America/Mexico_City')::date;
begin
  if v_uid is null then raise exception 'SIN_SESION: inicia sesión para comprar'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'CARRITO_INVALIDO: el carrito está vacío o es demasiado grande';
  end if;
  if (select count(*) from public.escrow_ordenes where buyer_user_id = v_uid and status = 'pendiente_pago') >= 3 then
    raise exception 'PAGOS_PENDIENTES: termina o cancela tus pagos pendientes antes de abrir otro';
  end if;
  select email into v_email from auth.users where id = v_uid;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_tipo := v_item->>'tipo';
    select * into v_prenda from public.prendas where id = (v_item->>'prenda_id')::bigint for update;
    if not found then raise exception 'PRENDA_NO_DISPONIBLE: una prenda ya no existe'; end if;
    if v_prenda.user_id = v_uid then raise exception 'PRENDA_PROPIA: no puedes comprar ni rentar tu propia prenda'; end if;

    if v_tipo = 'compra' then
      if not v_prenda.en_venta or coalesce(v_prenda.precio, 0) <= 0 then
        raise exception 'PRENDA_NO_DISPONIBLE: "%" ya no está a la venta', v_prenda.name;
      end if;
      v_precio := v_prenda.precio;
      v_fecha := null;
      update public.prendas set en_venta = false where id = v_prenda.id;
    elsif v_tipo = 'renta' then
      if not v_prenda.en_renta or coalesce(v_prenda.precio_renta, 0) <= 0 then
        raise exception 'PRENDA_NO_DISPONIBLE: "%" ya no está en renta', v_prenda.name;
      end if;
      v_fecha := (v_item->>'fecha_renta')::date;
      if v_fecha is null or v_fecha < v_hoy or v_fecha > v_hoy + 60 then
        raise exception 'FECHA_INVALIDA: elige una fecha de renta entre hoy y 2 meses';
      end if;
      if exists (select 1 from public.fechas_rentadas(v_prenda.id::text) f where f = v_fecha::text) then
        raise exception 'FECHA_OCUPADA: "%" ya está rentada ese día', v_prenda.name;
      end if;
      v_precio := v_prenda.precio_renta;
    else
      raise exception 'TIPO_INVALIDO';
    end if;

    v_total := v_total + v_precio;
    v_vendedores := array_append(v_vendedores, v_prenda.user_id);
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'id', gen_random_uuid(),
      'tipo', v_tipo,
      'precio', v_precio,
      'fechaRenta', v_fecha,
      'sellerId', v_prenda.user_id,
      'prenda', jsonb_build_object(
        'id', v_prenda.id::text, 'user_id', v_prenda.user_id, 'name', v_prenda.name, 'category', v_prenda.category,
        'image_url', v_prenda.image_url, 'talla', v_prenda.talla, 'estado_uso', v_prenda.estado_uso,
        'precio', v_prenda.precio, 'precio_renta', v_prenda.precio_renta, 'created_at', v_prenda.created_at
      )
    ));
  end loop;

  loop
    v_codigo := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.escrow_ordenes where order_code = 'ESC-' || v_codigo);
  end loop;

  insert into public.escrow_ordenes (order_code, qr_token, buyer_user_id, buyer_name, buyer_email, vendedor_ids,
    items, subtotal, total_pagado, metodo_pago, punto_acopio_id, punto_acopio_nombre)
  values ('ESC-' || v_codigo, 'ESC-QR-' || v_codigo, v_uid, coalesce(split_part(v_email, '@', 1), 'Comprador'), v_email,
    v_vendedores, v_items, v_total, v_total, coalesce(nullif(p_metodo, ''), 'tarjeta'),
    coalesce(nullif(p_punto_id, ''), 'tecnm-saltillo'), coalesce(nullif(p_punto_nombre, ''), 'TecNM ITS Saltillo'))
  returning * into v_orden;

  return to_jsonb(v_orden);
end;
$function$;

-- Regresa a la venta las prendas compradas de una orden cancelada (lo que antes hacía solo cancelar_orden_escrow).
create or replace function public.reponer_prendas_orden(p_orden public.escrow_ordenes)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids bigint[];
begin
  select array_agg((e->'prenda'->>'id')::bigint) into v_ids
    from jsonb_array_elements(p_orden.items) e
    where e->>'tipo' = 'compra' and (e->'prenda'->>'id') ~ '^\d+$';
  if v_ids is not null then
    update public.prendas p set en_venta = true
      where p.id = any(v_ids) and p.user_id = any(p_orden.vendedor_ids) and coalesce(p.precio, 0) > 0;
  end if;
end;
$$;
revoke execute on function public.reponer_prendas_orden(public.escrow_ordenes) from public, anon, authenticated;

-- Cancelar: ahora también una orden sin pagar. El reembolso lo hace /api/escrow/cancelar después.
create or replace function public.cancelar_orden_escrow(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_token text := upper(regexp_replace(trim(p_token), '^#', ''));
  v_orden public.escrow_ordenes%rowtype;
begin
  if v_uid is null then raise exception 'SIN_SESION: inicia sesión'; end if;

  select * into v_orden from public.escrow_ordenes
    where upper(qr_token) = v_token or upper(order_code) = v_token or id::text = lower(v_token)
    for update;
  if not found then raise exception 'ORDEN_NO_ENCONTRADA: verifica el folio'; end if;

  if v_orden.buyer_user_id is distinct from v_uid and not public.es_acopio() and not public.es_admin() then
    raise exception 'SIN_PERMISO: solo quien compró puede cancelar este pedido';
  end if;
  if v_orden.status not in ('pendiente_pago', 'pago_en_custodia') then
    raise exception 'NO_CANCELABLE: el pedido ya se entregó o ya estaba cancelado';
  end if;

  update public.escrow_ordenes set status = 'cancelado', validated_at = now(),
    validated_by = 'cancelado:' || v_uid::text
    where id = v_orden.id returning * into v_orden;
  perform public.reponer_prendas_orden(v_orden);

  return to_jsonb(v_orden);
end;
$function$;

-- Órdenes que nunca se pagaron: el pago de Stripe expira a los 30 minutos; a los 45 se liberan las prendas.
create or replace function public.expirar_ordenes_sin_pago()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orden public.escrow_ordenes%rowtype;
  v_n integer := 0;
begin
  for v_orden in
    update public.escrow_ordenes set status = 'cancelado', validated_at = now(), validated_by = 'expirado'
      where status = 'pendiente_pago' and created_at < now() - interval '45 minutes'
      returning *
  loop
    perform public.reponer_prendas_orden(v_orden);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
revoke execute on function public.expirar_ordenes_sin_pago() from public, anon, authenticated;

select cron.unschedule('clossapp-expirar-ordenes') where exists (select 1 from cron.job where jobname = 'clossapp-expirar-ordenes');
select cron.schedule('clossapp-expirar-ordenes', '*/10 * * * *', $$ select public.expirar_ordenes_sin_pago(); $$);

-- escrow_avanzar: entregar o liberar solo órdenes pagadas (antes se podía liberar cualquier estado no final).
create or replace function public.escrow_avanzar(p_token text, p_accion text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_perfil public.perfiles%rowtype;
  v_token text := upper(regexp_replace(trim(p_token), '^#', ''));
  v_orden public.escrow_ordenes%rowtype;
  v_tiene_renta boolean;
  v_ids bigint[];
begin
  select * into v_perfil from public.perfiles where user_id = auth.uid();
  if v_perfil.rol is distinct from 'acopio' then
    raise exception 'SOLO_ACOPIO: solo un punto de recolección puede entregar órdenes';
  end if;

  select * into v_orden from public.escrow_ordenes
    where upper(qr_token) = v_token or upper(order_code) = v_token or id::text = lower(v_token)
    for update;
  if not found then raise exception 'ORDEN_NO_ENCONTRADA: verifica el código QR o el folio'; end if;
  if v_orden.status = 'pendiente_pago' then raise exception 'SIN_PAGO: esta orden todavía no se paga'; end if;

  v_tiene_renta := exists (select 1 from jsonb_array_elements(v_orden.items) e where e->>'tipo' = 'renta');

  if p_accion = 'entregar_renta' then
    if not v_tiene_renta then raise exception 'NO_ES_RENTA: esta orden no tiene rentas'; end if;
    if v_orden.status <> 'pago_en_custodia' then raise exception 'ESTADO_INVALIDO: la prenda ya se entregó'; end if;
    update public.escrow_ordenes set status = 'en_renta_cliente' where id = v_orden.id returning * into v_orden;
  elsif p_accion = 'liberar' then
    if v_orden.status = 'entregado_y_liberado' then raise exception 'YA_LIBERADA: esta orden ya se entregó y liberó'; end if;
    if v_orden.status = 'cancelado' then raise exception 'CANCELADA: esta orden fue cancelada'; end if;
    if v_tiene_renta and v_orden.status <> 'en_renta_cliente' then
      raise exception 'ESTADO_INVALIDO: primero escanea el QR de entrega de la renta';
    end if;
    update public.escrow_ordenes
      set status = 'entregado_y_liberado', validated_at = now(),
          validated_by = coalesce(v_perfil.punto_acopio_id, auth.uid()::text)
      where id = v_orden.id returning * into v_orden;

    select array_agg((e->'prenda'->>'id')::bigint) into v_ids
      from jsonb_array_elements(v_orden.items) e
      where e->>'tipo' = 'compra' and (e->'prenda'->>'id') ~ '^\d+$';
    if v_ids is not null and v_orden.buyer_user_id is not null then
      update public.prendas
        set user_id = v_orden.buyer_user_id, en_venta = false, en_renta = false, precio = null, precio_renta = 0,
            usos = 0, ultimo_uso = null
        where id = any(v_ids);
    end if;

    insert into public.acopio_registros (ticket_id, punto_acopio_id, punto_acopio_nombre, donor_user_id, donor_name,
      donor_email, cantidad_prendas, puntos_otorgados, fecha_registro, observaciones)
    values (null, coalesce(v_perfil.punto_acopio_id, v_orden.punto_acopio_id),
      coalesce(v_perfil.punto_acopio_nombre, v_orden.punto_acopio_nombre), v_orden.buyer_user_id::text,
      v_orden.buyer_name, v_orden.buyer_email, jsonb_array_length(v_orden.items), 0, now(),
      'ENTREGA Y LIBERACIÓN DE CUSTODIA (#' || v_orden.order_code || '): $' || v_orden.total_pagado || ' MXN liberados');
  else
    raise exception 'ACCION_INVALIDA';
  end if;

  return to_jsonb(v_orden);
end;
$function$;
