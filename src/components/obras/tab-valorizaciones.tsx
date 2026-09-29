"use client";

import { useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import type { Contrato, EstadoValorizacion, ObraState } from "@/types/obras";
import {
  calcularValorizacion,
  clamp,
  fechaCorta,
  pct,
  soles,
  valorizacionesDeContrato,
  type CalculoValorizacion,
} from "@/lib/obras/calc";
import { nuevaValorizacion, uid } from "@/lib/obras/ops";
import { useObra } from "./obra-context";
import { BarrasSimples } from "./charts";
import { VALORIZACION_LABEL } from "./labels";
import { Button, Card, EmptyState, Field, StatusBadge, inputBase, inputClass } from "./ui";
import { cn } from "@/lib/cn";

export default function TabValorizaciones() {
  const { obra, replace, fecha } = useObra();
  const contratos = obra.contratos.filter((c) => c.beneficiarioIds.length);
  const [contratoId, setContratoId] = useState<string>(contratos[0]?.id ?? "");
  const contrato = obra.contratos.find((c) => c.id === contratoId) ?? contratos[0];
  const serie = contrato ? valorizacionesDeContrato(contrato.id, obra.valorizaciones) : [];
  const [valId, setValId] = useState<string | null>(serie[serie.length - 1]?.id ?? null);
  const [nuevaFecha, setNuevaFecha] = useState(fecha);

  const calculos = serie
    .map((v) => calcularValorizacion(v, obra))
    .filter((c): c is CalculoValorizacion => Boolean(c));

  if (!contrato) {
    return (
      <EmptyState title="No hay contratos con beneficiarios">
        Importa la lista oficial en Parámetros y datos: cada familia se asigna al contrato de su
        entidad técnica.
      </EmptyState>
    );
  }

  const actual = calculos.find((c) => c.valorizacion.id === valId) ?? calculos[calculos.length - 1];
  const ultimo = calculos[calculos.length - 1];

  const crear = () => {
    const { state, id } = nuevaValorizacion(obra, contrato.id, nuevaFecha);
    replace(state);
    setValId(id);
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
              setValId(null);
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

      <DatosContrato contrato={contrato} ultimo={ultimo} />

      <div className="grid gap-5 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Valorizaciones del contrato"
          actions={
            <>
              <input
                type="date"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
                className={cn(inputBase, "w-40")}
                aria-label="Fecha de corte de la nueva valorización"
              />
              <Button variant="primary" onClick={crear} disabled={!nuevaFecha}>
                <Plus size={14} /> Nueva valorización
              </Button>
            </>
          }
        >
          {calculos.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone">
              Sin valorizaciones. Elige la fecha de corte y crea la N° 01.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-stone">
                    <th className="py-2 pr-2 font-medium">N°</th>
                    <th className="py-2 pr-2 font-medium">Corte</th>
                    <th className="py-2 pr-2 font-medium">Estado</th>
                    <th className="py-2 pr-2 text-right font-medium">Avance</th>
                    <th className="py-2 pr-2 text-right font-medium">Bruto período</th>
                    <th className="py-2 pr-2 text-right font-medium">Amortización</th>
                    <th className="py-2 pr-2 text-right font-medium">Neto a pagar</th>
                    <th className="py-2 text-right font-medium">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {calculos.map((c) => (
                    <tr
                      key={c.valorizacion.id}
                      onClick={() => setValId(c.valorizacion.id)}
                      className={cn(
                        "cursor-pointer border-b border-line/60 hover:bg-bone",
                        actual?.valorizacion.id === c.valorizacion.id && "bg-bone",
                      )}
                    >
                      <td className="py-2 pr-2 font-semibold">
                        {String(c.valorizacion.numero).padStart(2, "0")}
                        {c.valorizacion.demo && <span className="ml-1 text-[0.6rem] text-stone">demo</span>}
                      </td>
                      <td className="py-2 pr-2 tabular-nums">{fechaCorta(c.valorizacion.fechaCorte)}</td>
                      <td className="py-2 pr-2">
                        <StatusBadge
                          status={c.valorizacion.estado === "borrador" ? "warning" : "good"}
                          label={VALORIZACION_LABEL[c.valorizacion.estado]}
                        />
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">{pct(c.avanceContrato)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{soles(c.brutoPeriodo)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{soles(c.amortizacionPeriodo)}</td>
                      <td className="py-2 pr-2 text-right font-semibold tabular-nums">{soles(c.netoPeriodo)}</td>
                      <td className="py-2 text-right tabular-nums">{soles(c.brutoAcumulado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Monto valorizado por período" subtitle="Bruto de cada valorización (S/)">
          <BarrasSimples
            data={calculos.map((c) => ({
              nombre: `N° ${String(c.valorizacion.numero).padStart(2, "0")}`,
              valor: c.brutoPeriodo,
            }))}
            valueLabel="Bruto"
            valueFormatter={(v) => `S/ ${Math.round(v).toLocaleString("es-PE")}`}
            height={220}
          />
        </Card>
      </div>

      {actual && <EditorValorizacion calc={actual} onDeleted={() => setValId(null)} />}

      <Movimientos contrato={contrato} calculos={calculos} />
    </div>
  );
}

function DatosContrato({ contrato, ultimo }: { contrato: Contrato; ultimo?: CalculoValorizacion }) {
  const { update } = useObra();
  const set = (patch: Partial<Contrato>) =>
    update((d) => {
      const c = d.contratos.find((x) => x.id === contrato.id);
      if (c) Object.assign(c, patch);
    });
  const n = contrato.beneficiarioIds.length;
  const adicionales = contrato.adicionales.reduce((s, a) => s + a.monto, 0);
  const adelantos = contrato.adelantos.reduce((s, a) => s + a.monto, 0);
  return (
    <Card title="Datos del contrato">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Subcontratista">
          <input className={inputClass} value={contrato.subcontratista} onChange={(e) => set({ subcontratista: e.target.value })} />
        </Field>
        <Field label="Costo unitario por módulo (S/)">
          <input
            type="number"
            min={0}
            step={50}
            className={inputClass}
            value={contrato.costoUnitario}
            onChange={(e) => set({ costoUnitario: Math.max(0, Number(e.target.value) || 0) })}
          />
        </Field>
        <Field label="Inicio de obra">
          <input type="date" className={inputClass} value={contrato.fechaInicio} onChange={(e) => e.target.value && set({ fechaInicio: e.target.value })} />
        </Field>
        <Field label="Plazo (días)">
          <input
            type="number"
            min={1}
            className={inputClass}
            value={contrato.plazoDias}
            onChange={(e) => set({ plazoDias: Math.max(1, Math.round(Number(e.target.value) || 1)) })}
          />
        </Field>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-3 xl:grid-cols-6">
        <Mini label="N° de módulos contratados" value={String(n)} />
        <Mini label="Monto del contrato" value={soles(n * contrato.costoUnitario)} />
        <Mini label="Obras adicionales" value={soles(adicionales)} />
        <Mini label="Adelantos otorgados" value={soles(adelantos)} />
        <Mini label="Valorizado acumulado" value={soles(ultimo?.brutoAcumulado ?? 0)} />
        <Mini label="Saldo por valorizar" value={soles(ultimo?.saldoPorValorizar ?? n * contrato.costoUnitario)} />
      </div>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-bone/50 p-2.5">
      <p className="text-[0.65rem] uppercase tracking-wide text-stone">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}

function EditorValorizacion({ calc, onDeleted }: { calc: CalculoValorizacion; onDeleted: () => void }) {
  const { obra, update } = useObra();
  const v = calc.valorizacion;
  const cu = calc.contrato.costoUnitario;
  const bloqueada = v.estado === "pagada";

  const setV = (fn: (x: ObraState["valorizaciones"][number]) => void) =>
    update((d) => {
      const x = d.valorizaciones.find((y) => y.id === v.id);
      if (x) fn(x);
    });

  const setAvance = (bId: string, pId: string, valor: number) =>
    setV((x) => {
      x.avances[bId] = { ...(x.avances[bId] ?? {}), [pId]: clamp(Math.round(valor * 10) / 10, 0, 100) };
    });

  const eliminar = () => {
    if (!confirm(`¿Eliminar la valorización N° ${v.numero}? Esta acción no se puede deshacer.`)) return;
    update((d) => {
      d.valorizaciones = d.valorizaciones.filter((x) => x.id !== v.id);
      for (const c of d.contratos) for (const a of c.adelantos) delete a.amortizaciones[v.id];
    });
    onDeleted();
  };

  return (
    <Card
      title={`Valorización N° ${String(v.numero).padStart(2, "0")} — ${calc.contrato.subcontratista}`}
      subtitle={`Corte al ${fechaCorta(v.fechaCorte)} · avance ACUMULADO por partida (% de la partida). Anterior: ${calc.anterior ? `N° ${calc.anterior.numero} (${fechaCorta(calc.anterior.fechaCorte)})` : "—"}`}
      actions={
        <>
          <select
            value={v.estado}
            onChange={(e) => setV((x) => void (x.estado = e.target.value as EstadoValorizacion))}
            className={cn(inputBase, "w-32")}
          >
            {Object.entries(VALORIZACION_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={v.fechaCorte}
            disabled={bloqueada}
            onChange={(e) => e.target.value && setV((x) => void (x.fechaCorte = e.target.value))}
            className={cn(inputBase, "w-40")}
          />
          <Button onClick={() => exportarCsv(calc, obra)}>
            <Download size={14} /> CSV
          </Button>
          <Button variant="danger" onClick={eliminar} disabled={bloqueada}>
            <Trash2 size={14} />
          </Button>
        </>
      }
    >
      {bloqueada && (
        <p className="mb-3 rounded-lg bg-bone px-3 py-2 text-xs text-stone">
          Valorización pagada: los metrados quedan bloqueados. Cambia el estado para editarla.
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
                </th>
              ))}
              <th className="px-2 py-1 text-right font-medium">Total avance</th>
              <th className="px-2 py-1 text-right font-medium">Período</th>
              <th className="px-2 py-1 text-right font-medium">Parcial S/</th>
            </tr>
            <tr className="border-b border-line bg-bone/60 text-stone">
              <td className="sticky left-0 z-10 bg-bone px-2 py-1">Peso · monto por partida</td>
              {obra.partidas.map((p) => (
                <td key={p.id} className="px-1 py-1 text-center tabular-nums">
                  {(p.peso * 100).toFixed(0)} %<div>{Math.round(p.peso * cu).toLocaleString("es-PE")}</div>
                </td>
              ))}
              <td className="px-2 py-1 text-right">100 %</td>
              <td />
              <td className="px-2 py-1 text-right tabular-nums">{soles(cu)}</td>
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
                    const val = l.avances[p.id] ?? 0;
                    const prev = ant[p.id] ?? 0;
                    return (
                      <td key={p.id} className="px-0.5 py-0.5">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={5}
                          disabled={bloqueada}
                          value={val}
                          title={`${p.nombre}: anterior ${prev} %`}
                          onChange={(e) => setAvance(l.beneficiario.id, p.id, Number(e.target.value) || 0)}
                          className={cn(
                            "w-full min-w-[52px] rounded border px-1 py-1 text-right tabular-nums outline-none focus:border-ink/50",
                            val < prev
                              ? "border-red-300 bg-red-50"
                              : val > prev
                                ? "border-line bg-[#2a78d6]/10"
                                : "border-line bg-paper",
                          )}
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-1 text-right font-semibold tabular-nums">{pct(l.acumulado)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{pct(l.periodo)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{soles(l.montoAcumulado)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-stone">
        Celda azul: avanzó respecto a la valorización anterior · roja: retrocedió (revisar metrado).
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-bone/40 p-4 text-sm">
          <h4 className="mb-2 font-display font-semibold text-ink">Resumen de pago</h4>
          <Linea label="Valorizado acumulado" value={calc.brutoAcumulado} />
          <Linea label="(−) Valorizado anterior" value={calc.brutoAcumulado - calc.brutoPeriodo} />
          <Linea label="Valorizado del período" value={calc.brutoPeriodo} bold />
          <Linea label="(+) Obras adicionales del período" value={calc.adicionalesPeriodo} />
          <Linea label="(−) Amortización de adelantos" value={-calc.amortizacionPeriodo} />
          <div className="my-2 border-t border-line" />
          <Linea label="Neto a pagar" value={calc.netoPeriodo} bold />
          <Linea label="Saldo de adelantos por amortizar" value={calc.saldoAdelantos} muted />
          <Linea label="Saldo del contrato por valorizar" value={calc.saldoPorValorizar} muted />
        </div>
        <div className="rounded-xl border border-line bg-bone/40 p-4 text-sm">
          <h4 className="mb-2 font-display font-semibold text-ink">Descuento de adelantos en esta valorización</h4>
          {calc.contrato.adelantos.length === 0 ? (
            <p className="text-xs text-stone">Sin adelantos registrados en el contrato.</p>
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
          {calc.contrato.adelantos.length > 0 && calc.saldoAdelantos > 0 && (
            <p className="mt-2 text-xs text-stone">
              Sugerido (proporcional al avance del período):{" "}
              <b className="text-ink">
                {soles(
                  Math.min(
                    calc.saldoAdelantos + calc.amortizacionPeriodo,
                    (calc.brutoPeriodo / Math.max(1, calc.lineas.length * calc.contrato.costoUnitario)) *
                      calc.contrato.adelantos.reduce((s, a) => s + a.monto, 0),
                  ),
                )}
              </b>
            </p>
          )}
          <Field label="Observaciones" className="mt-3">
            <textarea
              rows={2}
              className={inputClass}
              value={v.observaciones ?? ""}
              onChange={(e) => setV((x) => void (x.observaciones = e.target.value || undefined))}
            />
          </Field>
        </div>
      </div>
    </Card>
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

function Movimientos({ contrato, calculos }: { contrato: Contrato; calculos: CalculoValorizacion[] }) {
  const { update, fecha } = useObra();
  const mut = (fn: (c: Contrato) => void) =>
    update((d) => {
      const c = d.contratos.find((x) => x.id === contrato.id);
      if (c) fn(c);
    });

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card
        title="Adelantos (materiales / efectivo)"
        subtitle="Se descuentan en las valorizaciones (DES. N° 01, 02…)."
        actions={
          <Button
            onClick={() =>
              mut((c) =>
                c.adelantos.push({
                  id: uid("a"),
                  descripcion: "Adelanto de materiales",
                  fecha,
                  monto: 0,
                  tipo: "materiales",
                  amortizaciones: {},
                }),
              )
            }
          >
            <Plus size={14} /> Agregar
          </Button>
        }
      >
        {contrato.adelantos.length === 0 && <p className="text-sm text-stone">Sin adelantos.</p>}
        {contrato.adelantos.map((a, k) => {
          const amortizado = Object.values(a.amortizaciones).reduce((s, m) => s + m, 0);
          return (
            <div key={a.id} className="mb-3 rounded-xl border border-line p-3">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-[1fr_120px_110px_120px_auto]">
                <input className={inputClass} value={a.descripcion} onChange={(e) => mut((c) => void (c.adelantos[k].descripcion = e.target.value))} />
                <select className={inputClass} value={a.tipo} onChange={(e) => mut((c) => void (c.adelantos[k].tipo = e.target.value as "materiales" | "efectivo"))}>
                  <option value="materiales">Materiales</option>
                  <option value="efectivo">Efectivo</option>
                </select>
                <input type="date" className={inputClass} value={a.fecha} onChange={(e) => e.target.value && mut((c) => void (c.adelantos[k].fecha = e.target.value))} />
                <input type="number" min={0} className={inputClass} value={a.monto} onChange={(e) => mut((c) => void (c.adelantos[k].monto = Math.max(0, Number(e.target.value) || 0)))} />
                <Button variant="ghost" onClick={() => mut((c) => void c.adelantos.splice(k, 1))} aria-label="Eliminar adelanto">
                  <Trash2 size={14} />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[0.7rem] text-stone">
                {calculos.map((c) => (
                  <span key={c.valorizacion.id} className="rounded-full bg-bone px-2 py-0.5">
                    DES. N° {String(c.valorizacion.numero).padStart(2, "0")}: {soles(a.amortizaciones[c.valorizacion.id] ?? 0)}
                  </span>
                ))}
                <span className="rounded-full bg-bone px-2 py-0.5 font-semibold text-ink">
                  Saldo: {soles(a.monto - amortizado)}
                </span>
              </div>
            </div>
          );
        })}
      </Card>
      <Card
        title="Obras adicionales"
        subtitle="Se suman a la valorización cuyo período contiene la fecha."
        actions={
          <Button
            onClick={() =>
              mut((c) => c.adicionales.push({ id: uid("ad"), descripcion: "Adicional", fecha, monto: 0 }))
            }
          >
            <Plus size={14} /> Agregar
          </Button>
        }
      >
        {contrato.adicionales.length === 0 && <p className="text-sm text-stone">Sin adicionales.</p>}
        {contrato.adicionales.map((a, k) => (
          <div key={a.id} className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-[1fr_140px_120px_auto]">
            <input className={inputClass} value={a.descripcion} onChange={(e) => mut((c) => void (c.adicionales[k].descripcion = e.target.value))} />
            <input type="date" className={inputClass} value={a.fecha} onChange={(e) => e.target.value && mut((c) => void (c.adicionales[k].fecha = e.target.value))} />
            <input type="number" className={inputClass} value={a.monto} onChange={(e) => mut((c) => void (c.adicionales[k].monto = Number(e.target.value) || 0))} />
            <Button variant="ghost" onClick={() => mut((c) => void c.adicionales.splice(k, 1))} aria-label="Eliminar adicional">
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </Card>
    </div>
  );
}

/** Exporta la valorización en el mismo orden de columnas que el cuadro Excel. */
function exportarCsv(calc: CalculoValorizacion, obra: ObraState) {
  const sep = ";";
  const num = (n: number, d = 2) => n.toFixed(d).replace(".", ",");
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const v = calc.valorizacion;
  const lines: string[] = [];
  lines.push(esc(`VALORIZACIÓN N° ${String(v.numero).padStart(2, "0")} — ${obra.config.nombre}`));
  lines.push([esc("SUBCONTRATISTA"), esc(calc.contrato.subcontratista), esc("FECHA"), esc(fechaCorta(v.fechaCorte)), esc("COSTO UNITARIO"), num(calc.contrato.costoUnitario)].join(sep));
  lines.push("");
  lines.push(
    ["N°", "GRUPO", "AP. PATERNO", "AP. MATERNO", "NOMBRES", "DIRECCION", ...obra.partidas.map((p) => p.nombre.toUpperCase()), "TOTAL AVANCE", "PARCIAL S/."]
      .map(esc)
      .join(sep),
  );
  lines.push(["", "", "", "", "", esc("PESO"), ...obra.partidas.map((p) => num(p.peso, 4)), num(1, 4), ""].join(sep));
  calc.lineas.forEach((l, k) => {
    const b = l.beneficiario;
    lines.push(
      [
        String(k + 1),
        String(b.grupo),
        esc(b.apPaterno),
        esc(b.apMaterno),
        esc(b.nombres),
        esc(b.direccion),
        ...obra.partidas.map((p) => num((p.peso * (l.avances[p.id] ?? 0)) / 100, 4)),
        num(l.acumulado, 4),
        num(l.montoAcumulado),
      ].join(sep),
    );
  });
  lines.push("");
  lines.push([esc("VALORIZADO ACUMULADO"), num(calc.brutoAcumulado)].join(sep));
  lines.push([esc("VALORIZADO DEL PERÍODO"), num(calc.brutoPeriodo)].join(sep));
  lines.push([esc("ADICIONALES DEL PERÍODO"), num(calc.adicionalesPeriodo)].join(sep));
  lines.push([esc("AMORTIZACIÓN DE ADELANTOS"), num(calc.amortizacionPeriodo)].join(sep));
  lines.push([esc("NETO A PAGAR"), num(calc.netoPeriodo)].join(sep));
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `valorizacion-${calc.contrato.entidadId}-${String(v.numero).padStart(2, "0")}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
