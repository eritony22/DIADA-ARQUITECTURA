"use client";

import { useMemo } from "react";
import {
  addDays,
  curvaS,
  descriptivos,
  diffDays,
  fechaCorta,
  regresion,
  rendimiento,
  soles,
  type Descriptivos,
  type IndicadorBeneficiario,
} from "@/lib/obras/calc";
import { useObra } from "./obra-context";
import { BarrasSimples, DispersionControl } from "./charts";
import type { TabProps } from "./tab-resumen";
import { Card, EmptyState, Kpi, StatusBadge } from "./ui";

export default function TabEstadistica({ onSelectBeneficiario }: TabProps) {
  const { obra, obraReal, seleccion, indicadores, resumen, fecha } = useObra();
  const curva = useMemo(() => curvaS(seleccion, obraReal, fecha), [seleccion, obraReal, fecha]);

  if (!indicadores.length) return <EmptyState title="Sin datos para analizar" />;

  const histograma = Array.from({ length: 10 }, (_, k) => ({
    nombre: `${k * 10}–${k * 10 + 10}`,
    valor: indicadores.filter((i) => {
      const v = i.ejecutado * 100;
      return k === 9 ? v >= 90 : v >= k * 10 && v < k * 10 + 10;
    }).length,
  }));

  // Regresión lineal del avance global (cortes reales) → ritmo y fecha de 100 %.
  const reales = curva.filter((p) => p.ejecutado !== undefined);
  const inicio = curva[0]?.fecha ?? obra.config.fechaInicio;
  const reg = regresion(
    reales.map((p) => diffDays(p.fecha, inicio)),
    reales.map((p) => p.ejecutado!),
  );
  const dia100 = reg && reg.b > 0 ? Math.ceil((100 - reg.a) / reg.b) : null;

  // Flujo de valorización proyectado por quincena (según la curva proyectada).
  const proy = curva.filter((p) => p.proyectado !== undefined);
  const flujo: { nombre: string; valor: number }[] = [];
  if (proy.length >= 2) {
    const desde = proy[0].fecha;
    const hasta = proy[proy.length - 1].fecha;
    const valorEn = (f: string) => {
      // Interpolación lineal sobre los puntos proyectados.
      for (let k = 1; k < proy.length; k++) {
        if (proy[k].fecha >= f) {
          const a = proy[k - 1];
          const b = proy[k];
          const span = diffDays(b.fecha, a.fecha) || 1;
          return a.proyectado! + ((b.proyectado! - a.proyectado!) * diffDays(f, a.fecha)) / span;
        }
      }
      return proy[proy.length - 1].proyectado!;
    };
    for (let f = desde; f < hasta; f = addDays(f, 14)) {
      const fin = addDays(f, 14) < hasta ? addDays(f, 14) : hasta;
      flujo.push({
        nombre: fechaCorta(fin).slice(0, 5),
        valor: Math.round(((valorEn(fin) - valorEn(f)) / 100) * resumen.montoContratado),
      });
    }
  }

  const porEntidad = obra.entidades
    .map((e) => ({ e, ind: indicadores.filter((i) => i.beneficiario.entidadId === e.id) }))
    .filter((x) => x.ind.length);

  const ranking = [...indicadores]
    .filter((i) => i.ejecutado < 0.999)
    .sort((a, b) => (b.finProyectado ?? "9999").localeCompare(a.finProyectado ?? "9999"))
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Ritmo global (regresión)"
          value={reg ? `${reg.b.toFixed(2)} pts/día` : "—"}
          hint={reg ? <>R² = {reg.r2.toFixed(2)} · {reales.length} cortes</> : "se necesitan ≥ 2 cortes"}
        />
        <Kpi
          label="100 % según tendencia lineal"
          value={dia100 !== null ? fechaCorta(addDays(inicio, dia100)) : "—"}
          hint="ajuste lineal sobre todos los cortes"
        />
        <Kpi
          label="100 % según ritmo reciente"
          value={fechaCorta(resumen.finProyectado)}
          hint="último ritmo de cada módulo"
        />
        <Kpi
          label="Por valorizar (saldo)"
          value={soles(Math.max(0, resumen.montoContratado - resumen.montoEjecutado))}
          hint={<>de {soles(resumen.montoContratado)} contratados</>}
        />
      </div>

      <Card title="Estadística descriptiva" subtitle="Por módulo, a la fecha de corte. CV = desviación / media (dispersión relativa).">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-line text-right text-xs text-stone">
                <th className="py-2 pr-2 text-left font-medium">Indicador</th>
                <th className="py-2 pr-2 text-left font-medium">Grupo</th>
                {["n", "Media", "Desv.", "CV", "Mín", "Q1", "Mediana", "Q3", "Máx"].map((h) => (
                  <th key={h} className="py-2 pr-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[{ label: "Todos", ind: indicadores }, ...porEntidad.map((x) => ({ label: x.e.sigla, ind: x.ind }))].flatMap(
                ({ label, ind }) => [
                  <FilaDesc key={`${label}-av`} nombre="Avance ejecutado (%)" grupo={label} d={descriptivos(ind.map((i) => i.ejecutado * 100))} />,
                  <FilaDesc key={`${label}-spi`} nombre="SPI" grupo={label} d={descriptivos(ind.filter((i) => i.spi !== null).map((i) => i.spi!))} dec={2} />,
                  <FilaDesc
                    key={`${label}-rend`}
                    nombre="Rendimiento (pts/día)"
                    grupo={label}
                    d={descriptivos(ind.map((i) => rendimiento(i, fecha)).filter((v): v is number => v !== null))}
                    dec={2}
                  />,
                ],
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Control: programado vs ejecutado" subtitle="Cada punto es un módulo.">
          <DispersionControl indicadores={indicadores} entidades={obra.entidades} />
        </Card>
        <Card title="Distribución del avance" subtitle="N° de módulos por rango de avance ejecutado (%).">
          <BarrasSimples data={histograma} valueLabel="Módulos" height={280} />
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card
          title="Flujo de valorización proyectado"
          subtitle="Monto a valorizar por quincena si cada módulo mantiene su ritmo reciente (S/)."
        >
          {flujo.length ? (
            <BarrasSimples
              data={flujo}
              valueLabel="Proyectado"
              valueFormatter={(v) => `S/ ${Math.round(v).toLocaleString("es-PE")}`}
              height={240}
            />
          ) : (
            <p className="py-10 text-center text-sm text-stone">
              Se necesitan al menos dos valorizaciones con avance para proyectar.
            </p>
          )}
        </Card>
        <Card title="Módulos que definen el término" subtitle="Ordenados por fecha de término proyectada (los últimos en terminar).">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-stone">
                <th className="py-2 pr-2 font-medium">Módulo</th>
                <th className="py-2 pr-2 font-medium">Estado</th>
                <th className="py-2 pr-2 font-medium">Fin programado</th>
                <th className="py-2 pr-2 font-medium">Fin proyectado</th>
                <th className="py-2 text-right font-medium">Atraso</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((i: IndicadorBeneficiario) => (
                <tr
                  key={i.beneficiario.id}
                  className="cursor-pointer border-b border-line/60 hover:bg-bone"
                  onClick={() => onSelectBeneficiario(i.beneficiario.id)}
                >
                  <td className="py-2 pr-2">
                    {i.beneficiario.n}. {i.beneficiario.apPaterno}{" "}
                    <span className="text-xs text-stone">{i.beneficiario.entidadId}</span>
                  </td>
                  <td className="py-2 pr-2"><StatusBadge status={i.semaforo} /></td>
                  <td className="py-2 pr-2 tabular-nums">{fechaCorta(i.finProgramado)}</td>
                  <td className="py-2 pr-2 tabular-nums">{fechaCorta(i.finProyectado)}</td>
                  <td className="py-2 text-right tabular-nums">{i.diasAtraso ? `${i.diasAtraso} d` : "—"}</td>
                </tr>
              ))}
              {ranking.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-stone">Todos los módulos concluidos.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function FilaDesc({ nombre, grupo, d, dec = 1 }: { nombre: string; grupo: string; d: Descriptivos; dec?: number }) {
  const f = (v: number) => (d.n ? v.toFixed(dec) : "—");
  return (
    <tr className="border-b border-line/60 text-right tabular-nums">
      <td className="py-1.5 pr-2 text-left">{nombre}</td>
      <td className="py-1.5 pr-2 text-left text-stone">{grupo}</td>
      <td className="py-1.5 pr-2">{d.n}</td>
      <td className="py-1.5 pr-2 font-semibold">{f(d.media)}</td>
      <td className="py-1.5 pr-2">{f(d.desviacion)}</td>
      <td className="py-1.5 pr-2">{d.cv === null ? "—" : `${(d.cv * 100).toFixed(0)} %`}</td>
      <td className="py-1.5 pr-2">{f(d.min)}</td>
      <td className="py-1.5 pr-2">{f(d.q1)}</td>
      <td className="py-1.5 pr-2">{f(d.mediana)}</td>
      <td className="py-1.5 pr-2">{f(d.q3)}</td>
      <td className="py-1.5 pr-2">{f(d.max)}</td>
    </tr>
  );
}
