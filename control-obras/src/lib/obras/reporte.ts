// Datos del reporte de pago semanal, en el mismo orden que el "Cuadro de
// valorización" en Excel. Lo usan tanto la hoja imprimible (PDF) como la
// exportación a .xlsx, para que ambos muestren exactamente las mismas cifras.
import type { ObraState, Partida } from "@/types/obras";
import {
  numeroSemana,
  round2,
  semanaDe,
  valorizacionesDeContrato,
  type CalculoValorizacion,
} from "./calc";

export interface FilaReporte {
  n: number;
  grupo: number;
  apPaterno: string;
  apMaterno: string;
  nombres: string;
  direccion: string;
  /** Aporte de cada partida al módulo (fracción, p. ej. 0.10 = cimiento completo). */
  aportes: number[];
  acumulado: number;
  anterior: number;
  semana: number;
  montoAcumulado: number;
  montoSemana: number;
}

export interface Reporte {
  titulo: string;
  obra: string;
  distrito: string;
  entidad: string;
  subcontratista: string;
  valorizacionN: number;
  semanaN: number;
  semanaDesde: string;
  semanaHasta: string;
  costoUnitario: number;
  partidas: Partida[];
  filas: FilaReporte[];
  totales: { acumulado: number; anterior: number; semana: number; montoAcumulado: number; montoSemana: number };
  modulos: number;
  montoContrato: number;
  inicioObra: string;
  adicionales: { descripcion: string; fecha: string; monto: number }[];
  adelantos: {
    descripcion: string;
    fecha: string;
    monto: number;
    /** Descuentos DES. N° 01…N (hasta esta valorización). */
    descuentos: { numero: number; monto: number }[];
    saldo: number;
  }[];
  liquidacion: {
    valorizadoAcumulado: number;
    valorizadoAnterior: number;
    valorizadoSemana: number;
    adicionales: number;
    amortizacion: number;
    otrosDescuentos: { descripcion: string; monto: number }[];
    neto: number;
    netoEnLetras: string;
  };
  registrado: boolean;
  registradoEn?: string;
  registradoPor?: string;
  estado: string;
  fechaPago?: string;
  observaciones?: string;
}

export function construirReporte(calc: CalculoValorizacion, obra: ObraState): Reporte {
  const v = calc.valorizacion;
  const c = calc.contrato;
  const entidad = obra.entidades.find((e) => e.id === c.entidadId);
  const serie = valorizacionesDeContrato(c.id, obra.valorizaciones);
  const hasta = serie.slice(0, serie.findIndex((x) => x.id === v.id) + 1);
  const semana = semanaDe(v.fechaCorte);

  const filas: FilaReporte[] = calc.lineas.map((l, k) => ({
    n: k + 1,
    grupo: l.beneficiario.grupo,
    apPaterno: l.beneficiario.apPaterno,
    apMaterno: l.beneficiario.apMaterno,
    nombres: l.beneficiario.nombres,
    direccion: l.beneficiario.direccion,
    aportes: obra.partidas.map((p) => (p.peso * (l.avances[p.id] ?? 0)) / 100),
    acumulado: l.acumulado,
    anterior: l.anterior,
    semana: l.periodo,
    montoAcumulado: l.montoAcumulado,
    montoSemana: l.montoPeriodo,
  }));
  const sum = (f: (x: FilaReporte) => number) => filas.reduce((s, x) => s + f(x), 0);

  return {
    titulo: `VALORIZACIÓN N° ${String(v.numero).padStart(2, "0")} — PAGO SEMANAL`,
    obra: obra.config.nombre,
    distrito: obra.config.distrito.toUpperCase(),
    entidad: entidad ? `${entidad.sigla} — ${entidad.razonSocial}` : c.entidadId,
    subcontratista: c.subcontratista,
    valorizacionN: v.numero,
    semanaN: numeroSemana(v.fechaCorte, c.fechaInicio, obra.config.diaCorte),
    semanaDesde: v.semanaInicio ?? semana.inicio,
    semanaHasta: v.fechaCorte,
    costoUnitario: c.costoUnitario,
    partidas: obra.partidas,
    filas,
    totales: {
      acumulado: filas.length ? sum((x) => x.acumulado) / filas.length : 0,
      anterior: filas.length ? sum((x) => x.anterior) / filas.length : 0,
      semana: filas.length ? sum((x) => x.semana) / filas.length : 0,
      montoAcumulado: round2(sum((x) => x.montoAcumulado)),
      montoSemana: round2(sum((x) => x.montoSemana)),
    },
    modulos: calc.lineas.length,
    montoContrato: calc.lineas.length * c.costoUnitario,
    inicioObra: c.fechaInicio,
    adicionales: c.adicionales.map((a) => ({ descripcion: a.descripcion, fecha: a.fecha, monto: a.monto })),
    adelantos: c.adelantos.map((a) => {
      const descuentos = hasta.map((x) => ({ numero: x.numero, monto: a.amortizaciones[x.id] ?? 0 }));
      return {
        descripcion: a.descripcion,
        fecha: a.fecha,
        monto: a.monto,
        descuentos,
        saldo: round2(a.monto - descuentos.reduce((s, d) => s + d.monto, 0)),
      };
    }),
    liquidacion: {
      valorizadoAcumulado: calc.brutoAcumulado,
      valorizadoAnterior: round2(calc.brutoAcumulado - calc.brutoPeriodo),
      valorizadoSemana: calc.brutoPeriodo,
      adicionales: calc.adicionalesPeriodo,
      amortizacion: calc.amortizacionPeriodo,
      otrosDescuentos: (v.descuentos ?? []).map((d) => ({ descripcion: d.descripcion, monto: d.monto })),
      neto: calc.netoPeriodo,
      netoEnLetras: montoEnLetras(calc.netoPeriodo),
    },
    registrado: v.estado !== "borrador",
    registradoEn: v.registradoEn,
    registradoPor: v.registradoPor,
    estado: v.estado,
    fechaPago: v.fechaPago,
    observaciones: v.observaciones,
  };
}

/* ------------------------------------------------------------------ */
/* Monto en letras (formato usual en comprobantes peruanos)            */
/* ------------------------------------------------------------------ */

const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
const ESPECIALES = [
  "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE",
  "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE",
];
const VEINTIS = [
  "VEINTE", "VEINTIUNO", "VEINTIDÓS", "VEINTITRÉS", "VEINTICUATRO",
  "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE",
];
const DECENAS = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = [
  "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
  "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS",
];

function menorQueMil(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100);
  const r = n % 100;
  let texto = CENTENAS[c];
  let resto = "";
  if (r < 10) resto = UNIDADES[r];
  else if (r < 20) resto = ESPECIALES[r - 10];
  else if (r < 30) resto = VEINTIS[r - 20];
  else {
    const d = Math.floor(r / 10);
    const u = r % 10;
    resto = DECENAS[d] + (u ? ` Y ${UNIDADES[u]}` : "");
  }
  texto = [texto, resto].filter(Boolean).join(" ");
  return texto;
}

export function enteroEnLetras(n: number): string {
  if (n === 0) return "CERO";
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones) partes.push(millones === 1 ? "UN MILLÓN" : `${menorQueMil(millones)} MILLONES`);
  if (miles) partes.push(miles === 1 ? "MIL" : `${menorQueMil(miles)} MIL`);
  if (resto) partes.push(menorQueMil(resto));
  // "UNO" se apocopa delante de "MIL"/"MILLONES" (VEINTIÚN MIL, UN MILLÓN).
  return partes
    .join(" ")
    .replace(/VEINTIUNO (MIL|MILLONES)/g, "VEINTIÚN $1")
    .replace(/ UNO (MIL|MILLONES)/g, " UN $1")
    .replace(/^UNO (MIL|MILLONES)/, "UN $1");
}

export function montoEnLetras(monto: number): string {
  const negativo = monto < 0;
  const abs = Math.abs(round2(monto));
  const entero = Math.floor(abs);
  const centimos = Math.round((abs - entero) * 100);
  return `${negativo ? "MENOS " : ""}${enteroEnLetras(entero)} CON ${String(centimos).padStart(2, "0")}/100 SOLES`;
}
