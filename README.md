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
