"use client";

import type { ReactNode } from "react";
import type { ISODate } from "@/types/obras";
import { addDays, diffDays, fechaCorta } from "@/lib/obras/calc";
import { VIZ } from "./ui";

export interface GanttBar {
  desde: ISODate;
  hasta: ISODate;
  color: string;
  /** 0–1: fracción rellena (avance real) sobre la barra. */
  progreso?: number;
  hueca?: boolean;
  titulo: string;
}

export interface GanttRow {
  id: string;
  label: ReactNode;
  sublabel?: ReactNode;
  bars: GanttBar[];
}

export interface GanttMarker {
  fecha: ISODate;
  label: string;
  color: string;
}

/** Diagrama de Gantt en HTML: filas con barras posicionadas por fecha. */
export function Gantt({
  rows,
  desde,
  hasta,
  markers = [],
  onRowClick,
  labelWidth = 200,
}: {
  rows: GanttRow[];
  desde: ISODate;
  hasta: ISODate;
  markers?: GanttMarker[];
  onRowClick?: (id: string) => void;
  labelWidth?: number;
}) {
  const total = Math.max(1, diffDays(hasta, desde));
  const pos = (f: ISODate) => (Math.min(total, Math.max(0, diffDays(f, desde))) / total) * 100;

  // Marcas semanales en el eje.
  const ticks: ISODate[] = [];
  const paso = total > 180 ? 30 : total > 70 ? 14 : 7;
  for (let d = 0; d <= total; d += paso) ticks.push(addDays(desde, d));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="flex border-b border-line pb-1 text-[0.65rem] text-[#898781]">
          <div style={{ width: labelWidth }} className="shrink-0" />
          <div className="relative h-4 flex-1">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute -translate-x-1/2 tabular-nums"
                style={{ left: `${pos(t)}%` }}
              >
                {fechaCorta(t).slice(0, 5)}
              </span>
            ))}
          </div>
        </div>
        {rows.map((r) => (
          <div
            key={r.id}
            className={`flex items-center border-b border-line/60 py-1.5 ${onRowClick ? "cursor-pointer hover:bg-bone" : ""}`}
            onClick={onRowClick ? () => onRowClick(r.id) : undefined}
          >
            <div style={{ width: labelWidth }} className="shrink-0 truncate pr-3 text-xs">
              <div className="truncate font-medium text-ink">{r.label}</div>
              {r.sublabel && <div className="truncate text-[0.65rem] text-stone">{r.sublabel}</div>}
            </div>
            <div className="relative h-6 flex-1">
              {ticks.map((t) => (
                <div
                  key={t}
                  className="absolute inset-y-0 w-px"
                  style={{ left: `${pos(t)}%`, background: VIZ.grid }}
                />
              ))}
              {r.bars.map((b, k) => {
                const left = pos(b.desde);
                const width = Math.max(0.6, pos(b.hasta) - left);
                return (
                  <div
                    key={k}
                    title={`${b.titulo}: ${fechaCorta(b.desde)} → ${fechaCorta(b.hasta)}`}
                    className="absolute top-1/2 h-3.5 -translate-y-1/2 overflow-hidden rounded"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      background: b.hueca ? "transparent" : `${b.color}33`,
                      border: `1.5px ${b.hueca ? "dashed" : "solid"} ${b.color}`,
                    }}
                  >
                    {b.progreso !== undefined && (
                      <div
                        className="h-full"
                        style={{ width: `${Math.min(100, b.progreso * 100)}%`, background: b.color }}
                      />
                    )}
                  </div>
                );
              })}
              {markers.map((m) => (
                <div
                  key={m.label}
                  className="absolute inset-y-0 w-0.5"
                  style={{ left: `${pos(m.fecha)}%`, background: m.color }}
                />
              ))}
            </div>
          </div>
        ))}
        {markers.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-[#52514e]" style={{ paddingLeft: labelWidth }}>
            {markers.map((m) => (
              <span key={m.label} className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-0.5" style={{ background: m.color }} />
                {m.label} ({fechaCorta(m.fecha)})
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
