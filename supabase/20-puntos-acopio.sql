-- 20: centros de acopio reales. La tabla de 03-acopio-registros.sql nunca se creó en producción,
-- así que la app mostraba tres centros de ejemplo escritos en el código.
-- Decisión de Mauri (10 de noviembre de 2026): TecNM ITS Saltillo (entrada principal) y la
-- Alameda Zaragoza (justo en el centro), en horario de oficina.

create table if not exists public.puntos_acopio (
  id text primary key,
  nombre text not null,
  zona text not null,
  horario text not null,
  direccion text,
  activo boolean default true,
  created_at timestamptz default now()
);

alter table public.puntos_acopio enable row level security;
drop policy if exists "Lectura publica de puntos de acopio" on public.puntos_acopio;
create policy "Lectura publica de puntos de acopio" on public.puntos_acopio for select using (true);
-- Sin políticas de escritura: los centros se dan de alta desde el SQL editor o con service role.

insert into public.puntos_acopio (id, nombre, zona, horario, direccion) values
  ('tecnm-saltillo', 'TecNM ITS Saltillo', 'Col. Tecnológico', 'Lun a Vie · 9:00 a 18:00',
   'Entrada principal, Blvd. Venustiano Carranza 2400, Col. Tecnológico, Saltillo'),
  ('alameda', 'Alameda Zaragoza', 'Zona Centro', 'Lun a Vie · 9:00 a 18:00',
   'Centro de la Alameda Zaragoza, Zona Centro, Saltillo')
on conflict (id) do update set
  nombre = excluded.nombre, zona = excluded.zona, horario = excluded.horario, direccion = excluded.direccion;
