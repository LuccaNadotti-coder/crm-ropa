# Scripts de Supabase

Se corren en el panel de Supabase del CRM: **SQL Editor > New query > pegar
todo > Run**. Se pueden correr en cualquier orden y es seguro repetirlos.
Ninguno borra datos.

## Pendiente

| Script | Para qué | Si no se corre |
| --- | --- | --- |
| `supabase-migracion-v8-fecha-de-marcado.sql` | Guarda el DÍA en que se tilda cada casilla de Cumpleaños, no solo el año | El reporte no puede ubicar las casillas dentro de un rango de fechas: se ven varias tildadas en Cumpleaños y el reporte sigue diciendo 1 |

El archivo `supabase-TODO-PENDIENTE.sql` tiene siempre lo que falta, listo
para copiar y pegar de una sola vez.

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

Cada script termina con una consulta de comprobación: si devuelve filas con lo
que dice el comentario, quedó bien.
