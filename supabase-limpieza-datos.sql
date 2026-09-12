-- =========================================================
-- LIMPIEZA DE DATOS — Pega todo en Supabase > SQL Editor > Run
--
-- Son los dos arreglos de datos que revisamos. El código de la app ya evita
-- que vuelvan a ocurrir, pero los registros que ya están guardados hay que
-- corregirlos una vez.
--
-- Es seguro correrlo más de una vez: la segunda vez no cambia nada.
-- =========================================================


-- ---------------------------------------------------------
-- ANTES — mira qué se va a corregir
-- ---------------------------------------------------------
select
  count(*) filter (where tienda = 'Chimu')                          as tienda_mal_escrita,
  count(*) filter (where nombre <> btrim(nombre) or nombre ~ '\s\s') as nombres_sucios,
  count(*) filter (where asesora is not null
                    and (asesora <> btrim(asesora) or asesora ~ '\s\s')) as asesoras_sucias
from clientes;


-- ---------------------------------------------------------
-- 1) Tienda mal escrita
--
-- Una clienta quedó guardada con tienda = 'Chimu' en vez de 'Chimu SFIDA'.
-- Como los permisos comparan el texto exacto contra perfiles.tienda, la
-- encargada de Chimu nunca pudo verla ni marcarle catálogos.
-- Pasó porque la lista de tiendas del código decía 'Chimu' y 'Online'
-- mientras la base usa 'Chimu SFIDA' y 'Online SFIDA'. Eso ya está corregido
-- en src/lib/peru-ubigeo.js.
-- ---------------------------------------------------------
update clientes set tienda = 'Chimu SFIDA'  where tienda = 'Chimu';
update clientes set tienda = 'Online SFIDA' where tienda = 'Online';


-- ---------------------------------------------------------
-- 2) Nombres y asesoras con espacios de más
--
-- 113 nombres tienen espacios al inicio o al final y 3 tienen tabulaciones
-- (se ven al pegar desde Excel o WhatsApp). Salen primero al ordenar la lista
-- y desordenan el Excel. Esto quita espacios en los bordes, convierte
-- tabulaciones en espacios y colapsa los espacios dobles internos.
-- ---------------------------------------------------------
update clientes
set nombre = btrim(regexp_replace(translate(nombre, e'\t\r\n', '   '), '\s+', ' ', 'g'))
where nombre is distinct from
      btrim(regexp_replace(translate(nombre, e'\t\r\n', '   '), '\s+', ' ', 'g'));

update clientes
set asesora = nullif(btrim(regexp_replace(translate(asesora, e'\t\r\n', '   '), '\s+', ' ', 'g')), '')
where asesora is not null
  and asesora is distinct from
      nullif(btrim(regexp_replace(translate(asesora, e'\t\r\n', '   '), '\s+', ' ', 'g')), '');


-- ---------------------------------------------------------
-- DESPUÉS — todo debe quedar en 0
-- ---------------------------------------------------------
select
  count(*) filter (where tienda in ('Chimu','Online'))               as tienda_mal_escrita,
  count(*) filter (where nombre <> btrim(nombre) or nombre ~ '\s\s')  as nombres_sucios,
  count(*) filter (where asesora is not null
                    and (asesora <> btrim(asesora) or asesora ~ '\s\s')) as asesoras_sucias
from clientes;

-- Reparto final de clientes por tienda (deben quedar 6 tiendas, sin variantes)
select tienda, count(*) as clientes
from clientes group by tienda order by count(*) desc;
