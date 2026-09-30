"use client";

import { useEffect } from "react";
import { ExternalLink, X } from "lucide-react";
import {
  diffDays,
  fechaCorta,
  indicadorBeneficiario,
  nombreCompleto,
  pct,
  programadoPartida,
  soles,
} from "@/lib/obras/calc";
import { SEVERIDAD_LABEL } from "@/lib/obras/diagnostico";
import { useObra } from "./obra-context";
import { ETAPA_LABEL, PREDIO_LABEL } from "./labels";
import { Field, ProgressBar, SeverityBadge, StatusBadge, VIZ, inputClass } from "./ui";

export default function BeneficiarioDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { obra, obraReal, fecha, update, alertas } = useObra();
  const b = obra.beneficiarios.find((x) => x.id === id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!b) return null;
  const i = indicadorBeneficiario(b, obraReal, fecha);
  const dias = diffDays(fecha, i.inicio);
  const propias = alertas.filter((a) => a.beneficiarioIds.includes(b.id));
  const set = (patch: Partial<typeof b>) =>
    update((d) => {
      const x = d.beneficiarios.find((y) => y.id === id);
      if (x) Object.assign(x, patch);
    });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30" onClick={onClose}>
      <aside
        className="h-full w-full max-w-xl overflow-y-auto bg-bone p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="kicker text-stone">
              Módulo N° {b.n} · {b.entidadId} · Grupo {b.grupo}
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-ink">{nombreCompleto(b)}</h2>
            <p className="mt-1 text-sm text-stone">
              {b.tipoDoc} {b.numDoc} · {b.direccion}
            </p>
            <p className="text-sm text-stone">
              {b.distrito}, {b.provincia} — {b.departamento}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-paper"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge status={i.semaforo} />
          <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-[0.7rem]">
            {ETAPA_LABEL[b.etapa]}
          </span>
          <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-[0.7rem]">
            Predio: {b.estadoPredio ? PREDIO_LABEL[b.estadoPredio] : "sin registrar"}
            {b.predioConfirmado ? " (confirmado)" : ""}
          </span>
          {b.lat !== null && b.lng !== null && (
            <a
              href={`https://www.google.com/maps?q=${b.lat},${b.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 text-[0.7rem] text-ink hover:text-clay"
            >
              Ver en mapa <ExternalLink size={11} />
            </a>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
          <Dato label="Ejecutado" value={pct(i.ejecutado)} />
          <Dato label="Programado" value={pct(i.programado)} />
          <Dato label="SPI" value={i.spi === null ? "—" : i.spi.toFixed(2)} />
          <Dato label="Inicio" value={fechaCorta(i.inicio)} />
          <Dato label="Fin programado" value={fechaCorta(i.finProgramado)} />
          <Dato label="Fin proyectado" value={fechaCorta(i.finProyectado)} />
          <Dato label="Valorizado" value={soles(i.montoEjecutado)} />
          <Dato label="Costo unitario" value={soles(i.costoUnitario)} />
          <Dato label="Días desde inicio" value={String(Math.max(0, dias))} />
        </div>

        <h3 className="mt-6 font-display text-sm font-semibold text-ink">Avance por partida</h3>
        <p className="text-xs text-stone">Barra = ejecutado · marca = programado al {fechaCorta(fecha)}</p>
        <ul className="mt-2 flex flex-col gap-2">
          {obra.partidas.map((p) => {
            const ej = (i.avances[p.id] ?? 0) / 100;
            const pr = programadoPartida(p, dias) / 100;
            return (
              <li key={p.id} className="grid grid-cols-[1fr_120px_48px] items-center gap-3 text-xs">
                <span className="truncate text-ink">
                  {p.codigo} {p.nombre} <span className="text-stone">({(p.peso * 100).toFixed(0)} %)</span>
                </span>
                <ProgressBar value={ej} target={pr} color={ej + 0.1 < pr ? VIZ.status.serious : VIZ.ejecutado} />
                <span className="text-right tabular-nums">{(ej * 100).toFixed(0)} %</span>
              </li>
            );
          })}
        </ul>

        {propias.length > 0 && (
          <>
            <h3 className="mt-6 font-display text-sm font-semibold text-ink">Alertas</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {propias.map((a) => (
                <li key={a.clave} className="rounded-xl border border-line bg-paper p-3 text-sm">
                  <SeverityBadge severidad={a.severidad} label={SEVERIDAD_LABEL[a.severidad]} />
                  <p className="mt-1 font-medium text-ink">{a.titulo}</p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-stone">
                    {a.acciones.slice(0, 3).map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </>
        )}

        <h3 className="mt-6 font-display text-sm font-semibold text-ink">Datos de control</h3>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Field label="Inicio del módulo (vacío = según grupo)">
            <input
              type="date"
              className={inputClass}
              value={b.fechaInicio ?? ""}
              onChange={(e) => set({ fechaInicio: e.target.value || undefined })}
            />
          </Field>
          <Field label="Teléfono">
            <input
              className={inputClass}
              value={b.telefono ?? ""}
              onChange={(e) => set({ telefono: e.target.value || undefined })}
            />
          </Field>
          <Field label="Observaciones" className="col-span-2">
            <textarea
              rows={3}
              className={inputClass}
              value={b.observaciones ?? ""}
              onChange={(e) => set({ observaciones: e.target.value || undefined })}
            />
          </Field>
        </div>
      </aside>
    </div>
  );
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-2.5">
      <p className="text-[0.65rem] uppercase tracking-wide text-stone">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}
