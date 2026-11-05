-- 17: planes de pago plus/elite y datos de la suscripcion de Stripe.
-- Detalle y motivos en docs/tanda-pagos/fase-1-suscripciones.md.
-- Aplicar ANTES de desplegar el codigo que cobra con Stripe: el webhook escribe
-- 'plus' y 'elite', que el check viejo rechaza.

begin;

-- Topes por plan (los lee usar_ia y prendas_limite_plan). plus/elite heredan el
-- uso justo diario que tenia premium.
alter table public.limites_plan drop constraint if exists limites_plan_plan_check;
insert into public.limites_plan (plan, prendas, analisis_dia, analisis_total, outfits_dia, tope_global_dia) values
  ('plus', 200, 30, null, 15, null),
  ('elite', 500, 30, null, 15, null)
on conflict (plan) do update set
  prendas = excluded.prendas,
  analisis_dia = excluded.analisis_dia,
  analisis_total = excluded.analisis_total,
  outfits_dia = excluded.outfits_dia,
  tope_global_dia = excluded.tope_global_dia;

-- Las cuentas premium (creadas a mano) pasan a elite.
alter table public.perfiles drop constraint if exists perfiles_plan_check;
update public.perfiles set plan = 'elite', updated_at = now() where plan = 'premium';
delete from public.limites_plan where plan = 'premium';
update public.uso_ia_dia set plan = 'elite' where plan = 'premium';

alter table public.perfiles
  add constraint perfiles_plan_check check (plan in ('gratis', 'plus', 'elite'));
alter table public.limites_plan
  add constraint limites_plan_plan_check check (plan in ('gratis', 'plus', 'elite'));

-- Suscripcion de Stripe. Solo las escribe el webhook con la service role;
-- el usuario no tiene grant de update en estas columnas.
alter table public.perfiles
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text,
  add column if not exists suscripcion_estado text,
  add column if not exists suscripcion_vence timestamptz;

commit;
