-- Verificación del estado actual de Supabase.
-- CORRER ESTO PRIMERO, en el SQL Editor, y revisar la salida antes de aplicar
-- cualquier migración. No modifica nada: son cuatro SELECT.

-- 1. Todas las policies vigentes (public + storage).
--    Interesa confirmar si prendas tiene alguna policy de SELECT que exponga
--    en_venta / en_renta a otros usuarios, y qué quedó en storage.objects
--    después de poner el bucket en privado.
select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, cmd, policyname;

-- 2. RLS habilitado por tabla. Una tabla con rowsecurity = false queda abierta
--    sin importar las policies que tenga.
select
  n.nspname  as esquema,
  c.relname  as tabla,
  c.relrowsecurity  as rls_activo,
  c.relforcerowsecurity as rls_forzado
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

-- 3. Columnas de prendas. Necesario para saber si image_url guarda la URL
--    pública completa o sólo la ruta, y qué tipo tienen precio y metadata.
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'prendas'
order by ordinal_position;

-- 4. Configuración del bucket. Confirma que closet-images quedó privado
--    y muestra los límites vigentes.
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
order by name;
