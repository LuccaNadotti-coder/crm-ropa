-- =========================================================
-- MIGRACIÓN v3 — Permisos de "envios_catalogo"
-- Pega TODO esto en Supabase > SQL Editor > Run
--
-- PROBLEMA
-- La tabla envios_catalogo se creó a mano y nunca quedó en el repositorio,
-- así que sus permisos (RLS) no siguieron las mismas reglas que la tabla
-- clientes. Si su política filtra por tienda SIN la excepción del
-- administrador, el admin solo lee los envíos de su propia tienda: en su
-- Excel los catálogos de las demás tiendas salen todos como "No", mientras
-- que cada tienda entrando con su propio usuario sí ve los suyos bien.
--
-- SOLUCIÓN
-- Dejar los permisos iguales a los de clientes (migración v2):
--   admin  -> todas las tiendas
--   tienda -> solo los clientes de su propia tienda
--
-- Es seguro volver a correrlo las veces que haga falta.
-- =========================================================


-- ---------------------------------------------------------
-- PARTE 1 — Diagnóstico (solo lectura, no cambia nada)
-- ---------------------------------------------------------

-- 1.1 ¿Qué políticas tiene hoy envios_catalogo?
--     Si alguna compara tiendas y NO menciona rol = 'admin', ese era el bug.
select policyname, cmd, qual::text as condicion_lectura
from pg_policies
where schemaname = 'public' and tablename = 'envios_catalogo';

-- 1.2 ¿El administrador tiene una tienda asignada?
--     Si el admin tiene tienda y la política filtra por tienda, veía
--     únicamente esa tienda. Encaja exacto con el síntoma reportado.
select rol, tienda, nombre from perfiles order by rol, tienda;

-- 1.3 Envíos reales por tienda. Esto corre como dueño de la base, así que
--     muestra el total verdadero: compáralo con lo que ve el admin.
select c.tienda,
       e.anio,
       count(*) filter (where e.enviado is true) as envios_marcados
from envios_catalogo e
join clientes c on c.id = e.cliente_id
group by c.tienda, e.anio
order by e.anio desc, c.tienda;


-- ---------------------------------------------------------
-- PARTE 2 — El arreglo
-- ---------------------------------------------------------

alter table envios_catalogo enable row level security;

-- Se borran las políticas anteriores (se incluyen los nombres más probables)
drop policy if exists "admin_acceso_total"    on envios_catalogo;
drop policy if exists "tienda_acceso_propio"  on envios_catalogo;
drop policy if exists "envios_admin_total"    on envios_catalogo;
drop policy if exists "envios_tienda_propio"  on envios_catalogo;

-- El administrador ve y edita los envíos de TODAS las tiendas
create policy "envios_admin_total" on envios_catalogo
  for all
  using (exists (
    select 1 from perfiles p
    where p.id = auth.uid() and p.rol = 'admin'
  ))
  with check (exists (
    select 1 from perfiles p
    where p.id = auth.uid() and p.rol = 'admin'
  ));

-- Cada tienda ve y edita solo los envíos de sus propios clientes
create policy "envios_tienda_propio" on envios_catalogo
  for all
  using (exists (
    select 1
    from perfiles p
    join clientes c on c.id = envios_catalogo.cliente_id
    where p.id = auth.uid() and p.rol = 'tienda' and p.tienda = c.tienda
  ))
  with check (exists (
    select 1
    from perfiles p
    join clientes c on c.id = envios_catalogo.cliente_id
    where p.id = auth.uid() and p.rol = 'tienda' and p.tienda = c.tienda
  ));


-- ---------------------------------------------------------
-- PARTE 3 — Verificación
-- ---------------------------------------------------------

-- Deben aparecer exactamente dos políticas: envios_admin_total y
-- envios_tienda_propio. Después de esto, entra como administrador,
-- exporta el Excel y compáralo con el conteo del punto 1.3.
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'envios_catalogo'
order by policyname;

-- NOTA: no se crea ningún índice aquí. El upsert de la app ya funciona, así
-- que la restricción única (cliente_id, anio, mes) existe. Crear otra podría
-- fallar y cortar el script antes de aplicar los permisos de arriba.
