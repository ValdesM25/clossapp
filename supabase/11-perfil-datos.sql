-- Datos de perfil editables: nombre, telefono y foto (antes solo vivian en el estado de React).
alter table public.perfiles
  add column if not exists nombre text,
  add column if not exists telefono text,
  add column if not exists avatar_url text;

grant update (nombre, telefono, avatar_url) on public.perfiles to authenticated;

-- Permite borrar la foto de perfil anterior (solo en la carpeta propia del usuario).
-- Si ya aplicaste el BLOQUE B de 01-migracion-pendiente.sql esta policy ya existe: omitir.
create policy "borrar de propia carpeta"
on storage.objects for delete to authenticated
using (
  bucket_id = 'closet-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
