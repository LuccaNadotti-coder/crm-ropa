-- =========================================================
-- SFIDA CRM — POR QUÉ REPORTES NO DA LA CANTIDAD QUE ES
--
-- Este script NO cambia nada: solo mira y responde. Se puede correr las veces
-- que haga falta.
--
-- Cómo correrlo: panel de Supabase > SQL Editor > New query > pegar todo > Run.
-- Supabase muestra el resultado de la ÚLTIMA consulta. Para ver las demás,
-- selecciona con el mouse solo el bloque que te interesa y dale Run otra vez.
-- =========================================================


-- ---------------------------------------------------------
-- 1) QUÉ HAY ANOTADO, POR TIPO
--
-- Así se leen los tipos:
--   cumpleanos_saludo -> la tarjeta del mismo día      (KPI "Saludos")
--   cumpleanos_cupon  -> la invitación con el 15%      (KPI "Invitaciones")
--   campana           -> mensajes de campaña
--   catalogo          -> envíos del catálogo del mes
--   cumpleanos        -> envíos viejos, de antes de separar saludo y cupón
--
-- Si acá NO aparecen cumpleanos_saludo ni cumpleanos_cupon, el problema no es
-- el reporte: es que los envíos nunca llegaron a guardarse (mira el punto 4).
-- ---------------------------------------------------------
select
  origen,
  count(*)                     as clics,
  count(distinct cliente_id)   as clientes_distintos,
  min(fecha)                   as primer_envio,
  max(fecha)                   as ultimo_envio
from envios_whatsapp
group by origen
order by clics desc;


-- ---------------------------------------------------------
-- 2) EL MES EN CURSO, QUE ES LO QUE ABRE REPORTES POR DEFECTO
--
-- "clics" es cuántas veces se tocó el botón verde.
-- "clientes_distintos" es a cuánta gente se le escribió de verdad.
-- Si los dos números no coinciden, hubo botones tocados dos veces sobre el
-- mismo cliente: el CRM ya muestra el segundo número, que es el correcto.
-- ---------------------------------------------------------
select
  origen,
  count(*)                     as clics,
  count(distinct cliente_id)   as clientes_distintos
from envios_whatsapp
where fecha >= date_trunc('month', current_date)::date
group by origen
order by clics desc;


-- ---------------------------------------------------------
-- 3) CUMPLEAÑOS: EL REPORTE CONTRA LAS CASILLAS DE LA PANTALLA
--
-- Son dos cuentas distintas y hasta ahora vivían separadas:
--
--   "anotados_*"  -> lo que anotó el botón verde. Es lo que cuenta Reportes.
--   "casilla_*"   -> la casilla tildada a mano en la pantalla de Cumpleaños.
--
-- Lo normal, de acá en adelante, es que den parecido: el botón verde ahora
-- tilda la casilla solo. La diferencia que quede es de los meses anteriores:
-- casillas tildadas a mano sin usar el botón, o WhatsApp mandados desde el
-- celular por fuera del CRM. Eso no se puede recuperar: no quedó anotado.
-- ---------------------------------------------------------
select
  (select count(distinct cliente_id) from envios_whatsapp
     where origen = 'cumpleanos_saludo'
       and fecha >= date_trunc('year', current_date)::date)   as anotados_saludo,
  (select count(*) from clientes
     where saludo_cumple_anio = extract(year from current_date)::int) as casilla_saludo,
  (select count(distinct cliente_id) from envios_whatsapp
     where origen = 'cumpleanos_cupon'
       and fecha >= date_trunc('year', current_date)::date)   as anotados_invitacion,
  (select count(*) from clientes
     where promo_enviada_anio = extract(year from current_date)::int) as casilla_invitacion;


-- ---------------------------------------------------------
-- 4) ¿ALGO ESTÁ BLOQUEANDO QUE SE GUARDEN LOS ENVÍOS?
--
-- Dos cosas los pueden estar tirando a la basura sin avisar:
--
--   a) Una regla vieja sobre la columna "origen" que solo aceptaba los valores
--      antiguos. Si acá aparece alguna fila, corre el script v5 otra vez.
--   b) Que al rol "tienda" le falte el permiso de escribir. Deben salir
--      políticas de INSERT para envios_whatsapp; si solo hay de SELECT, las
--      tiendas no pueden anotar nada y el reporte siempre dará menos.
-- ---------------------------------------------------------
select con.conname as regla_sobre_origen, pg_get_constraintdef(con.oid) as dice
from pg_constraint con
join pg_class cl on cl.oid = con.conrelid
where cl.relname = 'envios_whatsapp'
  and con.contype = 'c'
  and pg_get_constraintdef(con.oid) ilike '%origen%';

select policyname as politica, cmd as permite, roles
from pg_policies
where schemaname = 'public' and tablename = 'envios_whatsapp'
order by cmd, policyname;


-- ---------------------------------------------------------
-- 5) LA FECHA CON LA QUE SE GUARDA CADA ENVÍO
--
-- La base corre en UTC y Lima está 5 horas atrás. Si la columna "fecha" se
-- llena sola con el reloj de la base, todo lo enviado después de las 7 pm
-- quedaba anotado al día siguiente, y los envíos del último día del mes caían
-- en el mes siguiente.
--
-- Desde ahora el CRM manda la fecha de Lima al guardar, así que esto ya no
-- vuelve a pasar. Esta consulta es para ver cuánto se corrió lo viejo.
-- ---------------------------------------------------------
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'envios_whatsapp' and column_name = 'fecha';

-- Envíos anotados en un día distinto al que realmente se hicieron en Lima.
-- Si la tabla no tiene columna created_at, esta consulta da error: ignórala.
select count(*) as envios_con_fecha_corrida
from envios_whatsapp
where fecha is distinct from (created_at at time zone 'America/Lima')::date;


-- ---------------------------------------------------------
-- 6) LOS ÚLTIMOS 30 ENVÍOS, PARA MIRARLOS DE CERCA
-- ---------------------------------------------------------
select e.fecha, e.origen, e.tienda, c.nombre
from envios_whatsapp e
left join clientes c on c.id = e.cliente_id
order by e.fecha desc, e.origen
limit 30;
