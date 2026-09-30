// Operaciones que transforman el estado de la obra (importar, crear
// valorizaciones, escenario de demostración). Devuelven un estado nuevo; no
// mutan el recibido.
import type {
  Beneficiario,
  EstadoPredio,
  ISODate,
  MovimientoMaterial,
  ObraState,
  Pago,
  Valorizacion,
} from "@/types/obras";
import {
  addDays,
  avancesA,
  cortesSemanales,
  semanaDe,
  inicioBeneficiario,
  programadoPartida,
  diffDays,
  valorizacionesDeContrato,
  calcularValorizacion,
  round2,
} from "./calc";

export function uid(prefix = ""): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}${rnd}`;
}

/* ------------------------------------------------------------------ */
/* Importación de la lista oficial                                     */
/* ------------------------------------------------------------------ */

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const clean = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

type Campo =
  | "n"
  | "tipoDoc"
  | "numDoc"
  | "apPaterno"
  | "apMaterno"
  | "nombres"
  | "departamento"
  | "provincia"
  | "distrito"
  | "direccion"
  | "grupo"
  | "entidad"
  | "lat"
  | "lng"
  | "predio"
  | "confirmacion"
  | "telefono";

const ALIAS: Record<string, Campo> = {
  N: "n",
  NRO: "n",
  ITEM: "n",
  TIPODOC: "tipoDoc",
  NDOC: "numDoc",
  NUMDOC: "numDoc",
  NRODOC: "numDoc",
  NUMERODOC: "numDoc",
  DOCUMENTO: "numDoc",
  APATERNO: "apPaterno",
  APPATERNO: "apPaterno",
  APELLIDOPATERNO: "apPaterno",
  AMATERNO: "apMaterno",
  APMATERNO: "apMaterno",
  APELLIDOMATERNO: "apMaterno",
  NOMBRES: "nombres",
  NOMBRE: "nombres",
  DEPARTAMENTO: "departamento",
  PROVINCIA: "provincia",
  DISTRITO: "distrito",
  DIRECCION: "direccion",
  GRUPO: "grupo",
  ENTIDADTECNICA: "entidad",
  ET: "entidad",
  LATITUD: "lat",
  LAT: "lat",
  LONGITUD: "lng",
  LONG: "lng",
  LNG: "lng",
  ESTADOPREDIO: "predio",
  CONDICIONPREDIO: "predio",
  DATOS: "predio",
  CONFIRMACION: "confirmacion",
  TELEFONO: "telefono",
  CELULAR: "telefono",
};

export interface ResultadoImportacion {
  state: ObraState;
  agregados: number;
  actualizados: number;
  omitidos: string[];
}

function parsePredio(v: string): EstadoPredio | null {
  const n = norm(v);
  if (!n) return null;
  if (n.includes("TOTAL")) return "demolicion_total";
  if (n.includes("PARCIAL")) return "demolicion_parcial";
  if (n.includes("VACIO")) return "vacio";
  return null;
}

/**
 * Importa beneficiarios desde una matriz (hoja de Excel o texto pegado).
 * Detecta la fila de encabezados por nombre de columna, actualiza por N° de
 * documento y asigna cada familia al contrato de su entidad técnica.
 */
export function importarBeneficiarios(
  rows: string[][],
  state: ObraState,
): ResultadoImportacion {
  const headerIdx = rows.findIndex((r) => {
    const keys = r.map((c) => norm(c ?? ""));
    return keys.includes("NOMBRES") && (keys.includes("APATERNO") || keys.includes("APELLIDOPATERNO"));
  });
  if (headerIdx < 0) {
    throw new Error(
      "No se encontró la fila de encabezados (se esperan columnas como N° DOC, A. PATERNO, A. MATERNO, NOMBRES, GRUPO, ENTIDAD TECNICA).",
    );
  }
  const header = rows[headerIdx].map((c) => norm(c ?? ""));
  const col: Partial<Record<Campo, number>> = {};
  header.forEach((h, i) => {
    const campo = ALIAS[h];
    if (campo && col[campo] === undefined) col[campo] = i;
  });
  // En la lista oficial la columna "DNI" es el tipo de documento y "N° DOC" el número.
  const dniIdx = header.indexOf("DNI");
  if (dniIdx >= 0) {
    if (col.numDoc === undefined) col.numDoc = dniIdx;
    else if (col.tipoDoc === undefined) col.tipoDoc = dniIdx;
  }
  if (col.numDoc === undefined) throw new Error("Falta la columna de N° de documento.");

  const next: ObraState = structuredClone(state);
  let agregados = 0;
  let actualizados = 0;
  const omitidos: string[] = [];
  const get = (r: string[], c: Campo) => (col[c] !== undefined ? clean(r[col[c]!]) : "");

  for (const r of rows.slice(headerIdx + 1)) {
    if (!r || r.every((c) => !clean(c))) continue;
    let numDoc = get(r, "numDoc").replace(/\D/g, "");
    if (!numDoc) {
      if (get(r, "nombres")) omitidos.push(`${get(r, "nombres")} (sin documento)`);
      continue;
    }
    if (numDoc.length < 8) numDoc = numDoc.padStart(8, "0");

    const entRaw = norm(get(r, "entidad"));
    let entidad = next.entidades.find(
      (e) => entRaw && (entRaw.includes(norm(e.sigla)) || norm(e.razonSocial).includes(entRaw)),
    );
    if (!entidad && entRaw) {
      entidad = { id: entRaw, sigla: entRaw, razonSocial: entRaw };
      next.entidades.push(entidad);
    }
    if (!entidad) {
      omitidos.push(`${numDoc} (sin entidad técnica)`);
      continue;
    }

    const num = (s: string) => {
      const v = Number(s.replace(",", "."));
      return Number.isFinite(v) && s !== "" ? v : null;
    };
    const conf = norm(get(r, "confirmacion"));
    const datos: Omit<Beneficiario, "id" | "etapa"> = {
      n: num(get(r, "n")) ?? next.beneficiarios.length + 1,
      tipoDoc: get(r, "tipoDoc") || "DNI",
      numDoc,
      apPaterno: get(r, "apPaterno"),
      apMaterno: get(r, "apMaterno"),
      nombres: get(r, "nombres"),
      departamento: get(r, "departamento"),
      provincia: get(r, "provincia"),
      distrito: get(r, "distrito"),
      direccion: get(r, "direccion"),
      grupo: num(get(r, "grupo")) ?? 1,
      entidadId: entidad.id,
      lat: num(get(r, "lat")),
      lng: num(get(r, "lng")),
      estadoPredio: parsePredio(get(r, "predio")),
      predioConfirmado: conf === "SI" ? true : conf === "NO" ? false : null,
      telefono: get(r, "telefono") || undefined,
    };

    const existente = next.beneficiarios.find((b) => b.numDoc === numDoc);
    let id: string;
    if (existente) {
      Object.assign(existente, {
        ...datos,
        estadoPredio: datos.estadoPredio ?? existente.estadoPredio,
        predioConfirmado: datos.predioConfirmado ?? existente.predioConfirmado,
        telefono: datos.telefono ?? existente.telefono,
      });
      id = existente.id;
      actualizados++;
    } else {
      id = uid("b");
      next.beneficiarios.push({ id, etapa: "contrato", ...datos });
      agregados++;
    }

    // Asignación a contrato por entidad técnica.
    for (const c of next.contratos) {
      if (c.entidadId !== entidad.id) {
        c.beneficiarioIds = c.beneficiarioIds.filter((x) => x !== id);
      }
    }
    if (!next.contratos.some((c) => c.beneficiarioIds.includes(id))) {
      let contrato = next.contratos.find((c) => c.entidadId === entidad!.id);
      if (!contrato) {
        contrato = {
          id: uid("c"),
          subcontratista: `Maestro de obra ${entidad.sigla} — por definir`,
          tipo: "maestro",
          pagos: [],
          entidadId: entidad.id,
          beneficiarioIds: [],
          costoUnitario: next.contratos[0]?.costoUnitario ?? 8500,
          fechaInicio: next.config.fechaInicio,
          plazoDias: next.config.plazoTotalDias,
          adicionales: [],
          adelantos: [],
        };
        next.contratos.push(contrato);
      }
      contrato.beneficiarioIds.push(id);
    }
  }
  next.beneficiarios.sort((a, b) => a.entidadId.localeCompare(b.entidadId) || a.n - b.n);
  return { state: next, agregados, actualizados, omitidos };
}

/* ------------------------------------------------------------------ */
/* Valorizaciones                                                      */
/* ------------------------------------------------------------------ */

/** Crea la siguiente valorización de un contrato, precargada con el avance anterior. */
export function nuevaValorizacion(
  state: ObraState,
  contratoId: string,
  fechaCorte: ISODate,
): { state: ObraState; id: string } {
  const next = structuredClone(state);
  const contrato = next.contratos.find((c) => c.id === contratoId);
  if (!contrato) throw new Error("Contrato no encontrado");
  const serie = valorizacionesDeContrato(contratoId, next.valorizaciones);
  const numero = serie.reduce((m, v) => Math.max(m, v.numero), 0) + 1;
  const avances: Valorizacion["avances"] = {};
  // Precarga con el último avance del módulo en cualquier contrato.
  for (const bId of contrato.beneficiarioIds) {
    avances[bId] = { ...avancesA(bId, next.valorizaciones, fechaCorte) };
  }
  const id = uid("v");
  next.valorizaciones.push({
    id,
    numero,
    contratoId,
    fechaCorte,
    estado: "borrador",
    avances,
  });
  return { state: next, id };
}

/* ------------------------------------------------------------------ */
/* Valorización semanal                                                */
/* ------------------------------------------------------------------ */

/**
 * Abre la valorización de la semana que cierra en `corte` para un contrato,
 * precargada con el último avance. Si ya existe, devuelve la existente. Solo
 * puede haber una semana abierta por contrato.
 */
export function abrirSemana(
  state: ObraState,
  contratoId: string,
  corte: ISODate,
  usuario?: string,
): { state: ObraState; id: string } {
  const serie = valorizacionesDeContrato(contratoId, state.valorizaciones);
  const existente = serie.find((v) => v.fechaCorte === corte);
  if (existente) return { state, id: existente.id };
  const abierta = serie.find((v) => v.estado === "borrador");
  if (abierta) {
    throw new Error(
      `La valorización N° ${abierta.numero} (corte ${abierta.fechaCorte.split("-").reverse().join("/")}) sigue abierta: regístrala antes de abrir otra semana.`,
    );
  }
  const posterior = serie.find((v) => v.fechaCorte > corte);
  if (posterior) {
    throw new Error("Ya existe una semana registrada posterior a esta fecha de corte.");
  }
  const r = nuevaValorizacion(state, contratoId, corte);
  const v = r.state.valorizaciones.find((x) => x.id === r.id)!;
  v.semanaInicio = semanaDe(corte).inicio;
  v.bitacora = [{ en: new Date().toISOString(), accion: "abierta", por: usuario }];
  return r;
}

function mutarValorizacion(
  state: ObraState,
  id: string,
  fn: (v: Valorizacion) => void,
): ObraState {
  const next = structuredClone(state);
  const v = next.valorizaciones.find((x) => x.id === id);
  if (!v) throw new Error("Valorización no encontrada");
  fn(v);
  return next;
}

/** Cierra la semana: su avance queda registrado como avance real, con fecha y hora. */
export function registrarSemana(state: ObraState, id: string, usuario?: string): ObraState {
  return mutarValorizacion(state, id, (v) => {
    const ahora = new Date().toISOString();
    v.estado = "aprobada";
    v.registradoEn = ahora;
    v.registradoPor = usuario;
    v.bitacora = [...(v.bitacora ?? []), { en: ahora, accion: "registrada", por: usuario }];
  });
}

/** Reabre la última semana registrada (si aún no se pagó) para corregirla. */
export function reabrirSemana(
  state: ObraState,
  id: string,
  usuario: string | undefined,
  motivo: string,
): ObraState {
  const v0 = state.valorizaciones.find((x) => x.id === id);
  if (!v0) throw new Error("Valorización no encontrada");
  if (v0.estado === "pagada") throw new Error("Una semana pagada no se puede reabrir.");
  const serie = valorizacionesDeContrato(v0.contratoId, state.valorizaciones);
  if (serie[serie.length - 1]?.id !== id) {
    throw new Error("Solo se puede reabrir la última semana del contrato.");
  }
  return mutarValorizacion(state, id, (v) => {
    v.estado = "borrador";
    v.bitacora = [
      ...(v.bitacora ?? []),
      { en: new Date().toISOString(), accion: "reabierta", por: usuario, nota: motivo },
    ];
  });
}


/* ------------------------------------------------------------------ */
/* Maestros de obra y pagos                                            */
/* ------------------------------------------------------------------ */

export function nuevoMaestro(state: ObraState, entidadId: string): { state: ObraState; id: string } {
  const next = structuredClone(state);
  const id = uid("c");
  const base = next.contratos.find((c) => c.entidadId === entidadId);
  next.contratos.push({
    id,
    subcontratista: "Nuevo maestro de obra",
    tipo: "maestro",
    entidadId,
    beneficiarioIds: [],
    costoUnitario: base?.costoUnitario ?? 8500,
    fechaInicio: base?.fechaInicio ?? next.config.fechaInicio,
    plazoDias: base?.plazoDias ?? next.config.plazoTotalDias,
    adicionales: [],
    adelantos: [],
    pagos: [],
  });
  return { state: next, id };
}

/**
 * Asigna un módulo a otro maestro (de la misma entidad técnica). Lo ya
 * valorizado queda en el contrato anterior; desde la próxima semana el
 * módulo se valoriza con el nuevo maestro sin volver a pagar lo ejecutado.
 */
export function asignarModulo(state: ObraState, beneficiarioId: string, contratoId: string): ObraState {
  const destino = state.contratos.find((c) => c.id === contratoId);
  const b = state.beneficiarios.find((x) => x.id === beneficiarioId);
  if (!destino || !b) throw new Error("Maestro o módulo no encontrado");
  if (destino.entidadId !== b.entidadId) {
    throw new Error("El módulo pertenece a otra entidad técnica.");
  }
  const abierta = state.valorizaciones.find(
    (v) => v.estado === "borrador" && v.avances[beneficiarioId] && v.contratoId !== contratoId,
  );
  if (abierta) {
    throw new Error(
      `El módulo está en la semana abierta N° ${abierta.numero} de su maestro actual: regístrala o elimínala antes de reasignarlo.`,
    );
  }
  const next = structuredClone(state);
  for (const c of next.contratos) c.beneficiarioIds = c.beneficiarioIds.filter((x) => x !== beneficiarioId);
  next.contratos.find((c) => c.id === contratoId)!.beneficiarioIds.push(beneficiarioId);
  return next;
}

/**
 * Registra un pago realizado. Si está asociado a una semana y con él se
 * completa su neto, la semana pasa a "pagada".
 */
export function registrarPago(
  state: ObraState,
  contratoId: string,
  pago: Omit<Pago, "id" | "registradoEn" | "registradoPor">,
  usuario?: string,
): ObraState {
  if (!(pago.monto > 0)) throw new Error("El monto debe ser mayor que cero.");
  const next = structuredClone(state);
  const c = next.contratos.find((x) => x.id === contratoId);
  if (!c) throw new Error("Maestro no encontrado");
  const ahora = new Date().toISOString();
  c.pagos = [...(c.pagos ?? []), { ...pago, id: uid("p"), registradoEn: ahora, registradoPor: usuario }];
  if (pago.valorizacionId) {
    const v = next.valorizaciones.find((x) => x.id === pago.valorizacionId);
    if (!v || v.estado === "borrador") throw new Error("Solo se pagan semanas registradas.");
    const calc = calcularValorizacion(v, next);
    const pagado = c.pagos.filter((p) => p.valorizacionId === v.id).reduce((s, p) => s + p.monto, 0);
    if (calc && pagado + 0.005 >= calc.netoPeriodo && v.estado !== "pagada") {
      v.estado = "pagada";
      v.fechaPago = pago.fecha;
      v.bitacora = [...(v.bitacora ?? []), { en: ahora, accion: "pagada", por: usuario }];
    }
  }
  return next;
}

export function anularPago(state: ObraState, contratoId: string, pagoId: string, usuario?: string): ObraState {
  const next = structuredClone(state);
  const c = next.contratos.find((x) => x.id === contratoId);
  const pago = c?.pagos?.find((p) => p.id === pagoId);
  if (!c || !pago) throw new Error("Pago no encontrado");
  c.pagos = c.pagos!.filter((p) => p.id !== pagoId);
  const v = pago.valorizacionId ? next.valorizaciones.find((x) => x.id === pago.valorizacionId) : null;
  if (v && v.estado === "pagada") {
    const calc = calcularValorizacion(v, next);
    const pagado = c.pagos.filter((p) => p.valorizacionId === v.id).reduce((s, p) => s + p.monto, 0);
    if (calc && pagado + 0.005 < calc.netoPeriodo) {
      v.estado = "aprobada";
      v.fechaPago = undefined;
      v.bitacora = [
        ...(v.bitacora ?? []),
        { en: new Date().toISOString(), accion: "pago_anulado", por: usuario, nota: `${pago.monto.toFixed(2)} del ${pago.fecha}` },
      ];
    }
  }
  return next;
}

/* ------------------------------------------------------------------ */
/* Movimientos de materiales                                           */
/* ------------------------------------------------------------------ */

export function registrarMovimiento(
  state: ObraState,
  mov: Omit<MovimientoMaterial, "id" | "registradoEn" | "registradoPor">,
  usuario?: string,
): { state: ObraState; id: string } {
  const items = mov.items.filter((i) => i.materialId && i.cantidad > 0);
  if (!items.length) throw new Error("Agrega al menos un material con cantidad.");
  if ((mov.tipo === "entrega" || mov.tipo === "traslado") && !mov.destinoId) throw new Error("Elige el módulo de destino.");
  if ((mov.tipo === "devolucion" || mov.tipo === "traslado") && !mov.origenId) throw new Error("Elige el módulo de origen.");
  if (mov.tipo === "traslado" && mov.origenId === mov.destinoId) throw new Error("Origen y destino son el mismo módulo.");
  const next = structuredClone(state);
  const id = uid("m");
  next.movimientosMaterial.push({
    ...mov,
    items,
    id,
    registradoEn: new Date().toISOString(),
    registradoPor: usuario,
  });
  return { state: next, id };
}

/* ------------------------------------------------------------------ */
/* Escenario de demostración                                           */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Genera valorizaciones semanales simuladas (marcadas `demo`) para ver el
 * tablero funcionando. Ritmos distintos por módulo, uno rezagado por ET y
 * un adelanto de materiales con amortización parcial.
 */
export function generarDemo(state: ObraState, seed = 2026): ObraState {
  let next = quitarDemo(state);
  const rnd = mulberry32(seed);
  // 8 semanas de obra con corte en el día configurado (sábado por defecto).
  const cortes = cortesSemanales(
    next.config.fechaInicio,
    addDays(next.config.fechaInicio, 56),
    next.config.diaCorte,
  ).filter((c) => c > next.config.fechaInicio);

  next = structuredClone(next);
  for (const contrato of next.contratos) {
    if (!contrato.beneficiarioIds.length) continue;
    const factores = new Map<string, number>();
    contrato.beneficiarioIds.forEach((id, k) => {
      const lento = k === contrato.beneficiarioIds.length - 1;
      factores.set(id, lento ? 0.35 + rnd() * 0.15 : 0.7 + rnd() * 0.45);
    });
    const adelantoId = uid("demo-a");
    contrato.adelantos.push({
      id: adelantoId,
      descripcion: "Adelanto de materiales (demo)",
      fecha: next.config.fechaInicio,
      monto: round2(contrato.beneficiarioIds.length * contrato.costoUnitario * 0.2),
      tipo: "materiales",
      amortizaciones: {},
    });
    cortes.forEach((fecha, k) => {
      const avances: Valorizacion["avances"] = {};
      for (const bId of contrato.beneficiarioIds) {
        const b = next.beneficiarios.find((x) => x.id === bId);
        if (!b) continue;
        const dias = diffDays(fecha, inicioBeneficiario(b, next.config));
        const efectivo = Math.max(0, dias * (factores.get(bId) ?? 1));
        avances[bId] = Object.fromEntries(
          next.partidas.map((p) => [
            p.id,
            Math.round(programadoPartida(p, efectivo) / 5) * 5,
          ]),
        );
      }
      // Semanas antiguas pagadas, la penúltima registrada y la última abierta.
      const estado = k < cortes.length - 2 ? "pagada" : k < cortes.length - 1 ? "aprobada" : "borrador";
      const registradoEn = `${fecha}T23:00:00.000Z`; // sábado 18:00 hora de Lima
      const v: Valorizacion = {
        id: uid("demo-v"),
        numero: k + 1,
        contratoId: contrato.id,
        fechaCorte: fecha,
        semanaInicio: semanaDe(fecha).inicio,
        estado,
        avances,
        demo: true,
        ...(estado !== "borrador" && { registradoEn, registradoPor: "demo" }),
        ...(estado === "pagada" && { fechaPago: addDays(fecha, 2) }),
        bitacora: [
          { en: `${addDays(fecha, -6)}T13:00:00.000Z`, accion: "abierta", por: "demo" },
          ...(estado !== "borrador" ? [{ en: registradoEn, accion: "registrada" as const, por: "demo" }] : []),
          ...(estado === "pagada" ? [{ en: `${addDays(fecha, 2)}T15:00:00.000Z`, accion: "pagada" as const, por: "demo" }] : []),
        ],
      };
      next.valorizaciones.push(v);
      // Amortiza el 20 % del bruto de cada valorización salvo la última.
      if (k < cortes.length - 1) {
        const calc = calcularValorizacion(v, next);
        const adelanto = contrato.adelantos.find((a) => a.id === adelantoId)!;
        if (calc) adelanto.amortizaciones[v.id] = round2(calc.brutoPeriodo * 0.2);
      }
    });
  }
  // Pagos: las semanas "pagadas" de la demo se pagan por transferencia.
  for (const contrato of next.contratos) {
    for (const v of next.valorizaciones.filter((x) => x.demo && x.contratoId === contrato.id && x.estado === "pagada")) {
      const calc = calcularValorizacion(v, next);
      if (!calc || calc.netoPeriodo <= 0) continue;
      contrato.pagos = [
        ...(contrato.pagos ?? []),
        {
          id: uid("demo-p"),
          fecha: v.fechaPago ?? v.fechaCorte,
          monto: calc.netoPeriodo,
          medio: "transferencia",
          referencia: `OP-${String(Math.floor(rnd() * 900000) + 100000)}`,
          valorizacionId: v.id,
          registradoEn: `${v.fechaPago ?? v.fechaCorte}T15:00:00.000Z`,
          registradoPor: "demo",
        },
      ];
    }
  }

  // Materiales: compras al almacén de cada ET y entregas por etapas a cada módulo.
  // Kits por etapa (cantidades solo para la demostración, no son un metrado).
  const kits: { dia: number; items: [string, number][] }[] = [
    { dia: 0, items: [["agl-01", 45], ["agr-01", 6], ["agr-02", 4]] },
    { dia: 7, items: [["ace-01", 14], ["ace-02", 20], ["ace-03", 30], ["ace-04", 8], ["alb-01", 3200], ["agl-01", 40], ["agr-03", 5], ["agr-05", 4]] },
    { dia: 18, items: [["cob-01", 26], ["cob-02", 14], ["agl-01", 30], ["agr-04", 4], ["san-01", 4], ["ele-01", 100]] },
    { dia: 32, items: [["aca-01", 9], ["aca-02", 4], ["san-06", 1], ["san-07", 1], ["ele-04", 1], ["car-01", 1]] },
  ];

  const existe = (id: string) => next.materiales.some((m) => m.id === id);
  for (const e of next.entidades) {
    const benefs = next.beneficiarios.filter((b) => b.entidadId === e.id);
    if (!benefs.length) continue;
    const total: Record<string, number> = {};
    for (const k of kits) for (const [id, q] of k.items) if (q && existe(id)) total[id] = (total[id] ?? 0) + q * benefs.length;
    next.movimientosMaterial.push({
      id: uid("demo-m"),
      tipo: "ingreso",
      fecha: addDays(next.config.fechaInicio, -3),
      entidadId: e.id,
      items: Object.entries(total).map(([materialId, cantidad]) => ({ materialId, cantidad })),
      documento: `IN-${e.id}-0001`,
      proveedor: "Proveedor demo S.A.C.",
      registradoEn: `${addDays(next.config.fechaInicio, -3)}T14:00:00.000Z`,
      registradoPor: "demo",
      demo: true,
    });
    let n = 0;
    for (const b of benefs) {
      const inicio = inicioBeneficiario(b, next.config);
      const lento = b.id === benefs[benefs.length - 1].id;
      for (const k of kits) {
        const fecha = addDays(inicio, k.dia);
        // El módulo rezagado todavía no recibe los últimos kits.
        if (fecha > addDays(next.config.fechaInicio, 50) || (lento && k.dia >= 18)) continue;
        n++;
        next.movimientosMaterial.push({
          id: uid("demo-m"),
          tipo: "entrega",
          fecha,
          entidadId: e.id,
          destinoId: b.id,
          items: k.items.filter(([id, q]) => q && existe(id)).map(([materialId, cantidad]) => ({ materialId, cantidad })),
          documento: `NE-${e.id}-${String(n).padStart(4, "0")}`,
          recibidoPor: next.contratos.find((c) => c.beneficiarioIds.includes(b.id))?.subcontratista,
          registradoEn: `${fecha}T13:00:00.000Z`,
          registradoPor: "demo",
          demo: true,
        });
      }
    }
  }
  return next;
}

export function quitarDemo(state: ObraState): ObraState {
  const next = structuredClone(state);
  next.valorizaciones = next.valorizaciones.filter((v) => !v.demo);
  for (const c of next.contratos) {
    c.adelantos = c.adelantos.filter((a) => !a.id.startsWith("demo-"));
    c.pagos = (c.pagos ?? []).filter((p) => !p.id.startsWith("demo-"));
  }
  next.movimientosMaterial = next.movimientosMaterial.filter((m) => !m.demo);
  return next;
}

export function tieneDemo(state: ObraState): boolean {
  return state.valorizaciones.some((v) => v.demo) || state.movimientosMaterial.some((m) => m.demo);
}
