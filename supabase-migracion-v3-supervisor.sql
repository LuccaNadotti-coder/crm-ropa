-- =========================================================
-- MIGRACIÓN v3 — Cuenta de SUPERVISOR (solo lectura)
--
-- ESTADO: YA APLICADA el 13 de septiembre de 2026 sobre el proyecto
-- CRM-SFIDA. Se deja como registro y para poder repetirla si algún día se
-- rehace la base desde cero. Es idempotente: volver a correrla no rompe nada.
--
-- Qué agrega: un tercer rol, 'supervisor', que ve EXACTAMENTE lo mismo que el
-- administrador (las 6 tiendas, todos los clientes, catálogos y envíos) pero
-- no puede crear, editar, marcar ni eliminar nada.
--
-- La protección no está en la pantalla, está acá: el supervisor solo tiene
-- políticas de SELECT. Aunque alguien manipule la aplicación o pegue la clave
-- pública en otro programa, Postgres rechaza cualquier escritura.
-- =========================================================


-- ---------------------------------------------------------
-- 1) Permitir el rol nuevo
-- ---------------------------------------------------------
alter table perfiles drop constraint if exists perfiles_rol_check;
alter table perfiles add constraint perfiles_rol_check
  check (rol in ('admin','tienda','supervisor'));


-- ---------------------------------------------------------
-- 2) Lectura de todo, escritura de nada
--
-- Solo hay policies FOR SELECT. Al no existir policy de INSERT, UPDATE ni
-- DELETE para este rol, RLS las bloquea por defecto.
-- ---------------------------------------------------------
drop policy if exists "supervisor_solo_ver" on clientes;
create policy "supervisor_solo_ver" on clientes
  for select
  using (exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'supervisor'));

drop policy if exists "supervisor_solo_ver_envios" on envios_catalogo;
create policy "supervisor_solo_ver_envios" on envios_catalogo
  for select
  using (exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'supervisor'));

drop policy if exists "supervisor_solo_ver_whatsapp" on envios_whatsapp;
create policy "supervisor_solo_ver_whatsapp" on envios_whatsapp
  for select
  using (exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'supervisor'));

-- La vista vista_cumpleanos no necesita nada: se creó con security_invoker,
-- así que aplica las políticas de clientes de quien la consulta.


-- ---------------------------------------------------------
-- 3) Crear la cuenta
--
-- La forma recomendada es el panel: Authentication > Users > Add user >
-- Create new user, marcando "Auto Confirm User". Después se le asigna el rol:
--
--   insert into perfiles (id, rol, tienda, nombre)
--   values ('UUID_DEL_USUARIO', 'supervisor', null, 'Supervisor SFIDA');
--
-- La cuenta que ya existe es supervisor@sfida.com. Para cambiarle la clave:
-- Authentication > Users > (los tres puntos) > Reset password / Update user.
-- ---------------------------------------------------------


-- ---------------------------------------------------------
-- COMPROBAR — debe listar admin, tienda x6 y supervisor
-- ---------------------------------------------------------
select p.rol, p.tienda, p.nombre, u.email
from perfiles p join auth.users u on u.id = p.id
order by p.rol, p.tienda;

-- Y las políticas del supervisor: deben ser 3, todas SELECT.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and policyname like 'supervisor%'
order by tablename;
