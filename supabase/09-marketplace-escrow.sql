-- 09: marketplace visible desde la base y escrow con su propia tabla.
-- Detalle en docs/tanda-registro-pwa/fase-4-marketplace-escrow.md.
--
-- Antes: (1) RLS de prendas solo deja ver las propias, así que el marketplace
-- nunca veía las prendas en venta de otras personas; (2) el escrow se
-- guardaba en donacion_tickets (con el dinero en la columna de puntos) y en
-- localStorage; (3) el total de la compra lo calculaba el navegador.

-- 1. Marketplace público ------------------------------------------------------
-- Solo columnas para anunciar; nada de compras, usos ni datos de la dueña.
create or replace function public.marketplace_publico(p_tipo text)
returns table (
  id bigint, user_id uuid, name text, category text, image_url text, description text,
  color text, style text, talla text, estado_uso text, precio numeric, precio_renta numeric,
  en_venta boolean, en_renta boolean, created_at timestamp
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.user_id, p.name, p.category, p.image_url, p.description, p.color, p.style,
         p.talla, p.estado_uso, p.precio, p.precio_renta, p.en_venta, p.en_renta, p.created_at
  from public.prendas p
  where (p_tipo = 'venta' and p.en_venta and coalesce(p.precio, 0) > 0)
     or (p_tipo = 'renta' and p.en_renta and coalesce(p.precio_renta, 0) > 0)
  order by p.created_at desc;
$$;

-- 2. Tabla de órdenes en custodia ---------------------------------------------
create table if not exists public.escrow_ordenes (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null,
  qr_token text unique not null,
  buyer_user_id uuid references auth.users(id) on delete set null,
  buyer_name text not null,
  buyer_email text,
  vendedor_ids uuid[] not null default '{}',
  items jsonb not null,
  subtotal numeric(10, 2) not null,
  garantia_escrow numeric(10, 2) not null default 0,
  total_pagado numeric(10, 2) not null,
  metodo_pago text not null default 'tarjeta' check (metodo_pago in ('tarjeta', 'puntos', 'saldo')),
  status text not null default 'pago_en_custodia'
    check (status in ('pago_en_custodia', 'listo_en_punto', 'en_renta_cliente', 'entregado_y_liberado', 'cancelado')),
  punto_acopio_id text not null default 'norte',
  punto_acopio_nombre text not null default 'Centro de Acopio Norte',
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  validated_by text
);

alter table public.escrow_ordenes enable row level security;
-- Ve la orden quien compra, quien vende y el punto de acopio. Nadie escribe directo.
drop policy if exists "escrow_select" on public.escrow_ordenes;
create policy "escrow_select" on public.escrow_ordenes
  for select to authenticated
  using (buyer_user_id = auth.uid() or auth.uid() = any(vendedor_ids) or public.es_acopio());

-- 3. Crear orden: el precio lo pone la base ----------------------------------
-- p_items: [{ "prenda_id": 123, "tipo": "compra" | "renta", "fecha_renta": "2026-11-05" }]
create or replace function public.crear_orden_escrow(
  p_items jsonb, p_metodo text default 'tarjeta',
  p_punto_id text default 'norte', p_punto_nombre text default 'Centro de Acopio Norte'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
      -- Apartada: nadie más la puede comprar mientras la orden está en custodia.
      update public.prendas set en_venta = false where id = v_prenda.id;
    elsif v_tipo = 'renta' then
      if not v_prenda.en_renta or coalesce(v_prenda.precio_renta, 0) <= 0 then
        raise exception 'PRENDA_NO_DISPONIBLE: "%" ya no está en renta', v_prenda.name;
      end if;
      v_fecha := (v_item->>'fecha_renta')::date;
      if v_fecha is null or v_fecha < v_hoy or v_fecha > v_hoy + 180 then
        raise exception 'FECHA_INVALIDA: elige una fecha de renta entre hoy y 6 meses';
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
    -- Mismo formato que CartItem en la app, con el precio tomado de la base.
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
    coalesce(nullif(p_punto_id, ''), 'norte'), coalesce(nullif(p_punto_nombre, ''), 'Centro de Acopio Norte'))
  returning * into v_orden;

  return to_jsonb(v_orden);
end;
$$;

-- 4. Avanzar una orden en el punto de acopio ---------------------------------
-- p_accion: 'entregar_renta' (QR #1: la prenda rentada sale con el cliente)
--           'liberar'        (compra entregada, o renta devuelta: se libera el pago)
create or replace function public.escrow_avanzar(p_token text, p_accion text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

    -- Las prendas compradas pasan al armario de quien compró.
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
$$;

-- 5. Fechas rentadas: ahora salen de escrow_ordenes ------------------------------
create or replace function public.fechas_rentadas(p_prenda_id text default null)
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select distinct e->>'fechaRenta'
  from public.escrow_ordenes o, jsonb_array_elements(o.items) e
  where o.status in ('pago_en_custodia', 'en_renta_cliente', 'entregado_y_liberado')
    and e->>'tipo' = 'renta' and e->>'fechaRenta' is not null
    and (p_prenda_id is null or e->'prenda'->>'id' = p_prenda_id);
$$;

-- 6. Pasar las órdenes viejas de donacion_tickets a escrow_ordenes ---------------
-- Allá el dinero estaba en puntos_otorgados. Las filas viejas se conservan
-- (no se borra nada); la app ya no las usa como escrow.
insert into public.escrow_ordenes (order_code, qr_token, buyer_user_id, buyer_name, buyer_email, vendedor_ids,
  items, subtotal, total_pagado, status, punto_acopio_id, punto_acopio_nombre, created_at, validated_at, validated_by)
select
  replace(t.qr_token, 'ESC-QR-', 'ESC-'),
  t.qr_token,
  case when t.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       and exists (select 1 from auth.users u where u.id = t.user_id::uuid) then t.user_id::uuid end,
  coalesce(t.donor_name, 'Comprador'),
  t.donor_email,
  coalesce((select array_agg(distinct (e->'prenda'->>'user_id')::uuid)
            from jsonb_array_elements(case when jsonb_typeof(t.prendas_ids) = 'array' then t.prendas_ids else '[]'::jsonb end) e
            where (e->'prenda'->>'user_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'), '{}'),
  case when jsonb_typeof(t.prendas_ids) = 'array' then t.prendas_ids else '[]'::jsonb end,
  coalesce(t.puntos_otorgados, 0),
  coalesce(t.puntos_otorgados, 0),
  t.status,
  t.punto_acopio_id,
  t.punto_acopio_nombre,
  t.created_at,
  t.validated_at,
  t.validated_by
from public.donacion_tickets t
where t.status in ('pago_en_custodia', 'en_renta_cliente', 'entregado_y_liberado')
on conflict (qr_token) do nothing;

-- 7. Permisos -------------------------------------------------------------------
revoke all on function public.crear_orden_escrow(jsonb, text, text, text) from public, anon;
revoke all on function public.escrow_avanzar(text, text) from public, anon;
grant execute on function public.crear_orden_escrow(jsonb, text, text, text) to authenticated;
grant execute on function public.escrow_avanzar(text, text) to authenticated;
grant execute on function public.marketplace_publico(text) to anon, authenticated;
grant execute on function public.fechas_rentadas(text) to anon, authenticated;
