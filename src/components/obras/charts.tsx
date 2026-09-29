"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { ISODate } from "@/types/obras";
import {
  fechaCorta,
  toTime,
  type AvancePartida,
  type IndicadorBeneficiario,
  type PuntoCurvaS,
} from "@/lib/obras/calc";
import { AXIS_PROPS, ChartTooltip, Legend, VIZ } from "./ui";

const fmtFecha = (t: unknown) => fechaCorta(new Date(Number(t)).toISOString().slice(0, 10));
const fmtPct = (v: number) => `${v.toFixed(1)} %`;

/* ------------------------------------------------------------------ */
/* Curva S                                                             */
/* ------------------------------------------------------------------ */

export function CurvaS({
  data,
  fecha,
  finContractual,
  height = 280,
}: {
  data: PuntoCurvaS[];
  fecha: ISODate;
  finContractual?: ISODate;
  height?: number;
}) {
  const hayProyeccion = data.some((d) => d.proyectado !== undefined);
  return (
    <div>
      <Legend
        items={[
          { label: "Programado", color: VIZ.programado, dashed: true },
          { label: "Ejecutado", color: VIZ.ejecutado },
          ...(hayProyeccion ? [{ label: "Proyección (ritmo actual)", color: VIZ.proyectado, dashed: true }] : []),
        ]}
      />
      <div style={{ height }} className="mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={VIZ.grid} vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t) => fmtFecha(t).slice(0, 5)}
              {...AXIS_PROPS}
            />
            <YAxis domain={[0, 100]} unit="%" {...AXIS_PROPS} />
            <Tooltip
              content={(p) => (
                <ChartTooltip active={p.active} payload={p.payload} label={p.label} labelFormatter={fmtFecha} valueFormatter={(v) => fmtPct(v)} />
              )}
            />
            <ReferenceLine
              x={toTime(fecha)}
              stroke={VIZ.textSecondary}
              strokeDasharray="2 3"
              label={{ value: "Corte", position: "insideTopRight", fill: VIZ.muted, fontSize: 10 }}
            />
            {finContractual && (
              <ReferenceLine
                x={toTime(finContractual)}
                stroke={VIZ.status.critical}
                strokeDasharray="4 3"
                label={{ value: "Plazo", position: "insideTopLeft", fill: VIZ.muted, fontSize: 10 }}
              />
            )}
            <Line
              name="Programado"
              dataKey="programado"
              stroke={VIZ.programado}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              name="Ejecutado"
              dataKey="ejecutado"
              stroke={VIZ.ejecutado}
              strokeWidth={2}
              connectNulls
              dot={{ r: 4, fill: VIZ.ejecutado, stroke: "#fffdf8", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              name="Proyección"
              dataKey="proyectado"
              stroke={VIZ.proyectado}
              strokeOpacity={0.6}
              strokeWidth={2}
              strokeDasharray="2 4"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Avance por partida (programado vs ejecutado)                        */
/* ------------------------------------------------------------------ */

export function AvancePartidas({
  data,
  onSelect,
}: {
  data: AvancePartida[];
  onSelect?: (partidaId: string) => void;
}) {
  const rows = data.map((d) => ({
    id: d.partida.id,
    nombre: `${d.partida.codigo} ${d.partida.nombre}`,
    Programado: d.programado,
    Ejecutado: d.ejecutado,
    peso: d.partida.peso,
  }));
  return (
    <div>
      <Legend
        items={[
          { label: "Programado", color: VIZ.programado },
          { label: "Ejecutado", color: VIZ.ejecutado },
        ]}
      />
      <div style={{ height: Math.max(220, rows.length * 30) }} className="mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
            barGap={2}
            barCategoryGap={6}
            onClick={(e) => {
              const id = (e as { activePayload?: { payload?: { id?: string } }[] })?.activePayload?.[0]?.payload?.id;
              if (id && onSelect) onSelect(id);
            }}
          >
            <CartesianGrid stroke={VIZ.grid} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} unit="%" {...AXIS_PROPS} />
            <YAxis
              type="category"
              dataKey="nombre"
              width={170}
              {...AXIS_PROPS}
              tick={{ fill: VIZ.textSecondary, fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(11,11,13,0.04)" }}
              content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} valueFormatter={(v) => fmtPct(v)} />}
            />
            <Bar dataKey="Programado" fill={VIZ.programado} radius={[0, 4, 4, 0]} barSize={8} isAnimationActive={false} />
            <Bar dataKey="Ejecutado" fill={VIZ.ejecutado} radius={[0, 4, 4, 0]} barSize={8} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Avance por módulo (semáforo)                                        */
/* ------------------------------------------------------------------ */

export function AvanceModulos({
  indicadores,
  onSelect,
}: {
  indicadores: IndicadorBeneficiario[];
  onSelect?: (id: string) => void;
}) {
  const rows = indicadores.map((i) => ({
    id: i.beneficiario.id,
    nombre: `${i.beneficiario.n}. ${i.beneficiario.apPaterno}`,
    Ejecutado: +(i.ejecutado * 100).toFixed(1),
    Programado: +(i.programado * 100).toFixed(1),
    semaforo: i.semaforo,
  }));
  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={rows}
          margin={{ top: 8, right: 8, bottom: 24, left: -16 }}
          onClick={(e) => {
            const id = (e as { activePayload?: { payload?: { id?: string } }[] })?.activePayload?.[0]?.payload?.id;
            if (id && onSelect) onSelect(id);
          }}
        >
          <CartesianGrid stroke={VIZ.grid} vertical={false} />
          <XAxis
            dataKey="nombre"
            {...AXIS_PROPS}
            angle={-35}
            textAnchor="end"
            interval={0}
            height={50}
          />
          <YAxis domain={[0, 100]} unit="%" {...AXIS_PROPS} />
          <Tooltip
            cursor={{ fill: "rgba(11,11,13,0.04)" }}
            content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} valueFormatter={(v) => fmtPct(v)} />}
          />
          <Bar dataKey="Ejecutado" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.id} fill={VIZ.status[r.semaforo]} />
            ))}
          </Bar>
          <Line
            dataKey="Programado"
            stroke={VIZ.textSecondary}
            strokeWidth={0}
            dot={{ r: 5, fill: "#fffdf8", stroke: VIZ.textSecondary, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mapa de módulos (lat/long)                                          */
/* ------------------------------------------------------------------ */

export function MapaModulos({
  indicadores,
  onSelect,
}: {
  indicadores: IndicadorBeneficiario[];
  onSelect?: (id: string) => void;
}) {
  const puntos = indicadores
    .filter((i) => i.beneficiario.lat !== null && i.beneficiario.lng !== null)
    .map((i) => ({
      id: i.beneficiario.id,
      x: i.beneficiario.lng!,
      y: i.beneficiario.lat!,
      z: 1,
      nombre: `${i.beneficiario.n}. ${i.beneficiario.apPaterno} ${i.beneficiario.nombres.split(" ")[0]}`,
      avance: i.ejecutado,
      semaforo: i.semaforo,
      et: i.beneficiario.entidadId,
    }));
  if (!puntos.length) {
    return <p className="py-10 text-center text-sm text-stone">Sin coordenadas registradas.</p>;
  }
  const pad = 0.004;
  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  return (
    <div style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
          <CartesianGrid stroke={VIZ.grid} />
          <XAxis
            type="number"
            dataKey="x"
            name="Longitud"
            domain={[Math.min(...xs) - pad, Math.max(...xs) + pad]}
            tickFormatter={(v) => Number(v).toFixed(2)}
            {...AXIS_PROPS}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Latitud"
            domain={[Math.min(...ys) - pad, Math.max(...ys) + pad]}
            tickFormatter={(v) => Number(v).toFixed(2)}
            {...AXIS_PROPS}
          />
          <ZAxis dataKey="z" range={[110, 110]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as (typeof puntos)[number] | undefined;
              if (!active || !p) return null;
              return (
                <div className="rounded-xl border border-line bg-paper px-3 py-2 text-xs shadow-lg">
                  <p className="font-semibold text-ink">{p.nombre}</p>
                  <p className="text-[#52514e]">
                    {p.et} · avance <b className="text-ink">{(p.avance * 100).toFixed(1)} %</b>
                  </p>
                  <p className="text-[#898781]">
                    {p.y.toFixed(5)}, {p.x.toFixed(5)}
                  </p>
                </div>
              );
            }}
          />
          <Scatter
            data={puntos}
            isAnimationActive={false}
            onClick={(d) => {
              const id = (d as { payload?: { id?: string } })?.payload?.id;
              if (id && onSelect) onSelect(id);
            }}
            className="cursor-pointer"
          >
            {puntos.map((p) => (
              <Cell key={p.id} fill={VIZ.status[p.semaforo]} stroke="#fffdf8" strokeWidth={2} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Barras simples                                                      */
/* ------------------------------------------------------------------ */

export function BarrasSimples({
  data,
  valueLabel,
  valueFormatter,
  height = 240,
  color = VIZ.series[0],
  colors,
  referencia,
  inclinar,
}: {
  data: { nombre: string; valor: number }[];
  /** Inclina las etiquetas del eje X cuando son largas. */
  inclinar?: boolean;
  valueLabel: string;
  valueFormatter?: (v: number) => string;
  height?: number;
  color?: string;
  colors?: string[];
  referencia?: { y: number; label: string };
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, bottom: inclinar ? 24 : 0, left: 0 }}>
          <CartesianGrid stroke={VIZ.grid} vertical={false} />
          <XAxis
            dataKey="nombre"
            {...AXIS_PROPS}
            interval={0}
            angle={inclinar ? -30 : 0}
            textAnchor={inclinar ? "end" : "middle"}
            height={inclinar ? 60 : 30}
          />
          <YAxis
            {...AXIS_PROPS}
            tickFormatter={(v) => (valueFormatter ? valueFormatter(Number(v)) : String(v))}
            width={70}
          />
          <Tooltip
            cursor={{ fill: "rgba(11,11,13,0.04)" }}
            content={(p) => (
              <ChartTooltip
                active={p.active}
                payload={p.payload}
                label={p.label}
                valueFormatter={(v) => (valueFormatter ? valueFormatter(v) : v)}
              />
            )}
          />
          {referencia && (
            <ReferenceLine
              y={referencia.y}
              stroke={VIZ.textSecondary}
              strokeDasharray="4 3"
              label={{ value: referencia.label, position: "insideTopRight", fill: VIZ.muted, fontSize: 10 }}
            />
          )}
          <Bar name={valueLabel} dataKey="valor" fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
            {colors && data.map((d, k) => <Cell key={d.nombre} fill={colors[k]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Programado vs ejecutado (dispersión con diagonal)                   */
/* ------------------------------------------------------------------ */

export function DispersionControl({
  indicadores,
  entidades,
}: {
  indicadores: IndicadorBeneficiario[];
  entidades: { id: string; sigla: string }[];
}) {
  return (
    <div>
      <Legend
        items={entidades.slice(0, 3).map((e, k) => ({ label: e.sigla, color: VIZ.series[k] }))}
      />
      <div style={{ height: 280 }} className="mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: -8 }}>
            <CartesianGrid stroke={VIZ.grid} />
            <XAxis type="number" dataKey="x" name="Programado" domain={[0, 100]} unit="%" {...AXIS_PROPS}
              label={{ value: "Programado", position: "insideBottom", offset: -8, fill: VIZ.muted, fontSize: 11 }} />
            <YAxis type="number" dataKey="y" name="Ejecutado" domain={[0, 100]} unit="%" {...AXIS_PROPS} />
            <ZAxis range={[90, 90]} />
            <ReferenceLine
              segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]}
              stroke={VIZ.axis}
              strokeDasharray="4 4"
            />
            <Tooltip
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as { nombre: string; x: number; y: number } | undefined;
                if (!active || !p) return null;
                return (
                  <div className="rounded-xl border border-line bg-paper px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-ink">{p.nombre}</p>
                    <p className="text-[#52514e]">Programado {p.x.toFixed(1)} % · Ejecutado {p.y.toFixed(1)} %</p>
                  </div>
                );
              }}
            />
            {entidades.slice(0, 3).map((e, k) => (
              <Scatter
                key={e.id}
                name={e.sigla}
                isAnimationActive={false}
                fill={VIZ.series[k]}
                stroke="#fffdf8"
                strokeWidth={2}
                data={indicadores
                  .filter((i) => i.beneficiario.entidadId === e.id)
                  .map((i) => ({
                    x: +(i.programado * 100).toFixed(1),
                    y: +(i.ejecutado * 100).toFixed(1),
                    nombre: `${i.beneficiario.n}. ${i.beneficiario.apPaterno} ${i.beneficiario.nombres.split(" ")[0]}`,
                  }))}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs text-stone">
        Sobre la diagonal: módulo adelantado. Debajo: atrasado respecto a su cronograma.
      </p>
    </div>
  );
}
