// Pagos a maestros de obra / subcontratistas: lo valorizado (semanas
// registradas) frente a lo realmente pagado.
import type { Contrato, ISODate, ObraState, Pago, Valorizacion } from "@/types/obras";
import {
  calcularValorizacion,
  round2,
  valorizacionesDeContrato,
  type CalculoValorizacion,
} from "./calc";

export const MEDIO_PAGO_LABEL: Record<Pago["medio"], string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  yape_plin: "Yape / Plin",
  cheque: "Cheque",
  otro: "Otro",
};

export function pagadoDeValorizacion(contrato: Contrato, valorizacionId: string): number {
  return round2(
    (contrato.pagos ?? [])
      .filter((p) => p.valorizacionId === valorizacionId)
      .reduce((s, p) => s + p.monto, 0),
  );
}

export interface EstadoPagoSemana {
  calc: CalculoValorizacion;
  neto: number;
  pagado: number;
  saldo: number;
}

/** Semanas registradas del contrato con lo pagado y el saldo de cada una. */
export function semanasPorPagar(contrato: Contrato, state: ObraState): EstadoPagoSemana[] {
  return valorizacionesDeContrato(contrato.id, state.valorizaciones)
    .filter((v) => v.estado !== "borrador")
    .map((v) => calcularValorizacion(v, state))
    .filter((c): c is CalculoValorizacion => Boolean(c))
    .map((calc) => {
      const pagado = pagadoDeValorizacion(contrato, calc.valorizacion.id);
      return { calc, neto: calc.netoPeriodo, pagado, saldo: round2(calc.netoPeriodo - pagado) };
    });
}

export interface ResumenPagosContrato {
  valorizadoNeto: number; // neto de semanas registradas
  pagado: number; // todos los pagos (incluye pagos a cuenta)
  pagosACuenta: number;
  saldo: number; // por pagar
  ultimoPago: ISODate | null;
}

export function resumenPagosContrato(contrato: Contrato, state: ObraState): ResumenPagosContrato {
  const semanas = semanasPorPagar(contrato, state);
  const pagos = contrato.pagos ?? [];
  const valorizadoNeto = round2(semanas.reduce((s, x) => s + x.neto, 0));
  const pagado = round2(pagos.reduce((s, p) => s + p.monto, 0));
  return {
    valorizadoNeto,
    pagado,
    pagosACuenta: round2(pagos.filter((p) => !p.valorizacionId).reduce((s, p) => s + p.monto, 0)),
    saldo: round2(valorizadoNeto - pagado),
    ultimoPago: pagos.reduce<ISODate | null>((m, p) => (!m || p.fecha > m ? p.fecha : m), null),
  };
}

/* ------------------------------------------------------------------ */
/* Planilla semanal consolidada (todos los maestros, un mismo corte)   */
/* ------------------------------------------------------------------ */

export interface FilaPlanilla {
  contrato: Contrato;
  entidad: string;
  valorizacion: Valorizacion;
  modulos: number;
  valorizado: number;
  adicionales: number;
  amortizacion: number;
  descuentos: number;
  neto: number;
  pagado: number;
  saldo: number;
  pagos: Pago[];
}

export function planillaSemanal(state: ObraState, corte: ISODate): FilaPlanilla[] {
  const filas: FilaPlanilla[] = [];
  for (const contrato of state.contratos) {
    const v = state.valorizaciones.find(
      (x) => x.contratoId === contrato.id && x.fechaCorte === corte,
    );
    if (!v) continue;
    const calc = calcularValorizacion(v, state);
    if (!calc) continue;
    const pagos = (contrato.pagos ?? []).filter((p) => p.valorizacionId === v.id);
    const pagado = round2(pagos.reduce((s, p) => s + p.monto, 0));
    filas.push({
      contrato,
      entidad: contrato.entidadId,
      valorizacion: v,
      modulos: calc.lineas.length,
      valorizado: calc.brutoPeriodo,
      adicionales: calc.adicionalesPeriodo,
      amortizacion: calc.amortizacionPeriodo,
      descuentos: calc.descuentosPeriodo,
      neto: calc.netoPeriodo,
      pagado,
      saldo: round2(calc.netoPeriodo - pagado),
      pagos,
    });
  }
  return filas.sort((a, b) => a.entidad.localeCompare(b.entidad) || a.contrato.subcontratista.localeCompare(b.contrato.subcontratista));
}
