-- Datos de perfil editables: nombre, telefono y foto (antes solo vivian en el estado de React).
alter table public.perfiles
  add column if not exists nombre text,
  add column if not exists telefono text,
  add column if not exists avatar_url text;

grant update (nombre, telefono, avatar_url) on public.perfiles to authenticated;
