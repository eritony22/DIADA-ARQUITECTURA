// Motor de cálculo del control de obras. Funciones puras (sin I/O) para que
// el panel, la API y cualquier exportación usen exactamente las mismas
// fórmulas que el cuadro de valorización en Excel:
//   aporte de la partida al módulo = peso × avance% / 100
//   monto valorizado               = avance del módulo × costo unitario
import type {
  Beneficiario,
  Contrato,
  ISODate,
  ObraConfig,
  ObraState,
  Partida,
  Valorizacion,
} from "@/types/obras";

/* ------------------------------------------------------------------ */
/* Fechas (siempre en UTC, para que no dependan de la zona horaria)    */
/* ------------------------------------------------------------------ */

const DAY = 86_400_000;

export function toTime(date: ISODate): number {
  return Date.parse(`${date}T00:00:00Z`);
}

export function fromTime(t: number): ISODate {
  return new Date(t).toISOString().slice(0, 10);
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromTime(toTime(date) + Math.round(days) * DAY);
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toTime(a) - toTime(b)) / DAY);
}

export function todayISO(): ISODate {
  return new Date().toISOString().slice(0, 10);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/* ------------------------------------------------------------------ */
/* Programado                                                          */
/* ------------------------------------------------------------------ */

export function inicioBeneficiario(b: Beneficiario, cfg: ObraConfig): ISODate {
  if (b.fechaInicio) return b.fechaInicio;
  return addDays(cfg.fechaInicio, Math.max(0, b.grupo - 1) * cfg.desfaseGrupoDias);
}

export function finProgramadoBeneficiario(
  b: Beneficiario,
  cfg: ObraConfig,
  partidas: Partida[],
): ISODate {
  return addDays(inicioBeneficiario(b, cfg), duracionModulo(partidas, cfg));
}

/** Duración del módulo según el cronograma de partidas (o el plazo configurado). */
export function duracionModulo(partidas: Partida[], cfg: ObraConfig): number {
  const fin = partidas.reduce(
    (max, p) => Math.max(max, p.inicioDia + p.duracionDias),
    0,
  );
  return fin > 0 ? fin : cfg.plazoModuloDias;
}

/** % programado de una partida (0–100) a `dias` del inicio del módulo. Avance lineal. */
export function programadoPartida(p: Partida, dias: number): number {
  if (p.duracionDias <= 0) return dias >= p.inicioDia ? 100 : 0;
  return clamp(((dias - p.inicioDia) / p.duracionDias) * 100, 0, 100);
}

/** Avance programado del módulo (fracción 0–1) a una fecha. */
export function programadoModulo(
  b: Beneficiario,
  state: Pick<ObraState, "config" | "partidas">,
  fecha: ISODate,
): number {
  const dias = diffDays(fecha, inicioBeneficiario(b, state.config));
  return state.partidas.reduce(
    (sum, p) => sum + (p.peso * programadoPartida(p, dias)) / 100,
    0,
  );
}

/* ------------------------------------------------------------------ */
/* Ejecutado (desde las valorizaciones)                                */
/* ------------------------------------------------------------------ */

export function valorizacionesOrdenadas(vals: Valorizacion[]): Valorizacion[] {
  return [...vals].sort(
    (a, b) =>
      a.fechaCorte.localeCompare(b.fechaCorte) || a.numero - b.numero,
  );
}

/** Avance acumulado por partida (0–100) de un beneficiario a una fecha. */
export function avancesA(
  beneficiarioId: string,
  vals: Valorizacion[],
  fecha: ISODate,
): Record<string, number> {
  let found: Record<string, number> | undefined;
  for (const v of valorizacionesOrdenadas(vals)) {
    if (v.fechaCorte > fecha) break;
    if (v.avances[beneficiarioId]) found = v.avances[beneficiarioId];
  }
  return found ?? {};
}

export function avanceModulo(
  avances: Record<string, number>,
  partidas: Partida[],
): number {
  return partidas.reduce(
    (sum, p) => sum + (p.peso * clamp(avances[p.id] ?? 0, 0, 100)) / 100,
    0,
  );
}

export function ultimaFechaCorte(vals: Valorizacion[]): ISODate | null {
  return vals.reduce<ISODate | null>(
    (max, v) => (max === null || v.fechaCorte > max ? v.fechaCorte : max),
    null,
  );
}

/**
 * Avance REAL = solo las semanas cerradas/registradas (aprobadas o pagadas).
 * La semana abierta (borrador) todavía puede cambiar y no entra en los
 * indicadores, la curva S ni las proyecciones.
 */
export function soloRegistradas<T extends { valorizaciones: Valorizacion[] }>(state: T): T {
  return {
    ...state,
    valorizaciones: state.valorizaciones.filter((v) => v.estado !== "borrador"),
  };
}

export function estaRegistrada(v: Valorizacion): boolean {
  return v.estado !== "borrador";
}

/* ------------------------------------------------------------------ */
/* Semanas de valorización                                             */
/* ------------------------------------------------------------------ */

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function nombreDia(dia: number): string {
  return DIAS[((dia % 7) + 7) % 7];
}

/** Día de la semana (0 = domingo) de una fecha ISO. */
export function diaSemana(fecha: ISODate): number {
  return new Date(toTime(fecha)).getUTCDay();
}

/** Fecha de corte (el día de corte igual o posterior a `fecha`). */
export function corteDeSemana(fecha: ISODate, diaCorte: number): ISODate {
  return addDays(fecha, (diaCorte - diaSemana(fecha) + 7) % 7);
}

/** Semana que cierra en `corte`: los 7 días que terminan ese día. */
export function semanaDe(corte: ISODate): { inicio: ISODate; fin: ISODate } {
  return { inicio: addDays(corte, -6), fin: corte };
}

/** N° de semana de obra (1 = la semana que contiene el inicio de obra). */
export function numeroSemana(corte: ISODate, inicioObra: ISODate, diaCorte: number): number {
  return Math.floor(diffDays(corte, corteDeSemana(inicioObra, diaCorte)) / 7) + 1;
}

/** Cortes semanales desde el inicio de obra hasta `hasta` (inclusive). */
export function cortesSemanales(inicioObra: ISODate, hasta: ISODate, diaCorte: number): ISODate[] {
  const out: ISODate[] = [];
  for (let c = corteDeSemana(inicioObra, diaCorte); c <= hasta; c = addDays(c, 7)) out.push(c);
  return out;
}

export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/* Indicadores por beneficiario                                        */
/* ------------------------------------------------------------------ */

export type Semaforo = "good" | "warning" | "serious" | "critical" | "neutral";

export interface IndicadorBeneficiario {
  beneficiario: Beneficiario;
  inicio: ISODate;
  finProgramado: ISODate;
  programado: number; // 0–1
  ejecutado: number; // 0–1
  spi: number | null;
  desvio: number; // ejecutado − programado (fracción)
  avances: Record<string, number>;
  finProyectado: ISODate | null;
  diasAtraso: number;
  semaforo: Semaforo;
  montoEjecutado: number;
  costoUnitario: number;
}

export function contratoDe(
  beneficiarioId: string,
  contratos: Contrato[],
): Contrato | undefined {
  return contratos.find((c) => c.beneficiarioIds.includes(beneficiarioId));
}

export function spiSemaforo(spi: number | null, cfg: ObraConfig): Semaforo {
  if (spi === null) return "neutral";
  if (spi >= 1) return "good";
  if (spi >= cfg.umbralSpiAlerta) return "warning";
  if (spi >= cfg.umbralSpiCritico) return "serious";
  return "critical";
}

/**
 * Historia (fecha, avance) de un beneficiario a partir de sus valorizaciones,
 * con el punto (inicio, 0) al comienzo.
 */
export function historiaBeneficiario(
  b: Beneficiario,
  state: ObraState,
  hasta: ISODate,
): { fecha: ISODate; avance: number }[] {
  const puntos = [{ fecha: inicioBeneficiario(b, state.config), avance: 0 }];
  for (const v of valorizacionesOrdenadas(state.valorizaciones)) {
    if (v.fechaCorte > hasta) break;
    const av = v.avances[b.id];
    if (!av) continue;
    puntos.push({ fecha: v.fechaCorte, avance: avanceModulo(av, state.partidas) });
  }
  return puntos;
}

export interface Ritmo {
  fecha: ISODate;
  avance: number;
  /** Avance (fracción) por día entre los dos últimos cortes con avance. */
  porDia: number;
}

/** Último punto y ritmo reciente de un módulo. */
export function ritmoReciente(
  puntos: { fecha: ISODate; avance: number }[],
): Ritmo | null {
  const ultimo = puntos[puntos.length - 1];
  if (!ultimo) return null;
  const conAvance = puntos.filter((p) => p.avance > 0);
  const base =
    conAvance.length >= 2 ? conAvance[conAvance.length - 2] : puntos[0];
  const dias = diffDays(ultimo.fecha, base.fecha);
  return {
    fecha: ultimo.fecha,
    avance: ultimo.avance,
    porDia: dias > 0 ? Math.max(0, (ultimo.avance - base.avance) / dias) : 0,
  };
}

/**
 * Proyección de término: ritmo (avance/día) de los dos últimos cortes con
 * avance; si no hay ritmo usable, se cae a la estimación EVM (plazo / SPI).
 */
export function proyectarFin(
  puntos: { fecha: ISODate; avance: number }[],
  inicio: ISODate,
  duracion: number,
  spi: number | null,
): ISODate | null {
  const r = ritmoReciente(puntos);
  if (!r || r.avance <= 0) return null;
  // Concluido: fecha del primer corte que registró el 100 %.
  if (r.avance >= 0.999) return puntos.find((p) => p.avance >= 0.999)?.fecha ?? r.fecha;
  if (r.porDia > 0.0005) {
    return addDays(r.fecha, Math.ceil((1 - r.avance) / r.porDia));
  }
  if (spi && spi > 0.05) return addDays(inicio, Math.ceil(duracion / spi));
  return null;
}

export function indicadorBeneficiario(
  b: Beneficiario,
  state: ObraState,
  fecha: ISODate,
): IndicadorBeneficiario {
  const inicio = inicioBeneficiario(b, state.config);
  const duracion = duracionModulo(state.partidas, state.config);
  const finProgramado = addDays(inicio, duracion);
  const programado = programadoModulo(b, state, fecha);
  const avances = avancesA(b.id, state.valorizaciones, fecha);
  const ejecutado = avanceModulo(avances, state.partidas);
  const spi = programado > 0.005 ? ejecutado / programado : null;
  const historia = historiaBeneficiario(b, state, fecha);
  const finProyectado = proyectarFin(historia, inicio, duracion, spi);
  const diasAtraso = finProyectado
    ? Math.max(0, diffDays(finProyectado, finProgramado))
    : programado > 0.1 && ejecutado === 0
      ? Math.max(0, diffDays(fecha, inicio))
      : 0;
  const contrato = contratoDe(b.id, state.contratos);
  const costoUnitario = contrato?.costoUnitario ?? 0;
  let semaforo = spiSemaforo(spi, state.config);
  if (ejecutado >= 0.999) semaforo = "good";
  return {
    beneficiario: b,
    inicio,
    finProgramado,
    programado,
    ejecutado,
    spi,
    desvio: ejecutado - programado,
    avances,
    finProyectado,
    diasAtraso,
    semaforo,
    montoEjecutado: ejecutado * costoUnitario,
    costoUnitario,
  };
}

/* ------------------------------------------------------------------ */
/* Agregados                                                           */
/* ------------------------------------------------------------------ */

export interface Resumen {
  modulos: number;
  programado: number;
  ejecutado: number;
  spi: number | null;
  terminados: number;
  enEjecucion: number;
  sinIniciar: number;
  atrasados: number;
  montoContratado: number;
  montoEjecutado: number;
  montoProgramado: number;
  bfhTotal: number;
  finProgramado: ISODate | null;
  finProyectado: ISODate | null;
}

export function resumen(
  indicadores: IndicadorBeneficiario[],
  cfg: ObraConfig,
): Resumen {
  const n = indicadores.length;
  const avg = (f: (i: IndicadorBeneficiario) => number) =>
    n ? indicadores.reduce((s, i) => s + f(i), 0) / n : 0;
  const programado = avg((i) => i.programado);
  const ejecutado = avg((i) => i.ejecutado);
  const maxDate = (dates: (ISODate | null)[]) =>
    dates.reduce<ISODate | null>(
      (m, d) => (d && (!m || d > m) ? d : m),
      null,
    );
  const proyectados = indicadores.map((i) => i.finProyectado);
  return {
    modulos: n,
    programado,
    ejecutado,
    spi: programado > 0.005 ? ejecutado / programado : null,
    terminados: indicadores.filter((i) => i.ejecutado >= 0.999).length,
    enEjecucion: indicadores.filter((i) => i.ejecutado > 0 && i.ejecutado < 0.999)
      .length,
    sinIniciar: indicadores.filter((i) => i.ejecutado === 0).length,
    atrasados: indicadores.filter(
      (i) => i.semaforo === "serious" || i.semaforo === "critical",
    ).length,
    montoContratado: indicadores.reduce((s, i) => s + i.costoUnitario, 0),
    montoEjecutado: indicadores.reduce((s, i) => s + i.montoEjecutado, 0),
    montoProgramado: indicadores.reduce(
      (s, i) => s + i.programado * i.costoUnitario,
      0,
    ),
    bfhTotal: n * cfg.valorBfh,
    finProgramado: maxDate(indicadores.map((i) => i.finProgramado)),
    // Si algún módulo con avance no tiene proyección, no se puede afirmar una fecha global.
    finProyectado: proyectados.some((d, k) => !d && indicadores[k].ejecutado < 0.999)
      ? null
      : maxDate(proyectados),
  };
}

export interface PuntoCurvaS {
  fecha: ISODate;
  t: number;
  programado: number; // %
  ejecutado?: number; // %
  proyectado?: number; // %
}

/**
 * Curva S del conjunto filtrado: programado semanal + ejecutado en cada corte
 * de valorización + proyección lineal desde el último corte hasta el 100 %.
 */
export function curvaS(
  beneficiarios: Beneficiario[],
  state: ObraState,
  hasta: ISODate,
): PuntoCurvaS[] {
  if (!beneficiarios.length) return [];
  const inicios = beneficiarios.map((b) => inicioBeneficiario(b, state.config));
  const inicio = inicios.reduce((m, d) => (d < m ? d : m));
  const duracion = duracionModulo(state.partidas, state.config);
  const finProg = addDays(
    inicios.reduce((m, d) => (d > m ? d : m)),
    duracion,
  );

  const cortes = [
    ...new Set(
      valorizacionesOrdenadas(state.valorizaciones)
        .filter(
          (v) =>
            v.fechaCorte <= hasta &&
            beneficiarios.some((b) => v.avances[b.id]),
        )
        .map((v) => v.fechaCorte),
    ),
  ];

  const ejecutadoA = (f: ISODate) =>
    (beneficiarios.reduce(
      (s, b) => s + avanceModulo(avancesA(b.id, state.valorizaciones, f), state.partidas),
      0,
    ) /
      beneficiarios.length) *
    100;
  const programadoA = (f: ISODate) =>
    (beneficiarios.reduce((s, b) => s + programadoModulo(b, state, f), 0) /
      beneficiarios.length) *
    100;

  // Proyección: cada módulo sigue a su ritmo reciente (misma lógica que
  // `proyectarFin`), así la curva llega al 100 % en la fecha proyectada.
  const ritmos = beneficiarios.map((b) =>
    ritmoReciente(historiaBeneficiario(b, state, hasta)),
  );
  const ultimoCorte = cortes[cortes.length - 1] ?? null;
  const proyectadoA = (f: ISODate) =>
    (ritmos.reduce(
      (s, r) =>
        s +
        (r ? Math.min(1, r.avance + r.porDia * Math.max(0, diffDays(f, r.fecha))) : 0),
      0,
    ) /
      beneficiarios.length) *
    100;
  let finProy: ISODate | null = null;
  if (ultimoCorte && ejecutadoA(ultimoCorte) < 100) {
    const fines = ritmos.map((r) =>
      !r || r.avance >= 0.999
        ? (r?.fecha ?? ultimoCorte)
        : r.porDia > 0.0005
          ? addDays(r.fecha, Math.ceil((1 - r.avance) / r.porDia))
          : null,
    );
    const conFin = fines.filter((d): d is ISODate => Boolean(d));
    const tope = addDays(ultimoCorte, 365);
    finProy = conFin.length
      ? conFin.reduce((m, d) => (d > m ? d : m), ultimoCorte)
      : null;
    if (finProy && finProy > tope) finProy = tope;
    // Módulos sin ritmo no llegan al 100 %: la curva se corta en el último fin conocido.
  }

  const fin = [finProg, finProy ?? finProg, ultimoCorte ?? finProg].reduce(
    (m, d) => (d > m ? d : m),
  );

  const fechas = new Set<ISODate>();
  for (let f = inicio; f <= fin; f = addDays(f, 7)) fechas.add(f);
  fechas.add(fin);
  fechas.add(finProg);
  for (const c of cortes) fechas.add(c);
  if (finProy) fechas.add(finProy);

  const cortesSet = new Set(cortes);
  return [...fechas].sort().map((f) => {
    const punto: PuntoCurvaS = {
      fecha: f,
      t: toTime(f),
      programado: round1(programadoA(f)),
    };
    if (f === inicio) punto.ejecutado = 0;
    if (cortesSet.has(f)) punto.ejecutado = round1(ejecutadoA(f));
    if (finProy && ultimoCorte && f >= ultimoCorte && f <= finProy) {
      punto.proyectado = round1(proyectadoA(f));
    }
    return punto;
  });
}

export interface AvancePartida {
  partida: Partida;
  programado: number; // % promedio de la partida
  ejecutado: number;
  brecha: number; // programado − ejecutado (puntos)
  aportePendiente: number; // puntos del módulo que faltan por esta partida
}

export function avancePorPartida(
  indicadores: IndicadorBeneficiario[],
  state: ObraState,
  fecha: ISODate,
): AvancePartida[] {
  const n = indicadores.length || 1;
  return state.partidas.map((p) => {
    const prog =
      indicadores.reduce(
        (s, i) => s + programadoPartida(p, diffDays(fecha, i.inicio)),
        0,
      ) / n;
    const ejec =
      indicadores.reduce((s, i) => s + clamp(i.avances[p.id] ?? 0, 0, 100), 0) /
      n;
    return {
      partida: p,
      programado: round1(prog),
      ejecutado: round1(ejec),
      brecha: round1(prog - ejec),
      aportePendiente: round1(p.peso * (100 - ejec)),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Valorización                                                        */
/* ------------------------------------------------------------------ */

export interface LineaValorizacion {
  beneficiario: Beneficiario;
  avances: Record<string, number>;
  acumulado: number; // fracción
  anterior: number;
  periodo: number;
  montoAcumulado: number;
  montoAnterior: number;
  montoPeriodo: number;
}

export interface CalculoValorizacion {
  valorizacion: Valorizacion;
  contrato: Contrato;
  anterior: Valorizacion | null;
  lineas: LineaValorizacion[];
  brutoPeriodo: number;
  brutoAcumulado: number;
  adicionalesPeriodo: number;
  amortizacionPeriodo: number;
  descuentosPeriodo: number;
  netoPeriodo: number;
  montoContrato: number;
  saldoPorValorizar: number;
  saldoAdelantos: number;
  avanceContrato: number; // fracción
}

export function valorizacionesDeContrato(
  contratoId: string,
  vals: Valorizacion[],
): Valorizacion[] {
  return valorizacionesOrdenadas(vals.filter((v) => v.contratoId === contratoId));
}

/**
 * Avance del módulo en su valorización previa (de cualquier contrato): lo ya
 * valorizado, que no se vuelve a pagar aunque el módulo cambie de maestro.
 */
export function avanceAnterior(
  beneficiarioId: string,
  v: Valorizacion,
  vals: Valorizacion[],
): Record<string, number> {
  let prev: Record<string, number> = {};
  for (const x of valorizacionesOrdenadas(vals)) {
    if (x.id === v.id || !x.avances[beneficiarioId]) continue;
    const antes =
      x.fechaCorte < v.fechaCorte ||
      (x.contratoId === v.contratoId && x.fechaCorte === v.fechaCorte && x.numero < v.numero);
    if (antes) prev = x.avances[beneficiarioId];
  }
  return prev;
}

export function calcularValorizacion(
  v: Valorizacion,
  state: ObraState,
): CalculoValorizacion | null {
  const contrato = state.contratos.find((c) => c.id === v.contratoId);
  if (!contrato) return null;
  const serie = valorizacionesDeContrato(contrato.id, state.valorizaciones);
  const idx = serie.findIndex((x) => x.id === v.id);
  const anterior = idx > 0 ? serie[idx - 1] : null;
  // Semana abierta: los módulos actuales del contrato. Semana registrada: los
  // módulos que tenía al valorizarse (así el reporte no cambia si después un
  // módulo pasa a otro maestro).
  const ids =
    v.estado === "borrador"
      ? contrato.beneficiarioIds
      : [
          ...contrato.beneficiarioIds.filter((id) => v.avances[id]),
          ...Object.keys(v.avances).filter((id) => !contrato.beneficiarioIds.includes(id)),
        ];
  const benefs = ids
    .map((id) => state.beneficiarios.find((b) => b.id === id))
    .filter((b): b is Beneficiario => Boolean(b));

  const lineas = benefs.map<LineaValorizacion>((b) => {
    const avances = v.avances[b.id] ?? {};
    const acumulado = avanceModulo(avances, state.partidas);
    const anteriorAv = avanceModulo(avanceAnterior(b.id, v, state.valorizaciones), state.partidas);
    const cu = contrato.costoUnitario;
    return {
      beneficiario: b,
      avances,
      acumulado,
      anterior: anteriorAv,
      periodo: acumulado - anteriorAv,
      montoAcumulado: round2(acumulado * cu),
      montoAnterior: round2(anteriorAv * cu),
      montoPeriodo: round2((acumulado - anteriorAv) * cu),
    };
  });

  const desde = anterior?.fechaCorte ?? "0000-00-00";
  const adicionalesPeriodo = contrato.adicionales
    .filter((a) => a.fecha > desde && a.fecha <= v.fechaCorte)
    .reduce((s, a) => s + a.monto, 0);
  const descuentosPeriodo = round2((v.descuentos ?? []).reduce((s, d) => s + d.monto, 0));
  const amortizacionPeriodo = contrato.adelantos.reduce(
    (s, a) => s + (a.amortizaciones[v.id] ?? 0),
    0,
  );
  const idsHasta = new Set(serie.slice(0, idx + 1).map((x) => x.id));
  const saldoAdelantos = contrato.adelantos.reduce(
    (s, a) =>
      s +
      a.monto -
      Object.entries(a.amortizaciones)
        .filter(([id]) => idsHasta.has(id))
        .reduce((t, [, m]) => t + m, 0),
    0,
  );
  const brutoPeriodo = round2(lineas.reduce((s, l) => s + l.montoPeriodo, 0));
  const brutoAcumulado = round2(lineas.reduce((s, l) => s + l.montoAcumulado, 0));
  const montoContrato =
    benefs.length * contrato.costoUnitario +
    contrato.adicionales.reduce((s, a) => s + a.monto, 0);
  return {
    valorizacion: v,
    contrato,
    anterior,
    lineas,
    brutoPeriodo,
    brutoAcumulado,
    adicionalesPeriodo,
    amortizacionPeriodo,
    descuentosPeriodo,
    netoPeriodo: round2(
      brutoPeriodo + adicionalesPeriodo - amortizacionPeriodo - descuentosPeriodo,
    ),
    montoContrato,
    saldoPorValorizar: round2(benefs.length * contrato.costoUnitario - brutoAcumulado),
    saldoAdelantos: round2(saldoAdelantos),
    avanceContrato: lineas.length
      ? lineas.reduce((s, l) => s + l.acumulado, 0) / lineas.length
      : 0,
  };
}

/* ------------------------------------------------------------------ */
/* Estadística                                                         */
/* ------------------------------------------------------------------ */

export interface Descriptivos {
  n: number;
  media: number;
  desviacion: number;
  cv: number | null;
  min: number;
  q1: number;
  mediana: number;
  q3: number;
  max: number;
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function descriptivos(valores: number[]): Descriptivos {
  const n = valores.length;
  const sorted = [...valores].sort((a, b) => a - b);
  const media = n ? valores.reduce((s, v) => s + v, 0) / n : 0;
  const desviacion = n > 1
    ? Math.sqrt(valores.reduce((s, v) => s + (v - media) ** 2, 0) / (n - 1))
    : 0;
  return {
    n,
    media,
    desviacion,
    cv: media ? desviacion / media : null,
    min: sorted[0] ?? 0,
    q1: quantile(sorted, 0.25),
    mediana: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: sorted[n - 1] ?? 0,
  };
}

/** Rendimiento real: puntos de avance del módulo por día desde su inicio. */
export function rendimiento(i: IndicadorBeneficiario, fecha: ISODate): number | null {
  const dias = diffDays(fecha, i.inicio);
  if (dias <= 0) return null;
  return (i.ejecutado * 100) / dias;
}

/** Regresión lineal simple y = a + b·x; devuelve también R². */
export function regresion(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let k = 0; k < n; k++) {
    sxy += (xs[k] - mx) * (ys[k] - my);
    sxx += (xs[k] - mx) ** 2;
    syy += (ys[k] - my) ** 2;
  }
  if (sxx === 0) return null;
  const b = sxy / sxx;
  return { a: my - b * mx, b, r2: syy === 0 ? 1 : (sxy * sxy) / (sxx * syy) };
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function nombreCompleto(b: Beneficiario): string {
  return `${b.apPaterno} ${b.apMaterno}, ${b.nombres}`.trim();
}

export function nombreCorto(b: Beneficiario): string {
  const primerNombre = b.nombres.split(" ")[0] ?? "";
  return `${primerNombre} ${b.apPaterno}`.trim();
}

const PEN = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function soles(n: number): string {
  return PEN.format(n);
}

export function pct(fraccion: number, decimales = 1): string {
  return `${(fraccion * 100).toFixed(decimales)} %`;
}

export function fechaCorta(d: ISODate | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

/**
 * Descuento de adelantos sugerido para una valorización: proporcional a lo
 * valorizado en el período respecto al monto del contrato, sin exceder el
 * saldo pendiente.
 */
export function amortizacionSugerida(c: CalculoValorizacion): number {
  const totalAdelantos = c.contrato.adelantos.reduce((s, a) => s + a.monto, 0);
  if (!totalAdelantos) return 0;
  const base = c.lineas.length * c.contrato.costoUnitario;
  const saldoAntes = c.saldoAdelantos + c.amortizacionPeriodo;
  return round2(Math.max(0, Math.min(saldoAntes, base ? (c.brutoPeriodo / base) * totalAdelantos : 0)));
}
