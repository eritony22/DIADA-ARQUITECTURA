"use client";

import { useState } from "react";
import {
  CalendarCheck2,
  CircleDashed,
  FileText,
  Lock,
  LockOpen,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import type { ISODate, Valorizacion } from "@/types/obras";
import {
  amortizacionSugerida,
  calcularValorizacion,
  clamp,
  corteDeSemana,
  cortesSemanales,
  fechaCorta,
  fechaHora,
  nombreDia,
  numeroSemana,
  pct,
  semanaDe,
  soles,
  todayISO,
  valorizacionesDeContrato,
  type CalculoValorizacion,
} from "@/lib/obras/calc";
import { abrirSemana, marcarPagada, reabrirSemana, registrarSemana, uid } from "@/lib/obras/ops";
import { cn } from "@/lib/cn";
import { useObra } from "./obra-context";
import { BarrasSimples } from "./charts";
import { DatosContrato, Movimientos } from "./contrato";
import ReportePago from "./reporte-pago";
import { Button, Card, EmptyState, Field, StatusBadge, inputBase, inputClass } from "./ui";

const ESTADO: Record<Valorizacion["estado"], { label: string; status: "warning" | "good" | "neutral" }> = {
  borrador: { label: "Abierta (no oficial)", status: "warning" },
  aprobada: { label: "Registrada", status: "good" },
  pagada: { label: "Pagada", status: "good" },
};

export default function TabSemanal() {
  const { obra, replace, usuario } = useObra();
  const contratos = obra.contratos.filter((c) => c.beneficiarioIds.length);
  const [contratoId, setContratoId] = useState<string>(contratos[0]?.id ?? "");
  const [corteSel, setCorteSel] = useState<ISODate | null>(null);
  const [reporteId, setReporteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const contrato = obra.contratos.find((c) => c.id === contratoId) ?? contratos[0];
  if (!contrato) {
    return (
      <EmptyState title="No hay contratos con beneficiarios">
        Importa la lista oficial en Parámetros y datos: cada familia se asigna al contrato de su
        entidad técnica.
      </EmptyState>
    );
  }

  const diaCorte = obra.config.diaCorte;
  const serie = valorizacionesDeContrato(contrato.id, obra.valorizaciones);
  const calculos = serie
    .map((v) => calcularValorizacion(v, obra))
    .filter((c): c is CalculoValorizacion => Boolean(c));
  const hoy = todayISO();
  const corteHoy = corteDeSemana(hoy, diaCorte);
  const ultimoCorte = serie[serie.length - 1]?.fechaCorte;
  const hastaCorte = ultimoCorte && ultimoCorte > corteHoy ? ultimoCorte : corteHoy;
  const cortes = [
    ...new Set([...cortesSemanales(contrato.fechaInicio, hastaCorte, diaCorte), ...serie.map((v) => v.fechaCorte)]),
  ].sort();

  const abierta = serie.find((v) => v.estado === "borrador");
  const seleccionado =
    corteSel && cortes.includes(corteSel)
      ? corteSel
      : (abierta?.fechaCorte ?? (cortes.includes(corteHoy) ? corteHoy : cortes[cortes.length - 1]));
  const calcSel = calculos.find((c) => c.valorizacion.fechaCorte === seleccionado);
  const reporte = calculos.find((c) => c.valorizacion.id === reporteId);

  const valorizar = () => {
    setError(null);
    try {
      const r = abrirSemana(obra, contrato.id, seleccionado, usuario ?? undefined);
      replace(r.state);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir la semana");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {contratos.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setContratoId(c.id);
              setCorteSel(null);
              setError(null);
            }}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium",
              c.id === contrato.id ? "border-ink bg-ink text-bone" : "border-line bg-paper text-ink",
            )}
          >
            {c.entidadId} · {c.subcontratista}
          </button>
        ))}
      </div>

      <Card
        title="Semanas de obra"
        subtitle={`Corte cada ${nombreDia(diaCorte)}. Valoriza la semana con el avance ejecutado y regístrala: queda guardada con fecha y hora como avance real y genera el reporte de pago.`}
      >
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {cortes.map((c) => {
            const v = serie.find((x) => x.fechaCorte === c);
            const activo = c === seleccionado;
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCorteSel(c);
                  setError(null);
                }}
                className={cn(
                  "flex min-w-[118px] shrink-0 flex-col items-start rounded-xl border px-3 py-2 text-left text-xs",
                  activo ? "border-ink bg-ink text-bone" : "border-line bg-paper text-ink hover:bg-bone",
                )}
              >
                <span className="font-semibold">
                  Semana {numeroSemana(c, contrato.fechaInicio, diaCorte)}
                </span>
                <span className={activo ? "text-bone/70" : "text-stone"}>al {fechaCorta(c)}</span>
                <span className="mt-1 inline-flex items-center gap-1">
                  {!v ? (
                    <>
                      <CircleDashed size={11} /> Sin valorizar
                    </>
                  ) : v.estado === "borrador" ? (
                    <>
                      <LockOpen size={11} /> Abierta
                    </>
                  ) : v.estado === "aprobada" ? (
                    <>
                      <CalendarCheck2 size={11} /> Registrada
                    </>
                  ) : (
                    <>
                      <Wallet size={11} /> Pagada
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {calcSel ? (
        <EditorSemana
          calc={calcSel}
          onReporte={() => setReporteId(calcSel.valorizacion.id)}
          // Mantener la semana a la vista después de registrarla, pagarla o reabrirla.
          onFijar={() => setCorteSel(calcSel.valorizacion.fechaCorte)}
        />
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-display text-lg font-semibold text-ink">
                Semana {numeroSemana(seleccionado, contrato.fechaInicio, diaCorte)} · del{" "}
                {fechaCorta(semanaDe(seleccionado).inicio)} al {fechaCorta(seleccionado)}
              </p>
              <p className="text-sm text-stone">
                Aún no valorizada. Se abrirá la valorización N°{" "}
                {String(serie.reduce((m, v) => Math.max(m, v.numero), 0) + 1).padStart(2, "0")} con el
                último avance registrado para que cargues lo ejecutado en la semana.
              </p>
              {seleccionado > hoy && (
                <p className="mt-1 text-xs text-stone">Es una semana en curso o futura: puedes adelantar el registro.</p>
              )}
            </div>
            <Button variant="primary" onClick={valorizar}>
              <Plus size={14} /> Valorizar esta semana
            </Button>
          </div>
          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Historial de pagos semanales" subtitle="Cada fila es una semana valorizada. Las registradas forman el avance real de la obra.">
          <HistorialPagos
            calculos={calculos}
            fechaInicio={contrato.fechaInicio}
            onVer={(id) => setReporteId(id)}
            onSelect={(c) => setCorteSel(c)}
          />
        </Card>
        <Card title="Neto pagado por semana" subtitle="Semanas registradas (S/)">
          <BarrasSimples
            data={calculos
              .filter((c) => c.valorizacion.estado !== "borrador")
              .map((c) => ({
                nombre: `S${numeroSemana(c.valorizacion.fechaCorte, contrato.fechaInicio, diaCorte)}`,
                valor: c.netoPeriodo,
              }))}
            valueLabel="Neto"
            valueFormatter={(v) => `S/ ${Math.round(v).toLocaleString("es-PE")}`}
            height={240}
          />
        </Card>
      </div>

      <DatosContrato contrato={contrato} ultimo={calculos[calculos.length - 1]} />
      <Movimientos contrato={contrato} calculos={calculos} />

      {reporte && <ReportePago calc={reporte} onClose={() => setReporteId(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EditorSemana({
  calc,
  onReporte,
  onFijar,
}: {
  calc: CalculoValorizacion;
  onReporte: () => void;
  onFijar: () => void;
}) {
  const { obra, update, replace, usuario } = useObra();
  const [modo, setModo] = useState<"semana" | "acumulado">("semana");
  const [fechaPago, setFechaPago] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);
  const v = calc.valorizacion;
  const bloqueada = v.estado !== "borrador";
  const cu = calc.contrato.costoUnitario;
  const semana = numeroSemana(v.fechaCorte, calc.contrato.fechaInicio, obra.config.diaCorte);
  const retrocesos = calc.lineas.filter((l) => l.periodo < -1e-9).length;
  const sugerida = amortizacionSugerida(calc);

  const setV = (fn: (x: Valorizacion) => void) =>
    update((d) => {
      const x = d.valorizaciones.find((y) => y.id === v.id);
      if (x) fn(x);
    });

  const setAcumulado = (bId: string, pId: string, valor: number) =>
    setV((x) => {
      x.avances[bId] = { ...(x.avances[bId] ?? {}), [pId]: clamp(Math.round(valor * 10) / 10, 0, 100) };
    });

  const accion = (fn: () => void) => {
    setError(null);
    onFijar();
    try {
      fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operación no válida");
    }
  };

  const registrar = () =>
    accion(() => {
      const msg =
        `¿Registrar la semana ${semana} (corte ${fechaCorta(v.fechaCorte)}) como avance real?\n\n` +
        `Valorizado de la semana: ${soles(calc.brutoPeriodo)}\nNeto a pagar: ${soles(calc.netoPeriodo)}\n` +
        (retrocesos ? `\n⚠ ${retrocesos} módulo(s) tienen menos avance que la semana anterior.\n` : "") +
        "\nQuedará bloqueada y con fecha y hora de registro.";
      if (!confirm(msg)) return;
      replace(registrarSemana(obra, v.id, usuario ?? undefined));
      onReporte();
    });

  const eliminar = () =>
    accion(() => {
      if (!confirm(`¿Eliminar la valorización abierta N° ${v.numero}?`)) return;
      update((d) => {
        d.valorizaciones = d.valorizaciones.filter((x) => x.id !== v.id);
        for (const c of d.contratos) for (const a of c.adelantos) delete a.amortizaciones[v.id];
      });
    });

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          Valorización N° {String(v.numero).padStart(2, "0")} · Semana {semana}
          <StatusBadge status={ESTADO[v.estado].status} label={ESTADO[v.estado].label} />
          {v.demo && <span className="text-xs font-normal text-stone">demo</span>}
        </span>
      }
      subtitle={
        <>
          Del {fechaCorta(v.semanaInicio ?? semanaDe(v.fechaCorte).inicio)} al {fechaCorta(v.fechaCorte)} ·{" "}
          {calc.contrato.subcontratista}
          {v.registradoEn && (
            <>
              {" "}· <b>registrada el {fechaHora(v.registradoEn)}</b>
              {v.registradoPor ? ` por ${v.registradoPor}` : ""}
            </>
          )}
          {v.fechaPago && <> · pagada el {fechaCorta(v.fechaPago)}</>}
        </>
      }
      actions={
        <>
          <Button onClick={onReporte}>
            <FileText size={14} /> {bloqueada ? "Reporte de pago" : "Vista previa del reporte"}
          </Button>
          {v.estado === "borrador" && (
            <>
              <Button variant="primary" onClick={registrar}>
                <Lock size={14} /> Registrar semana y generar pago
              </Button>
              <Button variant="danger" onClick={eliminar} aria-label="Eliminar semana abierta">
                <Trash2 size={14} />
              </Button>
            </>
          )}
          {v.estado === "aprobada" && (
            <>
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className={cn(inputBase, "w-40")}
                aria-label="Fecha de pago"
              />
              <Button
                variant="primary"
                onClick={() => accion(() => replace(marcarPagada(obra, v.id, fechaPago, usuario ?? undefined)))}
              >
                <Wallet size={14} /> Marcar pagada
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  accion(() => {
                    const motivo = prompt("Motivo de la reapertura (queda en la bitácora):");
                    if (!motivo) return;
                    replace(reabrirSemana(obra, v.id, usuario ?? undefined, motivo));
                  })
                }
              >
                <LockOpen size={14} /> Reabrir
              </Button>
            </>
          )}
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-line bg-bone p-0.5 text-xs font-medium">
          {(
            [
              ["semana", "Avance de la semana"],
              ["acumulado", "Avance acumulado"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setModo(id)}
              className={cn("rounded-full px-3 py-1", modo === id ? "bg-ink text-bone" : "text-ink/70")}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-stone">
          {modo === "semana"
            ? "Ingresa cuántos puntos (%) de cada partida se ejecutaron esta semana; se suman al acumulado anterior."
            : "Ingresa el % acumulado de cada partida al corte (como en el cuadro de valorización)."}
        </p>
      </div>

      {bloqueada && (
        <p className="mb-3 flex items-center gap-2 rounded-lg bg-bone px-3 py-2 text-xs text-stone">
          <Lock size={13} /> Semana registrada: el avance es oficial y no se puede editar.
          {v.estado === "aprobada" && " Si hay un error, reábrela (queda en la bitácora)."}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] border-collapse text-xs">
          <thead>
            <tr className="text-stone">
              <th className="sticky left-0 z-10 bg-paper px-2 py-1 text-left font-medium">Beneficiario</th>
              {obra.partidas.map((p) => (
                <th key={p.id} className="px-1 py-1 text-center font-medium" title={p.nombre}>
                  <div className="text-ink">{p.codigo}</div>
                  <div className="max-w-[72px] truncate">{p.nombre.split(" ")[0]}</div>
                  <div className="font-normal">{(p.peso * 100).toFixed(0)} %</div>
                </th>
              ))}
              <th className="px-2 py-1 text-right font-medium">Acumulado</th>
              <th className="px-2 py-1 text-right font-medium">Semana</th>
              <th className="px-2 py-1 text-right font-medium">Pago semana</th>
            </tr>
          </thead>
          <tbody>
            {calc.lineas.map((l) => {
              const ant = calc.anterior?.avances[l.beneficiario.id] ?? {};
              return (
                <tr key={l.beneficiario.id} className="border-b border-line/60">
                  <td className="sticky left-0 z-10 max-w-[200px] truncate bg-paper px-2 py-1 font-medium text-ink">
                    {l.beneficiario.n}. {l.beneficiario.apPaterno} {l.beneficiario.nombres.split(" ")[0]}
                    <span className="ml-1 text-stone">G{l.beneficiario.grupo}</span>
                  </td>
                  {obra.partidas.map((p) => {
                    const acum = l.avances[p.id] ?? 0;
                    const prev = ant[p.id] ?? 0;
                    const mostrado = modo === "semana" ? Math.round((acum - prev) * 10) / 10 : acum;
                    const lleno = prev >= 100;
                    return (
                      <td key={p.id} className="px-0.5 py-0.5">
                        <input
                          type="number"
                          min={modo === "semana" ? -prev : 0}
                          max={modo === "semana" ? 100 - prev : 100}
                          step={5}
                          disabled={bloqueada || (modo === "semana" && lleno)}
                          value={mostrado}
                          title={`${p.nombre}: anterior ${prev} % · acumulado ${acum} %`}
                          onChange={(e) => {
                            const n = Number(e.target.value) || 0;
                            setAcumulado(l.beneficiario.id, p.id, modo === "semana" ? prev + n : n);
                          }}
                          className={cn(
                            "w-full min-w-[52px] rounded border px-1 py-1 text-right tabular-nums outline-none focus:border-ink/50 disabled:opacity-60",
                            acum < prev
                              ? "border-red-300 bg-red-50"
                              : acum > prev
                                ? "border-line bg-[#2a78d6]/10"
                                : "border-line bg-paper",
                          )}
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-1 text-right font-semibold tabular-nums">{pct(l.acumulado)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{pct(l.periodo)}</td>
                  <td className="px-2 py-1 text-right font-semibold tabular-nums">{soles(l.montoPeriodo)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-stone">
        Celda azul: avanzó esta semana · roja: menos que la semana anterior (revisar metrado).
        {modo === "semana" && " Las partidas ya completas al 100 % quedan bloqueadas."}
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-bone/40 p-4 text-sm">
          <h4 className="mb-2 font-display font-semibold text-ink">Liquidación de la semana</h4>
          <Linea label="Valorizado acumulado" value={calc.brutoAcumulado} />
          <Linea label="(−) Valorizado anterior" value={calc.brutoAcumulado - calc.brutoPeriodo} />
          <Linea label="Valorizado de la semana" value={calc.brutoPeriodo} bold />
          <Linea label="(+) Obras adicionales de la semana" value={calc.adicionalesPeriodo} />
          <Linea label="(−) Amortización de adelantos" value={-calc.amortizacionPeriodo} />
          <Linea label="(−) Otros descuentos" value={-calc.descuentosPeriodo} />
          <div className="my-2 border-t border-line" />
          <Linea label="Neto a pagar" value={calc.netoPeriodo} bold />
          <Linea label="Saldo de adelantos por amortizar" value={calc.saldoAdelantos} muted />
          <Linea label="Saldo del contrato por valorizar" value={calc.saldoPorValorizar} muted />
          <p className="mt-2 text-xs text-stone">Costo unitario: {soles(cu)} por módulo.</p>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-line bg-bone/40 p-4 text-sm">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="font-display font-semibold text-ink">Descuento de adelantos</h4>
              {!bloqueada && calc.contrato.adelantos.length === 1 && sugerida > 0 && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    update((d) => {
                      const a = d.contratos.find((c) => c.id === calc.contrato.id)?.adelantos[0];
                      if (a) a.amortizaciones[v.id] = sugerida;
                    })
                  }
                >
                  Aplicar sugerido ({soles(sugerida)})
                </Button>
              )}
            </div>
            {calc.contrato.adelantos.length === 0 ? (
              <p className="text-xs text-stone">Sin adelantos en el contrato.</p>
            ) : (
              calc.contrato.adelantos.map((a) => (
                <div key={a.id} className="mb-2 grid grid-cols-[1fr_130px] items-center gap-2">
                  <span className="text-xs text-ink">
                    {a.descripcion} <span className="text-stone">({soles(a.monto)})</span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    disabled={bloqueada}
                    className={inputClass}
                    value={a.amortizaciones[v.id] ?? 0}
                    onChange={(e) =>
                      update((d) => {
                        const ad = d.contratos
                          .find((c) => c.id === calc.contrato.id)
                          ?.adelantos.find((x) => x.id === a.id);
                        if (ad) ad.amortizaciones[v.id] = Math.max(0, Number(e.target.value) || 0);
                      })
                    }
                  />
                </div>
              ))
            )}
            {calc.contrato.adelantos.length > 1 && sugerida > 0 && (
              <p className="text-xs text-stone">Sugerido total (proporcional al avance): {soles(sugerida)}</p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-display font-semibold text-ink">Otros descuentos</h4>
              {!bloqueada && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    setV((x) => {
                      x.descuentos = [
                        ...(x.descuentos ?? []),
                        { id: uid("d"), descripcion: "Descuento", fecha: x.fechaCorte, monto: 0 },
                      ];
                    })
                  }
                >
                  <Plus size={14} /> Agregar
                </Button>
              )}
            </div>
            {(v.descuentos ?? []).length === 0 && (
              <p className="text-xs text-stone">Herramientas, multas, retenciones, etc.</p>
            )}
            {(v.descuentos ?? []).map((d, k) => (
              <div key={d.id} className="mb-2 grid grid-cols-[1fr_120px_auto] items-center gap-2">
                <input
                  className={inputClass}
                  disabled={bloqueada}
                  value={d.descripcion}
                  onChange={(e) => setV((x) => void (x.descuentos![k].descripcion = e.target.value))}
                />
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  disabled={bloqueada}
                  value={d.monto}
                  onChange={(e) => setV((x) => void (x.descuentos![k].monto = Math.max(0, Number(e.target.value) || 0)))}
                />
                {!bloqueada && (
                  <Button variant="ghost" onClick={() => setV((x) => void x.descuentos!.splice(k, 1))} aria-label="Quitar descuento">
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Field label="Observaciones de la semana">
            <textarea
              rows={2}
              className={inputClass}
              disabled={bloqueada}
              value={v.observaciones ?? ""}
              onChange={(e) => setV((x) => void (x.observaciones = e.target.value || undefined))}
            />
          </Field>

          {(v.bitacora ?? []).length > 0 && (
            <div>
              <h4 className="mb-1 font-display font-semibold text-ink">Bitácora</h4>
              <ul className="space-y-0.5 text-xs text-stone">
                {v.bitacora!.map((b, k) => (
                  <li key={k}>
                    {fechaHora(b.en)} · <b className="text-ink">{b.accion}</b>
                    {b.por ? ` por ${b.por}` : ""}
                    {b.nota ? ` — ${b.nota}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function HistorialPagos({
  calculos,
  fechaInicio,
  onVer,
  onSelect,
}: {
  calculos: CalculoValorizacion[];
  fechaInicio: ISODate;
  onVer: (id: string) => void;
  onSelect: (corte: ISODate) => void;
}) {
  const { obra } = useObra();
  if (!calculos.length) return <p className="py-6 text-center text-sm text-stone">Aún no hay semanas valorizadas.</p>;
  const pagado = calculos.filter((c) => c.valorizacion.estado === "pagada").reduce((s, c) => s + c.netoPeriodo, 0);
  const porPagar = calculos.filter((c) => c.valorizacion.estado === "aprobada").reduce((s, c) => s + c.netoPeriodo, 0);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-sm">
        <span>Pagado: <b className="tabular-nums">{soles(pagado)}</b></span>
        <span>Registrado por pagar: <b className="tabular-nums">{soles(porPagar)}</b></span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-stone">
              <th className="py-2 pr-2 font-medium">N°</th>
              <th className="py-2 pr-2 font-medium">Semana</th>
              <th className="py-2 pr-2 font-medium">Estado</th>
              <th className="py-2 pr-2 text-right font-medium">Avance</th>
              <th className="py-2 pr-2 text-right font-medium">Valorizado</th>
              <th className="py-2 pr-2 text-right font-medium">Descuentos</th>
              <th className="py-2 pr-2 text-right font-medium">Neto</th>
              <th className="py-2 pr-2 font-medium">Registrado</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {[...calculos].reverse().map((c) => {
              const v = c.valorizacion;
              return (
                <tr key={v.id} className="border-b border-line/60 hover:bg-bone">
                  <td className="py-2 pr-2 font-semibold">{String(v.numero).padStart(2, "0")}</td>
                  <td className="py-2 pr-2">
                    <button type="button" onClick={() => onSelect(v.fechaCorte)} className="text-left hover:text-clay">
                      S{numeroSemana(v.fechaCorte, fechaInicio, obra.config.diaCorte)} · al {fechaCorta(v.fechaCorte)}
                    </button>
                  </td>
                  <td className="py-2 pr-2">
                    <StatusBadge status={ESTADO[v.estado].status} label={ESTADO[v.estado].label} />
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">{pct(c.avanceContrato)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{soles(c.brutoPeriodo)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{soles(c.amortizacionPeriodo + c.descuentosPeriodo)}</td>
                  <td className="py-2 pr-2 text-right font-semibold tabular-nums">{soles(c.netoPeriodo)}</td>
                  <td className="py-2 pr-2 text-xs text-stone">
                    {v.registradoEn ? fechaHora(v.registradoEn) : "—"}
                    {v.fechaPago && <div>pagado {fechaCorta(v.fechaPago)}</div>}
                  </td>
                  <td className="py-2 text-right">
                    <Button variant="ghost" onClick={() => onVer(v.id)} aria-label="Ver reporte de pago">
                      <FileText size={14} />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Linea({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean }) {
  return (
    <div className={cn("flex justify-between py-0.5", bold && "font-semibold text-ink", muted && "text-stone")}>
      <span>{label}</span>
      <span className="tabular-nums">{soles(value)}</span>
    </div>
  );
}
