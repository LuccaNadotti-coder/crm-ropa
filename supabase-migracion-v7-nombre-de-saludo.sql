-- =========================================================
-- v7 — Nombre para los saludos
--
-- Hay fichas cargadas con el apellido adelante, por ejemplo
-- "VILLANUEVA BRAVO DE VIZA SOFIA IRENE". El CRM saluda con la primera
-- palabra del nombre, así que a esa clienta le escribía "Hola Villanueva".
--
-- Adivinar cuál palabra es el nombre no se puede hacer bien (hay apellidos
-- que son nombres y al revés), así que la ficha gana un campo opcional:
--
--     nombre_pila
--
-- Si está vacío, todo sigue igual que hasta ahora. Si se llena, ese nombre es
-- el que va en el WhatsApp y en la tarjeta de cumpleaños.
--
-- Cómo correrlo: panel de Supabase > SQL Editor > pegar todo > Run.
-- Es seguro repetirlo. No borra ni cambia ningún dato.
-- =========================================================

alter table clientes add column if not exists nombre_pila text;

-- La vista de cumpleaños se rehace para que lleve el campo nuevo
-- (y el género, que entró en la v4).
drop view if exists vista_cumpleanos;

create view vista_cumpleanos
with (security_invoker = true)
as
select
  id,
  nombre,
  nombre_pila,
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
-- COMPROBAR — deben aparecer las columnas nombre_pila y genero
-- ---------------------------------------------------------
select nombre, nombre_pila, genero, dias_faltantes
from vista_cumpleanos
order by dias_faltantes
limit 5;

-- ---------------------------------------------------------
-- OPCIONAL — para encontrar las fichas a revisar
--
-- Lista los clientes cuyo nombre tiene 4 palabras o más, que son los casos
-- donde suele venir el apellido adelante. No cambia nada: solo los muestra.
-- ---------------------------------------------------------
-- select nombre, tienda
-- from clientes
-- where array_length(string_to_array(trim(nombre), ' '), 1) >= 4
-- order by nombre;
