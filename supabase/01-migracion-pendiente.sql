-- ============================================================================
-- MIGRACIÓN PENDIENTE — NO CORRER TODAVÍA
--
-- Aplicar sólo después de correr 00-verificacion.sql y revisar su salida.
-- Cada bloque es independiente: se pueden aplicar por separado, en este orden.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- BLOQUE A — Varias fotos por prenda
--
-- Tabla aparte en vez de un arreglo en prendas, para poder marcar foto
-- principal y ordenarlas. Máximo 10 fotos por prenda.
-- ----------------------------------------------------------------------------

-- prendas.id es bigint (no uuid), así que la FK va tipada igual.
create table if not exists public.prenda_imagenes (
  id          bigint generated always as identity primary key,
  prenda_id   bigint not null references public.prendas(id) on delete cascade,
  user_id     uuid   not null references auth.users(id) on delete cascade,
  storage_path text not null,
  orden       smallint not null default 0,
  es_principal boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists prenda_imagenes_prenda_idx
  on public.prenda_imagenes (prenda_id, orden);

-- Una sola foto principal por prenda.
create unique index if not exists prenda_imagenes_una_principal_idx
  on public.prenda_imagenes (prenda_id)
  where es_principal;

-- Tope de 10 fotos por prenda, aplicado en la base y no sólo en la interfaz.
create or replace function public.prenda_imagenes_limite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.prenda_imagenes where prenda_id = new.prenda_id) >= 10 then
    raise exception 'Una prenda no puede tener más de 10 fotos';
  end if;
  return new;
end;
$$;

drop trigger if exists prenda_imagenes_limite_trg on public.prenda_imagenes;
create trigger prenda_imagenes_limite_trg
  before insert on public.prenda_imagenes
  for each row execute function public.prenda_imagenes_limite();

alter table public.prenda_imagenes enable row level security;

create policy "ven sus propias imagenes"
on public.prenda_imagenes for select to authenticated
using ((select auth.uid()) = user_id);

create policy "insertan sus propias imagenes"
on public.prenda_imagenes for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "actualizan sus propias imagenes"
on public.prenda_imagenes for update to authenticated
using ((select auth.uid()) = user_id);

create policy "eliminan sus propias imagenes"
on public.prenda_imagenes for delete to authenticated
using ((select auth.uid()) = user_id);


-- ----------------------------------------------------------------------------
-- BLOQUE B — Storage: cerrar el bucket sin dejar la app sin imágenes
--
-- Estado verificado: closet-images tiene public = true, o sea que cualquier
-- objeto que se suba queda descargable por cualquiera vía /object/public/,
-- sin credencial. El listado devuelve vacío sólo porque falta policy de SELECT.
--
-- El orden importa. Primero estas policies, después desmarcar "Public bucket"
-- en el dashboard, y sólo entonces cambiar getPublicUrl() por createSignedUrl()
-- en hooks/use-image-upload.ts — con el bucket privado las URLs públicas dan 400.
-- Si se desmarca el bucket sin aplicar la policy de SELECT, se rompen TODAS las
-- imágenes de la app, incluido el clóset propio de cada usuario.
--
-- La policy de INSERT actual ("Usuarios logueados pueden subir fotos") permite
-- escribir en CUALQUIER ruta de CUALQUIER bucket. Se reemplaza por una acotada
-- a la carpeta del propio usuario.
-- ----------------------------------------------------------------------------

drop policy if exists "Usuarios logueados pueden subir fotos" on storage.objects;

create policy "leer propia carpeta"
on storage.objects for select to authenticated
using (
  bucket_id = 'closet-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "subir a propia carpeta"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'closet-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "borrar de propia carpeta"
on storage.objects for delete to authenticated
using (
  bucket_id = 'closet-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);


-- ----------------------------------------------------------------------------
-- BLOQUE C — Marketplace real (OPCIONAL, decidir antes de aplicar)
--
-- Hoy prendas sólo tiene "SELECT auth.uid() = user_id", así que el marketplace
-- nunca muestra prendas de otras personas: fetchVentaItems devuelve sólo las
-- tuyas y la vista cae al demo estático.
--
-- Esta policy expone a cualquier usuario autenticado las prendas publicadas.
-- OJO: expone todas las columnas de esas filas, incluido user_id. Aplicar sólo
-- cuando se decida abrir el marketplace de verdad.
-- ----------------------------------------------------------------------------

-- create policy "ven prendas publicadas"
-- on public.prendas for select to authenticated
-- using (
--   coalesce(en_venta, false) or coalesce(en_renta, false)
-- );

-- Nota sobre apartarCompra (services/marketplace.service.ts): hace un UPDATE
-- sobre la fila DEL VENDEDOR para marcarla como no disponible. Con la policy
-- de UPDATE actual ("auth.uid() = user_id") ese update afecta 0 filas y falla
-- en silencio: el comprador se queda con una copia y la prenda original sigue
-- publicada. Resolverlo con una función SECURITY DEFINER que valide la
-- operación, en vez de abrir el UPDATE a filas ajenas.
