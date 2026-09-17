# Pendientes en Supabase

Estos tres scripts hay que correrlos en el panel de Supabase del CRM:
**SQL Editor > New query > pegar todo > Run**. Se pueden correr en cualquier
orden y es seguro repetirlos. Ninguno borra datos.

Mientras no se corran, el CRM sigue funcionando: cada función simplemente se
comporta como antes, sin lo nuevo.

| Script | Para qué | Si no se corre |
| --- | --- | --- |
| `supabase-migracion-v4-genero-cumpleanos.sql` | Que el género del cliente llegue a la pantalla de Cumpleaños | El mensaje del cupón dice "gracias por su preferencia" en vez de "clienta" o "cliente" |
| `supabase-migracion-v5-reporte-cumpleanos.sql` | Permitir los nuevos tipos de envío y acelerar el reporte por fechas | Si la columna `origen` tiene una regla vieja, los envíos de cumpleaños no quedan registrados y el reporte marca cero |
| `supabase-migracion-v6-adjunto-campanas.sql` | Crear el espacio donde se guarda el archivo (imagen o PDF) de las campañas | Al subir un archivo en Campañas sale "Falta preparar el almacenamiento en Supabase" |

Cada script termina con una consulta de comprobación: si devuelve filas con lo
que dice el comentario, quedó bien.
