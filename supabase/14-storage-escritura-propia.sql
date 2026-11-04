-- Storage, paso 1 del endurecimiento: cada usuario solo escribe en su carpeta.
-- Reemplaza la policy que permitia INSERT en cualquier ruta a cualquier usuario con sesion.
-- El bucket sigue publico (las fotos se leen por URL). Ver docs/tanda-fixes-pwa/pendiente-storage-privado.md.
drop policy if exists "Usuarios logueados pueden subir fotos" on storage.objects;

create policy "subir a propia carpeta"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'closet-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
