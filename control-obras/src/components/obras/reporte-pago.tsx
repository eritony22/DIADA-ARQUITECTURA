"use client";

import { useEffect, useState } from "react";
import { Download, Printer, X } from "lucide-react";
import { fechaCorta, fechaHora, soles, type CalculoValorizacion } from "@/lib/obras/calc";
import { construirReporte } from "@/lib/obras/reporte";
import { useObra } from "./obra-context";
import { Button } from "./ui";

const pct = (f: number, d = 2) => `${(f * 100).toFixed(d)}%`;

/** Hoja del reporte de pago semanal (vista previa, impresión/PDF y Excel). */
export default function ReportePago({
  calc,
  onClose,
}: {
  calc: CalculoValorizacion;
  onClose: () => void;
}) {
  const { obra } = useObra();
  const r = construirReporte(calc, obra);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const archivo = `pago-semanal-${calc.contrato.entidadId}-val${String(r.valorizacionN).padStart(2, "0")}-${r.semanaHasta}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const th = "border border-[#999] bg-[#efede6] px-0.5 py-1 text-center text-[8px] font-semibold leading-none";
  const td = "border border-[#bbb] px-1 py-0.5 text-[8.5px]";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 p-4">
      <div className="no-print sticky top-0 z-10 mx-auto mb-3 flex max-w-[1400px] flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper p-3 shadow">
        <p className="text-sm font-semibold text-ink">
          Reporte de pago semanal · Valorización N° {String(r.valorizacionN).padStart(2, "0")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => window.print()}>
            <Printer size={14} /> Imprimir / Guardar PDF
          </Button>
          <Button
            disabled={exportando}
            onClick={async () => {
              setExportando(true);
              setError(null);
              try {
                const { descargarReporteExcel } = await import("@/lib/obras/reporte-excel");
                await descargarReporteExcel(r, `${archivo}.xlsx`);
              } catch (e) {
                setError(e instanceof Error ? e.message : "No se pudo generar el Excel");
              } finally {
                setExportando(false);
              }
            }}
          >
            <Download size={14} /> {exportando ? "Generando…" : "Descargar Excel"}
          </Button>
          <Button onClick={onClose} aria-label="Cerrar">
            <X size={14} /> Cerrar
          </Button>
        </div>
        {error && <p className="w-full text-xs text-red-700">{error}</p>}
      </div>

      <div className="print-area relative mx-auto max-w-[1400px] bg-white p-6 text-[10px] leading-tight text-black shadow">
        {!r.registrado && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rotate-[-18deg] text-7xl font-bold text-black/[0.06]">BORRADOR</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-2">
          <div>
            <p className="text-base font-bold">{r.titulo}</p>
            <p>{r.obra}</p>
            <p>{r.entidad}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">
              SEMANA N° {r.semanaN}: del {fechaCorta(r.semanaDesde)} al {fechaCorta(r.semanaHasta)}
            </p>
            <p>
              {r.registrado
                ? `Avance real registrado el ${fechaHora(r.registradoEn)}${r.registradoPor ? ` por ${r.registradoPor}` : ""}`
                : "BORRADOR — semana no registrada (avance no oficial)"}
            </p>
            {r.fechaPago && <p>Pagado el {fechaCorta(r.fechaPago)}</p>}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-4 gap-2">
          <p><b>SUBCONTRATISTA:</b> {r.subcontratista}</p>
          <p><b>DISTRITO:</b> {r.distrito}</p>
          <p><b>FECHA DE CORTE:</b> {fechaCorta(r.semanaHasta)}</p>
          <p className="text-right"><b>COSTO UNITARIO:</b> {soles(r.costoUnitario)}</p>
        </div>

        <div className="mt-2 overflow-x-auto print:overflow-visible">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th rowSpan={2} className={th}>N°</th>
              <th rowSpan={2} className={th}>GRUPO</th>
              <th rowSpan={2} className={th}>AP. PATERNO</th>
              <th rowSpan={2} className={th}>AP. MATERNO</th>
              <th rowSpan={2} className={th}>NOMBRES</th>
              <th rowSpan={2} className={th}>DIRECCIÓN</th>
              {gruposPartidas(r.partidas).map((g) => (
                <th key={g.inicio} colSpan={g.span} className={th}>{g.grupo}</th>
              ))}
              <th rowSpan={2} className={th}>TOTAL AVANCE</th>
              <th rowSpan={2} className={th}>AVANCE ANTERIOR</th>
              <th rowSpan={2} className={th}>AVANCE SEMANA</th>
              <th rowSpan={2} className={th}>PARCIAL ACUM. S/.</th>
              <th rowSpan={2} className={th}>PAGO SEMANA S/.</th>
            </tr>
            <tr>
              {r.partidas.map((p) => (
                <th key={p.id} className={`${th} min-w-[44px]`}>{p.nombre.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="italic">
              <td colSpan={6} className={`${td} text-right`}>PESO · MONTO POR PARTIDA</td>
              {r.partidas.map((p) => (
                <td key={p.id} className={`${td} text-center`}>
                  {pct(p.peso, 0)}
                  <br />
                  {(p.peso * r.costoUnitario).toLocaleString("es-PE")}
                </td>
              ))}
              <td className={`${td} text-center`}>100%</td>
              <td className={td} />
              <td className={td} />
              <td className={`${td} text-right`}>{soles(r.costoUnitario)}</td>
              <td className={td} />
            </tr>
            {r.filas.map((f) => (
              <tr key={f.n}>
                <td className={`${td} text-center`}>{f.n}</td>
                <td className={`${td} text-center`}>{f.grupo}</td>
                <td className={td}>{f.apPaterno}</td>
                <td className={td}>{f.apMaterno}</td>
                <td className={td}>{f.nombres}</td>
                <td className={`${td} max-w-[150px]`}>
                  <span className="line-clamp-2" title={f.direccion}>{f.direccion}</span>
                </td>
                {f.aportes.map((a, k) => (
                  <td key={k} className={`${td} text-right tabular-nums`}>{a ? pct(a) : ""}</td>
                ))}
                <td className={`${td} text-right font-semibold tabular-nums`}>{pct(f.acumulado)}</td>
                <td className={`${td} text-right tabular-nums`}>{pct(f.anterior)}</td>
                <td className={`${td} text-right tabular-nums`}>{pct(f.semana)}</td>
                <td className={`${td} text-right tabular-nums`}>{soles(f.montoAcumulado)}</td>
                <td className={`${td} text-right font-semibold tabular-nums`}>{soles(f.montoSemana)}</td>
              </tr>
            ))}
            <tr className="bg-[#efede6] font-bold">
              <td colSpan={6 + r.partidas.length} className={`${td} text-right`}>TOTAL</td>
              <td className={`${td} text-right`}>{pct(r.totales.acumulado)}</td>
              <td className={`${td} text-right`}>{pct(r.totales.anterior)}</td>
              <td className={`${td} text-right`}>{pct(r.totales.semana)}</td>
              <td className={`${td} text-right`}>{soles(r.totales.montoAcumulado)}</td>
              <td className={`${td} text-right`}>{soles(r.totales.montoSemana)}</td>
            </tr>
          </tbody>
        </table>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-6">
          <div>
            <table className="w-full border-collapse">
              <tbody>
                <tr><td className={td}>NÚMERO DE MÓDULOS CONTRATADOS</td><td className={`${td} text-right`}>{r.modulos}</td></tr>
                <tr><td className={td}>MONTO TOTAL DEL CONTRATO</td><td className={`${td} text-right`}>{soles(r.montoContrato)}</td></tr>
                <tr><td className={td}>INICIO DE OBRA</td><td className={`${td} text-right`}>{fechaCorta(r.inicioObra)}</td></tr>
              </tbody>
            </table>
            <p className="mt-3 font-bold">OBRAS ADICIONALES</p>
            <table className="w-full border-collapse">
              <thead><tr><th className={th}>DESCRIPCIÓN</th><th className={th}>FECHA</th><th className={th}>MONTO</th></tr></thead>
              <tbody>
                {r.adicionales.length === 0 && <tr><td colSpan={3} className={`${td} text-center`}>—</td></tr>}
                {r.adicionales.map((a, k) => (
                  <tr key={k}><td className={td}>{a.descripcion}</td><td className={td}>{fechaCorta(a.fecha)}</td><td className={`${td} text-right`}>{soles(a.monto)}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 font-bold">ADELANTO MATERIALES / EFECTIVO</p>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>DESCRIPCIÓN</th>
                  <th className={th}>FECHA</th>
                  <th className={th}>MONTO</th>
                  {(r.adelantos[0]?.descuentos ?? []).map((d) => (
                    <th key={d.numero} className={th}>DES. N°{String(d.numero).padStart(2, "0")}</th>
                  ))}
                  <th className={th}>SALDO</th>
                </tr>
              </thead>
              <tbody>
                {r.adelantos.length === 0 && <tr><td colSpan={4} className={`${td} text-center`}>—</td></tr>}
                {r.adelantos.map((a, k) => (
                  <tr key={k}>
                    <td className={td}>{a.descripcion}</td>
                    <td className={td}>{fechaCorta(a.fecha)}</td>
                    <td className={`${td} text-right`}>{soles(a.monto)}</td>
                    {a.descuentos.map((d) => (
                      <td key={d.numero} className={`${td} text-right`}>{d.monto ? soles(d.monto) : ""}</td>
                    ))}
                    <td className={`${td} text-right font-semibold`}>{soles(a.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-bold">LIQUIDACIÓN DE LA SEMANA</p>
            <table className="w-full border-collapse text-[11px]">
              <tbody>
                <Fila label="Valorizado acumulado" v={r.liquidacion.valorizadoAcumulado} td={td} />
                <Fila label="(−) Valorizado anterior" v={r.liquidacion.valorizadoAnterior} td={td} />
                <Fila label="Valorizado de la semana" v={r.liquidacion.valorizadoSemana} td={td} bold />
                <Fila label="(+) Obras adicionales" v={r.liquidacion.adicionales} td={td} />
                <Fila label="(−) Amortización de adelantos" v={r.liquidacion.amortizacion} td={td} />
                {r.liquidacion.otrosDescuentos.map((d, k) => (
                  <Fila key={k} label={`(−) ${d.descripcion}`} v={d.monto} td={td} />
                ))}
                <tr className="bg-[#efede6] text-sm font-bold">
                  <td className={td}>NETO A PAGAR</td>
                  <td className={`${td} text-right`}>{soles(r.liquidacion.neto)}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-1 italic">SON: {r.liquidacion.netoEnLetras}</p>
            {r.observaciones && <p className="mt-2"><b>Observaciones:</b> {r.observaciones}</p>}
          </div>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-10 text-center font-semibold">
          {["RESIDENTE DE OBRA", "SUBCONTRATISTA", "V°B° ENTIDAD TÉCNICA"].map((f) => (
            <div key={f} className="border-t border-black pt-1">{f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Fila({ label, v, td, bold }: { label: string; v: number; td: string; bold?: boolean }) {
  return (
    <tr className={bold ? "font-bold" : undefined}>
      <td className={td}>{label}</td>
      <td className={`${td} text-right tabular-nums`}>{soles(v)}</td>
    </tr>
  );
}

function gruposPartidas(ps: { grupo: string }[]) {
  const out: { grupo: string; inicio: number; span: number }[] = [];
  ps.forEach((p, i) => {
    const last = out[out.length - 1];
    if (last && last.grupo === p.grupo && last.inicio + last.span === i) last.span++;
    else out.push({ grupo: p.grupo, inicio: i, span: 1 });
  });
  return out;
}
