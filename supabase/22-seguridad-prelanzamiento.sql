-- 22: cierres de seguridad antes de abrir la app a más gente (decisión de Mauri, 10 de noviembre de 2026).
-- Detalle en docs/seguridad-prelanzamiento.md.
--
-- Se aplica ANTES de hacer deploy de la rama fix/seguridad-prelanzamiento: la app nueva llama a
-- cancelar_orden_escrow con p_uid, que no existe hasta correr esto. Entre la migración y el deploy, cancelar
-- un pedido ya pagado responde USA_LA_APP (no cancela ni cobra nada); hacer las dos cosas seguidas.

-- 1) Fotos: la app sube JPEG de ~100 KB (la más pesada hoy pesa 975 KB). Con 25 MB y cualquier image/*
--    una sola cuenta podía llenar el almacenamiento, y SVG permite subir HTML con scripts.
update storage.buckets
  set file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  where id = 'closet-images';

-- 2) Una prenda con un pedido en curso no se vuelve a poner en venta ni se borra: otra persona pagaría por
--    algo que ya está comprometido.
create or replace function public.prendas_pedido_activo()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if exists (
    select 1 from public.escrow_ordenes o, jsonb_array_elements(o.items) e
    where o.status in ('pendiente_pago', 'pago_en_custodia', 'en_renta_cliente')
      and e->'prenda'->>'id' = old.id::text
      -- Republicar solo choca con una compra viva; así una renta en curso no impide que
      -- reponer_prendas_orden regrese la prenda a la venta al cancelar otra orden.
      and (tg_op = 'DELETE' or e->>'tipo' = 'compra')
  ) then
    raise exception 'PRENDA_EN_PEDIDO: esta prenda está en un pedido en curso';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;
revoke all on function public.prendas_pedido_activo() from public, anon, authenticated;

drop trigger if exists prendas_pedido_activo_venta_trg on public.prendas;
create trigger prendas_pedido_activo_venta_trg before update of en_venta on public.prendas
  for each row when (new.en_venta and not coalesce(old.en_venta, false))
  execute function public.prendas_pedido_activo();

drop trigger if exists prendas_pedido_activo_borrar_trg on public.prendas;
create trigger prendas_pedido_activo_borrar_trg before delete on public.prendas
  for each row execute function public.prendas_pedido_activo();

-- 3) Cancelar un pedido YA PAGADO solo lo hace el servidor (/api/escrow/cancelar), que es quien reembolsa en
--    Stripe. Antes, llamando a esta función directo, el pedido se cancelaba y el reembolso nunca salía.
--    Un pedido sin pagar se sigue cancelando con la sesión normal (lo usa el checkout cuando Stripe falla).
drop function if exists public.cancelar_orden_escrow(text);
create or replace function public.cancelar_orden_escrow(p_token text, p_uid uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_servidor boolean := coalesce(auth.role() = 'service_role', false);
  -- p_uid solo cuenta cuando llama el servidor; con sesión manda la sesión, así nadie se hace pasar por otro.
  v_uid uuid := case when v_servidor then p_uid else auth.uid() end;
  v_token text := upper(regexp_replace(trim(p_token), '^#', ''));
  v_orden public.escrow_ordenes%rowtype;
begin
  if v_uid is null then raise exception 'SIN_SESION: inicia sesión'; end if;

  select * into v_orden from public.escrow_ordenes
    where upper(qr_token) = v_token or upper(order_code) = v_token or id::text = lower(v_token)
    for update;
  if not found then raise exception 'ORDEN_NO_ENCONTRADA: verifica el folio'; end if;

  -- es_acopio() y es_admin() leen auth.uid(), que viene vacío cuando llama el servidor.
  if v_orden.buyer_user_id is distinct from v_uid and not exists (
    select 1 from public.perfiles where user_id = v_uid and (rol = 'acopio' or es_admin)
  ) then
    raise exception 'SIN_PERMISO: solo quien compró puede cancelar este pedido';
  end if;
  if v_orden.status not in ('pendiente_pago', 'pago_en_custodia') then
    raise exception 'NO_CANCELABLE: el pedido ya se entregó o ya estaba cancelado';
  end if;
  if v_orden.status = 'pago_en_custodia' and not v_servidor then
    raise exception 'USA_LA_APP: cancela este pedido desde la app para recibir tu reembolso';
  end if;

  update public.escrow_ordenes set status = 'cancelado', validated_at = now(),
    validated_by = 'cancelado:' || v_uid::text
    where id = v_orden.id returning * into v_orden;
  perform public.reponer_prendas_orden(v_orden);

  return to_jsonb(v_orden);
end;
$function$;
-- Una función nueva nace ejecutable por todos: se deja como estaba la anterior (sin anon).
revoke all on function public.cancelar_orden_escrow(text, uuid) from public, anon;
grant execute on function public.cancelar_orden_escrow(text, uuid) to authenticated, service_role;
