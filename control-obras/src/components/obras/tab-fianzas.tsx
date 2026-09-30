"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EstadoFianza, Fianza, TipoFianza } from "@/types/obras";
import { addDays, diffDays, soles, type Semaforo } from "@/lib/obras/calc";
import { uid } from "@/lib/obras/ops";
import { useObra } from "./obra-context";
import { Gantt } from "./gantt";
import { ESTADO_FIANZA_LABEL, TIPO_FIANZA_LABEL } from "./labels";
import { AXIS_PROPS, Button, Card, ChartTooltip, EmptyState, Kpi, Legend, StatusBadge, VIZ, inputClass } from "./ui";

const ETAPAS_GARANTIA = ["garantia", "desembolso", "ejecucion", "verificacion"];

export default function TabFianzas() {
  const { obra, update, fecha } = useObra();
  const cfg = obra.config;

  const estadoVigencia = (f: Fianza): { s: Semaforo; label: string; dias: number } => {
    const dias = diffDays(f.fechaVencimiento, fecha);
    if (f.estado === "liberada" || f.estado === "ejecutada")
      return { s: "neutral", label: ESTADO_FIANZA_LABEL[f.estado], dias };
    if (dias < 0) return { s: "critical", label: `Vencida hace ${-dias} d`, dias };
    if (dias <= 15) return { s: "serious", label: `Vence en ${dias} d`, dias };
    if (dias <= cfg.diasAvisoFianza) return { s: "warning", label: `Vence en ${dias} d`, dias };
    return { s: "good", label: `Vigente (${dias} d)`, dias };
  };

  const activas = obra.fianzas.filter((f) => f.estado === "vigente" || f.estado === "renovada");
  const vigentes = activas.filter((f) => f.fechaVencimiento >= fecha);
  const porVencer = vigentes.filter((f) => diffDays(f.fechaVencimiento, fecha) <= cfg.diasAvisoFianza);
  const vencidas = activas.filter((f) => f.fechaVencimiento < fecha);

  const cobertura = obra.entidades.map((e) => {
    const familias = obra.beneficiarios.filter(
      (b) => b.entidadId === e.id && ETAPAS_GARANTIA.includes(b.etapa),
    ).length;
    return {
      nombre: e.sigla,
      Requerido: Math.round(familias * (cfg.valorBfh + cfg.ahorroFamilia) * cfg.coberturaGarantia),
      Vigente: vigentes.filter((f) => f.entidadId === e.id).reduce((s, f) => s + f.monto, 0),
      familias,
    };
  });

  const mut = (id: string, fn: (f: Fianza) => void) =>
    update((d) => {
      const f = d.fianzas.find((x) => x.id === id);
      if (f) fn(f);
    });

  const agregar = () =>
    update((d) =>
      d.fianzas.push({
        id: uid("f"),
        numero: "",
        entidadId: d.entidades[0]?.id ?? "",
        emisor: "",
        tipo: "bfh",
        monto: 0,
        fechaEmision: fecha,
        fechaVencimiento: addDays(fecha, 90),
        beneficiarioIds: [],
        estado: "vigente",
      }),
    );

  const fechasGantt = obra.fianzas.flatMap((f) => [f.fechaEmision, f.fechaVencimiento]).concat(fecha);
  const desde = fechasGantt.reduce((m, d) => (d < m ? d : m), fecha);
  const hasta = addDays(fechasGantt.reduce((m, d) => (d > m ? d : m), fecha), 7);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Cartas vigentes" value={String(vigentes.length)} hint={soles(vigentes.reduce((s, f) => s + f.monto, 0))} />
        <Kpi label={`Por vencer (≤ ${cfg.diasAvisoFianza} días)`} value={String(porVencer.length)} status={porVencer.length ? "warning" : "good"} />
        <Kpi label="Vencidas sin renovar" value={String(vencidas.length)} status={vencidas.length ? "critical" : "good"} />
        <Kpi
          label="Cobertura exigida"
          value={`${(cfg.coberturaGarantia * 100).toFixed(0)} %`}
          hint={<>de BFH + ahorro ({soles(cfg.valorBfh + cfg.ahorroFamilia)} por familia)</>}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card
          title="Cobertura de garantías por entidad técnica"
          subtitle="Requerido = familias en etapa de garantía, desembolso, ejecución o verificación × (BFH + ahorro) × cobertura."
        >
          <Legend items={[{ label: "Requerido", color: VIZ.programado }, { label: "Vigente", color: VIZ.series[0] }]} />
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cobertura} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barGap={2}>
                <CartesianGrid stroke={VIZ.grid} vertical={false} />
                <XAxis dataKey="nombre" {...AXIS_PROPS} />
                <YAxis {...AXIS_PROPS} width={70} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <Tooltip
                  cursor={{ fill: "rgba(11,11,13,0.04)" }}
                  content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} valueFormatter={(v) => soles(v)} />}
                />
                <Bar dataKey="Requerido" fill={VIZ.programado} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                <Bar dataKey="Vigente" fill={VIZ.series[0]} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Línea de tiempo de vigencias">
          {obra.fianzas.length === 0 ? (
            <p className="py-10 text-center text-sm text-stone">Sin cartas fianza registradas.</p>
          ) : (
            <Gantt
              rows={obra.fianzas.map((f) => {
                const e = estadoVigencia(f);
                return {
                  id: f.id,
                  label: `${f.entidadId} · N° ${f.numero || "s/n"}`,
                  sublabel: `${f.emisor || "emisor"} · ${soles(f.monto)}`,
                  bars: [
                    {
                      desde: f.fechaEmision,
                      hasta: f.fechaVencimiento,
                      color: VIZ.status[e.s],
                      titulo: e.label,
                    },
                  ],
                };
              })}
              desde={desde}
              hasta={hasta}
              labelWidth={170}
              markers={[{ fecha, label: "Fecha de corte", color: VIZ.textSecondary }]}
            />
          )}
        </Card>
      </div>

      <Card
        title="Registro de cartas fianza"
        subtitle="Cada carta puede cubrir a una o varias familias. Las alertas de vencimiento y cobertura aparecen en Diagnóstico."
        actions={
          <Button variant="primary" onClick={agregar}>
            <Plus size={14} /> Nueva carta fianza
          </Button>
        }
      >
        {obra.fianzas.length === 0 ? (
          <EmptyState title="Aún no hay cartas fianza">
            Registra número, emisor (banco, aseguradora o FOGAPI), monto y vigencia de cada garantía
            de {obra.entidades.map((e) => e.razonSocial).join(" e ")}.
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-3">
            {obra.fianzas.map((f) => {
              const e = estadoVigencia(f);
              const deEntidad = obra.beneficiarios.filter((b) => b.entidadId === f.entidadId);
              return (
                <div key={f.id} className="rounded-xl border border-line p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={e.s} label={e.label} />
                    <Button
                      variant="ghost"
                      onClick={() => update((d) => void (d.fianzas = d.fianzas.filter((x) => x.id !== f.id)))}
                      aria-label="Eliminar carta fianza"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
                    <Campo label="N° de carta">
                      <input className={inputClass} value={f.numero} onChange={(ev) => mut(f.id, (x) => void (x.numero = ev.target.value))} />
                    </Campo>
                    <Campo label="Entidad técnica">
                      <select className={inputClass} value={f.entidadId} onChange={(ev) => mut(f.id, (x) => { x.entidadId = ev.target.value; x.beneficiarioIds = []; })}>
                        {obra.entidades.map((en) => (
                          <option key={en.id} value={en.id}>{en.sigla}</option>
                        ))}
                      </select>
                    </Campo>
                    <Campo label="Emisor">
                      <input className={inputClass} value={f.emisor} onChange={(ev) => mut(f.id, (x) => void (x.emisor = ev.target.value))} />
                    </Campo>
                    <Campo label="Tipo">
                      <select className={inputClass} value={f.tipo} onChange={(ev) => mut(f.id, (x) => void (x.tipo = ev.target.value as TipoFianza))}>
                        {Object.entries(TIPO_FIANZA_LABEL).map(([k, l]) => (
                          <option key={k} value={k}>{l}</option>
                        ))}
                      </select>
                    </Campo>
                    <Campo label="Monto (S/)">
                      <input type="number" min={0} className={inputClass} value={f.monto} onChange={(ev) => mut(f.id, (x) => void (x.monto = Math.max(0, Number(ev.target.value) || 0)))} />
                    </Campo>
                    <Campo label="Emisión">
                      <input type="date" className={inputClass} value={f.fechaEmision} onChange={(ev) => ev.target.value && mut(f.id, (x) => void (x.fechaEmision = ev.target.value))} />
                    </Campo>
                    <Campo label="Vencimiento">
                      <input type="date" className={inputClass} value={f.fechaVencimiento} onChange={(ev) => ev.target.value && mut(f.id, (x) => void (x.fechaVencimiento = ev.target.value))} />
                    </Campo>
                    <Campo label="Estado">
                      <select className={inputClass} value={f.estado} onChange={(ev) => mut(f.id, (x) => void (x.estado = ev.target.value as EstadoFianza))}>
                        {Object.entries(ESTADO_FIANZA_LABEL).map(([k, l]) => (
                          <option key={k} value={k}>{l}</option>
                        ))}
                      </select>
                    </Campo>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs font-medium text-stone">Familias cubiertas</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {deEntidad.map((b) => {
                        const on = f.beneficiarioIds.includes(b.id);
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() =>
                              mut(f.id, (x) => {
                                x.beneficiarioIds = on
                                  ? x.beneficiarioIds.filter((y) => y !== b.id)
                                  : [...x.beneficiarioIds, b.id];
                              })
                            }
                            className={`rounded-full border px-2 py-0.5 text-[0.7rem] ${on ? "border-ink bg-ink text-bone" : "border-line bg-paper text-ink"}`}
                          >
                            {b.n}. {b.apPaterno}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <input
                    className={`${inputClass} mt-2`}
                    placeholder="Observaciones (renovación en trámite, contragarantía, etc.)"
                    value={f.observaciones ?? ""}
                    onChange={(ev) => mut(f.id, (x) => void (x.observaciones = ev.target.value || undefined))}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[0.7rem] font-medium text-stone">
      {label}
      {children}
    </label>
  );
}
