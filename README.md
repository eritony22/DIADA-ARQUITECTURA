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
- Contenido persistido en archivos **JSON** (`/data`) y multimedia en
  **`/public/uploads`** — sin base de datos externa que configurar
- Validación de formularios/API con **zod**

## Primeros pasos

```bash
npm install
cp .env.example .env.local   # completa las variables, ver abajo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) para el sitio público y
[http://localhost:3000/admin](http://localhost:3000/admin) para el panel.

### Variables de entorno

Copia `.env.example` a `.env.local` y define:

| Variable              | Descripción                                                        |
| ---------------------- | ------------------------------------------------------------------- |
| `ADMIN_USERNAME`       | Usuario para iniciar sesión en `/admin`.                            |
| `ADMIN_PASSWORD_HASH`  | Hash bcrypt de la contraseña del panel (ver comando abajo).         |
| `SESSION_SECRET`       | Cadena aleatoria larga para firmar la cookie de sesión.              |

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

Todo el contenido se guarda en `/data/*.json` y las imágenes subidas en
`/public/uploads`, y se refleja en el sitio público **al instante** (todas las
páginas se renderizan por solicitud, no hay que reconstruir el sitio para ver
un cambio).

## Estructura del proyecto

```
data/                    JSON con proyectos, configuración del sitio y mensajes
public/images/           Assets de marca y fotos de proyectos "semilla"
public/uploads/          Archivos subidos desde el panel (no se versiona)
src/app/(site)/          Páginas públicas (inicio, proyectos, servicios, nosotros, contacto)
src/app/admin/           Panel de administración (protegido por middleware)
src/app/api/admin/       Endpoints del panel (proyectos, media, settings, mensajes, auth)
src/app/api/contact/     Endpoint público del formulario de contacto
src/components/          Componentes de UI, secciones, marca y panel admin
src/lib/                 Acceso a datos (JSON), auth, validación, utilidades
```

## Despliegue — nota importante sobre persistencia

Este proyecto **necesita un sistema de archivos persistente y con permisos de
escritura** en tiempo de ejecución, porque:

1. El panel de administración escribe en `/data/*.json` al guardar cambios.
2. Las imágenes subidas se guardan en `/public/uploads`.

Esto funciona muy bien en un **VPS, servidor dedicado o contenedor Docker**
con `npm run build && npm run start` (o detrás de PM2/nginx), montando
`/data` y `/public/uploads` en un volumen persistente.

**No es compatible tal cual con plataformas serverless de solo lectura**
(por ejemplo, Vercel en su configuración por defecto), ya que ahí el sistema
de archivos se reinicia en cada despliegue y las funciones no pueden escribir
de forma persistente. Para desplegar en una plataforma así, habría que migrar
`src/lib/*.ts` (la capa de datos) a una base de datos (Postgres, SQLite en
Turso/LiteFS, etc.) y el almacenamiento de imágenes a un servicio como S3 o
Cloudinary — la interfaz de las funciones (`getProjects`, `createProject`,
`updateSettings`, etc.) ya está aislada en `src/lib/`, así que ese cambio no
afecta a las páginas ni al panel.

## Scripts

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run start    # servir el build de producción
npm run lint     # eslint
```
