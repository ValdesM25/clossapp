-- 11: cancelar una orden en custodia.
-- Detalle en docs/tanda-registro-pwa/fase-6-arreglos.md.
--
-- Solo mientras el pago sigue en custodia (nadie ha recogido nada). Puede
-- cancelar quien compró, el punto de acopio o administración. Las prendas
-- compradas vuelven a estar en venta; las fechas de renta se liberan solas
-- porque fechas_rentadas ignora las órdenes canceladas.
create or replace function public.cancelar_orden_escrow(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_token text := upper(regexp_replace(trim(p_token), '^#', ''));
  v_orden public.escrow_ordenes%rowtype;
  v_ids bigint[];
begin
  if v_uid is null then raise exception 'SIN_SESION: inicia sesión'; end if;

  select * into v_orden from public.escrow_ordenes
    where upper(qr_token) = v_token or upper(order_code) = v_token or id::text = lower(v_token)
    for update;
  if not found then raise exception 'ORDEN_NO_ENCONTRADA: verifica el folio'; end if;

  if v_orden.buyer_user_id is distinct from v_uid and not public.es_acopio() and not public.es_admin() then
    raise exception 'SIN_PERMISO: solo quien compró puede cancelar este pedido';
  end if;
  if v_orden.status <> 'pago_en_custodia' then
    raise exception 'NO_CANCELABLE: el pedido ya se entregó o ya estaba cancelado';
  end if;

  update public.escrow_ordenes set status = 'cancelado', validated_at = now(),
    validated_by = 'cancelado:' || v_uid::text
    where id = v_orden.id returning * into v_orden;

  -- Solo si la prenda sigue siendo de quien la vendía (no se toca si cambió de dueña).
  select array_agg((e->'prenda'->>'id')::bigint) into v_ids
    from jsonb_array_elements(v_orden.items) e
    where e->>'tipo' = 'compra' and (e->'prenda'->>'id') ~ '^\d+$';
  if v_ids is not null then
    update public.prendas p set en_venta = true
      where p.id = any(v_ids) and p.user_id = any(v_orden.vendedor_ids) and coalesce(p.precio, 0) > 0;
  end if;

  return to_jsonb(v_orden);
end;
$$;

revoke all on function public.cancelar_orden_escrow(text) from public, anon;
grant execute on function public.cancelar_orden_escrow(text) to authenticated;
