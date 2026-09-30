"use client";

import type { ReactNode } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Info,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Semaforo } from "@/lib/obras/calc";
import type { Severidad } from "@/lib/obras/diagnostico";

/* Paleta de gráficos (validada para daltonismo: ver skill dataviz). Los
   colores de serie siguen a la entidad, nunca al ranking. */
export const VIZ = {
  series: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],
  programado: "#898781",
  ejecutado: "#2a78d6",
  proyectado: "#2a78d6",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  textSecondary: "#52514e",
  muted: "#898781",
  status: {
    good: "#0ca30c",
    warning: "#fab219",
    serious: "#ec835a",
    critical: "#d03b3b",
    neutral: "#c3c2b7",
  } as Record<Semaforo, string>,
};

export const AXIS_PROPS = {
  stroke: VIZ.axis,
  tick: { fill: VIZ.muted, fontSize: 11 },
  tickLine: false,
} as const;

export function Card({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-2xl border border-line bg-paper p-5",
        className,
      )}
    >
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h3 className="font-display text-base font-semibold text-ink">
                {title}
              </h3>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-stone">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Kpi({
  label,
  value,
  hint,
  status,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  status?: Semaforo;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-paper p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-stone">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-ink">{value}</p>
      {(hint || status) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone">
          {status && <StatusBadge status={status} />}
          {hint}
        </div>
      )}
    </div>
  );
}

const STATUS_META: Record<Semaforo, { label: string; icon: typeof Info }> = {
  good: { label: "En plazo", icon: CheckCircle2 },
  warning: { label: "Leve atraso", icon: ArrowDownRight },
  serious: { label: "Atrasado", icon: AlertTriangle },
  critical: { label: "Crítico", icon: AlertOctagon },
  neutral: { label: "Sin datos", icon: CircleDashed },
};

/** Estado con ícono + texto: el color nunca va solo. */
export function StatusBadge({
  status,
  label,
}: {
  status: Semaforo;
  label?: string;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-line bg-bone px-2 py-0.5 text-[0.7rem] font-medium text-ink">
      <Icon size={12} color={VIZ.status[status]} strokeWidth={2.4} />
      {label ?? meta.label}
    </span>
  );
}

const SEV_TO_STATUS: Record<Severidad, Semaforo> = {
  critical: "critical",
  serious: "serious",
  warning: "warning",
  info: "neutral",
};

export function SeverityBadge({ severidad, label }: { severidad: Severidad; label: string }) {
  if (severidad === "info") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-line bg-bone px-2 py-0.5 text-[0.7rem] font-medium text-ink">
        <Info size={12} className="text-stone" strokeWidth={2.4} />
        {label}
      </span>
    );
  }
  return <StatusBadge status={SEV_TO_STATUS[severidad]} label={label} />;
}

export function ProgressBar({
  value,
  target,
  color = VIZ.ejecutado,
}: {
  value: number; // 0–1
  target?: number; // 0–1, marca de lo programado
  color?: string;
}) {
  return (
    <div className="relative h-2 w-full min-w-16 rounded-full bg-bone-dim">
      <div
        className="h-2 rounded-full"
        style={{ width: `${Math.min(100, value * 100)}%`, background: color }}
      />
      {target !== undefined && (
        <div
          className="absolute -top-1 h-4 w-0.5 rounded bg-ink/60"
          style={{ left: `calc(${Math.min(100, target * 100)}% - 1px)` }}
          title={`Programado ${(target * 100).toFixed(1)} %`}
        />
      )}
    </div>
  );
}

export function Button({
  children,
  variant = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-ink text-bone hover:bg-ink-soft",
        variant === "secondary" && "border border-line bg-paper text-ink hover:bg-bone",
        variant === "ghost" && "text-ink/70 hover:bg-ink/5 hover:text-ink",
        variant === "danger" && "border border-red-200 bg-paper text-red-700 hover:bg-red-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Estilo de campo sin ancho, para combinar con un ancho fijo (w-32, w-40…). */
export const inputBase =
  "rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/50";
export const inputClass = `w-full ${inputBase}`;

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1 text-xs font-medium text-stone", className)}>
      {label}
      {children}
    </label>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-paper/60 p-8 text-center">
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-xl text-sm text-stone">{children}</div>}
    </div>
  );
}

/** Tooltip estándar para Recharts: valores en tinta, identidad en la muestra de color. */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: unknown; value?: unknown; color?: string; dataKey?: unknown }>;
  label?: unknown;
  labelFormatter?: (label: unknown) => ReactNode;
  valueFormatter?: (value: number, name: string) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value !== undefined && p.value !== null);
  if (!rows.length) return null;
  return (
    <div className="rounded-xl border border-line bg-paper px-3 py-2 text-xs shadow-lg">
      {label !== undefined && (
        <p className="mb-1 font-semibold text-ink">
          {labelFormatter ? labelFormatter(label) : String(label)}
        </p>
      )}
      {rows.map((p, k) => (
        <p key={k} className="flex items-center gap-2 text-[#52514e]">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{String(p.name ?? p.dataKey)}:</span>
          <span className="font-semibold tabular-nums text-ink">
            {valueFormatter && typeof p.value === "number"
              ? valueFormatter(p.value, String(p.name))
              : String(p.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#52514e]">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4"
            style={{
              background: i.dashed ? "transparent" : i.color,
              borderTop: i.dashed ? `2px dashed ${i.color}` : undefined,
              height: i.dashed ? 0 : 3,
              borderRadius: 2,
            }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}
