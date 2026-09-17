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
