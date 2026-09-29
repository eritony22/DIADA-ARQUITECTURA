"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import type { EstadoPredio, EtapaTechoPropio } from "@/types/obras";
import { fechaCorta, pct, type IndicadorBeneficiario } from "@/lib/obras/calc";
import { useObra } from "./obra-context";
import { BarrasSimples } from "./charts";
import { ETAPAS, PREDIO_LABEL } from "./labels";
import type { TabProps } from "./tab-resumen";
import { Card, EmptyState, ProgressBar, StatusBadge, VIZ, inputBase } from "./ui";

type Orden = "n" | "ejecutado" | "spi" | "atraso";

export default function TabBeneficiarios({ onSelectBeneficiario, goTo }: TabProps) {
  const { obra, indicadores, update } = useObra();
  const [orden, setOrden] = useState<Orden>("n");

  const filas = useMemo(() => {
    const cmp: Record<Orden, (a: IndicadorBeneficiario, b: IndicadorBeneficiario) => number> = {
      n: (a, b) =>
        a.beneficiario.entidadId.localeCompare(b.beneficiario.entidadId) ||
        a.beneficiario.n - b.beneficiario.n,
      ejecutado: (a, b) => a.ejecutado - b.ejecutado,
      spi: (a, b) => (a.spi ?? 99) - (b.spi ?? 99),
      atraso: (a, b) => b.diasAtraso - a.diasAtraso,
    };
    return [...indicadores].sort(cmp[orden]);
  }, [indicadores, orden]);

  const embudo = ETAPAS.map((e) => ({
    nombre: e.label,
    valor: indicadores.filter((i) => i.beneficiario.etapa === e.id).length,
  }));

  if (!obra.beneficiarios.length) {
    return (
      <EmptyState title="Aún no hay beneficiarios">
        <button className="font-semibold text-clay underline" onClick={() => goTo("parametros")}>
          Importa la lista oficial
        </button>{" "}
        para verlos aquí.
      </EmptyState>
    );
  }

  const setB = (id: string, patch: (b: (typeof obra.beneficiarios)[number]) => void) =>
    update((d) => {
      const b = d.beneficiarios.find((x) => x.id === id);
      if (b) patch(b);
    });

  return (
    <div className="flex flex-col gap-5">
      <Card
        title="Familias por etapa del proceso Techo Propio"
        subtitle="Actualiza la etapa de cada familia en la tabla. Las etapas de garantía en adelante exigen carta fianza vigente."
      >
        <BarrasSimples data={embudo} valueLabel="Familias" height={240} inclinar />
      </Card>

      <Card title="Padrón de beneficiarios" subtitle="Clic en el nombre para ver el detalle por partida.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-stone">
                <th className="py-2 pr-2 font-medium"><OrdenBtn actual={orden} onClick={setOrden} id="n">N°</OrdenBtn></th>
                <th className="py-2 pr-2 font-medium">Beneficiario</th>
                <th className="py-2 pr-2 font-medium">ET · G</th>
                <th className="py-2 pr-2 font-medium">Predio</th>
                <th className="py-2 pr-2 font-medium">Etapa</th>
                <th className="py-2 pr-2 font-medium">Inicio</th>
                <th className="py-2 pr-2 font-medium"><OrdenBtn actual={orden} onClick={setOrden} id="ejecutado">Avance</OrdenBtn></th>
                <th className="py-2 pr-2 font-medium"><OrdenBtn actual={orden} onClick={setOrden} id="spi">SPI</OrdenBtn></th>
                <th className="py-2 font-medium"><OrdenBtn actual={orden} onClick={setOrden} id="atraso">Fin proyectado</OrdenBtn></th>
              </tr>
            </thead>
            <tbody>
              {filas.map((i) => {
                const b = i.beneficiario;
                return (
                  <tr key={b.id} className="border-b border-line/60 align-middle">
                    <td className="py-2 pr-2 tabular-nums text-stone">{b.n}</td>
                    <td className="max-w-[260px] py-2 pr-2">
                      <button
                        type="button"
                        onClick={() => onSelectBeneficiario(b.id)}
                        className="text-left font-medium text-ink hover:text-clay"
                      >
                        {b.apPaterno} {b.apMaterno}, {b.nombres}
                      </button>
                      <div className="truncate text-xs text-stone" title={b.direccion}>
                        {b.tipoDoc} {b.numDoc} · {b.direccion}
                      </div>
                    </td>
                    <td className="py-2 pr-2 text-xs">
                      {b.entidadId} · G{b.grupo}
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          value={b.estadoPredio ?? ""}
                          onChange={(e) =>
                            setB(b.id, (x) => {
                              x.estadoPredio = (e.target.value || null) as EstadoPredio | null;
                            })
                          }
                          className={`${inputBase} w-36 py-1 text-xs`}
                        >
                          <option value="">Sin registrar</option>
                          {Object.entries(PREDIO_LABEL).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                        <label className="flex items-center gap-1 text-[0.65rem] text-stone" title="Condición confirmada">
                          <input
                            type="checkbox"
                            checked={b.predioConfirmado === true}
                            onChange={(e) =>
                              setB(b.id, (x) => {
                                x.predioConfirmado = e.target.checked;
                              })
                            }
                          />
                          Conf.
                        </label>
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        value={b.etapa}
                        onChange={(e) =>
                          setB(b.id, (x) => {
                            x.etapa = e.target.value as EtapaTechoPropio;
                          })
                        }
                        className={`${inputBase} w-40 py-1 text-xs`}
                      >
                        {ETAPAS.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2 text-xs tabular-nums">{fechaCorta(i.inicio)}</td>
                    <td className="w-36 py-2 pr-2">
                      <div className="mb-1 text-xs tabular-nums">
                        {pct(i.ejecutado)} <span className="text-stone">/ {pct(i.programado, 0)}</span>
                      </div>
                      <ProgressBar value={i.ejecutado} target={i.programado} color={VIZ.status[i.semaforo]} />
                    </td>
                    <td className="py-2 pr-2">
                      <StatusBadge status={i.semaforo} label={i.spi === null ? "—" : i.spi.toFixed(2)} />
                    </td>
                    <td className="py-2 text-xs tabular-nums">
                      {fechaCorta(i.finProyectado)}
                      {i.diasAtraso > 0 && (
                        <div className="text-[0.65rem] text-red-700">+{i.diasAtraso} días</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function OrdenBtn({
  id,
  actual,
  onClick,
  children,
}: {
  id: Orden;
  actual: Orden;
  onClick: (o: Orden) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`inline-flex items-center gap-1 ${actual === id ? "text-ink" : ""}`}
    >
      {children}
      <ArrowDownUp size={11} />
    </button>
  );
}
