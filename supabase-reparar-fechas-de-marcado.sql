-- =========================================================
-- REPARAR LAS FECHAS DE LAS CASILLAS DE CUMPLEAÑOS
--
-- PARA QUÉ ES
--
-- Al correr la v8 se uso el UPDATE opcional del final, que le puso a TODAS las
-- casillas tildadas la fecha del dia en que se corrio (2026-09-21). El total
-- quedo bien, pero el dia de cada una es inventado: si en Reportes se elige un
-- rango que no incluya ese dia, todas desaparecen y el reporte dice 0.
--
-- Este script deja las fechas honestas:
--
--   * A quien tiene un envio de cumpleaños registrado, se le pone ESA fecha,
--     que es la real. Son 12 fichas.
--   * A los demas la fecha les queda en blanco. El CRM los sigue mostrando,
--     en la linea "casillas tildadas sin fecha", en vez de inventarles un dia.
--     Son 72 fichas.
--
-- Las casillas tildadas NO se destildan. Lo unico que cambia es la fecha.
--
-- Cómo correrlo: panel de Supabase > SQL Editor > New query > pegar todo > Run.
-- Es seguro repetirlo: corriendolo dos veces da el mismo resultado.
--
-- PARA DESHACER, si te arrepientes: volver a correr el UPDATE opcional de la
-- v8, que es el que puso 2026-09-21 en todas. El estado anterior era ese, sin
-- ninguna otra variacion.
-- =========================================================


-- ---------------------------------------------------------
-- 1) Se borran las fechas inventadas.
-- ---------------------------------------------------------
update clientes
set saludo_cumple_fecha = null,
    promo_enviada_fecha = null
where saludo_cumple_fecha is not null
   or promo_enviada_fecha is not null;


-- ---------------------------------------------------------
-- 2) Se devuelve la fecha REAL a quien dejo rastro de su envio.
--
-- Se prefiere el origen especifico (cumpleanos_saludo / cumpleanos_cupon).
-- El origen viejo "cumpleanos" no distingue saludo de cupon, asi que solo se
-- usa cuando no hay uno especifico: es la mejor evidencia disponible.
-- ---------------------------------------------------------
with ref as (
  select
    cliente_id,
    min(fecha) filter (where origen = 'cumpleanos_saludo') as saludo,
    min(fecha) filter (where origen = 'cumpleanos_cupon')  as cupon,
    min(fecha) filter (where origen = 'cumpleanos')        as viejo
  from envios_whatsapp
  where origen like 'cumpleanos%'
  group by cliente_id
)
update clientes c
set saludo_cumple_fecha = case
      when c.saludo_cumple_anio = extract(year from current_date)::int
      then coalesce(r.saludo, r.viejo) end,
    promo_enviada_fecha = case
      when c.promo_enviada_anio = extract(year from current_date)::int
      then coalesce(r.cupon, r.viejo) end
from ref r
where r.cliente_id = c.id
  and (c.saludo_cumple_anio = extract(year from current_date)::int
    or c.promo_enviada_anio = extract(year from current_date)::int);


-- ---------------------------------------------------------
-- COMPROBAR — deben salir estos numeros:
--
--   saludo_marcados      48      saludo_con_fecha      9
--   invitacion_marcados  77      invitacion_con_fecha 12
--
-- El resto queda sin fecha, que es lo correcto: no hay de donde sacarla.
-- ---------------------------------------------------------
select
  count(*) filter (where saludo_cumple_anio = extract(year from current_date)::int)   as saludo_marcados,
  count(*) filter (where saludo_cumple_anio = extract(year from current_date)::int
                     and saludo_cumple_fecha is not null)                             as saludo_con_fecha,
  count(*) filter (where promo_enviada_anio = extract(year from current_date)::int)   as invitacion_marcados,
  count(*) filter (where promo_enviada_anio = extract(year from current_date)::int
                     and promo_enviada_fecha is not null)                             as invitacion_con_fecha
from clientes;


-- ---------------------------------------------------------
-- Y las fechas que quedaron, para verlas. Deben ser del 12, 14, 17 y 18 de
-- setiembre, que son los dias en que hay envios registrados de verdad.
-- ---------------------------------------------------------
select promo_enviada_fecha as fecha, count(*) as fichas
from clientes
where promo_enviada_fecha is not null
group by promo_enviada_fecha
order by fecha;
