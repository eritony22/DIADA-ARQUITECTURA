"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ClipboardPlus, Pencil, Trash2 } from "lucide-react";
import type { Accion, Categoria6M, EstadoAccion } from "@/types/obras";
import { addDays, fechaCorta, nombreCorto } from "@/lib/obras/calc";
import {
  CATEGORIA_LABEL,
  SEVERIDAD_LABEL,
  type Alerta,
  type Severidad,
} from "@/lib/obras/diagnostico";
import { uid } from "@/lib/obras/ops";
import { useObra } from "./obra-context";
import { BarrasSimples } from "./charts";
import { PDCA } from "./labels";
import type { TabProps } from "./tab-resumen";
import { Button, Card, Field, Kpi, SeverityBadge, inputBase, inputClass } from "./ui";
import { cn } from "@/lib/cn";

export default function TabDiagnostico({ onSelectBeneficiario }: TabProps) {
  const { obra, alertas, update, fecha } = useObra();
  const [sev, setSev] = useState<Severidad | "all">("all");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);

  const filtradas = alertas.filter((a) => sev === "all" || a.severidad === sev);
  const conteo = (s: Severidad) => alertas.filter((a) => a.severidad === s).length;

  // Pareto: problemas (alertas no informativas + acciones registradas) por categoría 6M.
  const pareto = useMemo(() => {
    const cuenta = new Map<Categoria6M, number>();
    for (const a of alertas) if (a.severidad !== "info") cuenta.set(a.categoria, (cuenta.get(a.categoria) ?? 0) + 1);
    for (const a of obra.acciones) cuenta.set(a.categoria, (cuenta.get(a.categoria) ?? 0) + 1);
    const total = [...cuenta.values()].reduce((s, v) => s + v, 0);
    const orden = [...cuenta.entries()].sort((a, b) => b[1] - a[1]);
    return orden.map(([c, v], k) => {
      const acum = orden.slice(0, k + 1).reduce((s, [, x]) => s + x, 0);
      return { nombre: CATEGORIA_LABEL[c], valor: v, acumulado: total ? acum / total : 0 };
    });
  }, [alertas, obra.acciones]);

  const registrar = (a: Alerta) => {
    const id = uid("ac");
    update((d) =>
      d.acciones.push({
        id,
        creada: fecha,
        alertaClave: a.clave,
        problema: a.titulo,
        categoria: a.categoria,
        causaRaiz: "",
        accion: a.acciones[0] ?? "",
        responsable: "",
        fechaCompromiso: addDays(fecha, 7),
        estado: "plan",
        beneficiarioIds: a.beneficiarioIds,
      }),
    );
    setEditando(id);
  };

  const cerradas = obra.acciones.filter((a) => a.estado === "cerrada");
  const abiertas = obra.acciones.filter((a) => a.estado !== "cerrada");
  const vencidas = abiertas.filter((a) => a.fechaCompromiso < fecha);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Kpi label="Críticas" value={String(conteo("critical"))} status={conteo("critical") ? "critical" : "good"} />
        <Kpi label="Altas" value={String(conteo("serious"))} status={conteo("serious") ? "serious" : "good"} />
        <Kpi label="Medias" value={String(conteo("warning"))} status={conteo("warning") ? "warning" : "good"} />
        <Kpi label="Acciones abiertas" value={String(abiertas.length)} hint={<>{vencidas.length} vencidas</>} />
        <Kpi label="Acciones cerradas" value={String(cerradas.length)} />
        <Kpi
          label="Cumplimiento a tiempo"
          value={obra.acciones.length ? `${Math.round(((obra.acciones.length - vencidas.length) / obra.acciones.length) * 100)} %` : "—"}
          hint="acciones sin vencer"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Problemas detectados y acciones sugeridas"
          subtitle="El sistema revisa atrasos, cuellos de botella, secuencia constructiva, predios, adelantos, valorizaciones y garantías. Registra una acción para darle seguimiento PDCA."
          actions={
            <select value={sev} onChange={(e) => setSev(e.target.value as Severidad | "all")} className={cn(inputBase, "w-40")}>
              <option value="all">Todas ({alertas.length})</option>
              {(["critical", "serious", "warning", "info"] as Severidad[]).map((s) => (
                <option key={s} value={s}>
                  {SEVERIDAD_LABEL[s]} ({conteo(s)})
                </option>
              ))}
            </select>
          }
        >
          <ul className="flex flex-col gap-2">
            {filtradas.map((a) => {
              const open = abierta === a.clave;
              const vinculadas = obra.acciones.filter((x) => x.alertaClave === a.clave);
              return (
                <li key={a.clave} className="rounded-xl border border-line">
                  <button
                    type="button"
                    onClick={() => setAbierta(open ? null : a.clave)}
                    className="flex w-full items-start gap-3 p-3 text-left"
                  >
                    <SeverityBadge severidad={a.severidad} label={SEVERIDAD_LABEL[a.severidad]} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">{a.titulo}</span>
                      <span className="block text-xs text-stone">
                        {CATEGORIA_LABEL[a.categoria]}
                        {vinculadas.length > 0 &&
                          ` · acción: ${PDCA.find((p) => p.id === vinculadas[0].estado)?.label}`}
                      </span>
                    </span>
                    <ChevronDown size={16} className={cn("mt-0.5 shrink-0 transition-transform", open && "rotate-180")} />
                  </button>
                  {open && (
                    <div className="border-t border-line px-3 pb-3 pt-2 text-sm">
                      <p className="text-ink/80">{a.detalle}</p>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-stone">Acciones recomendadas</p>
                      <ol className="mt-1 list-decimal space-y-1 pl-5 text-ink/90">
                        {a.acciones.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ol>
                      {a.beneficiarioIds.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {a.beneficiarioIds.map((id) => {
                            const b = obra.beneficiarios.find((x) => x.id === id);
                            return b ? (
                              <button
                                key={id}
                                type="button"
                                onClick={() => onSelectBeneficiario(id)}
                                className="rounded-full border border-line bg-paper px-2 py-0.5 text-[0.7rem] hover:border-ink"
                              >
                                {b.n}. {nombreCorto(b)}
                              </button>
                            ) : null;
                          })}
                        </div>
                      )}
                      <div className="mt-3">
                        <Button variant="primary" onClick={() => registrar(a)}>
                          <ClipboardPlus size={14} /> Registrar acción correctiva
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
            {filtradas.length === 0 && <li className="text-sm text-stone">Sin alertas.</li>}
          </ul>
        </Card>

        <Card
          title="Pareto de causas (6M)"
          subtitle="Frecuencia de problemas y acciones por categoría. Atacar primero las que acumulan ~80 %."
        >
          <BarrasSimples data={pareto} valueLabel="Problemas" height={260} inclinar />
          <table className="mt-3 w-full text-xs">
            <tbody>
              {pareto.map((p) => (
                <tr key={p.nombre} className={cn("border-b border-line/60", p.acumulado <= 0.8 && "font-semibold")}>
                  <td className="py-1">{p.nombre}</td>
                  <td className="py-1 text-right tabular-nums">{p.valor}</td>
                  <td className="py-1 text-right tabular-nums text-stone">{Math.round(p.acumulado * 100)} % acum.</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card
        title="Tablero de mejora continua (PDCA)"
        subtitle="Planificar → Hacer → Verificar → Actuar. Una acción se cierra solo cuando se comprobó su eficacia."
        actions={
          <Button
            onClick={() => {
              const id = uid("ac");
              update((d) =>
                d.acciones.push({
                  id,
                  creada: fecha,
                  problema: "",
                  categoria: "metodo",
                  causaRaiz: "",
                  accion: "",
                  responsable: "",
                  fechaCompromiso: addDays(fecha, 7),
                  estado: "plan",
                  beneficiarioIds: [],
                }),
              );
              setEditando(id);
            }}
          >
            <ClipboardPlus size={14} /> Nueva acción / mejora
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {PDCA.map((col, k) => {
            const items = obra.acciones.filter((a) => a.estado === col.id);
            return (
              <div key={col.id} className="min-w-0 rounded-xl bg-bone/60 p-2">
                <p className="px-1 text-sm font-semibold text-ink">
                  {col.label} <span className="text-stone">({items.length})</span>
                </p>
                <p className="px-1 text-[0.65rem] text-stone">{col.descripcion}</p>
                <div className="mt-2 flex flex-col gap-2">
                  {items.map((a) => (
                    <TarjetaAccion
                      key={a.id}
                      accion={a}
                      editando={editando === a.id}
                      onEdit={() => setEditando(editando === a.id ? null : a.id)}
                      prev={k > 0 ? PDCA[k - 1].id : null}
                      next={k < PDCA.length - 1 ? PDCA[k + 1].id : null}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function TarjetaAccion({
  accion: a,
  editando,
  onEdit,
  prev,
  next,
}: {
  accion: Accion;
  editando: boolean;
  onEdit: () => void;
  prev: EstadoAccion | null;
  next: EstadoAccion | null;
}) {
  const { update, fecha } = useObra();
  const set = (patch: Partial<Accion>) =>
    update((d) => {
      const x = d.acciones.find((y) => y.id === a.id);
      if (x) Object.assign(x, patch);
    });
  const vencida = a.estado !== "cerrada" && a.fechaCompromiso < fecha;

  return (
    <div className={cn("rounded-lg border bg-paper p-2 text-xs", vencida ? "border-red-300" : "border-line")}>
      <p className="font-medium text-ink">{a.problema || "Sin título"}</p>
      {a.accion && <p className="mt-1 text-ink/70">{a.accion}</p>}
      <p className="mt-1 text-stone">
        {CATEGORIA_LABEL[a.categoria]} · {a.responsable || "sin responsable"} ·{" "}
        <span className={vencida ? "font-semibold text-red-700" : undefined}>{fechaCorta(a.fechaCompromiso)}</span>
      </p>
      <div className="mt-1.5 flex items-center justify-between">
        <div className="flex gap-1">
          <button type="button" disabled={!prev} onClick={() => prev && set({ estado: prev })} className="rounded p-1 hover:bg-bone disabled:opacity-30" aria-label="Retroceder etapa">
            <ChevronLeft size={14} />
          </button>
          <button type="button" disabled={!next} onClick={() => next && set({ estado: next })} className="rounded p-1 hover:bg-bone disabled:opacity-30" aria-label="Avanzar etapa">
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={onEdit} className="rounded p-1 hover:bg-bone" aria-label="Editar">
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => confirm("¿Eliminar esta acción?") && update((d) => void (d.acciones = d.acciones.filter((x) => x.id !== a.id)))}
            className="rounded p-1 hover:bg-bone"
            aria-label="Eliminar"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {editando && (
        <div className="mt-2 flex flex-col gap-2 border-t border-line pt-2">
          <Field label="Problema">
            <input className={inputClass} value={a.problema} onChange={(e) => set({ problema: e.target.value })} />
          </Field>
          <Field label="Categoría (6M)">
            <select className={inputClass} value={a.categoria} onChange={(e) => set({ categoria: e.target.value as Categoria6M })}>
              {Object.entries(CATEGORIA_LABEL).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Causa raíz (¿por qué? ×5)">
            <textarea rows={2} className={inputClass} value={a.causaRaiz} onChange={(e) => set({ causaRaiz: e.target.value })} />
          </Field>
          <Field label="Acción">
            <textarea rows={2} className={inputClass} value={a.accion} onChange={(e) => set({ accion: e.target.value })} />
          </Field>
          <Field label="Responsable">
            <input className={inputClass} value={a.responsable} onChange={(e) => set({ responsable: e.target.value })} />
          </Field>
          <Field label="Fecha compromiso">
            <input type="date" className={inputClass} value={a.fechaCompromiso} onChange={(e) => e.target.value && set({ fechaCompromiso: e.target.value })} />
          </Field>
          <Field label="Resultado / eficacia">
            <textarea rows={2} className={inputClass} value={a.resultado ?? ""} onChange={(e) => set({ resultado: e.target.value || undefined })} />
          </Field>
        </div>
      )}
    </div>
  );
}
