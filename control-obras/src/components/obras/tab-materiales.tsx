"use client";

import { useEffect, useMemo, useState } from "react";
import { PackageCheck, Plus, Printer, Trash2, X } from "lucide-react";
import type { Beneficiario, Material, MovimientoMaterial, TipoMovimientoMaterial } from "@/types/obras";
import { fechaCorta, fechaHora, round2, soles, todayISO } from "@/lib/obras/calc";
import {
  TIPO_MOVIMIENTO_LABEL,
  detalleAlmacen,
  materialesDeModulo,
  siguienteDocumento,
  stockAlmacen,
  stockModulo,
  tieneMateriales,
  validarMovimiento,
  valorizar,
} from "@/lib/obras/materiales";
import { registrarMovimiento, uid } from "@/lib/obras/ops";
import { cn } from "@/lib/cn";
import { useObra } from "./obra-context";
import { Button, Card, EmptyState, Field, Kpi, inputClass } from "./ui";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export default function TabMateriales() {
  const { obra, obraReal, seleccion, fecha } = useObra();
  const [vista, setVista] = useState<"entregado" | "estimado">("entregado");
  const [categoria, setCategoria] = useState("all");
  const [detalle, setDetalle] = useState<string | null>(null);
  const [nota, setNota] = useState<MovimientoMaterial | null>(null);

  const conMovimientos = useMemo(() => {
    const ids = new Set(obra.movimientosMaterial.flatMap((m) => m.items.map((i) => i.materialId)));
    return obra.materiales.filter((m) => ids.has(m.id));
  }, [obra.materiales, obra.movimientosMaterial]);
  const categorias = [...new Set(obra.materiales.map((m) => m.categoria))];
  const columnas = conMovimientos.filter((m) => categoria === "all" || m.categoria === categoria);
  const hayRequeridos = obra.materiales.some((m) => m.requeridoPorModulo);

  if (!obra.beneficiarios.length) return <EmptyState title="Importa primero la lista de beneficiarios" />;

  const conMat = seleccion.filter((b) => tieneMateriales(obra, b.id)).length;
  const valorAlmacenes = obra.entidades.reduce((s, e) => s + valorizar(stockAlmacen(obra, e.id), obra.materiales), 0);
  const valorModulos = seleccion.reduce((s, b) => s + valorizar(stockModulo(obra, b.id), obra.materiales), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          label="Módulos con materiales"
          value={`${conMat}/${seleccion.length}`}
          status={conMat < seleccion.length ? "warning" : "good"}
          hint={seleccion.length - conMat ? <>{seleccion.length - conMat} sin entregas</> : "todos abastecidos"}
        />
        <Kpi label="Movimientos registrados" value={String(obra.movimientosMaterial.length)} hint={<>{obra.materiales.length} materiales en catálogo</>} />
        <Kpi label="Valor en almacenes" value={soles(valorAlmacenes)} hint="según precio referencial" />
        <Kpi label="Valor entregado a módulos" value={soles(valorModulos)} hint="neto de devoluciones" />
      </div>

      <FormMovimiento onRegistrado={setNota} />

      <Card
        title="Materiales en obra por módulo"
        subtitle={
          vista === "entregado"
            ? "Cantidad entregada a cada módulo (entregas y traslados recibidos − devoluciones, traslados enviados y mermas). Clic en un módulo para ver su detalle."
            : "En obra estimado = entregado − consumo estimado con el avance registrado (solo materiales con 'requerido por módulo'). Negativo = faltante."
        }
        actions={
          <>
            <select className={cn(inputClass, "w-44")} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="all">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <div className="inline-flex rounded-full border border-line bg-bone p-0.5 text-xs font-medium">
              {(
                [
                  ["entregado", "Entregado"],
                  ["estimado", "En obra (estimado)"],
                ] as const
              ).map(([id, l]) => (
                <button
                  key={id}
                  type="button"
                  disabled={id === "estimado" && !hayRequeridos}
                  title={id === "estimado" && !hayRequeridos ? "Define el 'requerido por módulo' en el catálogo" : undefined}
                  onClick={() => setVista(id)}
                  className={cn("rounded-full px-3 py-1 disabled:opacity-40", vista === id ? "bg-ink text-bone" : "text-ink/70")}
                >
                  {l}
                </button>
              ))}
            </div>
          </>
        }
      >
        {columnas.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone">Aún no hay movimientos de materiales. Registra un ingreso al almacén y luego las entregas a los módulos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-stone">
                  <th className="sticky left-0 z-10 bg-paper px-2 py-1 text-left font-medium">Módulo</th>
                  {columnas.map((m) => (
                    <th key={m.id} className="px-1 py-1 text-center font-medium" title={m.nombre}>
                      <div className="max-w-[80px] truncate text-ink">{m.nombre.split(" (")[0]}</div>
                      <div className="font-normal">{m.unidad}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seleccion.map((b) => {
                  const lineas = materialesDeModulo(obra, obraReal, b, fecha);
                  const sin = !tieneMateriales(obra, b.id);
                  return (
                    <tr key={b.id} className="border-b border-line/60 hover:bg-bone">
                      <td className="sticky left-0 z-10 bg-paper px-2 py-1">
                        <button type="button" onClick={() => setDetalle(b.id)} className="text-left font-medium text-ink hover:text-clay">
                          {b.n}. {b.apPaterno} {b.nombres.split(" ")[0]}
                        </button>
                        <span className="ml-1 text-stone">{b.entidadId}</span>
                        {sin && <span className="ml-1 rounded bg-[#fab219]/20 px-1 text-[0.6rem] text-ink">sin materiales</span>}
                      </td>
                      {columnas.map((m) => {
                        const l = lineas.find((x) => x.material.id === m.id)!;
                        const valor = vista === "entregado" ? l.entregado : l.enObraEstimado;
                        const falta = vista === "estimado" && valor !== null && valor < 0;
                        return (
                          <td
                            key={m.id}
                            className={cn(
                              "px-1 py-1 text-center tabular-nums",
                              valor === null || valor === 0 ? "text-stone/50" : "text-ink",
                              falta && "bg-red-50 font-semibold text-red-700",
                              vista === "entregado" && l.entregado > 0 && "bg-[#2a78d6]/10",
                            )}
                            title={
                              l.requerido !== null
                                ? `Requerido ${fmt(l.requerido)} · entregado ${fmt(l.entregado)} · consumo est. ${fmt(l.consumoEstimado ?? 0)}`
                                : `Entregado ${fmt(l.entregado)}`
                            }
                          >
                            {valor === null ? "·" : valor === 0 ? "–" : fmt(valor)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Almacenes />
      <Historial onNota={setNota} />
      <Catalogo />

      {detalle && <DetalleModulo id={detalle} onClose={() => setDetalle(null)} />}
      {nota && <NotaMovimiento mov={nota} onClose={() => setNota(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

type Linea = { key: string; materialId: string; cantidad: number };

function FormMovimiento({ onRegistrado }: { onRegistrado: (m: MovimientoMaterial) => void }) {
  const { obra, replace, usuario } = useObra();
  const [tipo, setTipo] = useState<TipoMovimientoMaterial>("entrega");
  const [entidadId, setEntidadId] = useState(obra.entidades[0]?.id ?? "");
  const [fecha, setFecha] = useState(todayISO());
  const [destinos, setDestinos] = useState<string[]>([]);
  const [origenId, setOrigenId] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [documento, setDocumento] = useState("");
  const [recibidoPor, setRecibidoPor] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([{ key: uid(), materialId: "", cantidad: 0 }]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const modulos = obra.beneficiarios.filter((b) => b.entidadId === entidadId);
  const multiples = tipo === "entrega";
  const necesitaDestino = tipo === "entrega" || tipo === "traslado";
  const necesitaOrigen = tipo === "devolucion" || tipo === "traslado";
  const maestroDe = (bId: string) => obra.contratos.find((c) => c.beneficiarioIds.includes(bId))?.subcontratista ?? "";
  const docSugerido = siguienteDocumento(obra, tipo, entidadId);

  const guardar = () => {
    setMsg(null);
    const items = lineas.filter((l) => l.materialId && l.cantidad > 0).map(({ materialId, cantidad }) => ({ materialId, cantidad }));
    const base = {
      tipo,
      fecha,
      entidadId,
      items,
      proveedor: tipo === "ingreso" ? proveedor || undefined : undefined,
      observaciones: observaciones || undefined,
    };
    const lista = necesitaDestino ? destinos : [undefined];
    if (necesitaDestino && !lista.length) {
      setMsg({ ok: false, text: "Elige al menos un módulo de destino." });
      return;
    }
    // Avisar si alguna salida deja stock negativo (se permite registrar igual).
    const total = items.map((i) => ({ ...i, cantidad: i.cantidad * lista.length }));
    const avisos = validarMovimiento(obra, { ...base, items: total, origenId: necesitaOrigen || tipo === "merma" ? origenId || undefined : undefined });
    if (
      avisos.length &&
      !confirm(
        "Stock insuficiente en el origen:\n" +
          avisos
            .map((a) => `• ${obra.materiales.find((m) => m.id === a.materialId)?.nombre}: disponible ${fmt(a.disponible)}, sale ${fmt(a.solicitado)}`)
            .join("\n") +
          "\n\n¿Registrar de todos modos?",
      )
    )
      return;

    try {
      let estado = obra;
      let ultimo: MovimientoMaterial | null = null;
      for (const destinoId of lista) {
        const doc = documento && lista.length === 1 ? documento : siguienteDocumento(estado, tipo, entidadId);
        const r = registrarMovimiento(
          estado,
          {
            ...base,
            documento: doc,
            destinoId,
            origenId: necesitaOrigen || tipo === "merma" ? origenId || undefined : undefined,
            recibidoPor: recibidoPor || (destinoId ? maestroDe(destinoId) : undefined) || undefined,
          },
          usuario ?? undefined,
        );
        estado = r.state;
        ultimo = estado.movimientosMaterial.find((m) => m.id === r.id) ?? null;
      }
      replace(estado);
      setMsg({
        ok: true,
        text: `${TIPO_MOVIMIENTO_LABEL[tipo]} registrado${lista.length > 1 ? ` para ${lista.length} módulos` : ""}.`,
      });
      setLineas([{ key: uid(), materialId: "", cantidad: 0 }]);
      setDocumento("");
      setObservaciones("");
      if (ultimo && lista.length === 1) onRegistrado(ultimo);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "No se pudo registrar" });
    }
  };

  return (
    <Card
      title="Registrar movimiento de materiales"
      subtitle="Ingreso de compras al almacén de la entidad técnica, entrega a módulos (a uno o varios a la vez), devolución, traslado entre módulos o merma. Cada movimiento queda con N° de documento, fecha y usuario."
    >
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Tipo">
          <select className={inputClass} value={tipo} onChange={(e) => { setTipo(e.target.value as TipoMovimientoMaterial); setDestinos([]); setOrigenId(""); }}>
            {Object.entries(TIPO_MOVIMIENTO_LABEL).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Entidad técnica (almacén)">
          <select className={inputClass} value={entidadId} onChange={(e) => { setEntidadId(e.target.value); setDestinos([]); setOrigenId(""); }}>
            {obra.entidades.map((e) => (
              <option key={e.id} value={e.id}>{e.sigla} — {e.razonSocial}</option>
            ))}
          </select>
        </Field>
        <Field label="Fecha">
          <input type="date" className={inputClass} value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} />
        </Field>
        <Field label={`N° documento (sugerido ${docSugerido})`}>
          <input className={inputClass} value={documento} placeholder={tipo === "ingreso" ? "Guía / factura" : docSugerido} onChange={(e) => setDocumento(e.target.value)} />
        </Field>
        {tipo === "ingreso" && (
          <Field label="Proveedor" className="md:col-span-2">
            <input className={inputClass} value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
          </Field>
        )}
        {(necesitaOrigen || tipo === "merma") && (
          <Field label={tipo === "merma" ? "Dónde ocurrió (vacío = almacén)" : "Módulo de origen"} className="md:col-span-2">
            <select className={inputClass} value={origenId} onChange={(e) => setOrigenId(e.target.value)}>
              <option value="">{tipo === "merma" ? "Almacén" : "Elegir…"}</option>
              {modulos.map((b) => (
                <option key={b.id} value={b.id}>{b.n}. {b.apPaterno} {b.nombres}</option>
              ))}
            </select>
          </Field>
        )}
        {necesitaDestino && (
          <Field label="Recibe (vacío = maestro del módulo)" className="md:col-span-2">
            <input className={inputClass} value={recibidoPor} onChange={(e) => setRecibidoPor(e.target.value)} />
          </Field>
        )}
      </div>

      {necesitaDestino && (
        <div className="mt-3">
          <p className="text-xs font-medium text-stone">
            {multiples ? "Módulos de destino (puedes elegir varios: se registra una nota de entrega por módulo con las mismas cantidades)" : "Módulo de destino"}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {modulos.map((b) => {
              const on = destinos.includes(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() =>
                    setDestinos(multiples ? (on ? destinos.filter((x) => x !== b.id) : [...destinos, b.id]) : [b.id])
                  }
                  className={cn("rounded-full border px-2.5 py-1 text-xs", on ? "border-ink bg-ink text-bone" : "border-line bg-paper text-ink")}
                >
                  {b.n}. {b.apPaterno}
                  {!tieneMateriales(obra, b.id) && " •"}
                </button>
              );
            })}
            {multiples && modulos.length > 1 && (
              <button type="button" className="text-xs text-clay underline" onClick={() => setDestinos(destinos.length === modulos.length ? [] : modulos.map((b) => b.id))}>
                {destinos.length === modulos.length ? "ninguno" : "todos"}
              </button>
            )}
          </div>
          <p className="mt-1 text-[0.7rem] text-stone">• = módulo que aún no recibió materiales.</p>
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs font-medium text-stone">Materiales</p>
        <div className="mt-1 flex flex-col gap-2">
          {lineas.map((l, k) => {
            const stock = tipo === "entrega" ? stockAlmacen(obra, entidadId) : origenId ? stockModulo(obra, origenId) : null;
            const mat = obra.materiales.find((m) => m.id === l.materialId);
            return (
              <div key={l.key} className="grid grid-cols-[1fr_120px_auto] items-center gap-2 md:grid-cols-[1fr_140px_160px_auto]">
                <select
                  className={inputClass}
                  value={l.materialId}
                  onChange={(e) => setLineas(lineas.map((x, i) => (i === k ? { ...x, materialId: e.target.value } : x)))}
                >
                  <option value="">Elegir material…</option>
                  {categorias(obra.materiales).map((cat) => (
                    <optgroup key={cat} label={cat}>
                      {obra.materiales.filter((m) => m.categoria === cat).map((m) => (
                        <option key={m.id} value={m.id}>{m.codigo} · {m.nombre} ({m.unidad})</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step="any"
                  className={inputClass}
                  value={l.cantidad || ""}
                  placeholder={mat?.unidad ?? "cant."}
                  onChange={(e) => setLineas(lineas.map((x, i) => (i === k ? { ...x, cantidad: Number(e.target.value) || 0 } : x)))}
                />
                <span className="hidden text-xs text-stone md:block">
                  {stock && l.materialId ? `disponible: ${fmt(stock[l.materialId] ?? 0)} ${mat?.unidad ?? ""}` : ""}
                </span>
                <Button variant="ghost" onClick={() => setLineas(lineas.length > 1 ? lineas.filter((_, i) => i !== k) : lineas)} aria-label="Quitar línea">
                  <Trash2 size={14} />
                </Button>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => setLineas([...lineas, { key: uid(), materialId: "", cantidad: 0 }])}>
            <Plus size={14} /> Agregar material
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field label="Observaciones" className="min-w-64 flex-1">
          <input className={inputClass} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </Field>
        <Button variant="primary" onClick={guardar}>
          <PackageCheck size={14} /> Registrar {TIPO_MOVIMIENTO_LABEL[tipo].toLowerCase()}
        </Button>
      </div>
      {msg && <p className={cn("mt-3 rounded-lg px-3 py-2 text-sm", msg.ok ? "bg-[#0ca30c]/10" : "bg-red-50 text-red-700")}>{msg.text}</p>}
    </Card>
  );
}

function categorias(ms: Material[]) {
  return [...new Set(ms.map((m) => m.categoria))];
}

function Almacenes() {
  const { obra } = useObra();
  return (
    <Card title="Stock en almacén por entidad técnica" subtitle="Ingresos − entregas + devoluciones − mermas en almacén.">
      <div className="grid gap-5 xl:grid-cols-2">
        {obra.entidades.map((e) => {
          const d = detalleAlmacen(obra, e.id);
          const stock = stockAlmacen(obra, e.id);
          const ids = new Set([...Object.keys(d.ingresado), ...Object.keys(d.entregado)]);
          const mats = obra.materiales.filter((m) => ids.has(m.id));
          return (
            <div key={e.id}>
              <p className="mb-1 text-sm font-semibold text-ink">{e.sigla} — {e.razonSocial}</p>
              {mats.length === 0 ? (
                <p className="text-xs text-stone">Sin movimientos.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-line text-left text-stone">
                      <th className="py-1 pr-2 font-medium">Material</th>
                      <th className="py-1 pr-2 text-right font-medium">Ingresó</th>
                      <th className="py-1 pr-2 text-right font-medium">Entregado</th>
                      <th className="py-1 pr-2 text-right font-medium">Devuelto</th>
                      <th className="py-1 pr-2 text-right font-medium">Merma</th>
                      <th className="py-1 text-right font-medium">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mats.map((m) => {
                      const s = stock[m.id] ?? 0;
                      return (
                        <tr key={m.id} className="border-b border-line/60">
                          <td className="py-1 pr-2">{m.nombre} <span className="text-stone">({m.unidad})</span></td>
                          <td className="py-1 pr-2 text-right tabular-nums">{fmt(d.ingresado[m.id] ?? 0)}</td>
                          <td className="py-1 pr-2 text-right tabular-nums">{fmt(d.entregado[m.id] ?? 0)}</td>
                          <td className="py-1 pr-2 text-right tabular-nums">{fmt(d.devuelto[m.id] ?? 0)}</td>
                          <td className="py-1 pr-2 text-right tabular-nums">{fmt(d.merma[m.id] ?? 0)}</td>
                          <td className={cn("py-1 text-right font-semibold tabular-nums", s < 0 && "text-red-700")}>{fmt(s)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Historial({ onNota }: { onNota: (m: MovimientoMaterial) => void }) {
  const { obra, update } = useObra();
  const [tipo, setTipo] = useState<string>("all");
  const [modulo, setModulo] = useState<string>("all");
  const nombre = (id?: string) => {
    const b = obra.beneficiarios.find((x) => x.id === id);
    return b ? `${b.n}. ${b.apPaterno}` : "Almacén";
  };
  const movs = [...obra.movimientosMaterial]
    .filter((m) => (tipo === "all" || m.tipo === tipo) && (modulo === "all" || m.origenId === modulo || m.destinoId === modulo))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.registradoEn.localeCompare(a.registradoEn));
  return (
    <Card
      title="Historial de movimientos (kardex)"
      actions={
        <>
          <select className={cn(inputClass, "w-48")} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="all">Todos los tipos</option>
            {Object.entries(TIPO_MOVIMIENTO_LABEL).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
          <select className={cn(inputClass, "w-56")} value={modulo} onChange={(e) => setModulo(e.target.value)}>
            <option value="all">Todos los módulos</option>
            {obra.beneficiarios.map((b) => (
              <option key={b.id} value={b.id}>{b.n}. {b.apPaterno} ({b.entidadId})</option>
            ))}
          </select>
        </>
      }
    >
      {movs.length === 0 ? (
        <p className="py-4 text-center text-sm text-stone">Sin movimientos.</p>
      ) : (
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="sticky top-0 bg-paper">
              <tr className="border-b border-line text-left text-xs text-stone">
                <th className="py-2 pr-2 font-medium">Fecha</th>
                <th className="py-2 pr-2 font-medium">Documento</th>
                <th className="py-2 pr-2 font-medium">Tipo</th>
                <th className="py-2 pr-2 font-medium">De → A</th>
                <th className="py-2 pr-2 font-medium">Materiales</th>
                <th className="py-2 pr-2 font-medium">Registrado</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {movs.map((m) => (
                <tr key={m.id} className="border-b border-line/60 align-top">
                  <td className="py-2 pr-2 tabular-nums">{fechaCorta(m.fecha)}</td>
                  <td className="py-2 pr-2 text-xs">{m.documento ?? "—"}{m.demo && <span className="ml-1 text-stone">demo</span>}</td>
                  <td className="py-2 pr-2 text-xs">{TIPO_MOVIMIENTO_LABEL[m.tipo]}</td>
                  <td className="py-2 pr-2 text-xs">
                    {m.tipo === "ingreso" ? `${m.proveedor ?? "Proveedor"} → Almacén ${m.entidadId}` : `${nombre(m.origenId)} → ${m.tipo === "merma" ? "Merma" : nombre(m.destinoId)}`}
                    {m.recibidoPor && <div className="text-stone">recibe: {m.recibidoPor}</div>}
                  </td>
                  <td className="py-2 pr-2 text-xs">
                    {m.items.map((i) => {
                      const mat = obra.materiales.find((x) => x.id === i.materialId);
                      return <div key={i.materialId}>{fmt(i.cantidad)} {mat?.unidad} · {mat?.nombre ?? i.materialId}</div>;
                    })}
                  </td>
                  <td className="py-2 pr-2 text-xs text-stone">{fechaHora(m.registradoEn)}{m.registradoPor ? ` · ${m.registradoPor}` : ""}</td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" onClick={() => onNota(m)} aria-label="Imprimir nota">
                        <Printer size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label="Eliminar movimiento"
                        onClick={() =>
                          confirm(`¿Eliminar el movimiento ${m.documento ?? ""}? Cambiará el stock.`) &&
                          update((d) => void (d.movimientosMaterial = d.movimientosMaterial.filter((x) => x.id !== m.id)))
                        }
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Catalogo() {
  const { obra, update } = useObra();
  const set = (k: number, patch: Partial<Material>) => update((d) => void Object.assign(d.materiales[k], patch));
  const usados = new Set(obra.movimientosMaterial.flatMap((m) => m.items.map((i) => i.materialId)));
  return (
    <Card
      title="Catálogo de materiales"
      subtitle="Completa el 'requerido por módulo' con el metrado del expediente técnico: así se estima el consumo con el avance registrado y se detectan faltantes y excesos. La partida define con qué avance se consume."
      actions={
        <Button
          onClick={() =>
            update((d) =>
              d.materiales.push({
                id: uid("mat"),
                codigo: `OTR-${String(d.materiales.filter((m) => m.codigo.startsWith("OTR")).length + 1).padStart(2, "0")}`,
                nombre: "Nuevo material",
                unidad: "und",
                categoria: "Otros",
              }),
            )
          }
        >
          <Plus size={14} /> Material
        </Button>
      }
    >
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="sticky top-0 bg-paper">
            <tr className="border-b border-line text-left text-xs text-stone">
              <th className="py-2 pr-2 font-medium">Código</th>
              <th className="py-2 pr-2 font-medium">Material</th>
              <th className="py-2 pr-2 font-medium">Unidad</th>
              <th className="py-2 pr-2 font-medium">Categoría</th>
              <th className="py-2 pr-2 font-medium">Precio ref. S/</th>
              <th className="py-2 pr-2 font-medium">Requerido por módulo</th>
              <th className="py-2 pr-2 font-medium">Partida que lo consume</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {obra.materiales.map((m, k) => (
              <tr key={m.id} className="border-b border-line/60">
                <td className="w-24 py-1 pr-2"><input className={inputClass} value={m.codigo} onChange={(e) => set(k, { codigo: e.target.value })} /></td>
                <td className="py-1 pr-2"><input className={inputClass} value={m.nombre} onChange={(e) => set(k, { nombre: e.target.value })} /></td>
                <td className="w-24 py-1 pr-2"><input className={inputClass} value={m.unidad} onChange={(e) => set(k, { unidad: e.target.value })} /></td>
                <td className="w-40 py-1 pr-2"><input className={inputClass} value={m.categoria} onChange={(e) => set(k, { categoria: e.target.value })} /></td>
                <td className="w-28 py-1 pr-2">
                  <input type="number" min={0} step="any" className={inputClass} value={m.precioRef ?? ""} onChange={(e) => set(k, { precioRef: e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)) })} />
                </td>
                <td className="w-32 py-1 pr-2">
                  <input type="number" min={0} step="any" className={inputClass} value={m.requeridoPorModulo ?? ""} placeholder="por definir" onChange={(e) => set(k, { requeridoPorModulo: e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)) })} />
                </td>
                <td className="w-52 py-1 pr-2">
                  <select className={inputClass} value={m.partidaId ?? ""} onChange={(e) => set(k, { partidaId: e.target.value || undefined })}>
                    <option value="">Todo el módulo</option>
                    {obra.partidas.map((p) => (
                      <option key={p.id} value={p.id}>{p.codigo} {p.nombre}</option>
                    ))}
                  </select>
                </td>
                <td className="py-1 text-right">
                  {!usados.has(m.id) && (
                    <Button variant="ghost" aria-label="Eliminar material" onClick={() => update((d) => void d.materiales.splice(k, 1))}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function DetalleModulo({ id, onClose }: { id: string; onClose: () => void }) {
  const { obra, obraReal, fecha } = useObra();
  const b = obra.beneficiarios.find((x) => x.id === id) as Beneficiario;
  const lineas = materialesDeModulo(obra, obraReal, b, fecha).filter((l) => l.entregado !== 0 || l.requerido);
  const movs = obra.movimientosMaterial
    .filter((m) => m.destinoId === id || m.origenId === id)
    .sort((a, c) => a.fecha.localeCompare(c.fecha));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30" onClick={onClose}>
      <aside className="h-full w-full max-w-2xl overflow-y-auto bg-bone p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="kicker text-stone">Materiales del módulo N° {b.n} · {b.entidadId}</p>
            <h2 className="mt-1 font-display text-xl font-bold">{b.apPaterno} {b.apMaterno}, {b.nombres}</h2>
            <p className="text-sm text-stone">{b.direccion}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-stone">
              <th className="py-1 pr-2 font-medium">Material</th>
              <th className="py-1 pr-2 text-right font-medium">Entregado</th>
              <th className="py-1 pr-2 text-right font-medium">Requerido</th>
              <th className="py-1 pr-2 text-right font-medium">Consumo est.</th>
              <th className="py-1 pr-2 text-right font-medium">En obra est.</th>
              <th className="py-1 text-right font-medium">Por entregar</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l) => (
              <tr key={l.material.id} className="border-b border-line/60">
                <td className="py-1 pr-2">{l.material.nombre} <span className="text-stone">({l.material.unidad})</span></td>
                <td className="py-1 pr-2 text-right tabular-nums">{fmt(l.entregado)}</td>
                <td className="py-1 pr-2 text-right tabular-nums">{l.requerido === null ? "—" : fmt(l.requerido)}</td>
                <td className="py-1 pr-2 text-right tabular-nums">{l.consumoEstimado === null ? "—" : fmt(l.consumoEstimado)}</td>
                <td className={cn("py-1 pr-2 text-right tabular-nums", (l.enObraEstimado ?? 0) < 0 && "font-semibold text-red-700")}>
                  {l.enObraEstimado === null ? "—" : fmt(l.enObraEstimado)}
                </td>
                <td className="py-1 text-right tabular-nums">{l.pendientePorEntregar === null ? "—" : fmt(Math.max(0, l.pendientePorEntregar))}</td>
              </tr>
            ))}
            {!lineas.length && (
              <tr><td colSpan={6} className="py-4 text-center text-stone">Este módulo aún no recibió materiales.</td></tr>
            )}
          </tbody>
        </table>
        <h3 className="mt-6 font-display text-sm font-semibold">Movimientos</h3>
        <ul className="mt-2 space-y-1 text-xs">
          {movs.map((m) => (
            <li key={m.id}>
              {fechaCorta(m.fecha)} · <b>{TIPO_MOVIMIENTO_LABEL[m.tipo]}</b> {m.documento ?? ""} ·{" "}
              {m.items.map((i) => `${fmt(i.cantidad)} ${obra.materiales.find((x) => x.id === i.materialId)?.nombre ?? ""}`).join(", ")}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function NotaMovimiento({ mov, onClose }: { mov: MovimientoMaterial; onClose: () => void }) {
  const { obra } = useObra();
  const e = obra.entidades.find((x) => x.id === mov.entidadId);
  const ben = (id?: string) => obra.beneficiarios.find((b) => b.id === id);
  const destino = ben(mov.destinoId);
  const origen = ben(mov.origenId);
  const total = round2(mov.items.reduce((s, i) => s + (obra.materiales.find((m) => m.id === i.materialId)?.precioRef ?? 0) * i.cantidad, 0));
  const titulo =
    mov.tipo === "entrega" ? "NOTA DE ENTREGA DE MATERIALES" :
    mov.tipo === "ingreso" ? "INGRESO DE MATERIALES A ALMACÉN" :
    mov.tipo === "devolucion" ? "NOTA DE DEVOLUCIÓN DE MATERIALES" :
    mov.tipo === "traslado" ? "NOTA DE TRASLADO DE MATERIALES" : "ACTA DE MERMA / PÉRDIDA DE MATERIALES";
  const td = "border border-[#bbb] px-2 py-1";
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 p-4">
      <div className="no-print sticky top-0 z-10 mx-auto mb-3 flex max-w-3xl items-center justify-between gap-2 rounded-2xl bg-paper p-3 shadow">
        <p className="text-sm font-semibold">{titulo} · {mov.documento}</p>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => window.print()}><Printer size={14} /> Imprimir / PDF</Button>
          <Button onClick={onClose}><X size={14} /> Cerrar</Button>
        </div>
      </div>
      <div className="print-area print-nota mx-auto max-w-3xl bg-white p-8 text-[12px] text-black shadow">
        <div className="flex justify-between border-b-2 border-black pb-2">
          <div>
            <p className="text-lg font-bold">{titulo}</p>
            <p>{e ? `${e.sigla} — ${e.razonSocial}` : mov.entidadId}</p>
            <p>{obra.config.nombre}</p>
          </div>
          <div className="text-right">
            <p className="text-base font-bold">N° {mov.documento ?? "—"}</p>
            <p>Fecha: {fechaCorta(mov.fecha)}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {mov.tipo === "ingreso" && <p><b>Proveedor:</b> {mov.proveedor ?? "—"}</p>}
          {origen && <p><b>Origen:</b> Módulo N° {origen.n} — {origen.apPaterno} {origen.apMaterno}, {origen.nombres}</p>}
          {(mov.tipo === "entrega" || mov.tipo === "ingreso") && !origen && <p><b>Origen:</b> {mov.tipo === "ingreso" ? "Proveedor" : `Almacén ${mov.entidadId}`}</p>}
          {destino && (
            <p className="col-span-2">
              <b>Destino:</b> Módulo N° {destino.n} — {destino.apPaterno} {destino.apMaterno}, {destino.nombres} · {destino.direccion}
            </p>
          )}
          {mov.recibidoPor && <p><b>Recibe:</b> {mov.recibidoPor}</p>}
        </div>
        <table className="mt-3 w-full border-collapse">
          <thead>
            <tr className="bg-[#efede6]">
              <th className={td}>N°</th><th className={td}>Código</th><th className={td}>Material</th><th className={td}>Unidad</th><th className={td}>Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {mov.items.map((i, k) => {
              const m = obra.materiales.find((x) => x.id === i.materialId);
              return (
                <tr key={k}>
                  <td className={`${td} text-center`}>{k + 1}</td>
                  <td className={td}>{m?.codigo}</td>
                  <td className={td}>{m?.nombre}</td>
                  <td className={`${td} text-center`}>{m?.unidad}</td>
                  <td className={`${td} text-right font-semibold`}>{fmt(i.cantidad)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {total > 0 && <p className="mt-1 text-right text-[11px]">Valor referencial: {soles(total)}</p>}
        {mov.observaciones && <p className="mt-2"><b>Observaciones:</b> {mov.observaciones}</p>}
        <p className="mt-2 text-[10px] text-[#555]">Registrado el {fechaHora(mov.registradoEn)}{mov.registradoPor ? ` por ${mov.registradoPor}` : ""}</p>
        <div className="mt-20 grid grid-cols-3 gap-8 text-center text-[11px] font-semibold">
          <div className="border-t border-black pt-1">ENTREGA (ALMACÉN)</div>
          <div className="border-t border-black pt-1">RECIBE (MAESTRO DE OBRA)</div>
          <div className="border-t border-black pt-1">BENEFICIARIO / DNI</div>
        </div>
      </div>
    </div>
  );
}
