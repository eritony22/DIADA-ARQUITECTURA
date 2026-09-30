# Control de Obras

Herramienta independiente (no forma parte del sitio de DIADA) para controlar
obras de módulos de vivienda del programa **Techo Propio – Construcción en
Sitio Propio**. Primer proyecto: **VRAEM 2026 — Pangoa** (entidades técnicas
PAHER y JCVM).

Next.js 16 + TypeScript + Tailwind v4 + Recharts, datos en Postgres (Neon),
con su propio inicio de sesión.

## Qué hace

| Pestaña | Qué hace |
| --- | --- |
| Resumen | KPIs, curva S (programado / ejecutado / proyección), avance por partida y por módulo, mapa, comparativo por entidad técnica. |
| Beneficiarios | Padrón, etapa Techo Propio, condición del predio, semáforo y término proyectado; ficha por módulo. |
| Cronograma | Gantt por módulo y cronograma tipo por partida. |
| **Valorización semanal** | Valorizar la obra por avance cada semana (corte configurable, sábado por defecto), registrar la semana como **avance real** con fecha y hora, y generar el **reporte de pago semanal** al subcontratista (PDF e Excel con el formato del cuadro de valorización). |
| **Maestros y pagos** | Registro de maestros de obra (DNI, teléfono, cuenta, pago por módulo), asignación de módulos, pagos realizados (fecha, monto, medio, N° de operación) con saldo por maestro, pagos a cuenta y **planilla semanal consolidada** para firma (PDF / Excel). |
| **Materiales** | Almacén por entidad técnica y stock por módulo: ingresos de compras, entregas (a uno o varios módulos), devoluciones, traslados y mermas, cada una con N° de documento y **nota imprimible**. Matriz de qué materiales tiene cada módulo, kardex, catálogo con requerido por módulo y consumo estimado con el avance real. |
| Fianzas | Cartas fianza, vencimientos y cobertura por entidad técnica. |
| Diagnóstico y acciones | Alertas automáticas con acciones correctivas sugeridas, Pareto 6M y tablero PDCA. |
| Estadística y proyección | Descriptivos, dispersión, distribución, regresión y flujo de pagos proyectado. |
| Parámetros y datos | Importar la lista oficial (.xlsx), partidas y pesos, datos de la obra, demo y respaldo JSON. |

### Flujo semanal

1. En **Valorización semanal** elige el subcontrato y la semana (al sábado).
2. **Valorizar esta semana** abre la valorización N° siguiente con el último
   avance registrado.
3. Carga lo ejecutado por módulo y partida, como *avance de la semana* (puntos
   que se suman) o como *avance acumulado*. El pago de cada módulo se calcula
   solo: avance × peso de la partida × costo unitario.
4. Ajusta el descuento de adelantos (hay un valor sugerido proporcional) y
   otros descuentos.
5. **Registrar semana y generar pago**: la semana queda bloqueada, con fecha,
   hora y usuario, y pasa a ser avance real. Todos los indicadores, la curva S,
   las proyecciones y las alertas usan solo semanas registradas.
6. Se abre el **reporte de pago semanal**: *Imprimir / Guardar PDF* o
   *Descargar Excel* (con fórmulas, como el cuadro original).
7. Al pagar, **Marcar pagada** con la fecha de pago. Una semana registrada y no
   pagada se puede reabrir indicando el motivo; todo queda en la bitácora.

### Pagos a maestros de obra

- Cada maestro es un contrato a destajo por módulo. Si un módulo cambia de
  maestro, lo ya valorizado no se vuelve a pagar: el nuevo maestro solo cobra
  el avance posterior. Las semanas ya registradas conservan sus módulos.
- En la semana registrada se usa **Registrar pago**. Cuando los pagos cubren el
  neto, la semana pasa a *Pagada*. Un pago se puede anular y queda en la
  bitácora.
- Alertas: pagos pendientes a más de 7 días del corte, pagos mayores al neto
  y módulos sin maestro.

### Materiales

- Stock del almacén = ingresos − entregas + devoluciones − mermas en almacén.
- Stock del módulo = entregas + traslados recibidos − devoluciones − traslados
  enviados − mermas en el módulo.
- Si se completa el **requerido por módulo** (metrado del expediente) y la
  partida que lo consume, se estima el consumo con el avance registrado. Así
  se obtiene lo que queda en obra, lo que falta entregar, los faltantes y los
  sobrantes al concluir.
- El catálogo inicial trae nombres y unidades típicas de un módulo, **sin
  cantidades**: complétalas con tu metrado.
- Alertas: módulos por iniciar o en ejecución sin materiales, stock negativo en
  almacén, consumo mayor a lo entregado y sobrantes en módulos concluidos.

## Desarrollo local

```bash
cd control-obras
npm install
cp .env.example .env.local   # completa las variables
npm run dev                  # http://localhost:3000
```

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Postgres (Neon). La tabla `obras` se crea sola. |
| `ADMIN_USERNAME` | Usuario de acceso. |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt: `npm run hash-password -- "TU_CONTRASEÑA"`. En `.env.local` escapa cada `$` como `\$`; en Vercel pégalo tal cual. |
| `SESSION_SECRET` | Cadena aleatoria larga: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

Si falta alguna variable de acceso, la pantalla de ingreso lo dice
explícitamente en vez de mostrar "usuario o contraseña incorrectos".

## Despliegue en Vercel (proyecto propio, link propio)

1. En [vercel.com/new](https://vercel.com/new) importa **el mismo repositorio**
   como un **proyecto nuevo** (p. ej. `control-obras`).
2. En *Root Directory* elige **`control-obras`**. Vercel detecta Next.js.
3. En *Storage* crea y conecta una base **Postgres** (define `DATABASE_URL`).
4. En *Settings → Environment Variables* agrega `ADMIN_USERNAME`,
   `ADMIN_PASSWORD_HASH` y `SESSION_SECRET`, marcando **Production y Preview**.
5. Despliega. El link será `https://control-obras-<tu-usuario>.vercel.app` (o
   el dominio que le asignes).
6. Entra, ve a *Parámetros y datos → Subir archivo .xlsx* y carga la lista
   oficial de beneficiarios.

Opcional, para que cada proyecto solo se reconstruya cuando cambia lo suyo
(*Settings → Git → Ignored Build Step*):

- Proyecto **control-obras**: `git diff --quiet HEAD^ HEAD -- .`
- Proyecto **DIADA**: `git diff --quiet HEAD^ HEAD -- . ':!control-obras'`

## Datos personales

El repositorio es público: `data/obras-vraem-2026.json` solo contiene la
configuración (partidas, pesos, entidades, contratos). La lista de
beneficiarios se importa desde la herramienta y vive únicamente en la base de
datos. Los respaldos JSON descargados sí contienen datos personales.

## Código

```
src/lib/obras/calc.ts          fórmulas: avance, curva S, SPI, semanas, valorización
src/lib/obras/diagnostico.ts   reglas de alertas y acciones correctivas
src/lib/obras/ops.ts           importar, semanas, maestros, pagos, movimientos de materiales, demo
src/lib/obras/pagos.ts         valorizado vs. pagado por maestro, planilla semanal
src/lib/obras/materiales.ts    stock por almacén y módulo, consumo estimado, kardex
src/lib/obras/reporte.ts       datos del reporte de pago + monto en letras
src/lib/obras/reporte-excel.ts exportación .xlsx (exceljs)
src/components/obras/          tablero (pestañas, gráficos, reporte)
```
