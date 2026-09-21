# Scripts de Supabase

Se corren en el panel de Supabase del CRM: **SQL Editor > New query > pegar
todo > Run**. Se pueden correr en cualquier orden y es seguro repetirlos.
Ninguno borra datos.

## Pendiente

| Script | Para qué | Si no se corre |
| --- | --- | --- |
| `supabase-reparar-fechas-de-marcado.sql` | Al correr la v8 se usó el `UPDATE` opcional, que le puso a las 125 casillas tildadas la fecha de ese día. Este script les devuelve la fecha real a las 12 que dejaron rastro y deja las otras 72 en blanco | El total del mes sale bien, pero cualquier rango que no incluya el 21/9/2026 da 0, porque todas las casillas dicen ese día |
| `supabase-migracion-v9-fecha-de-alta-en-hora-de-lima.sql` | La fecha de alta del cliente pasa a guardar su zona horaria. Arregla de una vez todas las fichas viejas | Las altas cargadas después de las 7 pm siguen apareciendo al día siguiente, y la lista y el Excel siguen sin coincidir |

Las migraciones (v4 a v8) están todas corridas y comprobadas contra la base.

## Para revisar, no cambia nada

| Script | Para qué |
| --- | --- |
| `supabase-diagnostico-reportes.sql` | Responde por qué Reportes no da la cantidad esperada: qué hay anotado por tipo, el reporte contra las casillas de Cumpleaños, y si algo está bloqueando que los envíos se guarden. Solo consulta, no toca nada. |

## Ya corridos

| Script | Qué trajo | Estado |
| --- | --- | --- |
| `supabase-migracion-v4-genero-cumpleanos.sql` | El género del cliente en la pantalla de Cumpleaños | Comprobado: el cupón dice "clienta" o "cliente" según la ficha |
| `supabase-migracion-v5-reporte-cumpleanos.sql` | Tipos de envío nuevos e índice por fecha para el reporte | Se comprueba solo cuando se manda el primer saludo: el contador de Reportes debe pasar de 0 a 1 |
| `supabase-migracion-v6-adjunto-campanas.sql` | Espacio donde se guarda el archivo de las campañas | Comprobado: el bucket `campanas` existe y es público |
| `supabase-migracion-v7-nombre-de-saludo.sql` | Campo "nombre para los saludos" en la ficha del cliente | Comprobado el 21/9/2026 contra la base: la columna `nombre_pila` existe y la vista de cumpleaños la lleva |
| `supabase-migracion-v8-fecha-de-marcado.sql` | El día en que se tilda cada casilla de Cumpleaños, para que el reporte las pueda contar por rango | Comprobado el 21/9/2026 contra la base: `saludo_cumple_fecha` y `promo_enviada_fecha` existen en `clientes` y en la vista, y la vista sigue respetando las reglas por tienda |

Cada script termina con una consulta de comprobación: si devuelve filas con lo
que dice el comentario, quedó bien.
