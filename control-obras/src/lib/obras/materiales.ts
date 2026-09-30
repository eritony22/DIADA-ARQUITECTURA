// Control de materiales: almacén por entidad técnica y stock en cada módulo,
// calculados solo a partir de los movimientos registrados (kardex).
//   almacén  = ingresos − entregas + devoluciones − mermas en almacén
//   módulo   = entregas + traslados recibidos − devoluciones − traslados
//              enviados − mermas en el módulo
// Si el material tiene "requerido por módulo", se estima además el consumo
// con el avance REAL (semanas registradas) para saber lo que queda en obra.
import type {
  Beneficiario,
  ISODate,
  Material,
  MovimientoMaterial,
  ObraState,
  TipoMovimientoMaterial,
} from "@/types/obras";
import { avanceModulo, avancesA, round2 } from "./calc";

export const TIPO_MOVIMIENTO_LABEL: Record<TipoMovimientoMaterial, string> = {
  ingreso: "Ingreso a almacén",
  entrega: "Entrega a módulo",
  devolucion: "Devolución a almacén",
  traslado: "Traslado entre módulos",
  merma: "Merma / pérdida",
};

type Cantidades = Record<string, number>;

function sumar(dest: Cantidades, items: MovimientoMaterial["items"], signo: 1 | -1) {
  for (const it of items) dest[it.materialId] = round2((dest[it.materialId] ?? 0) + signo * it.cantidad);
}

function hastaFecha(movs: MovimientoMaterial[], hasta?: ISODate) {
  return hasta ? movs.filter((m) => m.fecha <= hasta) : movs;
}

/** Stock en el módulo (según movimientos), por material. */
export function stockModulo(state: ObraState, beneficiarioId: string, hasta?: ISODate): Cantidades {
  const out: Cantidades = {};
  for (const m of hastaFecha(state.movimientosMaterial, hasta)) {
    if (m.destinoId === beneficiarioId && (m.tipo === "entrega" || m.tipo === "traslado")) sumar(out, m.items, 1);
    if (m.origenId === beneficiarioId && (m.tipo === "devolucion" || m.tipo === "traslado" || m.tipo === "merma"))
      sumar(out, m.items, -1);
  }
  return out;
}

/** Total entregado (neto de devoluciones y traslados) al módulo: igual a su stock según movimientos. */
export const entregadoModulo = stockModulo;

/** Stock del almacén de una entidad técnica, por material. */
export function stockAlmacen(state: ObraState, entidadId: string, hasta?: ISODate): Cantidades {
  const out: Cantidades = {};
  for (const m of hastaFecha(state.movimientosMaterial, hasta)) {
    if (m.entidadId !== entidadId) continue;
    if (m.tipo === "ingreso") sumar(out, m.items, 1);
    if (m.tipo === "entrega") sumar(out, m.items, -1);
    if (m.tipo === "devolucion") sumar(out, m.items, 1);
    if (m.tipo === "merma" && !m.origenId) sumar(out, m.items, -1);
  }
  return out;
}

export interface MovimientosAlmacen {
  ingresado: Cantidades;
  entregado: Cantidades;
  devuelto: Cantidades;
  merma: Cantidades;
}

export function detalleAlmacen(state: ObraState, entidadId: string): MovimientosAlmacen {
  const r: MovimientosAlmacen = { ingresado: {}, entregado: {}, devuelto: {}, merma: {} };
  for (const m of state.movimientosMaterial) {
    if (m.entidadId !== entidadId) continue;
    if (m.tipo === "ingreso") sumar(r.ingresado, m.items, 1);
    if (m.tipo === "entrega") sumar(r.entregado, m.items, 1);
    if (m.tipo === "devolucion") sumar(r.devuelto, m.items, 1);
    if (m.tipo === "merma" && !m.origenId) sumar(r.merma, m.items, 1);
  }
  return r;
}

/**
 * Fracción ejecutada que consume el material en el módulo: el avance de su
 * partida si la tiene asignada, o el avance total del módulo.
 */
export function fraccionConsumida(
  material: Material,
  state: ObraState,
  beneficiarioId: string,
  fecha: ISODate,
): number {
  const avances = avancesA(beneficiarioId, state.valorizaciones, fecha);
  if (material.partidaId) return Math.min(1, (avances[material.partidaId] ?? 0) / 100);
  return avanceModulo(avances, state.partidas);
}

export interface LineaMaterialModulo {
  material: Material;
  entregado: number; // neto según movimientos
  requerido: number | null;
  consumoEstimado: number | null;
  enObraEstimado: number | null; // entregado − consumo estimado
  pendientePorEntregar: number | null; // requerido − entregado
}

/**
 * Situación de materiales de un módulo. `real` debe ser la obra con solo
 * semanas registradas (el consumo se estima con avance oficial).
 */
export function materialesDeModulo(
  state: ObraState,
  real: ObraState,
  b: Beneficiario,
  fecha: ISODate,
): LineaMaterialModulo[] {
  const stock = stockModulo(state, b.id, fecha);
  return state.materiales.map((material) => {
    const entregado = stock[material.id] ?? 0;
    const req = material.requeridoPorModulo ?? null;
    const consumo = req !== null ? round2(req * fraccionConsumida(material, real, b.id, fecha)) : null;
    return {
      material,
      entregado,
      requerido: req,
      consumoEstimado: consumo,
      enObraEstimado: consumo !== null ? round2(entregado - consumo) : null,
      pendientePorEntregar: req !== null ? round2(req - entregado) : null,
    };
  });
}

/** ¿El módulo recibió algún material? */
export function tieneMateriales(state: ObraState, beneficiarioId: string): boolean {
  return state.movimientosMaterial.some(
    (m) => m.destinoId === beneficiarioId && (m.tipo === "entrega" || m.tipo === "traslado"),
  );
}

export function valorizar(cantidades: Cantidades, materiales: Material[]): number {
  return round2(
    Object.entries(cantidades).reduce((s, [id, q]) => {
      const m = materiales.find((x) => x.id === id);
      return s + (m?.precioRef ?? 0) * Math.max(0, q);
    }, 0),
  );
}

/** Siguiente N° de documento por tipo y entidad (NE-PAHER-0001, IN-JCVM-0003…). */
export function siguienteDocumento(
  state: ObraState,
  tipo: TipoMovimientoMaterial,
  entidadId: string,
): string {
  const pre = { ingreso: "IN", entrega: "NE", devolucion: "DV", traslado: "TR", merma: "MR" }[tipo];
  const base = `${pre}-${entidadId}-`;
  const max = state.movimientosMaterial
    .filter((m) => m.documento?.startsWith(base))
    .reduce((mx, m) => Math.max(mx, Number(m.documento!.slice(base.length)) || 0), 0);
  return `${base}${String(max + 1).padStart(4, "0")}`;
}

export interface Advertencia {
  materialId: string;
  disponible: number;
  solicitado: number;
}

/**
 * Salidas que dejarían stock negativo en el origen (almacén o módulo). No se
 * bloquean —el registro físico manda— pero se avisan antes de guardar.
 */
export function validarMovimiento(state: ObraState, mov: Omit<MovimientoMaterial, "id" | "registradoEn">): Advertencia[] {
  const disponible =
    mov.tipo === "entrega" || (mov.tipo === "merma" && !mov.origenId)
      ? stockAlmacen(state, mov.entidadId)
      : mov.origenId && (mov.tipo === "devolucion" || mov.tipo === "traslado" || mov.tipo === "merma")
        ? stockModulo(state, mov.origenId)
        : null;
  if (!disponible) return [];
  return mov.items
    .filter((it) => it.cantidad > (disponible[it.materialId] ?? 0) + 1e-9)
    .map((it) => ({ materialId: it.materialId, disponible: disponible[it.materialId] ?? 0, solicitado: it.cantidad }));
}

export interface FilaKardex {
  movimiento: MovimientoMaterial;
  entrada: number;
  salida: number;
  saldo: number;
}

/** Kardex de un material en una ubicación (almacén de una ET o un módulo). */
export function kardex(
  state: ObraState,
  materialId: string,
  ubicacion: { almacen: string } | { modulo: string },
): FilaKardex[] {
  const movs = [...state.movimientosMaterial].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.registradoEn.localeCompare(b.registradoEn),
  );
  let saldo = 0;
  const out: FilaKardex[] = [];
  for (const m of movs) {
    const q = m.items.filter((i) => i.materialId === materialId).reduce((s, i) => s + i.cantidad, 0);
    if (!q) continue;
    let entrada = 0;
    let salida = 0;
    if ("almacen" in ubicacion) {
      if (m.entidadId !== ubicacion.almacen) continue;
      if (m.tipo === "ingreso" || m.tipo === "devolucion") entrada = q;
      else if (m.tipo === "entrega" || (m.tipo === "merma" && !m.origenId)) salida = q;
      else continue;
    } else {
      const id = ubicacion.modulo;
      if (m.destinoId === id && (m.tipo === "entrega" || m.tipo === "traslado")) entrada = q;
      else if (m.origenId === id && (m.tipo === "devolucion" || m.tipo === "traslado" || m.tipo === "merma")) salida = q;
      else continue;
    }
    saldo = round2(saldo + entrada - salida);
    out.push({ movimiento: m, entrada, salida, saldo });
  }
  return out;
}
