-- Idempotencia al guardar prendas: el cliente genera un uuid por prenda y
-- reintentar (doble clic, red caída tras insertar) no crea duplicados.
alter table public.prendas add column if not exists client_id uuid;

create unique index if not exists prendas_user_client_id_uidx
  on public.prendas (user_id, client_id)
  where client_id is not null;
