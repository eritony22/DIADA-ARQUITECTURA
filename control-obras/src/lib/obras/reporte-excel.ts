// Exporta el reporte de pago semanal a .xlsx con el formato del "Cuadro de
// valorización": pesos por partida, aporte de cada partida por módulo, TOTAL
// AVANCE = SUMA de aportes y PARCIAL = avance × costo unitario (con fórmulas
// vivas, como en el Excel original). Se carga solo al exportar (exceljs pesa).
import type { Reporte } from "./reporte";
import { fechaCorta, fechaHora } from "./calc";

const MONEDA = '"S/" #,##0.00';
const PCT = "0.00%";

export async function descargarReporteExcel(r: Reporte, nombreArchivo: string): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Control de Obras";
  wb.created = new Date();
  const ws = wb.addWorksheet(`VAL N° ${String(r.valorizacionN).padStart(2, "0")}`, {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  const nP = r.partidas.length;
  const colP0 = 7; // G
  const colTotal = colP0 + nP; // TOTAL AVANCE
  const colAnt = colTotal + 1;
  const colSem = colTotal + 2;
  const colParcial = colTotal + 3;
  const colPago = colTotal + 4;
  const L = (c: number) => ws.getColumn(c).letter;

  ws.columns = [
    { width: 5 }, { width: 7 }, { width: 14 }, { width: 14 }, { width: 18 }, { width: 34 },
    ...r.partidas.map(() => ({ width: 10 })),
    { width: 11 }, { width: 11 }, { width: 11 }, { width: 14 }, { width: 14 },
  ];

  const borde = { style: "thin" as const, color: { argb: "FF999999" } };
  const bordes = { top: borde, left: borde, bottom: borde, right: borde };
  const gris = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFEFEDE6" } };

  // Encabezado
  ws.mergeCells(1, 1, 1, colPago);
  ws.getCell(1, 1).value = r.titulo;
  ws.getCell(1, 1).font = { bold: true, size: 14 };
  ws.mergeCells(2, 1, 2, colPago);
  ws.getCell(2, 1).value = `${r.obra} · ${r.entidad}`;

  ws.mergeCells(3, 1, 3, 6);
  ws.getCell(3, 1).value = `SUBCONTRATISTA: ${r.subcontratista}`;
  ws.mergeCells(3, colP0, 3, colP0 + 4);
  ws.getCell(3, colP0).value = `DISTRITO: ${r.distrito}`;
  ws.mergeCells(3, colP0 + 5, 3, colTotal);
  ws.getCell(3, colP0 + 5).value = `FECHA DE CORTE: ${fechaCorta(r.semanaHasta)}`;
  ws.mergeCells(3, colAnt, 3, colPago);
  ws.getCell(3, colAnt).value = `VALORIZACIÓN N° ${String(r.valorizacionN).padStart(2, "0")}`;
  ws.getCell(3, colAnt).font = { bold: true };

  ws.mergeCells(4, 1, 4, 6);
  ws.getCell(4, 1).value = `SEMANA N° ${r.semanaN}: del ${fechaCorta(r.semanaDesde)} al ${fechaCorta(r.semanaHasta)}`;
  ws.mergeCells(4, colP0, 4, colSem);
  ws.getCell(4, colP0).value = r.registrado
    ? `Avance real registrado el ${fechaHora(r.registradoEn)}${r.registradoPor ? ` por ${r.registradoPor}` : ""}`
    : "BORRADOR — semana no registrada";
  ws.getCell(4, colParcial).value = "COSTO UNITARIO:";
  ws.getCell(4, colParcial).alignment = { horizontal: "right" };
  const celdaCosto = ws.getCell(4, colPago);
  celdaCosto.value = r.costoUnitario;
  celdaCosto.numFmt = MONEDA;
  celdaCosto.font = { bold: true };
  const CU = `$${L(colPago)}$4`;
  for (let row = 1; row <= 4; row++) ws.getRow(row).font = { ...(ws.getRow(row).font ?? {}), name: "Calibri" };

  // Cabecera de la tabla: grupo de partidas (fila 6) y partida (fila 7)
  const h1 = 6;
  const h2 = 7;
  const fijos = ["N°", "GRUPO", "AP. PATERNO", "AP. MATERNO", "NOMBRES", "DIRECCIÓN"];
  fijos.forEach((t, k) => {
    ws.mergeCells(h1, k + 1, h2, k + 1);
    ws.getCell(h1, k + 1).value = t;
  });
  let k = 0;
  while (k < nP) {
    let j = k;
    while (j + 1 < nP && r.partidas[j + 1].grupo === r.partidas[k].grupo) j++;
    if (j > k) ws.mergeCells(h1, colP0 + k, h1, colP0 + j);
    ws.getCell(h1, colP0 + k).value = r.partidas[k].grupo;
    k = j + 1;
  }
  r.partidas.forEach((p, i) => (ws.getCell(h2, colP0 + i).value = p.nombre.toUpperCase()));
  const finales = ["TOTAL AVANCE", "AVANCE ANTERIOR", "AVANCE SEMANA", "PARCIAL ACUM. S/.", "PAGO SEMANA S/."];
  finales.forEach((t, i) => {
    ws.mergeCells(h1, colTotal + i, h2, colTotal + i);
    ws.getCell(h1, colTotal + i).value = t;
  });
  for (const row of [h1, h2]) {
    for (let c = 1; c <= colPago; c++) {
      const cell = ws.getCell(row, c);
      cell.font = { bold: true, size: 9 };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.fill = gris;
      cell.border = bordes;
    }
  }
  ws.getRow(h2).height = 42;

  // Pesos y montos por partida (como las filas 10–11 del cuadro original)
  const rPeso = 8;
  const rMonto = 9;
  ws.mergeCells(rPeso, 1, rMonto, 6);
  ws.getCell(rPeso, 1).value = "PESO / MONTO POR PARTIDA";
  r.partidas.forEach((p, i) => {
    const c = colP0 + i;
    ws.getCell(rPeso, c).value = p.peso;
    ws.getCell(rPeso, c).numFmt = PCT;
    ws.getCell(rMonto, c).value = { formula: `${L(c)}${rPeso}*${CU}`, result: p.peso * r.costoUnitario };
    ws.getCell(rMonto, c).numFmt = MONEDA;
  });
  ws.getCell(rPeso, colTotal).value = {
    formula: `SUM(${L(colP0)}${rPeso}:${L(colTotal - 1)}${rPeso})`,
    result: r.partidas.reduce((s, p) => s + p.peso, 0),
  };
  ws.getCell(rPeso, colTotal).numFmt = PCT;
  ws.getCell(rMonto, colTotal).value = {
    formula: `SUM(${L(colP0)}${rMonto}:${L(colTotal - 1)}${rMonto})`,
    result: r.costoUnitario,
  };
  ws.getCell(rMonto, colTotal).numFmt = MONEDA;
  for (const row of [rPeso, rMonto]) {
    for (let c = 1; c <= colPago; c++) {
      ws.getCell(row, c).border = bordes;
      ws.getCell(row, c).font = { size: 9, italic: true };
    }
  }

  // Filas por beneficiario
  const r0 = 10;
  r.filas.forEach((f, i) => {
    const row = r0 + i;
    const vals = [f.n, f.grupo, f.apPaterno, f.apMaterno, f.nombres, f.direccion];
    vals.forEach((v, c) => (ws.getCell(row, c + 1).value = v));
    f.aportes.forEach((a, j) => {
      const cell = ws.getCell(row, colP0 + j);
      cell.value = a;
      cell.numFmt = PCT;
    });
    const T = `${L(colTotal)}${row}`;
    const U = `${L(colAnt)}${row}`;
    const V = `${L(colSem)}${row}`;
    ws.getCell(T).value = { formula: `SUM(${L(colP0)}${row}:${L(colTotal - 1)}${row})`, result: f.acumulado };
    ws.getCell(U).value = f.anterior;
    ws.getCell(V).value = { formula: `${T}-${U}`, result: f.semana };
    ws.getCell(row, colParcial).value = { formula: `${T}*${CU}`, result: f.montoAcumulado };
    ws.getCell(row, colPago).value = { formula: `${V}*${CU}`, result: f.montoSemana };
    for (const c of [colTotal, colAnt, colSem]) ws.getCell(row, c).numFmt = PCT;
    for (const c of [colParcial, colPago]) ws.getCell(row, c).numFmt = MONEDA;
    for (let c = 1; c <= colPago; c++) {
      ws.getCell(row, c).border = bordes;
      ws.getCell(row, c).font = { size: 9, bold: c === colPago };
      if (c === 6) ws.getCell(row, c).alignment = { wrapText: true, vertical: "middle" };
    }
  });
  const rTot = r0 + r.filas.length;
  const rFin = rTot - 1;
  ws.mergeCells(rTot, 1, rTot, colTotal - 1);
  ws.getCell(rTot, 1).value = "TOTAL";
  ws.getCell(rTot, 1).alignment = { horizontal: "right" };
  ws.getCell(rTot, colParcial).value = {
    formula: `SUM(${L(colParcial)}${r0}:${L(colParcial)}${rFin})`,
    result: r.totales.montoAcumulado,
  };
  ws.getCell(rTot, colPago).value = {
    formula: `SUM(${L(colPago)}${r0}:${L(colPago)}${rFin})`,
    result: r.totales.montoSemana,
  };
  for (let c = 1; c <= colPago; c++) {
    const cell = ws.getCell(rTot, c);
    cell.font = { bold: true };
    cell.fill = gris;
    cell.border = bordes;
    if (c >= colParcial) cell.numFmt = MONEDA;
  }

  // Datos del contrato (bloque inferior izquierdo del cuadro original)
  let row = rTot + 2;
  const par = (etiqueta: string, valor: string | number, fmt?: string) => {
    ws.mergeCells(row, 1, row, 5);
    ws.getCell(row, 1).value = etiqueta;
    ws.getCell(row, 6).value = valor;
    if (fmt) ws.getCell(row, 6).numFmt = fmt;
    row++;
  };
  ws.getCell(row, 1).value = "DATOS DEL CONTRATO";
  ws.getCell(row, 1).font = { bold: true };
  row++;
  par("NÚMERO DE MÓDULOS CONTRATADOS", r.modulos);
  par("MONTO TOTAL DEL CONTRATO", r.montoContrato, MONEDA);
  par("INICIO DE OBRA", fechaCorta(r.inicioObra));
  row++;
  ws.getCell(row, 1).value = "OBRAS ADICIONALES";
  ws.getCell(row, 1).font = { bold: true };
  row++;
  if (!r.adicionales.length) par("—", "");
  for (const a of r.adicionales) par(`${a.descripcion} (${fechaCorta(a.fecha)})`, a.monto, MONEDA);
  row++;
  ws.getCell(row, 1).value = "ADELANTO MATERIALES / EFECTIVO";
  ws.getCell(row, 1).font = { bold: true };
  row++;
  const hdr = ["DESCRIPCIÓN", "FECHA", "MONTO", ...(r.adelantos[0]?.descuentos ?? []).map((d) => `DES. N° ${String(d.numero).padStart(2, "0")}`), "SALDO"];
  hdr.forEach((t, i) => {
    const cell = ws.getCell(row, i === 0 ? 1 : 5 + i);
    cell.value = t;
    cell.font = { bold: true, size: 9 };
    cell.fill = gris;
  });
  ws.mergeCells(row, 1, row, 5);
  row++;
  if (!r.adelantos.length) {
    ws.getCell(row, 1).value = "—";
    row++;
  }
  for (const a of r.adelantos) {
    ws.mergeCells(row, 1, row, 5);
    ws.getCell(row, 1).value = a.descripcion;
    ws.getCell(row, 6).value = fechaCorta(a.fecha);
    ws.getCell(row, 7).value = a.monto;
    ws.getCell(row, 7).numFmt = MONEDA;
    a.descuentos.forEach((d, i) => {
      ws.getCell(row, 8 + i).value = d.monto;
      ws.getCell(row, 8 + i).numFmt = MONEDA;
    });
    ws.getCell(row, 8 + a.descuentos.length).value = a.saldo;
    ws.getCell(row, 8 + a.descuentos.length).numFmt = MONEDA;
    row++;
  }

  // Liquidación de la semana (debajo del bloque del contrato, a la derecha;
  // así las columnas DES. N° nunca se cruzan con ella aunque haya muchas semanas).
  let lr = row + 1;
  const cEt = colSem;
  const cVal = colPago;
  const liq = (etiqueta: string, valor: number, bold = false) => {
    ws.mergeCells(lr, cEt, lr, cVal - 1);
    ws.getCell(lr, cEt).value = etiqueta;
    ws.getCell(lr, cVal).value = valor;
    ws.getCell(lr, cVal).numFmt = MONEDA;
    if (bold) {
      ws.getCell(lr, cEt).font = { bold: true };
      ws.getCell(lr, cVal).font = { bold: true };
    }
    lr++;
  };
  ws.getCell(lr, cEt).value = "LIQUIDACIÓN DE LA SEMANA";
  ws.getCell(lr, cEt).font = { bold: true };
  lr++;
  const L0 = r.liquidacion;
  liq("Valorizado acumulado", L0.valorizadoAcumulado);
  liq("(−) Valorizado anterior", L0.valorizadoAnterior);
  liq("Valorizado de la semana", L0.valorizadoSemana, true);
  liq("(+) Obras adicionales", L0.adicionales);
  liq("(−) Amortización de adelantos", L0.amortizacion);
  for (const d of L0.otrosDescuentos) liq(`(−) ${d.descripcion}`, d.monto);
  liq("NETO A PAGAR", L0.neto, true);
  ws.mergeCells(lr, cEt - 4, lr, cVal);
  ws.getCell(lr, cEt - 4).value = `SON: ${L0.netoEnLetras}`;
  ws.getCell(lr, cEt - 4).font = { italic: true, size: 9 };
  lr++;

  // Firmas
  const rf = Math.max(row, lr) + 4;
  const firmas = ["RESIDENTE DE OBRA", "SUBCONTRATISTA", "V°B° ENTIDAD TÉCNICA"];
  const ancho = Math.floor(colPago / 3);
  firmas.forEach((t, i) => {
    const c1 = 1 + i * ancho + (i === 0 ? 1 : 0);
    const c2 = Math.min(colPago, c1 + ancho - 2);
    ws.mergeCells(rf, c1, rf, c2);
    const cell = ws.getCell(rf, c1);
    cell.value = t;
    cell.alignment = { horizontal: "center" };
    cell.border = { top: { style: "thin" } };
    cell.font = { size: 9, bold: true };
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(a.href);
}
