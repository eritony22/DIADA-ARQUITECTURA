# DIADA Arquitectura y Construcción — sitio web

Sitio web corporativo de **DIADA Arquitectura y Construcción S.A.C.** (Tarapoto,
San Martín, Perú), construido con Next.js. Incluye el sitio público (portafolio
de proyectos, servicios, nosotros, contacto) y un **panel de administración**
en `/admin` para editar todo el contenido y subir material multimedia sin
tocar código.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Framer Motion** para las animaciones (logo, transiciones, scroll reveals)
- Autenticación del panel con **JWT en cookie httpOnly** (`jose` + `bcryptjs`)
- Contenido persistido en **Postgres** (Neon, vía `@neondatabase/serverless`)
  y multimedia en **Vercel Blob** (`@vercel/blob`) — listo para desplegar en
  Vercel sin servidor propio
- Validación de formularios/API con **zod**

## Primeros pasos

```bash
npm install
cp .env.example .env.local   # completa las variables, ver abajo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) para el sitio público y
[http://localhost:3000/admin](http://localhost:3000/admin) para el panel.

Para desarrollo local necesitas una base de datos Postgres y un store de
Blob a los que apuntar (ver "Despliegue en Vercel" abajo) — la forma más
simple es crear ambos recursos en el dashboard de Vercel (aunque el proyecto
todavía no esté desplegado) y copiar sus variables a tu `.env.local`.

### Variables de entorno

Copia `.env.example` a `.env.local` y define:

| Variable                | Descripción                                                          |
| ------------------------ | ---------------------------------------------------------------------- |
| `DATABASE_URL`           | Cadena de conexión a Postgres (proyectos, configuración, mensajes). |
| `BLOB_READ_WRITE_TOKEN`  | Token del store de Vercel Blob (imágenes subidas desde el panel).   |
| `ADMIN_USERNAME`         | Usuario para iniciar sesión en `/admin`.                             |
| `ADMIN_PASSWORD_HASH`    | Hash bcrypt de la contraseña del panel (ver comando abajo).          |
| `SESSION_SECRET`         | Cadena aleatoria larga para firmar la cookie de sesión.               |

Generar un hash de contraseña nuevo:

```bash
node -e "console.log(require('bcryptjs').hashSync('TU_CONTRASEÑA', 10))"
```

> ⚠️ **Importante:** el hash generado empieza con `$2b$10$...`. Next.js expande
> `$variables` al leer archivos `.env`, así que debes **escapar cada `$` como
> `\$`** al pegarlo en `.env.local` (si no, el hash queda truncado y el login
> falla en silencio). El `.env.example` incluye un ejemplo.

Generar un `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Credenciales de desarrollo incluidas** (solo para probar localmente — el
`.env.local` real nunca se sube al repositorio):

- Usuario: `admin`
- Contraseña: `DiadaTarapoto2025!`

Cámbialas antes de desplegar a producción.

## Contenido editable desde `/admin`

- **Proyectos** — crear, editar, eliminar y destacar proyectos del portafolio;
  cada uno con portada, galería de imágenes con leyendas, materiales,
  servicios brindados y ficha técnica.
- **Media library** — subir, copiar la URL y eliminar imágenes usadas en el
  sitio (drag & drop o selector de archivos).
- **Mensajes** — bandeja con los mensajes enviados desde el formulario de
  contacto público.
- **Configuración** — datos de la empresa (RUC, teléfonos, correos,
  dirección, Instagram), textos de la portada (hero), sección "Quiénes
  somos" (misión, visión, valores, equipo), servicios y estadísticas.
- **Sorteo** (`/admin/sorteo`) — herramienta de sorteo de tickets numerados
  (1 a 1000, configurable). Permite definir título, temática, imágenes/video
  del premio, premios, reglas, precio por ticket y WhatsApp de contacto, y
  administrar el tablero marcando cada ticket como disponible, reservado o
  vendido (con datos del comprador). La página pública `/sorteo` muestra el
  tablero interactivo: el cliente elige uno o más números disponibles,
  llena un formulario de compra y se le redirige a WhatsApp con un mensaje
  prellenado para coordinar el pago con el administrador.

Todo el contenido se guarda en **Postgres** y las imágenes subidas en
**Vercel Blob**, y se refleja en el sitio público **al instante** (todas las
páginas se renderizan por solicitud, no hay que reconstruir el sitio para ver
un cambio).

## Estructura del proyecto

```
data/                    JSON "semilla" (contenido inicial) — solo se usa para
                          poblar la base de datos la primera vez, ver abajo
public/images/           Assets de marca y fotos de proyectos "semilla"
scripts/                 Script de migración inicial (JSON -> Postgres)
src/app/(site)/          Páginas públicas (inicio, proyectos, servicios, nosotros, contacto)
src/app/admin/           Panel de administración (protegido por middleware)
src/app/api/admin/       Endpoints del panel (proyectos, media, settings, mensajes, auth)
src/app/api/contact/     Endpoint público del formulario de contacto
src/components/          Componentes de UI, secciones, marca y panel admin
src/lib/                 Acceso a datos (Postgres/Blob), auth, validación, utilidades
```

## Despliegue en Vercel

El proyecto está listo para desplegarse en Vercel tal cual — no necesita
servidor propio ni configuración adicional más allá de conectar dos
integraciones de almacenamiento desde el dashboard.

1. **Importa el repositorio** en [vercel.com/new](https://vercel.com/new).
   Vercel detecta que es Next.js automáticamente, no hay que tocar el build
   command ni el output directory.

2. **Conecta una base de datos Postgres** — en el proyecto ya creado en
   Vercel: pestaña **Storage** → **Create Database** → **Postgres** (corre
   sobre Neon). Al conectarla, Vercel agrega automáticamente la variable
   `DATABASE_URL` a las Environment Variables del proyecto.

3. **Conecta un store de Blob** — misma pestaña **Storage** → **Create
   Database** → **Blob**. Esto agrega automáticamente `BLOB_READ_WRITE_TOKEN`.

4. **Agrega las variables restantes** en **Settings → Environment
   Variables**: `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` y `SESSION_SECRET`
   (ver la sección de variables de entorno arriba — en el dashboard de
   Vercel *no* hace falta escapar el `$` del hash bcrypt, ese problema es
   solo de los archivos `.env` locales).

5. **Redespliega** (Deployments → ⋯ → Redeploy) para que el build recoja las
   variables recién agregadas.

6. **Carga el contenido inicial** (proyectos de ejemplo, textos, etc.) —
   las tablas se crean solas en el primer request, pero empiezan vacías.
   Corre el script de migración apuntando a la base de datos de producción:

   ```bash
   # Copia la cadena de conexión desde Vercel: Storage -> tu base de datos -> .env.local
   DATABASE_URL="postgres://...neon.tech/..." npm run db:migrate
   ```

   Esto solo inserta lo que falte (es seguro correrlo más de una vez) —
   después de esto, todo el contenido se administra desde `/admin`.

A partir de ahí, cualquier `git push` a la rama conectada dispara un deploy
nuevo automáticamente, y las ediciones hechas desde `/admin` se guardan en
Postgres/Blob — sobreviven a cada redeploy sin perderse, a diferencia de un
filesystem local.

### Alternativa: VPS / servidor propio

El proyecto también corre igual de bien en un VPS, servidor dedicado o
contenedor Docker con `npm run build && npm run start` (detrás de PM2/nginx,
por ejemplo) — solo necesita las mismas variables de entorno (`DATABASE_URL`,
`BLOB_READ_WRITE_TOKEN`, credenciales de admin) apuntando a los mismos
servicios de Postgres/Blob, o a tu propia base de datos Postgres si prefieres
no depender de Neon/Vercel.

## Scripts

```bash
npm run dev        # servidor de desarrollo
npm run build      # build de producción
npm run start      # servir el build de producción
npm run lint       # eslint
npm run db:migrate # copia data/*.json a la base de datos Postgres conectada
```
