-- =========================================================
-- COMPLETAR LAS FECHAS QUE FALTAN, USANDO EL CUMPLEAÑOS
--
-- EL PROBLEMA
--
-- Hay 104 casillas tildadas que no tienen fecha. No es que se haya perdido el
-- dato: nunca se guardo. Las casillas nacieron el 11 de julio de 2026 y solo
-- guardaban el año; el registro de envios (envios_whatsapp) recien nacio el 12
-- de setiembre. Entre esas dos fechas hay dos meses en los que se tildaron
-- casillas y no habia nada que anotara el dia.
--
-- Sin fecha, el reporte por rango no las puede contar, y entonces no se puede
-- responder "cuantas clientas saludamos en agosto".
--
-- DE DONDE SALE LA FECHA
--
-- El saludo de cumpleaños se manda EL DIA del cumpleaños: es lo que significa
-- la casilla "Carta de cumpleaños enviada" y es como funciona la pantalla
-- (la tarjeta del mismo dia). Asi que si esta tildada para 2026, la fecha es
-- el cumpleaños de esa persona en 2026. Eso no es inventar un dato: es leer lo
-- que la casilla ya dice.
--
-- La regla, en una linea:
--
--     fecha = el cumpleaños de 2026, salvo que todavia no haya llegado,
--             en cuyo caso se usa hoy.
--
-- Lo segundo es para los pocos casos de cumpleaños que estan por venir: la
-- casilla ya esta tildada, asi que el mensaje se mando, y solo pudo ser en
-- estos dias. Nunca queda una fecha en el futuro.
--
-- QUE TAN CONFIABLE ES
--
--   * Saludos      ALTA.  El saludo va el dia del cumpleaños, por definicion.
--   * Invitaciones MEDIA. Se mandan "los dias previos", no un dia fijo, asi
--                  que el dia exacto puede moverse unos dias. El MES queda
--                  bien, que es lo que importa para el reporte mensual.
--
-- Las 21 casillas que YA tienen fecha real (la del boton verde, que quedo
-- registrada de verdad) no se tocan. Solo se rellenan las vacias.
--
-- Cómo correrlo: panel de Supabase > SQL Editor > New query > pegar todo > Run.
-- Es seguro repetirlo: solo toca las que estan en blanco.
--
-- PARA DESHACER: poner en null las fechas de las casillas tildadas y volver a
-- correr supabase-reparar-fechas-de-marcado.sql, que deja solo las 21 reales.
-- =========================================================


-- ---------------------------------------------------------
-- 1) Saludos de cumpleaños
-- ---------------------------------------------------------
update clientes
set saludo_cumple_fecha = least(
      case
        -- 2026 no es bisiesto: un cumpleaños 29/2 se toma como 28/2 para que
        -- make_date no falle. Hoy no hay ninguno, pero el script se va a
        -- volver a correr en otros años.
        when extract(month from fecha_nacimiento) = 2
         and extract(day   from fecha_nacimiento) = 29
        then make_date(extract(year from current_date)::int, 2, 28)
        else make_date(
               extract(year  from current_date)::int,
               extract(month from fecha_nacimiento)::int,
               extract(day   from fecha_nacimiento)::int)
      end,
      current_date)
where saludo_cumple_anio = extract(year from current_date)::int
  and saludo_cumple_fecha is null
  and fecha_nacimiento is not null;


-- ---------------------------------------------------------
-- 2) Invitaciones con el 15%
-- ---------------------------------------------------------
update clientes
set promo_enviada_fecha = least(
      case
        when extract(month from fecha_nacimiento) = 2
         and extract(day   from fecha_nacimiento) = 29
        then make_date(extract(year from current_date)::int, 2, 28)
        else make_date(
               extract(year  from current_date)::int,
               extract(month from fecha_nacimiento)::int,
               extract(day   from fecha_nacimiento)::int)
      end,
      current_date)
where promo_enviada_anio = extract(year from current_date)::int
  and promo_enviada_fecha is null
  and fecha_nacimiento is not null;


-- ---------------------------------------------------------
-- COMPROBAR — no debe quedar ninguna sin fecha
--
--   saludo_marcados 48 · saludo_sin_fecha 0
--   invitacion_marcados 77 · invitacion_sin_fecha 0
-- ---------------------------------------------------------
select
  count(*) filter (where saludo_cumple_anio = extract(year from current_date)::int)   as saludo_marcados,
  count(*) filter (where saludo_cumple_anio = extract(year from current_date)::int
                     and saludo_cumple_fecha is null)                                 as saludo_sin_fecha,
  count(*) filter (where promo_enviada_anio = extract(year from current_date)::int)   as invitacion_marcados,
  count(*) filter (where promo_enviada_anio = extract(year from current_date)::int
                     and promo_enviada_fecha is null)                                 as invitacion_sin_fecha
from clientes;


-- ---------------------------------------------------------
-- COMO QUEDA EL REPORTE POR MES — deben salir estos numeros:
--
--   saludos       2026-07: 1   2026-08: 21   2026-09: 26     (48 en total)
--   invitaciones  2026-07: 2   2026-08: 27   2026-09: 48     (77 en total)
--
-- Ahora si se puede responder "cuantas clientas saludamos en agosto".
-- ---------------------------------------------------------
select
  to_char(saludo_cumple_fecha, 'YYYY-MM') as mes,
  count(*) filter (where saludo_cumple_anio = extract(year from current_date)::int) as saludos
from clientes
where saludo_cumple_fecha is not null
group by 1
order by 1;

select
  to_char(promo_enviada_fecha, 'YYYY-MM') as mes,
  count(*) filter (where promo_enviada_anio = extract(year from current_date)::int) as invitaciones
from clientes
where promo_enviada_fecha is not null
group by 1
order by 1;
