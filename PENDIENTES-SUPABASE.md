# Scripts de Supabase

Se corren en el panel de Supabase del CRM: **SQL Editor > New query > pegar
todo > Run**. Se pueden correr en cualquier orden y es seguro repetirlos.
Ninguno borra datos.

## Pendiente

| Script | Para qué | Si no se corre |
| --- | --- | --- |
| `supabase-migracion-v7-nombre-de-saludo.sql` | Campo opcional "nombre para los saludos" en la ficha del cliente, para las fichas que tienen el apellido adelante | El campo no aparece en Clientes y los saludos siguen usando la primera palabra del nombre ("Hola Villanueva") |

El archivo `supabase-TODO-PENDIENTE.sql` tiene siempre lo que falta, listo
para copiar y pegar de una sola vez.

## Ya corridos

| Script | Qué trajo | Estado |
| --- | --- | --- |
| `supabase-migracion-v4-genero-cumpleanos.sql` | El género del cliente en la pantalla de Cumpleaños | Comprobado: el cupón dice "clienta" o "cliente" según la ficha |
| `supabase-migracion-v5-reporte-cumpleanos.sql` | Tipos de envío nuevos e índice por fecha para el reporte | Se comprueba solo cuando se manda el primer saludo: el contador de Reportes debe pasar de 0 a 1 |
| `supabase-migracion-v6-adjunto-campanas.sql` | Espacio donde se guarda el archivo de las campañas | Comprobado: el bucket `campanas` existe y es público |

Cada script termina con una consulta de comprobación: si devuelve filas con lo
que dice el comentario, quedó bien.
