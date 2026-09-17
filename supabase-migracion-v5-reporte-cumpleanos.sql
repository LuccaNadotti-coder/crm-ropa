-- =========================================================
-- v5 — Reporte de cumpleaños por rango de fechas
--
-- Ahora cada WhatsApp de cumpleaños se guarda diciendo qué se mandó:
--
--   cumpleanos_saludo   la tarjeta del mismo día
--   cumpleanos_cupon    la invitación con el 15% de los días previos
--   campana             mensajes de campaña (ya existía)
--   cumpleanos          valor viejo, cuando no se distinguían los dos
--
-- Este script hace dos cosas:
--   1) Se asegura de que la columna "origen" acepte los valores nuevos, en
--      caso de que tenga una regla que solo permitía los viejos. Si no tiene
--      ninguna regla, no cambia nada.
--   2) Agrega un índice por fecha, para que el reporte por rango siga siendo
--      rápido cuando la tabla de envíos crezca.
--
-- Cómo correrlo: panel de Supabase > SQL Editor > pegar todo > Run.
-- Es seguro repetirlo y no borra ni modifica ningún envío ya registrado.
-- =========================================================

-- 1) Quitar cualquier regla que limite los valores de "origen".
do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid
    where cl.relname = 'envios_whatsapp'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%origen%'
  loop
    execute format('alter table envios_whatsapp drop constraint %I', r.conname);
    raise notice 'Regla quitada: %', r.conname;
  end loop;
end $$;

-- 2) Índice por fecha para el reporte por rango.
create index if not exists envios_whatsapp_fecha_idx on envios_whatsapp (fecha);

-- ---------------------------------------------------------
-- COMPROBAR
-- ---------------------------------------------------------

-- Columnas de la tabla de envíos: deben estar cliente_id, tienda, origen y fecha.
select column_name, data_type
from information_schema.columns
where table_name = 'envios_whatsapp'
order by ordinal_position;

-- Qué se ha enviado hasta ahora, por tipo.
select origen, count(*) as envios, min(fecha) as primero, max(fecha) as ultimo
from envios_whatsapp
group by origen
order by envios desc;
