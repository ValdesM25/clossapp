-- 19: canjear puntos da un descuento automático en Stripe, sin códigos que copiar.
-- Si la cuenta ya paga, /api/puntos/canjear lo pega a su suscripción (próximo cobro).
-- Si no, queda pendiente y /api/stripe/checkout lo aplica en su primer pago.
-- Cupones en Stripe: canje_desc_20, canje_desc_50, canje_mes_gratis (un cobro, solo Plus y Elite).

create table if not exists public.descuentos_canje (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opcion text not null,
  historial_id uuid not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aplicado')),
  aplicado_en text,
  created_at timestamptz not null default now(),
  aplicado_at timestamptz
);

-- Un descuento esperando a la vez: dos en el mismo cobro no se suman, el segundo reemplazaría al primero.
create unique index if not exists descuentos_canje_un_pendiente
  on public.descuentos_canje (user_id) where estado = 'pendiente';

alter table public.descuentos_canje enable row level security;
drop policy if exists descuentos_canje_select_propio on public.descuentos_canje;
create policy descuentos_canje_select_propio on public.descuentos_canje
  for select using (auth.uid() = user_id);
-- Sin políticas de escritura: solo canjear_puntos (security definer) y el servidor con service role.

create or replace function public.canjear_puntos(p_opcion text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_costo int;
  v_titulo text;
  v_saldo int;
  v_hist uuid;
  v_desc uuid;
begin
  if v_uid is null then raise exception 'SIN_SESION'; end if;
  select costo, titulo into v_costo, v_titulo from (values
    ('desc_20', 400, 'Descuento de 20%'),
    ('desc_50', 800, 'Descuento de 50%'),
    ('mes_gratis', 1500, 'Un mes gratis')
  ) o(id, costo, titulo) where o.id = p_opcion;
  if v_costo is null then raise exception 'OPCION_INVALIDA'; end if;

  perform 1 from public.perfiles where user_id = v_uid for update;
  if exists (select 1 from public.descuentos_canje where user_id = v_uid and estado = 'pendiente') then
    raise exception 'DESCUENTO_PENDIENTE';
  end if;
  v_saldo := 150 + coalesce((select sum(puntos) from public.puntos_historial where user_id = v_uid::text), 0);
  if v_saldo < v_costo then raise exception 'PUNTOS_INSUFICIENTES'; end if;

  insert into public.puntos_historial (user_id, puntos, tipo, referencia_id, descripcion)
  values (v_uid::text, -v_costo, 'canje_suscripcion', p_opcion, v_titulo)
  returning id into v_hist;
  insert into public.descuentos_canje (user_id, opcion, historial_id)
  values (v_uid, p_opcion, v_hist)
  returning id into v_desc;

  return jsonb_build_object('descuento_id', v_desc, 'historial_id', v_hist, 'puntos_usados', v_costo, 'saldo', v_saldo - v_costo);
end;
$function$;
