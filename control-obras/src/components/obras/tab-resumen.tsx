"use client";

import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import {
  addDays,
  avancePorPartida,
  curvaS,
  diffDays,
  fechaCorta,
  pct,
  resumen as calcResumen,
  soles,
  spiSemaforo,
} from "@/lib/obras/calc";
import { SEVERIDAD_LABEL } from "@/lib/obras/diagnostico";
import type { TabId } from "./control-obras";
import { useObra } from "./obra-context";
import { AvanceModulos, AvancePartidas, CurvaS, MapaModulos } from "./charts";
import { Button, Card, EmptyState, Kpi, ProgressBar, SeverityBadge, StatusBadge, VIZ } from "./ui";

export interface TabProps {
  onSelectBeneficiario: (id: string) => void;
  goTo: (tab: TabId) => void;
}

export default function TabResumen({ onSelectBeneficiario, goTo }: TabProps) {
  const { obra, obraReal, seleccion, indicadores, resumen, alertas, fecha } = useObra();
  const curva = useMemo(() => curvaS(seleccion, obraReal, fecha), [seleccion, obraReal, fecha]);
  const partidas = useMemo(
    () => avancePorPartida(indicadores, obraReal, fecha),
    [indicadores, obraReal, fecha],
  );
  const finContractual = addDays(obra.config.fechaInicio, obra.config.plazoTotalDias);

  if (!obra.beneficiarios.length) {
    return (
      <EmptyState title="Aún no hay beneficiarios cargados">
        Importa la lista oficial (.xlsx) desde{" "}
        <button className="font-semibold text-clay underline" onClick={() => goTo("parametros")}>
          Parámetros y datos
        </button>{" "}
        para empezar a controlar la obra.
      </EmptyState>
    );
  }

  const spiStatus = spiSemaforo(resumen.spi, obra.config);
  const desfaseFin =
    resumen.finProyectado && resumen.finProgramado
      ? diffDays(resumen.finProyectado, resumen.finProgramado)
      : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label="Avance ejecutado"
          value={pct(resumen.ejecutado)}
          hint={<>programado {pct(resumen.programado)}</>}
        />
        <Kpi
          label="Índice de cronograma (SPI)"
          value={resumen.spi === null ? "—" : resumen.spi.toFixed(2)}
          status={spiStatus}
        />
        <Kpi
          label="Módulos"
          value={`${resumen.terminados}/${resumen.modulos}`}
          hint={<>terminados · {resumen.enEjecucion} en obra · {resumen.sinIniciar} sin iniciar</>}
        />
        <Kpi
          label="Valorizado (subcontrato)"
          value={soles(resumen.montoEjecutado)}
          hint={<>de {soles(resumen.montoContratado)}</>}
        />
        <Kpi
          label="Término proyectado"
          value={fechaCorta(resumen.finProyectado)}
          hint={
            desfaseFin === null ? (
              <>programado {fechaCorta(resumen.finProgramado)}</>
            ) : desfaseFin > 0 ? (
              <>{desfaseFin} días después de lo programado</>
            ) : (
              <>en fecha ({fechaCorta(resumen.finProgramado)})</>
            )
          }
          status={
            desfaseFin === null
              ? undefined
              : resumen.finProyectado! > finContractual
                ? "critical"
                : desfaseFin > 0
                  ? "warning"
                  : "good"
          }
        />
        <Kpi
          label="BFH gestionado"
          value={soles(resumen.bfhTotal)}
          hint={<>{resumen.modulos} × {soles(obra.config.valorBfh)}</>}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Curva S — avance acumulado"
          subtitle="Promedio de los módulos filtrados. La proyección extiende el ritmo reciente de cada módulo."
        >
          <CurvaS data={curva} fecha={fecha} finContractual={finContractual} />
        </Card>
        <Card
          title="Alertas prioritarias"
          subtitle={`${alertas.length} detectadas al ${fechaCorta(fecha)}`}
          actions={
            <Button variant="ghost" onClick={() => goTo("diagnostico")}>
              Ver todas <ArrowRight size={14} />
            </Button>
          }
        >
          <ul className="flex flex-col gap-2">
            {alertas.slice(0, 6).map((a) => (
              <li key={a.clave} className="rounded-xl border border-line bg-bone/50 p-2.5">
                <div className="flex items-start gap-2">
                  <SeverityBadge severidad={a.severidad} label={SEVERIDAD_LABEL[a.severidad]} />
                </div>
                <p className="mt-1 text-sm font-medium text-ink">{a.titulo}</p>
              </li>
            ))}
            {alertas.length === 0 && (
              <li className="text-sm text-stone">Sin alertas para la selección actual.</li>
            )}
          </ul>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card
          title="Avance por partida"
          subtitle="Promedio de los módulos: % de cada partida. Las de mayor peso mueven más el avance."
        >
          <AvancePartidas data={partidas} />
        </Card>
        <Card
          title="Avance por módulo"
          subtitle="Barra = ejecutado (color por estado) · círculo = programado. Clic para ver el detalle."
        >
          <AvanceModulos indicadores={indicadores} onSelect={onSelectBeneficiario} />
          <div className="mt-2 flex flex-wrap gap-2">
            {(["good", "warning", "serious", "critical"] as const).map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card
          title="Ubicación de los módulos"
          subtitle="Coordenadas de la lista oficial, color según estado del módulo. Clic para ver el detalle."
        >
          <MapaModulos indicadores={indicadores} onSelect={onSelectBeneficiario} />
        </Card>
        <Card title="Comparativo por entidad técnica">
          <ComparativoEntidades />
        </Card>
      </div>
    </div>
  );
}

function ComparativoEntidades() {
  const { obra, indicadores } = useObra();
  const filas = obra.entidades
    .map((e, k) => {
      const ind = indicadores.filter((i) => i.beneficiario.entidadId === e.id);
      return { e, k, ind, r: calcResumen(ind, obra.config) };
    })
    .filter((f) => f.ind.length);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-stone">
            <th className="py-2 pr-3 font-medium">Entidad</th>
            <th className="py-2 pr-3 font-medium">Módulos</th>
            <th className="py-2 pr-3 font-medium">Avance</th>
            <th className="py-2 pr-3 font-medium">SPI</th>
            <th className="py-2 pr-3 font-medium">Valorizado</th>
            <th className="py-2 font-medium">Fin proyectado</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(({ e, k, ind, r }) => (
            <tr key={e.id} className="border-b border-line/60">
              <td className="py-2.5 pr-3">
                <span className="inline-flex items-center gap-2 font-medium text-ink">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: VIZ.series[k] }} />
                  {e.sigla}
                </span>
                <div className="text-xs text-stone">{e.razonSocial}</div>
              </td>
              <td className="py-2.5 pr-3 tabular-nums">{ind.length}</td>
              <td className="w-40 py-2.5 pr-3">
                <div className="mb-1 text-xs tabular-nums text-ink">{pct(r.ejecutado)}</div>
                <ProgressBar value={r.ejecutado} target={r.programado} color={VIZ.series[k]} />
              </td>
              <td className="py-2.5 pr-3">
                <StatusBadge
                  status={spiSemaforo(r.spi, obra.config)}
                  label={r.spi === null ? "—" : r.spi.toFixed(2)}
                />
              </td>
              <td className="py-2.5 pr-3 tabular-nums">{soles(r.montoEjecutado)}</td>
              <td className="py-2.5 tabular-nums">{fechaCorta(r.finProyectado)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
