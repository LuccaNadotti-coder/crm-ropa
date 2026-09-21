-- =========================================================
-- v9 — La fecha de alta del cliente, en hora de Lima
--
-- EL PROBLEMA QUE ARREGLA
--
-- La columna created_at de clientes se creo asi:
--
--     created_at timestamp default now()
--
-- "timestamp" a secas quiere decir SIN ZONA HORARIA. Guarda "20 de setiembre
-- a las 22:44" y no dice de donde es esa hora. Y como el servidor de la base
-- corre en UTC, esa hora es UTC: en Lima eran las 17:44 del 20.
--
-- Al no venir la zona, el CRM no tenia como saberlo y cada pantalla adivinaba
-- distinto. Con KAREN ELIZABETH ROMERO MARTINEZ, dada de alta el 20:
--
--     guardado en la base   2026-09-20T22:44   (UTC)
--     la lista decia        21 Set             <- mal, le sumaba 5 horas de mas
--     el Excel decia        20/9/2026          <- bien, pero de casualidad
--     lo correcto es        20 Set
--
-- Y con JACKELINE, dada de alta el 20 a las 19:20 de Lima:
--
--     guardado en la base   2026-09-21T00:20   (UTC)
--     la lista decia        21 Set             <- mal
--     el Excel decia        21/9/2026          <- mal tambien
--     lo correcto es        20 Set
--
-- Por eso la lista y el Excel no coincidian, y por eso todo lo cargado
-- despues de las 7 de la tarde aparecia al dia siguiente.
--
-- LA SOLUCION
--
-- Se cambia el tipo a "timestamptz", que es lo mismo pero SI guarda la zona.
-- El "using ... at time zone 'UTC'" le dice a Postgres que lo que ya estaba
-- guardado es UTC, que es la verdad.
--
-- Esto arregla TAMBIEN todas las fichas viejas, de una vez. El instante
-- siempre estuvo bien guardado; lo unico que faltaba era decir de que zona
-- era. No se pierde ni se mueve ninguna fecha: se la nombra correctamente.
--
-- Cómo correrlo: panel de Supabase > SQL Editor > New query > pegar todo > Run.
-- Es seguro repetirlo. No borra ningun dato.
-- =========================================================

alter table clientes
  alter column created_at type timestamptz
  using created_at at time zone 'UTC';

alter table clientes
  alter column created_at set default now();


-- ---------------------------------------------------------
-- COMPROBAR — el tipo debe decir "timestamp with time zone"
-- ---------------------------------------------------------
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'clientes' and column_name = 'created_at';


-- ---------------------------------------------------------
-- Las ultimas altas, con la hora de Lima al lado.
--
-- "hora_lima" es la que vale y la que ahora muestra el CRM. Las de KAREN y
-- JACKELINE deben decir 20 de setiembre, no 21.
-- ---------------------------------------------------------
select
  nombre,
  created_at                               as guardado,
  created_at at time zone 'America/Lima'   as hora_lima,
  (created_at at time zone 'America/Lima')::date as dia_lima
from clientes
order by created_at desc
limit 10;


-- ---------------------------------------------------------
-- Cuantas altas cambian de dia con la correccion.
--
-- Son las cargadas despues de las 7 de la tarde de Lima, que es cuando en UTC
-- ya es el dia siguiente. Antes contaban para el dia equivocado.
-- ---------------------------------------------------------
select count(*) as altas_que_cambian_de_dia
from clientes
where created_at::date is distinct from (created_at at time zone 'America/Lima')::date;
