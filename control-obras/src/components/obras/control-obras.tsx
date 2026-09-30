"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  CloudOff,
  FileSpreadsheet,
  HardHat,
  Package,
  LayoutDashboard,
  Loader2,
  LogOut,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import type { ObraState } from "@/types/obras";
import { cn } from "@/lib/cn";
import { tieneDemo } from "@/lib/obras/ops";
import { ObraProvider, useObra } from "./obra-context";
import { Button, inputBase, inputClass } from "./ui";
import TabResumen from "./tab-resumen";
import TabBeneficiarios from "./tab-beneficiarios";
import TabCronograma from "./tab-cronograma";
import TabSemanal from "./tab-semanal";
import TabMaestros from "./tab-maestros";
import TabMateriales from "./tab-materiales";
import TabFianzas from "./tab-fianzas";
import TabDiagnostico from "./tab-diagnostico";
import TabEstadistica from "./tab-estadistica";
import TabParametros from "./tab-parametros";
import BeneficiarioDrawer from "./beneficiario-drawer";

const TABS = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "beneficiarios", label: "Beneficiarios", icon: Users },
  { id: "cronograma", label: "Cronograma", icon: CalendarRange },
  { id: "valorizaciones", label: "Valorización semanal", icon: FileSpreadsheet },
  { id: "maestros", label: "Maestros y pagos", icon: HardHat },
  { id: "materiales", label: "Materiales", icon: Package },
  { id: "fianzas", label: "Fianzas", icon: ShieldCheck },
  { id: "diagnostico", label: "Diagnóstico y acciones", icon: Wrench },
  { id: "estadistica", label: "Estadística y proyección", icon: BarChart3 },
  { id: "parametros", label: "Parámetros y datos", icon: Settings2 },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export default function ControlObras({
  initial,
  usuario,
}: {
  initial: ObraState;
  usuario: string | null;
}) {
  return (
    <ObraProvider initial={initial} usuario={usuario}>
      <Dashboard />
    </ObraProvider>
  );
}

function Dashboard() {
  const { obra, alertas, seleccion } = useObra();
  const [tab, setTab] = useState<TabId>(obra.beneficiarios.length ? "resumen" : "parametros");
  const [detalle, setDetalle] = useState<string | null>(null);
  const criticas = alertas.filter((a) => a.severidad === "critical").length;

  const props = { onSelectBeneficiario: setDetalle, goTo: setTab };

  return (
    <div>
      <Header />
      {tieneDemo(obra) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#fab219] bg-[#fab219]/10 px-4 py-2.5 text-sm text-ink">
          <Activity size={16} />
          <b>Escenario de demostración:</b> las valorizaciones marcadas como demo son
          simuladas. Puedes borrarlas en <em>Parámetros y datos</em>.
        </div>
      )}
      <Filters />

      <nav className="-mx-1 mt-5 flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                tab === t.id ? "bg-ink text-bone" : "text-ink/70 hover:bg-ink/5 hover:text-ink",
              )}
            >
              <Icon size={15} strokeWidth={1.9} />
              {t.label}
              {t.id === "diagnostico" && criticas > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d03b3b] px-1 text-[0.65rem] font-bold text-white">
                  {criticas}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-5">
        {seleccion.length === 0 && obra.beneficiarios.length > 0 && tab !== "parametros" ? (
          <p className="rounded-2xl border border-line bg-paper p-8 text-center text-sm text-stone">
            Ningún beneficiario coincide con los filtros.
          </p>
        ) : (
          <>
            {tab === "resumen" && <TabResumen {...props} />}
            {tab === "beneficiarios" && <TabBeneficiarios {...props} />}
            {tab === "cronograma" && <TabCronograma {...props} />}
            {tab === "valorizaciones" && <TabSemanal />}
            {tab === "maestros" && <TabMaestros />}
            {tab === "materiales" && <TabMateriales />}
            {tab === "fianzas" && <TabFianzas />}
            {tab === "diagnostico" && <TabDiagnostico {...props} />}
            {tab === "estadistica" && <TabEstadistica {...props} />}
            {tab === "parametros" && <TabParametros />}
          </>
        )}
      </div>

      {detalle && <BeneficiarioDrawer id={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}

function Header() {
  const { obra, saveStatus, saveError, reloadFromServer } = useObra();
  const router = useRouter();
  const c = obra.config;
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="kicker text-stone">
          Control de obras · {c.programa} — {c.modalidad}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink">{c.nombre}</h1>
        <p className="mt-1 text-sm text-stone">
          {c.distrito}, {c.provincia} — {c.departamento} · Módulo de {c.areaModuloM2} m² ·{" "}
          {obra.beneficiarios.length} familias · {obra.entidades.map((e) => e.sigla).join(" / ")}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-3">
          <SaveIndicator status={saveStatus} />
          <Button
            variant="ghost"
            onClick={async () => {
              await fetch("/api/logout", { method: "POST" });
              router.push("/login");
              router.refresh();
            }}
          >
            <LogOut size={14} /> Salir
          </Button>
        </div>
        {saveError && (
          <div className="flex max-w-sm items-center gap-2 text-right text-xs text-red-700">
            <span>{saveError}</span>
            {saveStatus === "conflict" && (
              <Button onClick={() => void reloadFromServer()} className="shrink-0">
                <RefreshCw size={13} /> Recargar
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SaveIndicator({ status }: { status: string }) {
  const map = {
    saved: { icon: CheckCircle2, label: "Guardado", cls: "text-stone" },
    pending: { icon: Loader2, label: "Cambios sin guardar…", cls: "text-stone" },
    saving: { icon: Loader2, label: "Guardando…", cls: "text-stone" },
    error: { icon: CloudOff, label: "Error al guardar", cls: "text-red-700" },
    conflict: { icon: CloudOff, label: "Conflicto de versión", cls: "text-red-700" },
  } as const;
  const m = map[status as keyof typeof map] ?? map.saved;
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", m.cls)}>
      <Icon size={14} className={status === "saving" ? "animate-spin" : undefined} />
      {m.label}
    </span>
  );
}

function Filters() {
  const { obra, filtros, setFiltros, fecha, setFecha, seleccion } = useObra();
  const grupos = [...new Set(obra.beneficiarios.map((b) => b.grupo))].sort((a, b) => a - b);
  return (
    <div className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-paper p-3">
      <label className="flex flex-col gap-1 text-[0.7rem] font-medium uppercase tracking-wide text-stone">
        Fecha de corte
        <input
          type="date"
          value={fecha}
          onChange={(e) => e.target.value && setFecha(e.target.value)}
          className={cn(inputBase, "w-40")}
        />
      </label>
      <label className="flex flex-col gap-1 text-[0.7rem] font-medium uppercase tracking-wide text-stone">
        Entidad técnica
        <select
          value={filtros.entidad}
          onChange={(e) => setFiltros({ ...filtros, entidad: e.target.value })}
          className={cn(inputBase, "w-56")}
        >
          <option value="all">Todas</option>
          {obra.entidades.map((e) => (
            <option key={e.id} value={e.id}>
              {e.sigla} — {e.razonSocial}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[0.7rem] font-medium uppercase tracking-wide text-stone">
        Grupo
        <select
          value={filtros.grupo}
          onChange={(e) => setFiltros({ ...filtros, grupo: e.target.value })}
          className={cn(inputBase, "w-28")}
        >
          <option value="all">Todos</option>
          {grupos.map((g) => (
            <option key={g} value={String(g)}>
              Grupo {g}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-48 flex-1 flex-col gap-1 text-[0.7rem] font-medium uppercase tracking-wide text-stone">
        Buscar
        <input
          value={filtros.q}
          placeholder="Nombre, DNI o dirección"
          onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
          className={inputClass}
        />
      </label>
      <span className="pb-2 text-xs text-stone">
        {seleccion.length} de {obra.beneficiarios.length} módulos
      </span>
    </div>
  );
}
