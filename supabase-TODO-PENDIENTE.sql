-- =========================================================
-- SFIDA CRM — TODO LO PENDIENTE, EN UN SOLO ARCHIVO
--
-- Son los tres scripts pendientes (v4, v5 y v6) pegados uno tras otro.
-- Copia TODO este archivo, pegalo en Supabase > SQL Editor > New query
-- y dale Run. Al terminar vas a ver varias tablas de resultados: son las
-- comprobaciones de cada parte.
--
-- Es seguro repetirlo y no borra ni modifica ningun dato de clientes.
-- =========================================================

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



-- =========================================================
-- v6 — Archivo (imagen o PDF) para las campañas
--
-- En Campañas ahora se puede subir UN archivo, igual para todas las tiendas,
-- y el mensaje de WhatsApp lleva su enlace corto:
--
--     https://crm-ropa.vercel.app/a/campana
--
-- Ese enlace siempre muestra el archivo que esté subido en ese momento, así
-- que se puede cambiar el archivo sin reescribir ninguna campaña.
--
-- Este script crea el espacio donde se guarda (bucket "campanas") y define
-- quién puede qué:
--   - Cualquiera puede VER el archivo (quien recibe el WhatsApp no tiene
--     usuario en el CRM, así que tiene que poder abrirlo sin entrar).
--   - Solo el ADMINISTRADOR puede subirlo, cambiarlo o borrarlo.
--
-- Cómo correrlo: panel de Supabase > SQL Editor > pegar todo > Run.
-- Es seguro repetirlo.
-- =========================================================

-- 1) El bucket, público para lectura.
insert into storage.buckets (id, name, public)
values ('campanas', 'campanas', true)
on conflict (id) do update set public = true;

-- 2) Permisos.
drop policy if exists "campanas_ver_todos" on storage.objects;
create policy "campanas_ver_todos" on storage.objects
  for select
  using (bucket_id = 'campanas');

drop policy if exists "campanas_subir_admin" on storage.objects;
create policy "campanas_subir_admin" on storage.objects
  for insert
  with check (
    bucket_id = 'campanas'
    and exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'admin')
  );

drop policy if exists "campanas_actualizar_admin" on storage.objects;
create policy "campanas_actualizar_admin" on storage.objects
  for update
  using (
    bucket_id = 'campanas'
    and exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'admin')
  );

drop policy if exists "campanas_borrar_admin" on storage.objects;
create policy "campanas_borrar_admin" on storage.objects
  for delete
  using (
    bucket_id = 'campanas'
    and exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'admin')
  );

-- ---------------------------------------------------------
-- COMPROBAR — el bucket debe aparecer como público
-- ---------------------------------------------------------
select id, name, public from storage.buckets where id = 'campanas';

-- Y sus cuatro permisos.
select policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname like 'campanas%'
order by policyname;

