-- =========================================================
-- v4 — El género del cliente llega a la pantalla de Cumpleaños
--
-- El mensaje del cupón cambia "clienta" por "cliente" según el género de la
-- ficha. La vista de cumpleaños no traía esa columna, así que se vuelve a
-- crear igual que antes pero agregando "genero".
--
-- Cómo correrlo: panel de Supabase > SQL Editor > pegar todo > Run.
-- Es seguro repetirlo. No borra ni cambia datos: solo rehace la vista.
--
-- Mientras no se corra, el CRM manda el mensaje sin género
-- ("como agradecimiento por su preferencia"), así que nada se rompe.
-- =========================================================

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
  genero,
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

-- ---------------------------------------------------------
-- COMPROBAR — debe aparecer la columna "genero"
-- ---------------------------------------------------------
select nombre, genero, dias_faltantes
from vista_cumpleanos
order by dias_faltantes
limit 5;
