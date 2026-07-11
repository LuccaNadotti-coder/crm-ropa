-- =========================================================
-- MIGRACIÓN v2 — Pega todo esto en Supabase > SQL Editor > Run
-- (después de que ya corriste el supabase-schema.sql original)
-- =========================================================

-- 1) Nuevas columnas en clientes, y se elimina "última compra"
alter table clientes add column if not exists departamento text;
alter table clientes add column if not exists tienda text;
alter table clientes add column if not exists saludo_cumple_anio integer;
alter table clientes add column if not exists promo_enviada_anio integer;
alter table clientes drop column if exists ultima_compra;

-- 2) Tabla de perfiles: dice quién es cada usuario que inicia sesión
--    rol = 'admin'  -> ve y edita clientes de TODAS las tiendas
--    rol = 'tienda' -> ve y edita SOLO los clientes de su propia tienda
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol text not null check (rol in ('admin','tienda')),
  tienda text,
  nombre text
);

alter table perfiles enable row level security;

drop policy if exists "ver_propio_perfil" on perfiles;
create policy "ver_propio_perfil" on perfiles
  for select using (auth.uid() = id);

-- 3) Seguridad a nivel de fila (RLS) en clientes
alter table clientes enable row level security;

drop policy if exists "admin_acceso_total" on clientes;
create policy "admin_acceso_total" on clientes
  for all
  using (exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'admin'))
  with check (exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'admin'));

drop policy if exists "tienda_acceso_propio" on clientes;
create policy "tienda_acceso_propio" on clientes
  for all
  using (exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'tienda' and p.tienda = clientes.tienda))
  with check (exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'tienda' and p.tienda = clientes.tienda));

-- 4) Reemplaza la vista de cumpleaños para que respete las mismas reglas
--    (security_invoker = true es la parte clave: sin esto, la vista
--     ignoraría las reglas de arriba y todas las tiendas verían a todos)
drop view if exists vista_cumpleanos;

create view vista_cumpleanos
with (security_invoker = true)
as
select
  id,
  nombre,
  telefono,
  asesora,
  distrito,
  departamento,
  tienda,
  fecha_nacimiento,
  saludo_cumple_anio,
  promo_enviada_anio,
  extract(day from fecha_nacimiento) as dia,
  extract(month from fecha_nacimiento) as mes,
  case
    when make_date(extract(year from current_date)::int, extract(month from fecha_nacimiento)::int, extract(day from fecha_nacimiento)::int) >= current_date
    then make_date(extract(year from current_date)::int, extract(month from fecha_nacimiento)::int, extract(day from fecha_nacimiento)::int) - current_date
    else make_date((extract(year from current_date)::int + 1), extract(month from fecha_nacimiento)::int, extract(day from fecha_nacimiento)::int) - current_date
  end as dias_faltantes
from clientes;

-- =========================================================
-- Después de correr esto, ve a la Parte 2 de la guía para crear
-- las 6 cuentas de acceso (5 tiendas + 1 administrador).
-- =========================================================
