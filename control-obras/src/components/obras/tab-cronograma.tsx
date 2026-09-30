"use client";

import { useMemo } from "react";
import {
  addDays,
  avancePorPartida,
  duracionModulo,
  fechaCorta,
  pct,
} from "@/lib/obras/calc";
import { useObra } from "./obra-context";
import { Gantt, type GanttRow } from "./gantt";
import type { TabProps } from "./tab-resumen";
import { Card, VIZ } from "./ui";

export default function TabCronograma({ onSelectBeneficiario }: TabProps) {
  const { obra, obraReal, indicadores, fecha } = useObra();
  const cfg = obra.config;
  const finContractual = addDays(cfg.fechaInicio, cfg.plazoTotalDias);
  const duracion = duracionModulo(obra.partidas, cfg);

  const partidas = useMemo(
    () => avancePorPartida(indicadores, obraReal, fecha),
    [indicadores, obraReal, fecha],
  );

  // Cronograma tipo: partidas relativas al inicio del módulo (día 0 = inicio de obra).
  const base = cfg.fechaInicio;
  const filasTipo: GanttRow[] = partidas.map((ap) => ({
    id: ap.partida.id,
    label: `${ap.partida.codigo} ${ap.partida.nombre}`,
    sublabel: `Día ${ap.partida.inicioDia}–${ap.partida.inicioDia + ap.partida.duracionDias} · peso ${(ap.partida.peso * 100).toFixed(0)} % · ejecutado ${ap.ejecutado.toFixed(0)} %`,
    bars: [
      {
        desde: addDays(base, ap.partida.inicioDia),
        hasta: addDays(base, ap.partida.inicioDia + ap.partida.duracionDias),
        color: ap.brecha > 15 ? VIZ.status.serious : VIZ.ejecutado,
        progreso: ap.ejecutado / 100,
        titulo: ap.partida.nombre,
      },
    ],
  }));

  const filasModulos: GanttRow[] = indicadores.map((i) => {
    const b = i.beneficiario;
    const bars: GanttRow["bars"] = [
      {
        desde: i.inicio,
        hasta: i.finProgramado,
        color: VIZ.status[i.semaforo === "neutral" ? "neutral" : i.semaforo],
        progreso: i.ejecutado,
        titulo: `Programado · ejecutado ${pct(i.ejecutado)}`,
      },
    ];
    if (i.finProyectado && i.finProyectado > i.finProgramado) {
      bars.push({
        desde: i.finProgramado,
        hasta: i.finProyectado,
        color: VIZ.status.critical,
        hueca: true,
        titulo: `Extensión proyectada (+${i.diasAtraso} días)`,
      });
    }
    return {
      id: b.id,
      label: `${b.n}. ${b.apPaterno} ${b.nombres.split(" ")[0]}`,
      sublabel: `${b.entidadId} · G${b.grupo} · ${pct(i.ejecutado, 0)} · fin ${fechaCorta(i.finProyectado ?? i.finProgramado)}`,
      bars,
    };
  });

  const fechas = [
    cfg.fechaInicio,
    ...indicadores.map((i) => i.inicio),
    ...indicadores.map((i) => i.finProyectado ?? i.finProgramado),
    finContractual,
    fecha,
  ];
  const desde = fechas.reduce((m, d) => (d < m ? d : m));
  const hasta = addDays(fechas.reduce((m, d) => (d > m ? d : m)), 3);

  return (
    <div className="flex flex-col gap-5">
      <Card
        title="Cronograma por módulo"
        subtitle="Barra = plazo programado del módulo, relleno = avance ejecutado; tramo punteado = extensión proyectada al ritmo actual. Clic en una fila para ver el detalle."
      >
        <Gantt
          rows={filasModulos}
          desde={desde}
          hasta={hasta}
          onRowClick={onSelectBeneficiario}
          markers={[
            { fecha, label: "Fecha de corte", color: VIZ.textSecondary },
            { fecha: finContractual, label: "Plazo contractual", color: VIZ.status.critical },
          ]}
        />
      </Card>

      <Card
        title={`Cronograma tipo del módulo (${duracion} días)`}
        subtitle={`Secuencia estándar de partidas desde el inicio de obra (${fechaCorta(base)}). Relleno = avance promedio de la partida en los módulos filtrados. Se edita en Parámetros.`}
      >
        <Gantt
          rows={filasTipo}
          desde={base}
          hasta={addDays(base, duracion + 2)}
          labelWidth={240}
        />
      </Card>

      <Card title="Hitos del plan">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Hito label="Inicio de obra" valor={fechaCorta(cfg.fechaInicio)} />
          <Hito
            label="Desfase entre grupos"
            valor={`${cfg.desfaseGrupoDias} días`}
          />
          <Hito label="Duración por módulo" valor={`${duracion} días`} />
          <Hito label="Plazo contractual" valor={`${cfg.plazoTotalDias} días → ${fechaCorta(finContractual)}`} />
        </div>
      </Card>
    </div>
  );
}

function Hito({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border border-line bg-bone/50 p-3">
      <p className="text-xs text-stone">{label}</p>
      <p className="mt-1 font-semibold text-ink">{valor}</p>
    </div>
  );
}
