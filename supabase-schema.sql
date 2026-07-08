-- Pega todo esto en Supabase > SQL Editor > New query > Run

create extension if not exists pgcrypto;

create table clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  dni_ruc text,
  telefono text not null,
  fecha_nacimiento date not null,
  genero text,
  tipo_cliente text,
  talla text,
  estilo text,
  distrito text,
  asesora text,
  ultima_compra date,
  observaciones text,
  created_at timestamp default now()
);

create view vista_cumpleanos as
select
  id,
  nombre,
  telefono,
  asesora,
  distrito,
  fecha_nacimiento,
  extract(day from fecha_nacimiento) as dia,
  extract(month from fecha_nacimiento) as mes,
  case
    when make_date(extract(year from current_date)::int, extract(month from fecha_nacimiento)::int, extract(day from fecha_nacimiento)::int) >= current_date
    then make_date(extract(year from current_date)::int, extract(month from fecha_nacimiento)::int, extract(day from fecha_nacimiento)::int) - current_date
    else make_date((extract(year from current_date)::int + 1), extract(month from fecha_nacimiento)::int, extract(day from fecha_nacimiento)::int) - current_date
  end as dias_faltantes
from clientes;

-- Nota de seguridad:
-- Por defecto, Row Level Security (RLS) está desactivado en tablas nuevas de Supabase,
-- así que tu anon key (pública) puede leer y escribir libremente. Es el mismo nivel
-- de apertura que tenía el link de Claude. Si más adelante quieres restringir el acceso
-- (por ejemplo, exigir login), se activa RLS y se agregan políticas — avísame cuando
-- llegues a ese punto y lo armamos.
