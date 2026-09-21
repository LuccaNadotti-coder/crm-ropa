-- =========================================================
-- SFIDA CRM — LO QUE FALTA CORRER (actualizado)
--
-- Comprobado contra la base el 21 de setiembre de 2026: los scripts v4, v5,
-- v6 y v7 YA estan corridos (la columna nombre_pila existe y la vista de
-- cumpleanos la lleva). Lo unico pendiente es el v8.
--
-- Copia TODO este archivo, pegalo en Supabase > SQL Editor > New query
-- y dale Run.
-- =========================================================


-- =========================================================
-- v8 — La fecha en que se marcó cada casilla de Cumpleaños
--
-- EL PROBLEMA QUE ARREGLA
--
-- En la pantalla de Cumpleaños hay dos casillas por cliente:
--
--     [x] Carta de cumpleaños enviada
--     [x] Tarjeta de invitación / descuento
--
-- Hasta ahora, tildarlas guardaba SOLO EL AÑO:
--
--     saludo_cumple_anio = 2026
--     promo_enviada_anio = 2026
--
-- Sin día ni mes. Por eso el reporte, que se pide por rango de fechas
-- ("del 1 al 21 de setiembre"), no las podía contar: no hay con qué saber si
-- esa tilde cae adentro o afuera del rango. Se veían diez casillas tildadas
-- en la pantalla y el reporte decía 1.
--
-- Este script agrega el día:
--
--     saludo_cumple_fecha
--     promo_enviada_fecha
--
-- De acá en adelante, cada tilde guarda la fecha y el reporte la cuenta.
--
-- IMPORTANTE, PARA QUE NO HAYA SORPRESA: las casillas que YA estaban tildadas
-- no se pueden recuperar con su día real, porque ese dato nunca se guardó. El
-- CRM las va a mostrar aparte, como "marcados este año sin fecha", para que se
-- vean y no se pierdan. Las nuevas sí entran al rango con normalidad.
--
-- Cómo correrlo: panel de Supabase > SQL Editor > New query > pegar todo > Run.
-- Es seguro repetirlo. No borra ni cambia ningún dato existente.
-- =========================================================

alter table clientes add column if not exists saludo_cumple_fecha date;
alter table clientes add column if not exists promo_enviada_fecha date;

-- La vista de abajo usa nombre_pila, que llega con la v7. Se asegura acá para
-- que este script funcione aunque la v7 todavía no se haya corrido, y así los
-- dos se puedan correr en cualquier orden.
alter table clientes add column if not exists nombre_pila text;

-- La vista de cumpleaños se rehace para que lleve los campos nuevos
-- (y nombre_pila, que entró en la v7, y genero, que entró en la v4).
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
  saludo_cumple_fecha,
  promo_enviada_fecha,
  extract(day from fecha_nacimiento) as dia,
  extract(month from fecha_nacimiento) as mes,
  case
    when make_date(extract(year from current_date)::int, extract(month from fecha_nacimiento)::int, extract(day from fecha_nacimiento)::int) >= current_date
    then make_date(extract(year from current_date)::int, extract(month from fecha_nacimiento)::int, extract(day from fecha_nacimiento)::int) - current_date
    else make_date((extract(year from current_date)::int + 1), extract(month from fecha_nacimiento)::int, extract(day from fecha_nacimiento)::int) - current_date
  end as dias_faltantes
from clientes;

-- ---------------------------------------------------------
-- COMPROBAR — deben aparecer las dos columnas de fecha
-- ---------------------------------------------------------
select column_name, data_type
from information_schema.columns
where table_name = 'clientes'
  and column_name in ('saludo_cumple_anio', 'saludo_cumple_fecha',
                      'promo_enviada_anio', 'promo_enviada_fecha')
order by column_name;

-- ---------------------------------------------------------
-- CUÁNTAS CASILLAS HAY TILDADAS HOY
--
-- "sin_fecha" son las de antes de este script: se siguen viendo en el CRM,
-- pero fuera del rango, en la línea de "marcados este año sin fecha".
-- ---------------------------------------------------------
select
  count(*) filter (where saludo_cumple_anio = extract(year from current_date)::int) as saludo_marcados,
  count(*) filter (where saludo_cumple_anio = extract(year from current_date)::int
                     and saludo_cumple_fecha is null)                               as saludo_sin_fecha,
  count(*) filter (where promo_enviada_anio = extract(year from current_date)::int) as invitacion_marcados,
  count(*) filter (where promo_enviada_anio = extract(year from current_date)::int
                     and promo_enviada_fecha is null)                               as invitacion_sin_fecha
from clientes;

-- ---------------------------------------------------------
-- OPCIONAL — si sabes que todo lo tildado se mandó en un rango conocido,
-- se le puede poner esa fecha a mano. Está comentado a propósito: cámbiale
-- la fecha y quítale los guiones solo si estás seguro.
--
-- update clientes set saludo_cumple_fecha = date '2026-09-21'
--  where saludo_cumple_anio = 2026 and saludo_cumple_fecha is null;
--
-- update clientes set promo_enviada_fecha = date '2026-09-21'
--  where promo_enviada_anio = 2026 and promo_enviada_fecha is null;
-- ---------------------------------------------------------
