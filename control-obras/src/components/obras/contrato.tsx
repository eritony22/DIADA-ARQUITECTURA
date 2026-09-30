"use client";

import { Plus, Trash2 } from "lucide-react";
import type { Contrato } from "@/types/obras";
import { soles, type CalculoValorizacion } from "@/lib/obras/calc";
import { uid } from "@/lib/obras/ops";
import { useObra } from "./obra-context";
import { Button, Card, Field, inputClass } from "./ui";

export function DatosContrato({ contrato, ultimo }: { contrato: Contrato; ultimo?: CalculoValorizacion }) {
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

export function Movimientos({ contrato, calculos }: { contrato: Contrato; calculos: CalculoValorizacion[] }) {
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
