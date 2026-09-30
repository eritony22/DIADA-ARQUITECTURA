// Diagnóstico automático: recorre el estado de la obra, detecta problemas y
// propone acciones correctivas estandarizadas. Cada alerta tiene una `clave`
// estable para poder vincularla a una acción del tablero PDCA.
import type {
  Categoria6M,
  EtapaTechoPropio,
  ISODate,
  ObraState,
} from "@/types/obras";
import {
  addDays,
  avanceModulo,
  avancePorPartida,
  calcularValorizacion,
  descriptivos,
  diffDays,
  fechaCorta,
  indicadorBeneficiario,
  nombreCorto,
  pct,
  programadoPartida,
  resumen,
  soles,
  soloRegistradas,
  valorizacionesDeContrato,
  type IndicadorBeneficiario,
} from "./calc";

export type Severidad = "critical" | "serious" | "warning" | "info";

export interface Alerta {
  clave: string;
  severidad: Severidad;
  categoria: Categoria6M;
  ambito: "beneficiario" | "partida" | "obra" | "fianza" | "contrato" | "gestion";
  titulo: string;
  detalle: string;
  acciones: string[];
  beneficiarioIds: string[];
}

export const SEVERIDAD_ORDEN: Record<Severidad, number> = {
  critical: 0,
  serious: 1,
  warning: 2,
  info: 3,
};

export const SEVERIDAD_LABEL: Record<Severidad, string> = {
  critical: "Crítico",
  serious: "Alto",
  warning: "Medio",
  info: "Informativo",
};

export const CATEGORIA_LABEL: Record<Categoria6M, string> = {
  mano_obra: "Mano de obra",
  materiales: "Materiales",
  metodo: "Método",
  maquinaria: "Equipos",
  medio_ambiente: "Entorno / clima",
  medicion: "Medición / calidad",
  gestion: "Gestión / contractual",
};

/* ------------------------------------------------------------------ */
/* Catálogo de acciones por partida                                    */
/* ------------------------------------------------------------------ */

interface FichaPartida {
  categoria: Categoria6M;
  causas: string[];
  acciones: string[];
}

export const CATALOGO_PARTIDAS: Record<string, FichaPartida> = {
  cimiento: {
    categoria: "metodo",
    causas: [
      "Trazo y niveles sin aprobar por el supervisor",
      "Suelo inestable o nivel freático alto al excavar",
      "Agregados o cemento no acopiados a tiempo",
    ],
    acciones: [
      "Validar trazo y niveles con el supervisor antes de excavar (acta de replanteo).",
      "Programar vaciados conjuntos por grupo de módulos cercanos para reducir traslados.",
      "Si hay agua en zanja: drenar/bombear y considerar solado; registrarlo en cuaderno de obra.",
      "Acopiar agregados y cemento con al menos 3 días de anticipación por módulo.",
    ],
  },
  sobrecimiento: {
    categoria: "maquinaria",
    causas: ["Encofrado insuficiente", "Espera de fraguado del cimiento"],
    acciones: [
      "Rotar un juego de encofrado metálico entre módulos del mismo grupo.",
      "Encadenar el sobrecimiento 24 h después del cimiento y curar ambos.",
    ],
  },
  muros: {
    categoria: "mano_obra",
    causas: [
      "Rendimiento de albañilería bajo (< 8 m²/día por pareja)",
      "Falta de ladrillo en obra",
      "Una sola cuadrilla atendiendo varios módulos dispersos",
    ],
    acciones: [
      "Medir el rendimiento real por pareja (m²/día) y compararlo con 8–10 m²/día.",
      "Asegurar stock de ladrillo para 1 semana por módulo antes de iniciar muros.",
      "Asignar una cuadrilla dedicada por cada 2 módulos cercanos del mismo grupo.",
      "Controlar plomada, alineamiento y juntas diariamente para evitar rehacer.",
    ],
  },
  columnas: {
    categoria: "metodo",
    causas: ["Acero habilitado en sitio (lento)", "Encofrado de columnas insuficiente"],
    acciones: [
      "Habilitar el acero en taller central y distribuir armado por módulo.",
      "Verificar recubrimientos y estribos antes del vaciado (check-list de supervisión).",
    ],
  },
  losa: {
    categoria: "medio_ambiente",
    causas: [
      "Lluvias en la zona del VRAEM",
      "Estructura o coberturas livianas no entregadas",
      "Muros/columnas sin concluir",
    ],
    acciones: [
      "Programar el techado en ventanas de clima seco y proteger el material acopiado.",
      "Confirmar con el proveedor la entrega de estructura y coberturas por grupo.",
      "Prefabricar la estructura de cobertura mientras se concluyen muros.",
    ],
  },
  tarrajeo: {
    categoria: "mano_obra",
    causas: [
      "Es la partida de mayor peso (20 %) y la más intensiva en mano de obra",
      "Arena fina sin cernir o de mala calidad",
      "Falta de curado → fisuras y retrabajo",
    ],
    acciones: [
      "Asignar una cuadrilla especializada de tarrajeadores que rote por módulos.",
      "Trabajar por ambientes en paralelo (interior/exterior) con andamios propios.",
      "Cernir la arena fina y controlar la dosificación; curar 3 días mínimo.",
      "Controlar espesor y plomo con reglas; registrar m²/día por operario.",
    ],
  },
  iiss: {
    categoria: "mano_obra",
    causas: ["Gasfitero compartido entre muchos frentes", "Pruebas hidráulicas pendientes"],
    acciones: [
      "Programar al gasfitero por grupo de módulos y dejar las pruebas hidráulicas con acta.",
      "Coordinar el trazo de desagüe con la ubicación del pozo séptico.",
    ],
  },
  iiee: {
    categoria: "mano_obra",
    causas: ["Electricista no disponible", "Tuberías no embebidas a tiempo"],
    acciones: [
      "Embeber tuberías durante muros y techo para no picar después.",
      "Programar pruebas de continuidad y aislamiento antes de acabados.",
    ],
  },
  piso: {
    categoria: "metodo",
    causas: ["Depende de concluir tarrajeo", "Falta de nivelación del contrapiso"],
    acciones: [
      "Vaciar contrapisos en bloque por grupo apenas termina el tarrajeo.",
      "Verificar niveles y pendientes hacia sumideros.",
    ],
  },
  mayolica: {
    categoria: "materiales",
    causas: ["Mayólica o pegamento no comprados", "Muros sin tarrajeo"],
    acciones: [
      "Consolidar la compra de mayólica y fragua para todos los módulos del grupo.",
      "Iniciar enchape por baño apenas se libera el tarrajeo de ese ambiente.",
    ],
  },
  accesorios: {
    categoria: "materiales",
    causas: ["Compras dispersas", "Accesorios faltantes o dañados"],
    acciones: [
      "Hacer una compra consolidada de aparatos sanitarios y eléctricos por grupo.",
      "Checklist de instalación y prueba de funcionamiento por módulo.",
    ],
  },
  parapeto: {
    categoria: "metodo",
    causas: ["Depende de la losa/cobertura"],
    acciones: ["Ejecutar parapetos inmediatamente después del techado, con la misma cuadrilla."],
  },
  pozo: {
    categoria: "medio_ambiente",
    causas: [
      "Test de percolación o nivel freático desfavorable",
      "Espacio insuficiente en el lote",
    ],
    acciones: [
      "Realizar el test de percolación al inicio y definir tipo de pozo/percolador.",
      "Respetar distancias a pozos de agua y linderos; registrar ubicación en plano.",
    ],
  },
};

const ACCIONES_ATRASO = [
  "Reunión de reprogramación con la cuadrilla y el residente; fijar metas semanales por módulo.",
  "Reforzar la cuadrilla o extender la jornada en el módulo atrasado.",
  "Revisar abastecimiento de materiales para las próximas 2 semanas.",
];

const ACCIONES_NO_INICIADO = [
  "Verificar que el predio esté liberado (acta de entrega de terreno firmada por la familia).",
  "Confirmar la condición del predio (vacío / demolición) y resolver demoliciones pendientes.",
  "Confirmar disponibilidad y contacto del beneficiario; registrar visitas fallidas.",
  "Asegurar materiales iniciales (cemento, fierro, agregados) en el lote.",
];

/* ------------------------------------------------------------------ */
/* Reglas                                                              */
/* ------------------------------------------------------------------ */

const ETAPAS_CON_GARANTIA: EtapaTechoPropio[] = [
  "garantia",
  "desembolso",
  "ejecucion",
  "verificacion",
];

export function diagnosticar(
  state: ObraState,
  fecha: ISODate,
  beneficiarioIds?: Set<string>,
): Alerta[] {
  const cfg = state.config;
  // Indicadores sobre el avance real (semanas registradas); las reglas de
  // contrato sí miran también la semana abierta.
  const real = soloRegistradas(state);
  const alertas: Alerta[] = [];
  const benefs = state.beneficiarios.filter(
    (b) => !beneficiarioIds || beneficiarioIds.has(b.id),
  );
  const indicadores = benefs.map((b) => indicadorBeneficiario(b, real, fecha));
  const hayValorizaciones = real.valorizaciones.length > 0;

  /* 1. Beneficiarios: sin inicio, atraso, secuencia, predio, cierre */
  for (const i of indicadores) {
    const b = i.beneficiario;
    const nombre = `${nombreCorto(b)} (G${b.grupo} · ${b.entidadId})`;

    if (hayValorizaciones && i.programado > 0.05 && i.ejecutado === 0) {
      alertas.push({
        clave: `sin-inicio:${b.id}`,
        severidad: i.programado > 0.25 ? "critical" : "serious",
        categoria: "gestion",
        ambito: "beneficiario",
        titulo: `Módulo sin iniciar — ${nombre}`,
        detalle: `Debería llevar ${pct(i.programado)} y no registra avance. Inicio programado: ${fechaCorta(i.inicio)}.`,
        acciones: ACCIONES_NO_INICIADO,
        beneficiarioIds: [b.id],
      });
    } else if (
      i.spi !== null &&
      i.ejecutado > 0 &&
      i.ejecutado < 0.999 &&
      i.spi < cfg.umbralSpiAlerta
    ) {
      const brechas = state.partidas
        .map((p) => {
          const prog = programadoPartida(p, diffDays(fecha, i.inicio));
          return { p, brecha: prog - (i.avances[p.id] ?? 0) };
        })
        .filter((x) => x.brecha > 10)
        .sort((a, b) => b.brecha * b.p.peso - a.brecha * a.p.peso)
        .slice(0, 2);
      alertas.push({
        clave: `atraso:${b.id}`,
        severidad: i.spi < cfg.umbralSpiCritico ? "critical" : "serious",
        categoria: brechas[0]
          ? (CATALOGO_PARTIDAS[brechas[0].p.id]?.categoria ?? "metodo")
          : "metodo",
        ambito: "beneficiario",
        titulo: `Atraso en módulo — ${nombre}`,
        detalle:
          `Ejecutado ${pct(i.ejecutado)} vs programado ${pct(i.programado)} (SPI ${i.spi.toFixed(2)}).` +
          (i.finProyectado ? ` Término proyectado: ${fechaCorta(i.finProyectado)} (programado ${fechaCorta(i.finProgramado)}).` : "") +
          (brechas.length
            ? ` Partidas más rezagadas: ${brechas.map((x) => x.p.nombre).join(", ")}.`
            : ""),
        acciones: [
          ...ACCIONES_ATRASO,
          ...brechas.flatMap((x) => CATALOGO_PARTIDAS[x.p.id]?.acciones.slice(0, 2) ?? []),
        ],
        beneficiarioIds: [b.id],
      });
    }

    const errores = state.partidas.filter(
      (p) =>
        (i.avances[p.id] ?? 0) > 0 &&
        p.predecesoras.some((pre) => (i.avances[pre] ?? 0) < 50),
    );
    if (errores.length) {
      alertas.push({
        clave: `secuencia:${b.id}`,
        severidad: "warning",
        categoria: "medicion",
        ambito: "beneficiario",
        titulo: `Secuencia constructiva inconsistente — ${nombre}`,
        detalle: `${errores.map((p) => p.nombre).join(", ")} registra avance con predecesoras por debajo del 50 %.`,
        acciones: [
          "Verificar en campo el metrado reportado (posible error de registro).",
          "Si es real: revisar calidad y riesgo de retrabajo (p. ej. tarrajeo sobre muro sin concluir).",
          "Estandarizar el formato de metrado diario por partida para la cuadrilla.",
        ],
        beneficiarioIds: [b.id],
      });
    }

    if (
      (b.estadoPredio === "demolicion_total" ||
        b.estadoPredio === "demolicion_parcial") &&
      b.predioConfirmado !== true
    ) {
      alertas.push({
        clave: `predio:${b.id}`,
        severidad: i.programado > 0 ? "serious" : "warning",
        categoria: "gestion",
        ambito: "beneficiario",
        titulo: `Demolición pendiente de confirmar — ${nombre}`,
        detalle: `El predio figura como "${b.estadoPredio === "demolicion_total" ? "Demolición total" : "Demolición parcial"}" sin confirmación.`,
        acciones: [
          "Coordinar con la familia la demolición y el retiro de desmonte (acta firmada).",
          "Definir quién asume el costo de la demolición y registrarlo como adicional si corresponde.",
          "Reprogramar el inicio del módulo según la fecha real de liberación del predio.",
        ],
        beneficiarioIds: [b.id],
      });
    }

    if (i.ejecutado >= 0.999 && (b.etapa === "ejecucion" || b.etapa === "desembolso")) {
      alertas.push({
        clave: `cierre:${b.id}`,
        severidad: "info",
        categoria: "gestion",
        ambito: "beneficiario",
        titulo: `Módulo concluido — gestionar verificación — ${nombre}`,
        detalle: "El módulo llegó al 100 % pero sigue en etapa de ejecución.",
        acciones: [
          "Solicitar la verificación de obra y el informe correspondiente para el cierre del BFH.",
          "Preparar acta de entrega a la familia y dossier fotográfico.",
          "Gestionar la liberación de la carta fianza asociada.",
        ],
        beneficiarioIds: [b.id],
      });
    }
  }

  /* 2. Partidas cuello de botella */
  if (hayValorizaciones && indicadores.length) {
    for (const ap of avancePorPartida(indicadores, real, fecha)) {
      // Impacto = puntos del módulo que faltan respecto a lo programado.
      const impacto = ap.brecha * ap.partida.peso;
      if (ap.brecha <= 15 || impacto < 0.75) continue;
      const ficha = CATALOGO_PARTIDAS[ap.partida.id];
      alertas.push({
        clave: `partida:${ap.partida.id}`,
        severidad: impacto >= 4 ? "critical" : impacto >= 2 ? "serious" : "warning",
        categoria: ficha?.categoria ?? "metodo",
        ambito: "partida",
        titulo: `Cuello de botella: ${ap.partida.nombre}`,
        detalle:
          `Promedio ejecutado ${ap.ejecutado.toFixed(0)} % vs programado ${ap.programado.toFixed(0)} % (brecha ${ap.brecha.toFixed(0)} pts; peso ${(ap.partida.peso * 100).toFixed(0)} %; impacto ${impacto.toFixed(1)} pts del avance del módulo).` +
          (ficha ? ` Causas frecuentes: ${ficha.causas.join("; ")}.` : ""),
        acciones: ficha?.acciones ?? ACCIONES_ATRASO,
        beneficiarioIds: indicadores
          .filter((i) => (i.avances[ap.partida.id] ?? 0) < ap.programado)
          .map((i) => i.beneficiario.id),
      });
    }
  }

  /* 3. Obra: proyección y dispersión */
  const res = resumen(indicadores, cfg);
  const finContractual = addDays(cfg.fechaInicio, cfg.plazoTotalDias);
  if (res.finProyectado && res.finProyectado > finContractual) {
    alertas.push({
      clave: "obra:plazo",
      severidad: "critical",
      categoria: "gestion",
      ambito: "obra",
      titulo: "La proyección supera el plazo contractual",
      detalle: `Término proyectado ${fechaCorta(res.finProyectado)} vs plazo ${fechaCorta(finContractual)} (${diffDays(res.finProyectado, finContractual)} días de exceso).`,
      acciones: [
        "Elaborar un plan de recuperación con metas semanales por frente y responsable.",
        "Evaluar ampliación de plazo con sustento (lluvias, liberación de predios) antes del vencimiento.",
        "Priorizar los módulos con mayor atraso y las partidas de mayor peso (tarrajeo, losa, muros).",
        "Revisar la vigencia de las cartas fianza frente al nuevo plazo proyectado.",
      ],
      beneficiarioIds: indicadores
        .filter((i) => i.finProyectado && i.finProyectado > finContractual)
        .map((i) => i.beneficiario.id),
    });
  }

  const enCurso = indicadores.filter((i) => i.programado > 0.1);
  if (enCurso.length >= 4) {
    const d = descriptivos(enCurso.map((i) => i.ejecutado));
    if (d.cv !== null && d.cv > 0.35) {
      alertas.push({
        clave: "obra:dispersion",
        severidad: "warning",
        categoria: "metodo",
        ambito: "obra",
        titulo: "Frentes desbalanceados",
        detalle: `El avance entre módulos en curso varía mucho (coef. de variación ${(d.cv * 100).toFixed(0)} %; rango ${pct(d.min, 0)} – ${pct(d.max, 0)}).`,
        acciones: [
          "Redistribuir cuadrillas de los módulos adelantados hacia los rezagados.",
          "Agrupar módulos cercanos (misma zona/grupo) bajo un mismo capataz.",
          "Estandarizar un ciclo de trabajo tipo por módulo (tren de actividades).",
        ],
        beneficiarioIds: [],
      });
    }
  }

  const porEntidad = state.entidades
    .map((e) => {
      const ind = indicadores.filter((i) => i.beneficiario.entidadId === e.id);
      return { e, ind, res: resumen(ind, cfg) };
    })
    .filter((x) => x.res.spi !== null);
  if (porEntidad.length >= 2) {
    const sorted = [...porEntidad].sort((a, b) => (a.res.spi ?? 0) - (b.res.spi ?? 0));
    const peor = sorted[0];
    const mejor = sorted[sorted.length - 1];
    if ((mejor.res.spi ?? 0) - (peor.res.spi ?? 0) > 0.2) {
      alertas.push({
        clave: `entidad:${peor.e.id}`,
        severidad: "warning",
        categoria: "gestion",
        ambito: "obra",
        titulo: `Rendimiento dispar entre entidades técnicas: ${peor.e.sigla}`,
        detalle: `SPI ${peor.e.sigla} ${(peor.res.spi ?? 0).toFixed(2)} vs ${mejor.e.sigla} ${(mejor.res.spi ?? 0).toFixed(2)}.`,
        acciones: [
          `Replicar en ${peor.e.sigla} las prácticas de ${mejor.e.sigla} (organización de cuadrillas, abastecimiento).`,
          "Revisar el cumplimiento del subcontratista y aplicar las cláusulas del contrato si corresponde.",
        ],
        beneficiarioIds: peor.ind.map((i) => i.beneficiario.id),
      });
    }
  }

  /* 4. Contratos: adelantos y valorizaciones pendientes */
  for (const c of state.contratos) {
    const serie = valorizacionesDeContrato(c.id, state.valorizaciones).filter(
      (v) => v.fechaCorte <= fecha,
    );
    const ultima = serie[serie.length - 1];
    if (ultima) {
      const calc = calcularValorizacion(ultima, state);
      if (calc && calc.saldoAdelantos > 0 && calc.saldoAdelantos > calc.saldoPorValorizar) {
        alertas.push({
          clave: `adelanto:${c.id}`,
          severidad: "critical",
          categoria: "gestion",
          ambito: "contrato",
          titulo: `Adelanto en riesgo — ${c.subcontratista}`,
          detalle: `Saldo de adelantos ${soles(calc.saldoAdelantos)} mayor que el saldo por valorizar ${soles(calc.saldoPorValorizar)}.`,
          acciones: [
            "Aumentar el porcentaje de amortización en las próximas valorizaciones.",
            "Conciliar materiales entregados vs. consumidos en obra (kardex por módulo).",
          ],
          beneficiarioIds: c.beneficiarioIds,
        });
      } else if (
        calc &&
        calc.saldoAdelantos > 0 &&
        calc.amortizacionPeriodo === 0 &&
        calc.brutoPeriodo > 0
      ) {
        alertas.push({
          clave: `amortizacion:${c.id}:${ultima.id}`,
          severidad: "warning",
          categoria: "gestion",
          ambito: "contrato",
          titulo: `Valorización N° ${ultima.numero} sin amortizar adelantos — ${c.entidadId}`,
          detalle: `${c.subcontratista}: saldo de adelantos ${soles(calc.saldoAdelantos)} sin descuento en el período.`,
          acciones: [
            "Aplicar el descuento de adelanto proporcional al avance valorizado.",
          ],
          beneficiarioIds: [],
        });
      }
    }
    for (const v of serie) {
      if (v.estado === "borrador" && diffDays(fecha, v.fechaCorte) > 7) {
        alertas.push({
          clave: `val-pendiente:${v.id}`,
          severidad: "warning",
          categoria: "gestion",
          ambito: "contrato",
          titulo: `Valorización N° ${v.numero} sin aprobar — ${c.entidadId}`,
          detalle: `${c.subcontratista}: corte del ${fechaCorta(v.fechaCorte)}, ${diffDays(fecha, v.fechaCorte)} días en borrador.`,
          acciones: [
            "Revisar metrados con el supervisor y aprobar o devolver con observaciones.",
            "Fijar un calendario de valorizaciones (p. ej. cada 15 días) con fechas límite.",
          ],
          beneficiarioIds: [],
        });
      }
    }
    for (let k = 1; k < serie.length; k++) {
      const retro = c.beneficiarioIds.filter(
        (id) =>
          avanceModulo(serie[k].avances[id] ?? {}, state.partidas) + 1e-9 <
          avanceModulo(serie[k - 1].avances[id] ?? {}, state.partidas),
      );
      if (retro.length) {
        alertas.push({
          clave: `retroceso:${serie[k].id}`,
          severidad: "warning",
          categoria: "medicion",
          ambito: "contrato",
          titulo: `Avance acumulado disminuye en valorización N° ${serie[k].numero}`,
          detalle: `${retro.length} módulo(s) reportan menos avance que en la N° ${serie[k - 1].numero}.`,
          acciones: [
            "Corregir el metrado (el avance es acumulado) o documentar la demolición/retrabajo.",
          ],
          beneficiarioIds: retro,
        });
      }
    }
  }

  /* 5. Fianzas */
  const diasAviso = cfg.diasAvisoFianza;
  for (const f of state.fianzas) {
    if (f.estado !== "vigente" && f.estado !== "renovada") continue;
    const dias = diffDays(f.fechaVencimiento, fecha);
    if (dias < 0) {
      alertas.push({
        clave: `fianza-vencida:${f.id}`,
        severidad: "critical",
        categoria: "gestion",
        ambito: "fianza",
        titulo: `Carta fianza vencida — N° ${f.numero} (${f.entidadId})`,
        detalle: `Venció el ${fechaCorta(f.fechaVencimiento)} (${-dias} días). Monto ${soles(f.monto)} — ${f.emisor}.`,
        acciones: [
          "Renovar de inmediato con el emisor y remitir la nueva carta al Fondo MIVIVIENDA.",
          "Si ya fue renovada, registrar la nueva y marcar ésta como 'renovada/liberada'.",
        ],
        beneficiarioIds: f.beneficiarioIds,
      });
    } else if (dias <= diasAviso) {
      alertas.push({
        clave: `fianza-vence:${f.id}`,
        severidad: dias <= 15 ? "serious" : "warning",
        categoria: "gestion",
        ambito: "fianza",
        titulo: `Carta fianza por vencer — N° ${f.numero} (${f.entidadId})`,
        detalle: `Vence el ${fechaCorta(f.fechaVencimiento)} (en ${dias} días). Monto ${soles(f.monto)} — ${f.emisor}.`,
        acciones: [
          "Iniciar la renovación con al menos 15 días de anticipación (requisitos, estados financieros, contragarantías).",
          "Contrastar el nuevo vencimiento con la fecha de término proyectada de los módulos cubiertos.",
        ],
        beneficiarioIds: f.beneficiarioIds,
      });
    }
  }

  for (const e of state.entidades) {
    const requeridos = benefs.filter(
      (b) => b.entidadId === e.id && ETAPAS_CON_GARANTIA.includes(b.etapa),
    );
    if (!requeridos.length) continue;
    const requerido =
      requeridos.length * (cfg.valorBfh + cfg.ahorroFamilia) * cfg.coberturaGarantia;
    const vigente = state.fianzas
      .filter(
        (f) =>
          f.entidadId === e.id &&
          (f.estado === "vigente" || f.estado === "renovada") &&
          f.fechaVencimiento >= fecha,
      )
      .reduce((s, f) => s + f.monto, 0);
    if (vigente + 1 < requerido) {
      alertas.push({
        clave: `cobertura:${e.id}`,
        severidad: vigente === 0 ? "critical" : "serious",
        categoria: "gestion",
        ambito: "fianza",
        titulo: `Cobertura de garantías insuficiente — ${e.sigla}`,
        detalle: `${requeridos.length} familia(s) en etapa de garantía/desembolso/ejecución requieren ≈ ${soles(requerido)} (${(cfg.coberturaGarantia * 100).toFixed(0)} % de BFH + ahorro); vigente: ${soles(vigente)}.`,
        acciones: [
          "Registrar o tramitar las cartas fianza faltantes antes de solicitar el desembolso.",
          "Verificar el porcentaje de cobertura exigido en la convocatoria vigente.",
        ],
        beneficiarioIds: requeridos.map((b) => b.id),
      });
    }
  }

  /* 6. Gestión: acciones PDCA vencidas, datos faltantes */
  for (const a of state.acciones) {
    if (a.estado === "cerrada") continue;
    if (a.fechaCompromiso < fecha) {
      alertas.push({
        clave: `accion-vencida:${a.id}`,
        severidad: "warning",
        categoria: "gestion",
        ambito: "gestion",
        titulo: `Acción correctiva vencida: ${a.accion.slice(0, 60)}${a.accion.length > 60 ? "…" : ""}`,
        detalle: `Responsable: ${a.responsable || "sin asignar"} · compromiso ${fechaCorta(a.fechaCompromiso)}.`,
        acciones: [
          "Actualizar el estado en el tablero PDCA o reprogramar con nueva fecha y responsable.",
        ],
        beneficiarioIds: a.beneficiarioIds,
      });
    }
  }

  const sinPredio = benefs.filter((b) => b.estadoPredio === null);
  if (sinPredio.length) {
    alertas.push({
      clave: "datos:predio",
      severidad: "info",
      categoria: "medicion",
      ambito: "gestion",
      titulo: `${sinPredio.length} predio(s) sin condición registrada`,
      detalle: "Registra si el predio está vacío o requiere demolición total/parcial.",
      acciones: [
        "Completar la ficha de diagnóstico del predio en la visita de replanteo.",
      ],
      beneficiarioIds: sinPredio.map((b) => b.id),
    });
  }

  if (!hayValorizaciones && indicadores.some((i) => i.programado > 0)) {
    alertas.push({
      clave: "datos:valorizaciones",
      severidad: "info",
      categoria: "medicion",
      ambito: "gestion",
      titulo: "Aún no hay semanas registradas",
      detalle: "El cronograma indica que la obra ya debería tener avance, pero ninguna semana fue cerrada como avance real.",
      acciones: ["Valorizar la semana en 'Valorización semanal' y cerrarla para registrar el avance real."],
      beneficiarioIds: [],
    });
  }

  if (!state.fianzas.length && state.beneficiarios.length) {
    alertas.push({
      clave: "datos:fianzas",
      severidad: "info",
      categoria: "gestion",
      ambito: "fianza",
      titulo: "No hay cartas fianza registradas",
      detalle: "Registra las garantías de cada entidad técnica para controlar vencimientos y cobertura.",
      acciones: ["Cargar número, emisor, monto y vigencia de cada carta fianza."],
      beneficiarioIds: [],
    });
  }

  return alertas.sort(
    (a, b) => SEVERIDAD_ORDEN[a.severidad] - SEVERIDAD_ORDEN[b.severidad],
  );
}

export type { IndicadorBeneficiario };
