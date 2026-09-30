"use client";

import { useEffect, useState } from "react";
import { Download, HardHat, Plus, Printer, Trash2, Wallet, X } from "lucide-react";
import type { Contrato, ISODate, MedioPago } from "@/types/obras";
import {
  avanceModulo,
  avancesA,
  corteDeSemana,
  fechaCorta,
  fechaHora,
  numeroSemana,
  pct,
  semanaDe,
  soles,
  todayISO,
} from "@/lib/obras/calc";
import { anularPago, asignarModulo, nuevoMaestro, registrarPago } from "@/lib/obras/ops";
import {
  MEDIO_PAGO_LABEL,
  planillaSemanal,
  resumenPagosContrato,
  type FilaPlanilla,
} from "@/lib/obras/pagos";
import { cn } from "@/lib/cn";
import { useObra } from "./obra-context";
import { BarrasSimples } from "./charts";
import { Button, Card, EmptyState, Field, Kpi, inputClass } from "./ui";

export default function TabMaestros() {
  const { obra, obraReal, replace, fecha, seleccion } = useObra();
  const [error, setError] = useState<string | null>(null);
  const [planilla, setPlanilla] = useState<ISODate | null>(null);

  if (!obra.beneficiarios.length) {
    return <EmptyState title="Importa primero la lista de beneficiarios" />;
  }

  const intentar = (fn: () => void) => {
    setError(null);
    try {
      fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operación no válida");
    }
  };

  const resumenes = obra.contratos.map((c) => ({ c, r: resumenPagosContrato(c, obra) }));
  const totalNeto = resumenes.reduce((s, x) => s + x.r.valorizadoNeto, 0);
  const totalPagado = resumenes.reduce((s, x) => s + x.r.pagado, 0);
  const sinMaestro = obra.beneficiarios.filter((b) => !obra.contratos.some((c) => c.beneficiarioIds.includes(b.id)));

  // Cortes con alguna semana registrada (para la planilla consolidada).
  const cortes = [
    ...new Set(obra.valorizaciones.filter((v) => v.estado !== "borrador").map((v) => v.fechaCorte)),
  ].sort().reverse();

  // Pagos por semana (según la fecha de pago).
  const porSemana = new Map<ISODate, number>();
  for (const c of obra.contratos) {
    for (const p of c.pagos ?? []) {
      const clave = corteDeSemana(p.fecha, obra.config.diaCorte); // semana (al corte) en que se pagó
      porSemana.set(clave, (porSemana.get(clave) ?? 0) + p.monto);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Maestros de obra" value={String(obra.contratos.length)} hint={<>{obra.beneficiarios.length - sinMaestro.length} módulos asignados</>} />
        <Kpi label="Módulos sin maestro" value={String(sinMaestro.length)} status={sinMaestro.length ? "warning" : "good"} />
        <Kpi label="Neto valorizado (semanas registradas)" value={soles(totalNeto)} />
        <Kpi label="Pagado" value={soles(totalPagado)} />
        <Kpi
          label="Por pagar"
          value={soles(totalNeto - totalPagado)}
          status={totalNeto - totalPagado > 0.005 ? "warning" : "good"}
        />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Card
        title="Maestros de obra"
        subtitle="Cada maestro tiene un contrato a destajo por módulo; sus semanas se valorizan en 'Valorización semanal'."
        actions={obra.entidades.map((e) => (
          <Button
            key={e.id}
            onClick={() => intentar(() => replace(nuevoMaestro(obra, e.id).state))}
          >
            <Plus size={14} /> Maestro {e.sigla}
          </Button>
        ))}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {resumenes.map(({ c, r }) => (
            <TarjetaMaestro key={c.id} contrato={c} resumen={r} />
          ))}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card
          title="Asignación de módulos"
          subtitle="Cambiar de maestro no vuelve a pagar lo ya valorizado: desde la próxima semana el módulo se valoriza con el nuevo maestro."
        >
          <div className="max-h-[460px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-paper">
                <tr className="border-b border-line text-left text-xs text-stone">
                  <th className="py-2 pr-2 font-medium">Módulo</th>
                  <th className="py-2 pr-2 font-medium">Avance real</th>
                  <th className="py-2 font-medium">Maestro</th>
                </tr>
              </thead>
              <tbody>
                {seleccion.map((b) => {
                  const actual = obra.contratos.find((c) => c.beneficiarioIds.includes(b.id));
                  const avance = avanceModulo(avancesA(b.id, obraReal.valorizaciones, fecha), obra.partidas);
                  return (
                    <tr key={b.id} className="border-b border-line/60">
                      <td className="py-1.5 pr-2">
                        {b.n}. {b.apPaterno} {b.nombres.split(" ")[0]}
                        <span className="ml-1 text-xs text-stone">{b.entidadId} · G{b.grupo}</span>
                      </td>
                      <td className="py-1.5 pr-2 tabular-nums">{pct(avance, 0)}</td>
                      <td className="py-1.5">
                        <select
                          className={cn(inputClass, !actual && "border-[#fab219]")}
                          value={actual?.id ?? ""}
                          onChange={(e) => e.target.value && intentar(() => replace(asignarModulo(obra, b.id, e.target.value)))}
                        >
                          {!actual && <option value="">Sin maestro</option>}
                          {obra.contratos
                            .filter((c) => c.entidadId === b.entidadId)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.subcontratista}
                              </option>
                            ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Pagos realizados por semana" subtitle="Suma de pagos a todos los maestros (S/), según la fecha de pago.">
          <BarrasSimples
            data={[...porSemana.entries()]
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([f, v]) => ({ nombre: fechaCorta(f).slice(0, 5), valor: Math.round(v * 100) / 100 }))}
            valueLabel="Pagado"
            valueFormatter={(v) => `S/ ${Math.round(v).toLocaleString("es-PE")}`}
            height={260}
          />
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <Field label="Planilla semanal consolidada (corte)">
              <select className={cn(inputClass, "w-56")} value={planilla ?? ""} onChange={(e) => setPlanilla(e.target.value || null)}>
                <option value="">Elegir semana…</option>
                {cortes.map((c) => (
                  <option key={c} value={c}>
                    Semana al {fechaCorta(c)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="mt-1 text-xs text-stone">Una fila por maestro con neto, pagado, saldo y espacio para firma o huella.</p>
        </Card>
      </div>

      <RegistroPagos onError={setError} />

      {planilla && (
        <PlanillaReporte
          corte={planilla}
          filas={planillaSemanal(obra, planilla)}
          onClose={() => setPlanilla(null)}
        />
      )}
    </div>
  );
}

function TarjetaMaestro({
  contrato: c,
  resumen: r,
}: {
  contrato: Contrato;
  resumen: ReturnType<typeof resumenPagosContrato>;
}) {
  const { obra, update, fecha, obraReal } = useObra();
  const set = (patch: Partial<Contrato>) =>
    update((d) => {
      const x = d.contratos.find((y) => y.id === c.id);
      if (x) Object.assign(x, patch);
    });
  const modulos = c.beneficiarioIds
    .map((id) => obra.beneficiarios.find((b) => b.id === id))
    .filter((b): b is NonNullable<typeof b> => Boolean(b));
  const avance = modulos.length
    ? modulos.reduce((s, b) => s + avanceModulo(avancesA(b.id, obraReal.valorizaciones, fecha), obra.partidas), 0) / modulos.length
    : 0;
  const tieneHistoria = obra.valorizaciones.some((v) => v.contratoId === c.id) || (c.pagos ?? []).length > 0;

  return (
    <div className="rounded-xl border border-line p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
          <HardHat size={16} /> {c.entidadId}
        </span>
        {!tieneHistoria && !c.beneficiarioIds.length && (
          <Button
            variant="ghost"
            onClick={() => update((d) => void (d.contratos = d.contratos.filter((x) => x.id !== c.id)))}
            aria-label="Eliminar maestro sin movimientos"
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Nombre" className="col-span-2">
          <input className={inputClass} value={c.subcontratista} onChange={(e) => set({ subcontratista: e.target.value })} />
        </Field>
        <Field label="DNI">
          <input className={inputClass} value={c.dni ?? ""} onChange={(e) => set({ dni: e.target.value || undefined })} />
        </Field>
        <Field label="Teléfono">
          <input className={inputClass} value={c.telefono ?? ""} onChange={(e) => set({ telefono: e.target.value || undefined })} />
        </Field>
        <Field label="Cuenta / Yape-Plin">
          <input className={inputClass} value={c.cuentaPago ?? ""} onChange={(e) => set({ cuentaPago: e.target.value || undefined })} />
        </Field>
        <Field label="Pago por módulo (S/)">
          <input
            type="number"
            min={0}
            step={50}
            className={inputClass}
            value={c.costoUnitario}
            onChange={(e) => set({ costoUnitario: Math.max(0, Number(e.target.value) || 0) })}
          />
        </Field>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {modulos.map((b) => (
          <span key={b.id} className="rounded-full bg-bone px-2 py-0.5 text-[0.7rem]">
            {b.n}. {b.apPaterno}
          </span>
        ))}
        {!modulos.length && <span className="text-xs text-stone">Sin módulos asignados.</span>}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 text-xs sm:grid-cols-4">
        <span>Avance <b className="tabular-nums">{pct(avance, 0)}</b></span>
        <span>Neto <b className="tabular-nums">{soles(r.valorizadoNeto)}</b></span>
        <span>Pagado <b className="tabular-nums">{soles(r.pagado)}</b></span>
        <span className={r.saldo > 0.005 ? "text-red-700" : undefined}>
          Saldo <b className="tabular-nums">{soles(r.saldo)}</b>
        </span>
      </div>
      {r.ultimoPago && <p className="mt-1 text-[0.7rem] text-stone">Último pago: {fechaCorta(r.ultimoPago)}</p>}
    </div>
  );
}

function RegistroPagos({ onError }: { onError: (e: string | null) => void }) {
  const { obra, replace, usuario } = useObra();
  const [filtro, setFiltro] = useState<string>("all");
  const [maestro, setMaestro] = useState<string>(obra.contratos[0]?.id ?? "");
  const [monto, setMonto] = useState(0);
  const [fecha, setFecha] = useState(todayISO());
  const [medio, setMedio] = useState<MedioPago>("efectivo");
  const [referencia, setReferencia] = useState("");
  const [nota, setNota] = useState("");

  const pagos = obra.contratos
    .filter((c) => filtro === "all" || c.id === filtro)
    .flatMap((c) => (c.pagos ?? []).map((p) => ({ c, p })))
    .sort((a, b) => b.p.fecha.localeCompare(a.p.fecha) || b.p.registradoEn.localeCompare(a.p.registradoEn));

  return (
    <Card
      title="Registro de pagos realizados"
      subtitle="Los pagos de cada semana se registran desde 'Valorización semanal'. Aquí puedes registrar además pagos a cuenta (adelantos al maestro que no corresponden a una semana)."
      actions={
        <select className={cn(inputClass, "w-64")} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="all">Todos los maestros</option>
          {obra.contratos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.subcontratista}
            </option>
          ))}
        </select>
      }
    >
      <div className="mb-4 grid grid-cols-2 items-end gap-2 rounded-xl border border-line bg-bone/40 p-3 md:grid-cols-[1fr_120px_150px_140px_1fr_1fr_auto]">
        <Field label="Maestro">
          <select className={inputClass} value={maestro} onChange={(e) => setMaestro(e.target.value)}>
            {obra.contratos.map((c) => (
              <option key={c.id} value={c.id}>{c.subcontratista}</option>
            ))}
          </select>
        </Field>
        <Field label="Monto (S/)">
          <input type="number" min={0} className={inputClass} value={monto} onChange={(e) => setMonto(Number(e.target.value) || 0)} />
        </Field>
        <Field label="Fecha">
          <input type="date" className={inputClass} value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} />
        </Field>
        <Field label="Medio">
          <select className={inputClass} value={medio} onChange={(e) => setMedio(e.target.value as MedioPago)}>
            {Object.entries(MEDIO_PAGO_LABEL).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="N° operación / recibo">
          <input className={inputClass} value={referencia} onChange={(e) => setReferencia(e.target.value)} />
        </Field>
        <Field label="Concepto">
          <input className={inputClass} value={nota} placeholder="Pago a cuenta" onChange={(e) => setNota(e.target.value)} />
        </Field>
        <Button
          variant="primary"
          disabled={!(monto > 0) || !maestro}
          onClick={() => {
            onError(null);
            try {
              replace(
                registrarPago(
                  obra,
                  maestro,
                  { fecha, monto, medio, referencia: referencia || undefined, observaciones: nota || "Pago a cuenta" },
                  usuario ?? undefined,
                ),
              );
              setMonto(0);
              setReferencia("");
              setNota("");
            } catch (e) {
              onError(e instanceof Error ? e.message : "No se pudo registrar");
            }
          }}
        >
          <Wallet size={14} /> Pago a cuenta
        </Button>
      </div>

      {pagos.length === 0 ? (
        <p className="py-4 text-center text-sm text-stone">Aún no hay pagos registrados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-stone">
                <th className="py-2 pr-2 font-medium">Fecha</th>
                <th className="py-2 pr-2 font-medium">Maestro</th>
                <th className="py-2 pr-2 font-medium">Concepto</th>
                <th className="py-2 pr-2 text-right font-medium">Monto</th>
                <th className="py-2 pr-2 font-medium">Medio</th>
                <th className="py-2 pr-2 font-medium">Registrado</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {pagos.map(({ c, p }) => {
                const v = p.valorizacionId ? obra.valorizaciones.find((x) => x.id === p.valorizacionId) : null;
                return (
                  <tr key={p.id} className="border-b border-line/60">
                    <td className="py-2 pr-2 tabular-nums">{fechaCorta(p.fecha)}</td>
                    <td className="py-2 pr-2">{c.subcontratista} <span className="text-xs text-stone">{c.entidadId}</span></td>
                    <td className="py-2 pr-2">
                      {v
                        ? `Valorización N° ${String(v.numero).padStart(2, "0")} · semana ${numeroSemana(v.fechaCorte, c.fechaInicio, obra.config.diaCorte)} (al ${fechaCorta(v.fechaCorte)})`
                        : (p.observaciones ?? "Pago a cuenta")}
                    </td>
                    <td className="py-2 pr-2 text-right font-semibold tabular-nums">{soles(p.monto)}</td>
                    <td className="py-2 pr-2">{MEDIO_PAGO_LABEL[p.medio]}{p.referencia ? ` · ${p.referencia}` : ""}</td>
                    <td className="py-2 pr-2 text-xs text-stone">{fechaHora(p.registradoEn)}{p.registradoPor ? ` · ${p.registradoPor}` : ""}</td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost"
                        aria-label="Anular pago"
                        onClick={() => {
                          if (!confirm(`¿Anular el pago de ${soles(p.monto)} a ${c.subcontratista}?`)) return;
                          try {
                            replace(anularPago(obra, c.id, p.id, usuario ?? undefined));
                          } catch (e) {
                            onError(e instanceof Error ? e.message : "No se pudo anular");
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function PlanillaReporte({ corte, filas, onClose }: { corte: ISODate; filas: FilaPlanilla[]; onClose: () => void }) {
  const { obra } = useObra();
  const [exportando, setExportando] = useState(false);
  const inicio = obra.contratos[0]?.fechaInicio ?? obra.config.fechaInicio;
  const semanaN = numeroSemana(corte, inicio, obra.config.diaCorte);
  const desde = semanaDe(corte).inicio;
  const tot = (k: keyof Pick<FilaPlanilla, "valorizado" | "adicionales" | "amortizacion" | "descuentos" | "neto" | "pagado" | "saldo">) =>
    filas.reduce((s, f) => s + f[k], 0);
  const pagosTexto = (f: FilaPlanilla) =>
    f.pagos.map((p) => `${MEDIO_PAGO_LABEL[p.medio]}${p.referencia ? ` ${p.referencia}` : ""} (${fechaCorta(p.fecha)})`).join("; ");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const th = "border border-[#999] bg-[#efede6] px-1 py-1 text-center text-[9px] font-semibold";
  const td = "border border-[#bbb] px-1.5 py-2 text-[10px]";
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 p-4">
      <div className="no-print sticky top-0 z-10 mx-auto mb-3 flex max-w-[1200px] flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper p-3 shadow">
        <p className="text-sm font-semibold">Planilla de pagos · semana {semanaN}</p>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => window.print()}>
            <Printer size={14} /> Imprimir / Guardar PDF
          </Button>
          <Button
            disabled={exportando}
            onClick={async () => {
              setExportando(true);
              try {
                const { descargarPlanillaExcel } = await import("@/lib/obras/reporte-excel");
                await descargarPlanillaExcel(
                  {
                    obra: obra.config.nombre,
                    semanaN,
                    desde,
                    hasta: corte,
                    filas: filas.map((f) => ({
                      maestro: f.contrato.subcontratista,
                      dni: f.contrato.dni,
                      entidad: f.entidad,
                      modulos: f.modulos,
                      valorizado: f.valorizado,
                      adicionales: f.adicionales,
                      amortizacion: f.amortizacion,
                      descuentos: f.descuentos,
                      neto: f.neto,
                      pagado: f.pagado,
                      saldo: f.saldo,
                      pagos: pagosTexto(f),
                    })),
                  },
                  `planilla-maestros-semana-${semanaN}-${corte}.xlsx`,
                );
              } finally {
                setExportando(false);
              }
            }}
          >
            <Download size={14} /> {exportando ? "Generando…" : "Descargar Excel"}
          </Button>
          <Button onClick={onClose}>
            <X size={14} /> Cerrar
          </Button>
        </div>
      </div>
      <div className="print-area print-nota mx-auto max-w-[1200px] bg-white p-6 text-black shadow">
        <p className="text-base font-bold">PLANILLA DE PAGOS SEMANALES — MAESTROS DE OBRA</p>
        <p className="text-xs">
          {obra.config.nombre} · SEMANA N° {semanaN}: del {fechaCorta(desde)} al {fechaCorta(corte)}
        </p>
        <table className="mt-3 w-full border-collapse">
          <thead>
            <tr>
              {["N°", "MAESTRO DE OBRA", "DNI", "E.T.", "MÓD.", "VALORIZADO SEMANA", "ADICIONALES", "AMORT. ADELANTO", "OTROS DESC.", "NETO A PAGAR", "PAGADO", "MEDIO / N° OPERACIÓN", "SALDO", "FIRMA / HUELLA"].map((h) => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={f.contrato.id}>
                <td className={`${td} text-center`}>{i + 1}</td>
                <td className={td}>{f.contrato.subcontratista}</td>
                <td className={td}>{f.contrato.dni ?? ""}</td>
                <td className={td}>{f.entidad}</td>
                <td className={`${td} text-center`}>{f.modulos}</td>
                <td className={`${td} text-right`}>{soles(f.valorizado)}</td>
                <td className={`${td} text-right`}>{soles(f.adicionales)}</td>
                <td className={`${td} text-right`}>{soles(f.amortizacion)}</td>
                <td className={`${td} text-right`}>{soles(f.descuentos)}</td>
                <td className={`${td} text-right font-bold`}>{soles(f.neto)}</td>
                <td className={`${td} text-right`}>{soles(f.pagado)}</td>
                <td className={`${td} text-[9px]`}>{pagosTexto(f)}</td>
                <td className={`${td} text-right`}>{soles(f.saldo)}</td>
                <td className={`${td} w-40`} />
              </tr>
            ))}
            <tr className="bg-[#efede6] font-bold">
              <td colSpan={5} className={`${td} text-right`}>TOTAL</td>
              <td className={`${td} text-right`}>{soles(tot("valorizado"))}</td>
              <td className={`${td} text-right`}>{soles(tot("adicionales"))}</td>
              <td className={`${td} text-right`}>{soles(tot("amortizacion"))}</td>
              <td className={`${td} text-right`}>{soles(tot("descuentos"))}</td>
              <td className={`${td} text-right`}>{soles(tot("neto"))}</td>
              <td className={`${td} text-right`}>{soles(tot("pagado"))}</td>
              <td className={td} />
              <td className={`${td} text-right`}>{soles(tot("saldo"))}</td>
              <td className={td} />
            </tr>
          </tbody>
        </table>
        <div className="mt-16 grid grid-cols-2 gap-24 px-16 text-center text-xs font-semibold">
          <div className="border-t border-black pt-1">RESIDENTE DE OBRA</div>
          <div className="border-t border-black pt-1">V°B° ENTIDAD TÉCNICA</div>
        </div>
      </div>
    </div>
  );
}
