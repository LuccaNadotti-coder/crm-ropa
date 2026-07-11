# CRM Ropa — Guía paso a paso para principiantes

Este proyecto ya está armado. Solo te falta: instalar 2 programas, crear 3 cuentas gratuitas, conectar tus claves, y publicarlo. Sigue el orden exacto.

---

## Parte 1 — Instalar en tu PC

1. **Node.js (versión LTS)** → https://nodejs.org — descarga, instala, deja todo por defecto (Siguiente, Siguiente, Instalar).
2. **Git** → https://git-scm.com/downloads — igual, todo por defecto.
3. (Opcional pero recomendado) **Visual Studio Code** → https://code.visualstudio.com — para ver y editar archivos fácilmente.

Para confirmar que quedó instalado, abre la terminal (CMD en Windows, o Terminal en Mac) y escribe:

```
node -v
git -v
```

Si te muestra un número de versión en ambos, está listo.

---

## Parte 2 — Crear tus cuentas gratuitas

1. **GitHub** → https://github.com (guarda tu código en la nube)
2. **Supabase** → https://supabase.com (tu base de datos)
3. **Vercel** → https://vercel.com (donde vivirá la página web) — puedes crear la cuenta usando tu cuenta de GitHub, es más rápido.

---

## Parte 3 — Crear la base de datos en Supabase

1. Entra a supabase.com → **New project**.
2. Ponle un nombre (ej. `crm-ropa`), crea una contraseña de base de datos (guárdala en algún lado), elige la región más cercana a Perú, clic en **Create new project**. Espera 1-2 minutos mientras se prepara.
3. En el menú izquierdo, entra a **SQL Editor** → **New query**.
4. Abre el archivo `supabase-schema.sql` (está en esta misma carpeta), copia todo su contenido, pégalo en el editor y dale a **Run**.
5. Ve a **Settings** (ícono de engranaje) → **API**. Ahí verás dos datos que necesitas:
   - **Project URL**
   - **anon public key**

   Déjalos a la mano, los usas en el siguiente paso.

---

## Parte 4 — Conectar el proyecto a tu base de datos

1. Dentro de esta carpeta del proyecto, busca el archivo `.env.local.example`.
2. Haz una copia y renómbrala a `.env.local` (sin ".example").
3. Ábrelo y reemplaza los valores con los que copiaste de Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_larga_aqui
```

4. Guarda el archivo.

---

## Parte 5 — Probarlo en tu computadora

Abre la terminal, entra a la carpeta del proyecto y ejecuta:

```
cd crm-ropa-supabase
npm install
npm run dev
```

Espera a que termine de instalar (puede tardar 1-2 minutos la primera vez). Luego abre tu navegador en:

```
http://localhost:3000
```

Deberías ver el menú del CRM. Prueba registrar un cliente de prueba y revisa que aparezca en "Clientes" y en "Cumpleaños". Si algo falla, revisa que el archivo `.env.local` tenga las claves correctas y que le hayas dado a "Run" al script SQL en Supabase.

Para detener el servidor de prueba, presiona `Ctrl + C` en la terminal.

---

## Parte 6 — Subirlo a GitHub

En la misma terminal, dentro de la carpeta del proyecto:

```
git init
git add .
git commit -m "CRM inicial"
```

Luego entra a github.com → **New repository** → ponle un nombre (ej. `crm-ropa`) → **Create repository**. GitHub te mostrará unos comandos parecidos a estos (usa los que te muestre GitHub, con tu propia URL):

```
git remote add origin URL_QUE_TE_DIO_GITHUB
git branch -M main
git push -u origin main
```

---

## Parte 7 — Publicarlo en internet con Vercel

1. Entra a vercel.com → **Add New** → **Project**.
2. Conecta tu cuenta de GitHub si te lo pide, y selecciona el repositorio que acabas de subir.
3. Antes de darle a Deploy, abre **Environment Variables** y agrega las mismas dos claves de tu `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clic en **Deploy**. Espera 1-2 minutos.

Al terminar, Vercel te da una URL como `crm-ropa.vercel.app`. Esa es la dirección que compartes con cada tienda — funciona en cualquier navegador, celular, tablet o PC, sin instalar nada.

---

## Cómo actualizar el sistema más adelante

Cuando quieras hacerle cambios (con o sin ayuda de Claude):

```
git add .
git commit -m "descripción del cambio"
git push
```

Vercel detecta el cambio automáticamente y actualiza la página en 1-2 minutos, sin que tengas que hacer nada más.

---

## Notas importantes

- **Tus datos son tuyos**: viven en tu proyecto de Supabase, no dependen de Claude ni de ningún plan de pago de Claude.
- **Seguridad**: por ahora, cualquiera que tenga el link puede ver y editar los datos (no hay login todavía) — mismo nivel de apertura que tenía la versión anterior. Si más adelante quieres pedir usuario y contraseña para entrar, se puede agregar.
- **Costo**: Supabase y Vercel son gratis hasta miles de registros y visitas mensuales — de sobra para una empresa de ropa con varias tiendas.
- Si algo no carga en Vercel, revisa primero que las Environment Variables estén bien escritas (mismo nombre exacto, sin espacios).

# Actualización v2 — Guía paso a paso

Ya tienes el proyecto funcionando. Esta actualización agrega: departamento/distrito
desplegables, DNI en la tabla, se quitó "última compra", el dashboard de cumpleaños
ahora solo muestra hoy/7 días con tareas marcables, exportar a Excel, y el sistema
de **login por tienda** (para que ninguna tienda vea los clientes de otra).

Sigue el orden exacto.

---

## Parte 1 — Correr la migración de base de datos

1. Entra a tu proyecto en supabase.com → **SQL Editor** → **New query**.
2. Abre el archivo `supabase-migracion-v2.sql` (está en esta carpeta), copia todo, pégalo y dale **Run**.
3. Debería decir "Success". Esto agrega las columnas nuevas, la tabla `perfiles`, y activa las reglas de seguridad (RLS) que separan a las tiendas entre sí.

⚠️ A partir de este punto, **nadie puede leer ni escribir en `clientes` sin haber iniciado sesión** — ni siquiera con la clave pública. Por eso el siguiente paso es obligatorio antes de seguir usando el sistema.

---

## Parte 2 — Crear las 6 cuentas de acceso (5 tiendas + 1 administrador)

### 2.1 — Crear los usuarios

En Supabase, ve a **Authentication** (ícono de personas) → **Users** → **Add user** → **Create new user**.

Crea 6 usuarios (correo + contraseña, marca "Auto Confirm User" para que no pida verificación por correo):

| Correo (ejemplo) | Contraseña |
|---|---|
| tienda1@tuempresa.com | (la que tú definas) |
| tienda2@tuempresa.com | ... |
| tienda3@tuempresa.com | ... |
| tienda4@tuempresa.com | ... |
| tienda5@tuempresa.com | ... |
| admin@tuempresa.com | ... |

Después de crear cada uno, **copia su UUID** (aparece en la lista de usuarios, es un código largo tipo `a1b2c3d4-...`). Vas a necesitar los 6.

### 2.2 — Asignarles su rol y tienda

Ve a **SQL Editor** → **New query**, y corre esto reemplazando cada UUID por el que copiaste (uno por fila):

```sql
insert into perfiles (id, rol, tienda, nombre) values
  ('UUID_TIENDA_1', 'tienda', 'Tienda 1', 'Encargada Tienda 1'),
  ('UUID_TIENDA_2', 'tienda', 'Tienda 2', 'Encargada Tienda 2'),
  ('UUID_TIENDA_3', 'tienda', 'Tienda 3', 'Encargada Tienda 3'),
  ('UUID_TIENDA_4', 'tienda', 'Tienda 4', 'Encargada Tienda 4'),
  ('UUID_TIENDA_5', 'tienda', 'Tienda 5', 'Encargada Tienda 5'),
  ('UUID_ADMIN',    'admin',  null,       'Administrador');
```

**Importante:** el valor de `tienda` debe escribirse exactamente igual (mismas mayúsculas/espacios) a como aparece en `src/lib/peru-ubigeo.js`, en la lista `TIENDAS`. Si le pones nombres reales a tus tiendas (ej. "Gamarra", "San Isidro"...), edita esa lista en el archivo **y** en este INSERT para que coincidan exactamente.

### 2.3 — Confirmar que quedó bien

En **Table Editor → perfiles** deberías ver tus 6 filas con su rol y tienda correctos.

---

## Parte 3 — Actualizar tu proyecto local

En la terminal, dentro de la carpeta del proyecto:

```
npm install
npm run dev
```

`npm install` va a instalar la librería nueva para exportar a Excel. Abre `localhost:3000` — ahora te debería pedir **correo y contraseña** antes de dejarte entrar. Prueba con una cuenta de tienda y confirma que:
- Solo ves/registras clientes de esa tienda.
- El campo "Tienda" del formulario aparece fijo (no editable).
- En "Cumpleaños" ya no aparece la sección de 30 días, y puedes marcar "Carta enviada" / "Promoción enviada".

Luego cierra sesión y entra con la cuenta `admin` — deberías ver **todos** los clientes de las 5 tiendas, con una columna "Tienda" extra y un filtro para elegir cuál ver.

---

## Parte 4 — Publicar los cambios

Igual que siempre:

```
git add .
git commit -m "v2: departamentos, roles por tienda, excel, cumpleanos"
git push
```

Vercel lo detecta y republica solo en 1-2 minutos. No necesitas tocar nada en Vercel — las mismas variables de entorno de antes siguen sirviendo.

---

## Cómo funciona la separación entre tiendas (para que entiendas el "por qué")

La protección real **no** es que cada tienda tenga su propia base de datos — siguen compartiendo una sola. Lo que las separa son las reglas de seguridad (RLS) que corriste en la Parte 1:

- Cuando alguien inicia sesión, Supabase sabe quién es.
- Antes de devolver cualquier dato, Postgres revisa la tabla `perfiles`: si es `admin`, deja pasar todo; si es `tienda`, solo deja pasar (leer, crear, editar, borrar) las filas donde `clientes.tienda` coincide con la suya.
- Esto se aplica **directamente en la base de datos**, no en el código de la página — así que aunque alguien intente manipular la aplicación, la base de datos igual bloquea lo que no le corresponde ver.

Si el día de mañana quieres agregar una sexta tienda, no hay que tocar código: solo creas un usuario nuevo en Authentication, le agregas su fila en `perfiles`, y le agregas su nombre a la lista `TIENDAS` en `src/lib/peru-ubigeo.js`.
  
